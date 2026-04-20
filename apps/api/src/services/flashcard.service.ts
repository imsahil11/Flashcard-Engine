import { GoogleGenAI } from '@google/genai';
import type { FlashcardCardType, GeneratedFlashcard, TeacherNotes } from '@flashcard/types';
import { env } from '../config.js';
import { logger } from '../utils/logger.js';
import { chunkPdfText } from './pdf.service.js';
import { flashcardJsonSchema, generatedFlashcardDeckSchema } from './flashcard-schema.js';
import { z } from 'zod';

export const MASTER_TEACHER_SYSTEM_PROMPT = [
  'You are a Master Educator and Cognitive Scientist.',
  'Your task is to process source material and generate a comprehensive deck of spaced-repetition flashcards.',
  'Do not write lazy, shallow definitions. Build cards that feel like they were written by a great teacher.',
  '',
  'Use this taxonomy:',
  '1. Core Concepts: Ask questions that test the underlying why and how.',
  '2. Definitions: Capture essential terms precisely without becoming shallow.',
  '3. Relationships: Ask how Concept A connects to, differs from, depends on, or causes Concept B.',
  '4. Edge Cases: Present scenarios where the standard rule bends, breaks, or needs qualification.',
  '5. Worked Examples: Present a concrete scenario, procedure, or problem and ask for step-by-step resolution.',
  '',
  'Quality rules:',
  '- Each card must be grounded only in the provided source text.',
  '- Prefer active recall over recognition. Ask for explanation, reconstruction, comparison, mechanism, tradeoff, exception, or application.',
  '- Cover key concepts, definitions, relationships, edge cases, and worked examples whenever the source supports them.',
  '- Make every question self-contained; include the necessary subject, context, and scope.',
  '- Make every answer precise enough that a learner can grade their recall without opening the PDF.',
  '- Avoid duplicates, trivia, vague prompts, yes/no questions, and copy-pasted headings.',
  '- Break complex material into multiple cards instead of collapsing it into one generic summary.',
  '- If the chunk contains process, procedure, math, or case analysis, include a Worked_Example card.',
  '- If the chunk contains exceptions, caveats, failure modes, boundary conditions, or limitations, include an Edge_Case card.',
  '',
  'Return format:',
  '- Return only a JSON array.',
  '- Do not include markdown, commentary, code fences, or wrapper objects.',
  '- Every array item must contain cardType, front, back, and context.',
].join('\n');

const chunkTeachingPlanSchema = z.object({
  concepts: z.array(z.string().min(1)).max(8),
  definitions: z.array(z.string().min(1)).max(8),
  relationships: z.array(z.string().min(1)).max(8),
  edgeCases: z.array(z.string().min(1)).max(6),
  workedExamples: z.array(z.string().min(1)).max(6),
  coverageNotes: z.array(z.string().min(1)).max(10),
});

const chunkTeachingPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    concepts: { type: 'array', maxItems: 8, items: { type: 'string' } },
    definitions: { type: 'array', maxItems: 8, items: { type: 'string' } },
    relationships: { type: 'array', maxItems: 8, items: { type: 'string' } },
    edgeCases: { type: 'array', maxItems: 6, items: { type: 'string' } },
    workedExamples: { type: 'array', maxItems: 6, items: { type: 'string' } },
    coverageNotes: { type: 'array', maxItems: 10, items: { type: 'string' } },
  },
  required: ['concepts', 'definitions', 'relationships', 'edgeCases', 'workedExamples', 'coverageNotes'],
} as const;

type ChunkTeachingPlan = z.infer<typeof chunkTeachingPlanSchema>;

type ChunkPayload = ReturnType<typeof chunkPdfTextForFlashcards>[number];

const MAX_CHUNKS_PER_PDF = 18;
const CHUNK_CONCURRENCY = 3;
const MAX_FLASHCARDS_PER_CHUNK = 12;

const gemini = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

export function chunkPdfTextForFlashcards(text: string) {
  return chunkPdfText(text).slice(0, MAX_CHUNKS_PER_PDF);
}

export async function generateFlashcards(
  text: string,
  options: {
    teacherNotes?: TeacherNotes;
    onProgress?: (update: { stage: 'planning_concepts' | 'crafting_cards'; message: string; progressPercent: number }) => void;
  } = {},
): Promise<GeneratedFlashcard[]> {
  const chunks = chunkPdfTextForFlashcards(text);
  if (chunks.length === 0) {
    return [];
  }

  if (!gemini) {
    return generateFallbackFlashcards(chunks);
  }

  options.onProgress?.({
    stage: 'planning_concepts',
    message: 'Identifying core concepts...',
    progressPercent: 35,
  });

  const chunkResults = await mapWithConcurrency(chunks, CHUNK_CONCURRENCY, async (chunk, index) =>
    generateChunkFlashcards(chunk, options.teacherNotes, index + 1, chunks.length),
  );

  options.onProgress?.({
    stage: 'crafting_cards',
    message: 'Crafting edge-case scenarios...',
    progressPercent: 72,
  });

  const results = chunkResults.flat();

  const uniqueResults = dedupeFlashcards(results);
  return uniqueResults.length > 0 ? uniqueResults : generateFallbackFlashcards(chunks);
}

async function generateChunkFlashcards(
  chunk: ChunkPayload,
  teacherNotes: TeacherNotes | undefined,
  chunkNumber: number,
  totalChunks: number,
) {
  try {
    const plan = await buildChunkTeachingPlan(chunk, chunkNumber, totalChunks);
    const response = await gemini!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildFlashcardPrompt(chunk, teacherNotes, plan, chunkNumber, totalChunks),
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: flashcardJsonSchema,
      },
    });

    const raw = response.text ?? '[]';
    const generatedCards = generatedFlashcardDeckSchema.parse(JSON.parse(raw));
    return finalizeChunkFlashcards(chunk, plan, generatedCards, teacherNotes);
  } catch (error) {
    logger.warn({ error, chunkId: chunk.id, heading: chunk.heading }, 'Gemini flashcard generation failed for a chunk');
    return buildFallbackFlashcardsForChunk(chunk, teacherNotes);
  }
}

async function buildChunkTeachingPlan(
  chunk: ChunkPayload,
  chunkNumber: number,
  totalChunks: number,
) {
  try {
    const response = await gemini!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildPlanningPrompt(chunk, chunkNumber, totalChunks),
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: chunkTeachingPlanJsonSchema,
      },
    });

    return chunkTeachingPlanSchema.parse(JSON.parse(response.text ?? '{}'));
  } catch (error) {
    logger.warn({ error, chunkId: chunk.id, heading: chunk.heading }, 'Chunk teaching plan generation failed');
    return buildFallbackPlan(chunk);
  }
}

function buildPlanningPrompt(
  chunk: ChunkPayload,
  chunkNumber: number,
  totalChunks: number,
) {
  return [
    MASTER_TEACHER_SYSTEM_PROMPT,
    '',
    'Before writing cards, extract the teaching plan for this chunk.',
    'List the material that deserves coverage under concepts, definitions, relationships, edge cases, and worked examples.',
    'If a category is not truly supported by the source, return an empty array instead of inventing content.',
    '',
    `PDF chunk ${chunkNumber} of ${totalChunks}`,
    `Chunk ID: ${chunk.id}`,
    chunk.heading ? `Section heading: ${chunk.heading}` : 'Section heading: None',
    `Chunk word count: ${chunk.wordCount}`,
    '<source_text>',
    chunk.text,
    '</source_text>',
  ].join('\n');
}

function buildFlashcardPrompt(
  chunk: ChunkPayload,
  teacherNotes: TeacherNotes | undefined,
  plan: ChunkTeachingPlan,
  chunkNumber: number,
  totalChunks: number,
) {
  const coverageTargets = buildCoverageTargets(plan, chunk);

  return [
    MASTER_TEACHER_SYSTEM_PROMPT,
    '',
    `PDF chunk ${chunkNumber} of ${totalChunks}:`,
    `Chunk ID: ${chunk.id}`,
    chunk.heading ? `Section heading: ${chunk.heading}` : 'Section heading: None',
    `Chunk word count: ${chunk.wordCount}`,
    '',
    'Teaching plan for coverage:',
    `Core concepts: ${joinPlanItems(plan.concepts)}`,
    `Definitions: ${joinPlanItems(plan.definitions)}`,
    `Relationships: ${joinPlanItems(plan.relationships)}`,
    `Edge cases: ${joinPlanItems(plan.edgeCases)}`,
    `Worked examples: ${joinPlanItems(plan.workedExamples)}`,
    `Coverage notes: ${joinPlanItems(plan.coverageNotes)}`,
    teacherNotes
      ? `Teacher notes overview: ${teacherNotes.overview}`
      : 'Teacher notes overview: None',
    teacherNotes
      ? `Teacher key ideas: ${joinPlanItems(teacherNotes.keyIdeas)}`
      : 'Teacher key ideas: None',
    '<source_text>',
    chunk.text,
    '</source_text>',
    '',
    `Generate ${coverageTargets.totalCards} high-value flashcards for this chunk.`,
    'Use the teaching plan to balance coverage across the taxonomy instead of overproducing shallow definition cards.',
    'Only emit card types supported by the source, but include relationships, edge cases, and worked examples whenever the text justifies them.',
    'Coverage requirements:',
    `- Concepts: at least ${coverageTargets.Concept}`,
    `- Definitions: at least ${coverageTargets.Definition}`,
    `- Relationships: at least ${coverageTargets.Relationship}`,
    `- Edge cases: at least ${coverageTargets.Edge_Case}`,
    `- Worked examples: at least ${coverageTargets.Worked_Example}`,
    '- If a category target is zero, omit it unless the text clearly supports it.',
    '- Prefer one focused card per important idea over one broad survey card.',
  ].join('\n');
}

function dedupeFlashcards(cards: GeneratedFlashcard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.cardType}:${card.front}`.toLowerCase().replace(/\W+/g, ' ').trim();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function generateFallbackFlashcards(
  chunks: ReturnType<typeof chunkPdfTextForFlashcards>,
): GeneratedFlashcard[] {
  return chunks.flatMap((chunk) => buildFallbackFlashcardsForChunk(chunk, undefined)).slice(0, MAX_CHUNKS_PER_PDF * 6);
}

function buildFallbackPlan(chunk: ChunkPayload): ChunkTeachingPlan {
  const sentences = chunk.text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30);

  return {
    concepts: sentences.slice(0, 3),
    definitions: extractDefinitionCandidates(chunk),
    relationships: extractRelationshipCandidates(chunk, sentences),
    edgeCases: extractEdgeCaseCandidates(chunk, sentences),
    workedExamples: extractWorkedExampleCandidates(chunk, sentences),
    coverageNotes: [chunk.contextSnippet],
  };
}

function joinPlanItems(items: string[]) {
  return items.length > 0 ? items.join(' | ') : 'None';
}

function finalizeChunkFlashcards(
  chunk: ChunkPayload,
  plan: ChunkTeachingPlan,
  generatedCards: GeneratedFlashcard[],
  teacherNotes: TeacherNotes | undefined,
) {
  const normalized = dedupeFlashcards(generatedCards.map((card) => normalizeGeneratedCard(card, chunk)));
  const coverageTargets = buildCoverageTargets(plan, chunk);
  const supplemented = fillCoverageGaps(normalized, plan, chunk, teacherNotes, coverageTargets);
  return supplemented.slice(0, MAX_FLASHCARDS_PER_CHUNK);
}

function normalizeGeneratedCard(card: GeneratedFlashcard, chunk: ChunkPayload): GeneratedFlashcard {
  return {
    cardType: card.cardType,
    front: ensureSentence(card.front, 280),
    back: ensureSentence(card.back, 2_000),
    context: ensureSentence(card.context || chunk.contextSnippet, 500),
  };
}

function buildCoverageTargets(plan: ChunkTeachingPlan, chunk: ChunkPayload) {
  const targets: Record<FlashcardCardType, number> = {
    Concept: plan.concepts.length > 0 ? Math.min(3, Math.max(1, Math.ceil(plan.concepts.length / 2))) : 1,
    Definition: plan.definitions.length > 0 ? Math.min(2, plan.definitions.length) : 0,
    Relationship: plan.relationships.length > 0 ? Math.min(2, plan.relationships.length) : 0,
    Edge_Case: plan.edgeCases.length > 0 || hasEdgeCaseSignals(chunk.text) ? 1 : 0,
    Worked_Example: plan.workedExamples.length > 0 || hasWorkedExampleSignals(chunk.text) ? 1 : 0,
  };

  const totalCards = Math.min(
    MAX_FLASHCARDS_PER_CHUNK,
    Math.max(6, Object.values(targets).reduce((sum, value) => sum + value, 0) + 2),
  );

  return { ...targets, totalCards };
}

function fillCoverageGaps(
  cards: GeneratedFlashcard[],
  plan: ChunkTeachingPlan,
  chunk: ChunkPayload,
  teacherNotes: TeacherNotes | undefined,
  coverageTargets: ReturnType<typeof buildCoverageTargets>,
) {
  const supplemented = [...cards];

  for (const cardType of ['Concept', 'Definition', 'Relationship', 'Edge_Case', 'Worked_Example'] as const) {
    const needed = Math.max(
      0,
      coverageTargets[cardType] - supplemented.filter((card) => card.cardType === cardType).length,
    );

    if (needed <= 0) {
      continue;
    }

    const additions = buildCoverageCardsForType(cardType, plan, chunk, teacherNotes, needed);
    for (const addition of additions) {
      supplemented.push(addition);
      if (supplemented.length >= MAX_FLASHCARDS_PER_CHUNK) {
        return dedupeFlashcards(supplemented);
      }
    }
  }

  if (supplemented.length < Math.min(coverageTargets.totalCards, MAX_FLASHCARDS_PER_CHUNK)) {
    const breadthCards = buildBreadthCards(plan, chunk, teacherNotes);
    for (const card of breadthCards) {
      supplemented.push(card);
      if (supplemented.length >= Math.min(coverageTargets.totalCards, MAX_FLASHCARDS_PER_CHUNK)) {
        break;
      }
    }
  }

  return dedupeFlashcards(supplemented);
}

function buildCoverageCardsForType(
  cardType: FlashcardCardType,
  plan: ChunkTeachingPlan,
  chunk: ChunkPayload,
  teacherNotes: TeacherNotes | undefined,
  needed: number,
) {
  const ideas = getIdeasForCardType(cardType, plan, chunk);
  const additions: GeneratedFlashcard[] = [];

  for (const idea of ideas) {
    additions.push(buildDeterministicCard(cardType, idea, chunk, teacherNotes));
    if (additions.length >= needed) {
      break;
    }
  }

  return dedupeFlashcards(additions);
}

function getIdeasForCardType(cardType: FlashcardCardType, plan: ChunkTeachingPlan, chunk: ChunkPayload) {
  switch (cardType) {
    case 'Concept':
      return plan.concepts.length > 0 ? plan.concepts : firstSentences(chunk, 3);
    case 'Definition':
      return plan.definitions.length > 0 ? plan.definitions : extractDefinitionCandidates(chunk);
    case 'Relationship':
      return plan.relationships.length > 0 ? plan.relationships : extractRelationshipCandidates(chunk, firstSentences(chunk, 6));
    case 'Edge_Case':
      return plan.edgeCases.length > 0 ? plan.edgeCases : extractEdgeCaseCandidates(chunk, firstSentences(chunk, 8));
    case 'Worked_Example':
      return plan.workedExamples.length > 0 ? plan.workedExamples : extractWorkedExampleCandidates(chunk, firstSentences(chunk, 8));
    default:
      return [];
  }
}

function buildDeterministicCard(
  cardType: FlashcardCardType,
  idea: string,
  chunk: ChunkPayload,
  teacherNotes: TeacherNotes | undefined,
): GeneratedFlashcard {
  const topic = chunk.heading ?? 'this section';
  const explanation = summarizeChunkForAnswer(chunk.text);
  const teacherCue = teacherNotes?.keyIdeas.find((item) => includesNormalized(item, idea))
    ?? teacherNotes?.examCues.find((item) => includesNormalized(item, idea))
    ?? null;

  switch (cardType) {
    case 'Concept':
      return {
        cardType,
        front: ensureSentence(`Why does ${idea} matter in ${topic}, and how would you explain the core mechanism or logic behind it?`, 280),
        back: ensureSentence(
          `${idea} matters because ${explanation}${teacherCue ? ` Keep in mind: ${teacherCue}` : ''}`,
          2_000,
        ),
        context: buildContextFromIdea(chunk, idea),
      };
    case 'Definition':
      return {
        cardType,
        front: ensureSentence(`In ${topic}, what does "${idea}" mean, and what detail keeps the definition from becoming too shallow?`, 280),
        back: ensureSentence(
          `${idea} refers to ${explanation}${teacherCue ? ` A useful recall cue is: ${teacherCue}` : ''}`,
          2_000,
        ),
        context: buildContextFromIdea(chunk, idea),
      };
    case 'Relationship':
      return {
        cardType,
        front: ensureSentence(`What is the important relationship involving ${idea} in ${topic}, and why does that connection matter?`, 280),
        back: ensureSentence(
          `The important relationship is that ${explanation}${teacherCue ? ` Notice this connection: ${teacherCue}` : ''}`,
          2_000,
        ),
        context: buildContextFromIdea(chunk, idea),
      };
    case 'Edge_Case':
      return {
        cardType,
        front: ensureSentence(`What edge case, limitation, or failure mode involving ${idea} should a student remember from ${topic}?`, 280),
        back: ensureSentence(
          `A key edge case is that ${explanation}${teacherCue ? ` A common trap is: ${teacherCue}` : ''}`,
          2_000,
        ),
        context: buildContextFromIdea(chunk, idea),
      };
    case 'Worked_Example':
      return {
        cardType,
        front: ensureSentence(`How would you work through the example or procedure involving ${idea} in ${topic}, step by step?`, 280),
        back: ensureSentence(
          `A strong answer should walk through the process like this: ${explanation}${teacherCue ? ` Useful prompt: ${teacherCue}` : ''}`,
          2_000,
        ),
        context: buildContextFromIdea(chunk, idea),
      };
    default:
      return {
        cardType: 'Concept',
        front: ensureSentence(`What is the main idea in ${topic}?`, 280),
        back: ensureSentence(explanation, 2_000),
        context: chunk.contextSnippet,
      };
  }
}

function buildBreadthCards(plan: ChunkTeachingPlan, chunk: ChunkPayload, teacherNotes: TeacherNotes | undefined) {
  return [
    ...plan.coverageNotes.slice(0, 2).map((idea) => buildDeterministicCard('Concept', idea, chunk, teacherNotes)),
    ...plan.relationships.slice(0, 1).map((idea) => buildDeterministicCard('Relationship', idea, chunk, teacherNotes)),
  ];
}

function buildFallbackFlashcardsForChunk(chunk: ChunkPayload, teacherNotes: TeacherNotes | undefined) {
  const plan = buildFallbackPlan(chunk);
  const coverageTargets = buildCoverageTargets(plan, chunk);
  const cards: GeneratedFlashcard[] = [];

  for (const cardType of ['Concept', 'Definition', 'Relationship', 'Edge_Case', 'Worked_Example'] as const) {
    const count = coverageTargets[cardType];
    if (count <= 0) {
      continue;
    }

    cards.push(...buildCoverageCardsForType(cardType, plan, chunk, teacherNotes, count));
  }

  return dedupeFlashcards(cards).slice(0, Math.min(coverageTargets.totalCards, MAX_FLASHCARDS_PER_CHUNK));
}

function buildContextFromIdea(chunk: ChunkPayload, idea: string) {
  const sentences = firstSentences(chunk, 8);
  const matchingSentence = sentences.find((sentence) => includesNormalized(sentence, idea));
  return ensureSentence(matchingSentence ?? chunk.contextSnippet, 500);
}

function firstSentences(chunk: ChunkPayload, count: number) {
  return chunk.text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30)
    .slice(0, count);
}

function extractDefinitionCandidates(chunk: ChunkPayload) {
  const matches = chunk.text.match(/\b[A-Z][A-Za-z0-9-]{2,}(?:\s+[A-Z][A-Za-z0-9-]{2,}){0,2}\b/g) ?? [];
  const uniqueMatches = Array.from(new Set(matches.map((item) => item.trim())));
  if (chunk.heading) {
    uniqueMatches.unshift(chunk.heading);
  }
  return uniqueMatches.slice(0, 4);
}

function extractRelationshipCandidates(chunk: ChunkPayload, sentences: string[]) {
  return sentences
    .filter((sentence) => /\b(because|therefore|depends on|compared with|unlike|causes|leads to|results in|requires|associated with)\b/i.test(sentence))
    .slice(0, 3);
}

function extractEdgeCaseCandidates(chunk: ChunkPayload, sentences: string[]) {
  return sentences
    .filter((sentence) => /\b(except|unless|however|but|limitation|fails|failure|caveat|boundary|special case|edge case)\b/i.test(sentence))
    .slice(0, 3);
}

function extractWorkedExampleCandidates(chunk: ChunkPayload, sentences: string[]) {
  return sentences
    .filter((sentence) => /\b(example|for instance|consider|suppose|steps?|procedure|calculate|solve|case)\b/i.test(sentence))
    .slice(0, 3);
}

function hasEdgeCaseSignals(text: string) {
  return /\b(except|unless|however|limitation|fails|failure|caveat|boundary|special case|edge case)\b/i.test(text);
}

function hasWorkedExampleSignals(text: string) {
  return /\b(example|for instance|consider|suppose|steps?|procedure|calculate|solve|case)\b/i.test(text);
}

function summarizeChunkForAnswer(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 420) {
    return cleaned;
  }

  return `${cleaned.slice(0, 417).trimEnd()}...`;
}

function includesNormalized(source: string, target: string) {
  const normalizedSource = source.toLowerCase().replace(/\W+/g, ' ').trim();
  const normalizedTarget = target.toLowerCase().replace(/\W+/g, ' ').trim();
  return normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource);
}

function ensureSentence(value: string, maxLength: number) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 3).trimEnd()}...`;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        const item = items[index];
        if (item === undefined) {
          continue;
        }
        results[index] = await mapper(item, index);
      }
    }),
  );

  return results;
}
