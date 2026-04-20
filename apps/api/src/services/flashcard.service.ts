import { GoogleGenAI } from '@google/genai';
import type { FlashcardCardType, GeneratedFlashcard, TeacherNotes } from '@flashcard/types';
import { env } from '../config.js';
import { logger } from '../utils/logger.js';
import { chunkPdfText } from './pdf.service.js';
import { flashcardJsonSchema, generatedFlashcardDeckSchema } from './flashcard-schema.js';
import { z } from 'zod';

export const TEACHER_NOTES_PROMPT = [
  'You are a Master Educator writing comprehensive study notes for a student.',
  'Your job is to explain the material the way a great teacher would in class.',
  'Write in clear, flowing prose. Do not use bullet points or headers.',
  '',
  'STRUCTURE for every chunk:',
  '- overview: 2-3 sentence summary of what this section is about.',
  '- keyIdeas: array of 5-10 important ideas, each a full explanatory sentence.',
  '  Each idea must be self-contained and teach something - not just name a term.',
  '- watchOuts: array of 1-3 common misconceptions or tricky edge cases.',
  '  Each must explain WHY it trips students up.',
  '- examCues: array of 1-3 things likely to appear in exams from this section.',
  '',
  'HARD RULES:',
  '1. Every keyIdea must have a subject, a verb, and an explanation.',
  '2. Never copy headings or section titles as a keyIdea.',
  '3. Never write "this section covers" or any meta-reference.',
  '4. Return ONLY valid JSON. No markdown, no commentary.',
].join('\n');

export const FLASHCARD_PROMPT = [
  'You are writing spaced-repetition flashcards for active recall.',
  'Output must be short, crisp, and quiz-ready.',
  'Use flashcard-style questions only; no descriptive or paragraph-like stems.',
  '',
  'CARD TYPES:',
  '- Concept: "What mechanism causes X, and why does it matter?"',
  '- Definition: "What precisely distinguishes X from Y?"',
  '- Relationship: "How does A cause/limit/enable B?"',
  '- Edge_Case: "When does the standard rule for X break down?"',
  '- Worked_Example: "Walk through solving X step by step."',
  '',
  'FRONT rules:',
  '- One direct question, single sentence, ending with "?".',
  '- 6-18 words. Hard max 140 characters.',
  '- No long clauses, no section-title copies, no meta text.',
  '- Ask recall, definition, relationship, edge case, or step target directly.',
  '',
  'BACK rules:',
  '- Sentence 1 is the direct answer and MUST be 4-14 words.',
  '- Sentence 2 is one short why/how explanation (optional).',
  '- Sentence 3 is one short caveat or exam check (optional).',
  '- Hard max 55 words total. No bullets.',
  '',
  'HARD RULES:',
  '1. Never copy a heading, label, or paragraph opener as a front.',
  '2. Never start a back with "In this section" or "As mentioned".',
  '3. One focused idea per card. Split complex ideas into multiple cards.',
  '4. Return ONLY a JSON array. No markdown, no wrapper.',
].join('\n');

export const MCQ_PROMPT = [
  'You are writing short flashcard-style MCQs.',
  'Input items are flashcard questions and short canonical answers.',
  'Keep every output concise and quiz-ready.',
  '',
  'For each item output:',
  '- question: short flashcard-style stem that keeps the same intent as input (single sentence, <= 140 chars, ends with "?").',
  '- correctAnswer: concise option text (4-14 words, <= 100 chars).',
  '- distractors: exactly 3 concise wrong options (4-14 words each, <= 100 chars each).',
  '',
  'Distractor quality:',
  '- Plausible but clearly wrong for one reason.',
  '- Same topic and style as correct answer.',
  '- No vague fillers, no jokes, no "All/None of the above".',
  '',
  'HARD RULES:',
  '1. Do not write explanations in options.',
  '2. Keep all four options similar in length and grammar.',
  '3. Avoid commas and multi-clause sentences in options.',
  '4. Keep output order exactly the same as input order.',
  '5. Return ONLY a JSON array. No markdown, no commentary.',
].join('\n');

const MCQ_REPAIR_PROMPT = [
  'You repair weak MCQ options for flashcard questions.',
  'Input is JSON array items with question, correctAnswer, and current distractors.',
  'For EACH item, return exactly 3 high-quality distractors.',
  '',
  'RULES:',
  '1. Distractors must be concise (4-14 words, <= 100 chars).',
  '2. Distractors must be plausible but clearly incorrect.',
  '3. Do not repeat the correctAnswer, and do not repeat distractors.',
  '4. No ellipsis (...), no long explanations, no heading artifacts.',
  '5. Keep item order exactly the same as input order.',
  '6. Return ONLY a JSON array of objects with question, correctAnswer, distractors.',
].join('\n');

const CHUNK_PLANNING_PROMPT = [
  'You are an instructional designer building a chunk-level teaching coverage plan.',
  'Extract source-grounded concepts, definitions, relationships, edge cases, and worked examples.',
  'If the source does not support a category, return an empty array for that category.',
  'Return ONLY valid JSON matching the requested schema.',
].join('\n');

const chunkTeachingPlanSchema = z.object({
  concepts: z.array(z.string().min(1)).max(8),
  definitions: z.array(z.string().min(1)).max(8),
  relationships: z.array(z.string().min(1)).max(8),
  edgeCases: z.array(z.string().min(1)).max(6),
  workedExamples: z.array(z.string().min(1)).max(6),
  coverageNotes: z.array(z.string().min(1)).max(10),
});

const chunkTeacherNotesSchema = z.object({
  overview: z.string().min(1),
  keyIdeas: z.array(z.string().min(1)).max(10),
  watchOuts: z.array(z.string().min(1)).max(3),
  examCues: z.array(z.string().min(1)).max(3),
});

const generatedChunkMcqSchema = z.object({
  question: z.string().min(10).max(180),
  correctAnswer: z.string().min(4).max(110),
  distractors: z.array(z.string().min(4).max(110)).length(3),
});

const generatedChunkMcqDeckSchema = z.array(generatedChunkMcqSchema).min(1).max(12);

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

const chunkTeacherNotesJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overview: { type: 'string' },
    keyIdeas: { type: 'array', minItems: 5, maxItems: 10, items: { type: 'string' } },
    watchOuts: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
    examCues: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
  },
  required: ['overview', 'keyIdeas', 'watchOuts', 'examCues'],
} as const;

const generatedChunkMcqJsonSchema = {
  type: 'array',
  minItems: 1,
  maxItems: 12,
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      question: { type: 'string', maxLength: 180 },
      correctAnswer: { type: 'string', maxLength: 110 },
      distractors: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', maxLength: 110 } },
    },
    required: ['question', 'correctAnswer', 'distractors'],
  },
} as const;

type ChunkTeachingPlan = z.infer<typeof chunkTeachingPlanSchema>;
type ChunkTeacherNotes = z.infer<typeof chunkTeacherNotesSchema>;
type GeneratedChunkMcq = z.infer<typeof generatedChunkMcqSchema>;

type ChunkGeneratedContent = {
  notes: ChunkTeacherNotes;
  flashcards: GeneratedFlashcard[];
  mcqs: GeneratedChunkMcq[];
};

type ChunkPayload = ReturnType<typeof chunkPdfTextForFlashcards>[number];
type CoverageTargets = Record<FlashcardCardType, number> & { totalCards: number };

const MAX_CHUNKS_PER_PDF = 18;
const CHUNK_CONCURRENCY = 3;
const MAX_FLASHCARDS_PER_CHUNK = 12;
const FLASHCARD_GENERATION_MODEL = 'gemini-3-flash-preview';
const FLASHCARD_PLANNING_MODEL = 'gemini-3-flash-preview';
const MCQ_CONTEXT_TAG = '[MCQ_META:';
const GEMINI_RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_RETRY_BASE_MS = 400;

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
    logger.warn('Skipping flashcard generation because GEMINI_API_KEY is not configured');
    return [];
  }

  options.onProgress?.({
    stage: 'planning_concepts',
    message: 'Identifying core concepts...',
    progressPercent: 35,
  });

  const chunkResults = await mapWithConcurrency(chunks, CHUNK_CONCURRENCY, async (chunk, index) =>
    generateChunkContent(chunk, options.teacherNotes, index + 1, chunks.length),
  );

  options.onProgress?.({
    stage: 'crafting_cards',
    message: 'Crafting edge-case scenarios...',
    progressPercent: 72,
  });

  const results = chunkResults.flatMap((chunkResult) => chunkResult.flashcards);

  const uniqueResults = dedupeFlashcards(results);
  return uniqueResults;
}

async function generateChunkContent(
  chunk: ChunkPayload,
  teacherNotes: TeacherNotes | undefined,
  chunkNumber: number,
  totalChunks: number,
): Promise<ChunkGeneratedContent> {
  try {
    const plan = await buildChunkTeachingPlan(chunk, chunkNumber, totalChunks);
    const [notes, generatedCards] = await Promise.all([
      generateChunkTeacherNotes(chunk, plan, chunkNumber, totalChunks),
      generateFlashcardsForChunk(chunk, teacherNotes, plan, chunkNumber, totalChunks),
    ]);

    const finalizedCards = finalizeChunkFlashcards(chunk, plan, generatedCards, teacherNotes);
    const mcqs = await generateMCQs(finalizedCards, chunk, chunkNumber, totalChunks);

    return {
      notes,
      flashcards: attachMcqMetadata(finalizedCards, mcqs),
      mcqs,
    };
  } catch (error) {
    logger.warn({ error, chunkId: chunk.id, heading: chunk.heading }, 'Chunk content generation failed for a chunk');
    const fallbackPlan = buildFallbackPlan(chunk);
    const fallbackNotes = buildFallbackChunkTeacherNotes(chunk, fallbackPlan);

    return {
      notes: fallbackNotes,
      flashcards: [],
      mcqs: [],
    };
  }
}

async function generateChunkTeacherNotes(
  chunk: ChunkPayload,
  plan: ChunkTeachingPlan,
  chunkNumber: number,
  totalChunks: number,
) {
  try {
    const response = await generateContentWithRetry(
      'chunk teacher notes generation',
      {
        model: FLASHCARD_GENERATION_MODEL,
        contents: buildTeacherNotesPrompt(chunk, plan, chunkNumber, totalChunks),
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: chunkTeacherNotesJsonSchema,
        },
      },
      { chunkId: chunk.id, heading: chunk.heading },
    );

    const parsed = chunkTeacherNotesSchema.parse(JSON.parse(response.text ?? '{}'));
    return normalizeChunkTeacherNotes(parsed, chunk, plan);
  } catch (error) {
    logger.warn({ error, chunkId: chunk.id, heading: chunk.heading }, 'Chunk teacher notes generation failed');
    return buildFallbackChunkTeacherNotes(chunk, plan);
  }
}

async function generateFlashcardsForChunk(
  chunk: ChunkPayload,
  teacherNotes: TeacherNotes | undefined,
  plan: ChunkTeachingPlan,
  chunkNumber: number,
  totalChunks: number,
) {
  const response = await generateContentWithRetry(
    'chunk flashcard generation',
    {
      model: FLASHCARD_GENERATION_MODEL,
      contents: buildFlashcardPrompt(chunk, teacherNotes, plan, chunkNumber, totalChunks),
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: flashcardJsonSchema,
      },
    },
    { chunkId: chunk.id, heading: chunk.heading },
  );

  const raw = response.text ?? '[]';
  return generatedFlashcardDeckSchema.parse(JSON.parse(raw));
}

async function generateMCQs(
  flashcards: GeneratedFlashcard[],
  chunk: ChunkPayload,
  chunkNumber: number,
  totalChunks: number,
): Promise<GeneratedChunkMcq[]> {
  if (flashcards.length === 0) {
    return [];
  }

  try {
    const response = await generateContentWithRetry(
      'chunk MCQ generation',
      {
        model: FLASHCARD_GENERATION_MODEL,
        contents: buildMcqPrompt(flashcards, chunkNumber, totalChunks),
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: generatedChunkMcqJsonSchema,
        },
      },
      { chunkId: chunk.id, heading: chunk.heading },
    );

    const parsed = generatedChunkMcqDeckSchema.parse(JSON.parse(response.text ?? '[]'));
    const normalized = normalizeGeneratedMcqs(parsed, flashcards);
    return repairIncompleteMcqsWithAi(normalized, chunkNumber, totalChunks);
  } catch (error) {
    logger.warn({ error, chunkId: chunk.id, heading: chunk.heading }, 'Chunk MCQ generation failed');

    const seeded = flashcards.map((card) => ({
      question: card.front,
      correctAnswer: extractCorrectAnswerFromBack(card.back),
      distractors: [] as string[],
    }));

    return repairIncompleteMcqsWithAi(seeded, chunkNumber, totalChunks);
  }
}

async function repairIncompleteMcqsWithAi(
  mcqs: GeneratedChunkMcq[],
  chunkNumber: number,
  totalChunks: number,
): Promise<GeneratedChunkMcq[]> {
  const incomplete = mcqs
    .map((mcq, index) => ({ index, mcq }))
    .filter(({ mcq }) => mcq.distractors.length < 3);

  if (incomplete.length === 0) {
    return mcqs;
  }

  try {
    const response = await generateContentWithRetry(
      'chunk MCQ repair generation',
      {
        model: FLASHCARD_GENERATION_MODEL,
        contents: buildMcqRepairPrompt(
          incomplete.map(({ mcq }) => ({
            question: mcq.question,
            correctAnswer: mcq.correctAnswer,
            distractors: mcq.distractors,
          })),
          chunkNumber,
          totalChunks,
        ),
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: generatedChunkMcqJsonSchema,
        },
      },
    );

    const repairedRaw = generatedChunkMcqDeckSchema.parse(JSON.parse(response.text ?? '[]'));
    const repairedByQuestion = new Map(repairedRaw.map((item) => [normalizeComparable(item.question), item]));

    const merged = [...mcqs];
    for (let idx = 0; idx < incomplete.length; idx += 1) {
      const { index, mcq } = incomplete[idx] as { index: number; mcq: GeneratedChunkMcq };
      const repaired = repairedByQuestion.get(normalizeComparable(mcq.question)) ?? repairedRaw[idx];
      const distractors = normalizeDistractors(repaired?.distractors ?? [], mcq.question, mcq.correctAnswer);

      merged[index] = {
        question: mcq.question,
        correctAnswer: mcq.correctAnswer,
        distractors,
      };
    }

    return merged;
  } catch (error) {
    logger.warn({ error }, 'MCQ repair generation failed');
    return mcqs;
  }
}

async function buildChunkTeachingPlan(
  chunk: ChunkPayload,
  chunkNumber: number,
  totalChunks: number,
) {
  try {
    const response = await generateContentWithRetry(
      'chunk teaching plan generation',
      {
        model: FLASHCARD_PLANNING_MODEL,
        contents: buildPlanningPrompt(chunk, chunkNumber, totalChunks),
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: chunkTeachingPlanJsonSchema,
        },
      },
      { chunkId: chunk.id, heading: chunk.heading },
    );

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
    CHUNK_PLANNING_PROMPT,
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
    FLASHCARD_PROMPT,
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
      ? `Teacher misconceptions: ${joinPlanItems(teacherNotes.misconceptions)}`
      : 'Teacher misconceptions: None',
    teacherNotes
      ? `Teacher notes overview: ${teacherNotes.overview}`
      : 'Teacher notes overview: None',
    teacherNotes
      ? `Teacher key ideas: ${joinPlanItems(
        teacherNotes.keyIdeas
          .filter((idea) => idea.length > 8 && !hasAuthoringArtifacts(idea))
          .map((idea) => stripAuthoringArtifacts(idea).replace(/\s+/g, ' ').trim())
          .filter((idea) => idea.length > 8 && !hasAuthoringArtifacts(idea)),
      )}`
      : 'Teacher key ideas: None',
    '<source_text>',
    chunk.text,
    '</source_text>',
    '',
    `Generate ${coverageTargets.totalCards} high-value flashcards for this chunk.`,
    'Generate question flashcards only in this response (front is the question, back is the teacher answer).',
    'These flashcards feed an interactive MCQ UI, so each front must be a clean stem and each back must begin with an option-ready sentence.',
    'Make each back immediately gradable: first sentence should state the direct answer, then add concise reasoning.',
    'Do not output heading artifacts such as "Detailed Notes", "Long Paragraph", or chunk labels in fronts or backs.',
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

function buildTeacherNotesPrompt(
  chunk: ChunkPayload,
  plan: ChunkTeachingPlan,
  chunkNumber: number,
  totalChunks: number,
) {
  return [
    TEACHER_NOTES_PROMPT,
    '',
    `PDF chunk ${chunkNumber} of ${totalChunks}:`,
    `Chunk ID: ${chunk.id}`,
    chunk.heading ? `Section heading: ${chunk.heading}` : 'Section heading: None',
    `Chunk word count: ${chunk.wordCount}`,
    '',
    'Teaching plan for grounding:',
    `Core concepts: ${joinPlanItems(plan.concepts)}`,
    `Definitions: ${joinPlanItems(plan.definitions)}`,
    `Relationships: ${joinPlanItems(plan.relationships)}`,
    `Edge cases: ${joinPlanItems(plan.edgeCases)}`,
    `Worked examples: ${joinPlanItems(plan.workedExamples)}`,
    '<source_text>',
    chunk.text,
    '</source_text>',
  ].join('\n');
}

function buildMcqPrompt(flashcards: GeneratedFlashcard[], chunkNumber: number, totalChunks: number) {
  const compactCards = flashcards.map((card) => ({
    question: card.front,
    correctAnswer: extractCorrectAnswerFromBack(card.back),
    cardType: card.cardType,
  }));

  return [
    MCQ_PROMPT,
    '',
    `PDF chunk ${chunkNumber} of ${totalChunks}.`,
    'Flashcard quiz targets JSON:',
    JSON.stringify(compactCards),
  ].join('\n');
}

function buildMcqRepairPrompt(
  items: Array<{ question: string; correctAnswer: string; distractors: string[] }>,
  chunkNumber: number,
  totalChunks: number,
) {
  return [
    MCQ_REPAIR_PROMPT,
    '',
    `PDF chunk ${chunkNumber} of ${totalChunks}.`,
    'Items JSON:',
    JSON.stringify(items),
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

function normalizeChunkTeacherNotes(
  notes: ChunkTeacherNotes,
  chunk: ChunkPayload,
  plan: ChunkTeachingPlan,
): ChunkTeacherNotes {
  const fallback = buildFallbackChunkTeacherNotes(chunk, plan);

  const keyIdeas = uniqueTeachingIdeas(
    notes.keyIdeas
      .map((idea) => sanitizeIdea(stripAuthoringArtifacts(idea), 170))
      .filter((idea) => idea.length >= 12 && !hasAuthoringArtifacts(idea)),
  ).slice(0, 10);

  const watchOuts = uniqueTeachingIdeas(
    notes.watchOuts
      .map((item) => sanitizeIdea(stripAuthoringArtifacts(item), 170))
      .filter((item) => item.length >= 12 && !hasAuthoringArtifacts(item)),
  ).slice(0, 3);

  const examCues = uniqueTeachingIdeas(
    notes.examCues
      .map((item) => sanitizeIdea(stripAuthoringArtifacts(item), 170))
      .filter((item) => item.length >= 12 && !hasAuthoringArtifacts(item)),
  ).slice(0, 3);

  const overviewSource = sanitizeIdea(stripAuthoringArtifacts(notes.overview), 280);
  const overview = overviewSource.length >= 32 ? overviewSource : fallback.overview;

  return {
    overview,
    keyIdeas: keyIdeas.length >= 3 ? keyIdeas : fallback.keyIdeas,
    watchOuts: watchOuts.length > 0 ? watchOuts : fallback.watchOuts,
    examCues: examCues.length > 0 ? examCues : fallback.examCues,
  };
}

function buildFallbackChunkTeacherNotes(chunk: ChunkPayload, plan: ChunkTeachingPlan): ChunkTeacherNotes {
  const sentences = splitSentences(chunk.text);
  const heading = sanitizeIdea(stripAuthoringArtifacts(chunk.heading ?? ''), 80);

  const keyIdeas = uniqueTeachingIdeas(
    [
      ...plan.concepts,
      ...plan.definitions,
      ...plan.relationships,
      ...sentences.slice(0, 8).map((sentence) => extractFocusFromSentence(sentence)),
    ]
      .map((value) => sanitizeIdea(stripAuthoringArtifacts(value), 170))
      .filter((value) => value.length >= 12 && !hasAuthoringArtifacts(value)),
  ).slice(0, 10);

  const watchOuts = uniqueTeachingIdeas(
    [
      ...plan.edgeCases,
      ...sentences
        .filter((sentence) => /\b(except|unless|however|but|limitation|fails|failure|caveat|boundary|special case|edge case)\b/i.test(sentence))
        .slice(0, 3),
    ]
      .map((value) => sanitizeIdea(stripAuthoringArtifacts(value), 170))
      .filter((value) => value.length >= 12 && !hasAuthoringArtifacts(value)),
  ).slice(0, 3);

  const examCues = keyIdeas
    .slice(0, 3)
    .map((idea) => `Explain ${idea}, then give one distinction or limitation.`);

  const overviewSeed = [
    heading ? `This section explains ${heading} in practical, exam-relevant terms.` : '',
    ...sentences.slice(0, 2),
  ]
    .filter(Boolean)
    .join(' ');

  return {
    overview: ensureSentence(
      overviewSeed || 'This section explains the key mechanism, practical use, and common pitfalls.',
      280,
    ),
    keyIdeas: keyIdeas.length > 0
      ? keyIdeas
      : ['Define the core mechanism, explain why it matters, and add one practical implication.'],
    watchOuts: watchOuts.length > 0
      ? watchOuts
      : ['Students often memorize labels without explaining the mechanism that makes the idea true.'],
    examCues: examCues.length > 0
      ? examCues
      : ['Explain the core concept, then state one limitation or boundary condition.'],
  };
}

function normalizeGeneratedMcqs(
  mcqs: GeneratedChunkMcq[],
  flashcards: GeneratedFlashcard[],
): GeneratedChunkMcq[] {
  const byQuestion = new Map(mcqs.map((mcq) => [normalizeComparable(mcq.question), mcq]));

  return flashcards.map((card, index) => {
    const correctAnswer = extractCorrectAnswerFromBack(card.back);
    const matched = byQuestion.get(normalizeComparable(card.front)) ?? mcqs[index];
    const distractors = normalizeDistractors(matched?.distractors ?? [], card.front, correctAnswer);

    return {
      question: card.front,
      correctAnswer,
      distractors,
    };
  });
}

function attachMcqMetadata(cards: GeneratedFlashcard[], mcqs: GeneratedChunkMcq[]) {
  if (cards.length === 0) {
    return cards;
  }

  const normalizedMcqs = normalizeGeneratedMcqs(mcqs, cards);

  return cards.map((card, index) => {
    const current = normalizedMcqs[index];
    if (!current || current.distractors.length < 3) {
      return card;
    }

    const correct = current.correctAnswer;
    const distractors = current.distractors;
    const optionPool = uniqueOptionStrings([correct, ...distractors]).slice(0, 4);

    if (optionPool.length < 4) {
      return card;
    }

    const options = deterministicShuffle(optionPool.slice(0, 4), `${card.front}:${index}`);
    const correctIndex = options.findIndex((option) => normalizeComparable(option) === normalizeComparable(correct));

    const context = embedMcqMetadataInContext(card.context, {
      options,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
    });

    return {
      ...card,
      context,
    };
  });
}

function normalizeDistractors(distractors: string[], question: string, correctAnswer: string) {
  return uniqueOptionStrings(
    distractors
      .map((value) => normalizeMcqOption(value))
      .filter((value) => value.length >= 3)
      .filter((value) => !/[.]{3,}|…/.test(value))
      .filter((value) => normalizeComparable(value) !== normalizeComparable(correctAnswer)),
  )
    .filter((value) => normalizeComparable(value) !== normalizeComparable(question))
    .slice(0, 3);
}

function normalizeMcqOption(value: string) {
  const cleaned = value
    .replace(/\s+/g, ' ')
    .replace(/[.]{3,}|…/g, ' ')
    .replace(/[.!?]+$/g, '')
    .trim();

  return clampText(limitWords(cleaned, 14, false), 100).replace(/[.!?]+$/g, '');
}

function extractCorrectAnswerFromBack(answer: string) {
  const cleaned = answer.replace(/\s+/g, ' ').trim();
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  const stripped = firstSentence
    .replace(/^(answer|key insight|in short|therefore|thus)\s*[:,-]?\s*/i, '')
    .replace(/[.!?]+$/g, '')
    .trim();

  return normalizeMcqOption(stripped || cleaned);
}

function uniqueOptionStrings(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const normalized = normalizeComparable(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(value.trim());
  }

  return unique;
}

function embedMcqMetadataInContext(
  context: string,
  payload: { options: string[]; correctIndex: number },
) {
  const visibleContext = stripEmbeddedMcqMetadata(context || '');
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${visibleContext} ${MCQ_CONTEXT_TAG}${encoded}]`.trim();
}

function stripEmbeddedMcqMetadata(value: string) {
  return value.replace(/\s*\[MCQ_META:[A-Za-z0-9_-]+\]$/g, '').trim();
}

function deterministicShuffle<T>(items: T[], seed: string) {
  const result = [...items];
  let hash = hashSeed(seed);

  for (let index = result.length - 1; index > 0; index -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const nextIndex = hash % (index + 1);
    [result[index], result[nextIndex]] = [result[nextIndex] as T, result[index] as T];
  }

  return result;
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function normalizeComparable(value: string) {
  return value.toLowerCase().replace(/\W+/g, ' ').trim();
}

function buildFallbackPlan(chunk: ChunkPayload): ChunkTeachingPlan {
  const sentences = splitSentences(chunk.text);

  return {
    concepts: extractConceptCandidates(chunk, sentences),
    definitions: extractDefinitionCandidates(chunk),
    relationships: extractRelationshipCandidates(chunk, sentences),
    edgeCases: extractEdgeCaseCandidates(chunk, sentences),
    workedExamples: extractWorkedExampleCandidates(chunk, sentences),
    coverageNotes: [sanitizeIdea(chunk.contextSnippet, 120)],
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
    front: normalizeQuestionFront(card.front, chunk),
    back: normalizeAnswerText(card.back),
    context: ensureSentence(card.context || chunk.contextSnippet, 260),
  };
}

function buildCoverageTargets(plan: ChunkTeachingPlan, chunk: ChunkPayload): CoverageTargets {
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
  coverageTargets: CoverageTargets,
) {
  const supplemented = [...cards];

  for (const cardType of ['Concept', 'Definition', 'Relationship', 'Edge_Case', 'Worked_Example'] as const) {
    const targetCount = coverageTargets[cardType] ?? 0;
    const needed = Math.max(
      0,
      targetCount - supplemented.filter((card) => card.cardType === cardType).length,
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
  const topic = extractPrimaryTopic(chunk);
  const focusIdea = stripTopicPrefixFromIdea(sanitizeIdea(idea, 90) || topic, topic);
  const support = findSupportingSentences(chunk, focusIdea, 2);
  const teacherCue = teacherNotes?.keyIdeas.find((item: string) => includesNormalized(item, focusIdea))
    ?? teacherNotes?.examCues.find((item: string) => includesNormalized(item, focusIdea))
    ?? null;

  const answer = renderTeacherExplanation(cardType, focusIdea, topic, support, teacherCue);
  const context = buildContextFromIdea(chunk, focusIdea);

  const createCard = (type: FlashcardCardType, front: string): GeneratedFlashcard => ({
    cardType: type,
    front: normalizeQuestionFront(front, chunk),
    back: normalizeAnswerText(answer),
    context,
  });

  switch (cardType) {
    case 'Concept':
      return createCard(cardType, `In ${topic}, what mechanism drives ${focusIdea}?`);
    case 'Definition':
      return createCard(cardType, `In ${topic}, how is ${focusIdea} defined precisely?`);
    case 'Relationship':
      return createCard(cardType, `In ${topic}, how does ${focusIdea} affect related concepts?`);
    case 'Edge_Case':
      return createCard(cardType, `In ${topic}, when does ${focusIdea} break down?`);
    case 'Worked_Example':
      return createCard(cardType, `In ${topic}, how do you solve ${focusIdea} step by step?`);
    default:
      return createCard('Concept', `What is the main idea in ${topic}?`);
  }
}

function buildBreadthCards(plan: ChunkTeachingPlan, chunk: ChunkPayload, teacherNotes: TeacherNotes | undefined) {
  return [
    ...plan.coverageNotes.slice(0, 2).map((idea) => buildDeterministicCard('Concept', idea, chunk, teacherNotes)),
    ...plan.relationships.slice(0, 1).map((idea) => buildDeterministicCard('Relationship', idea, chunk, teacherNotes)),
  ];
}

function buildContextFromIdea(chunk: ChunkPayload, idea: string) {
  const [matchingSentence] = findSupportingSentences(chunk, idea, 1);
  return ensureSentence(matchingSentence ?? chunk.contextSnippet, 260);
}

function firstSentences(chunk: ChunkPayload, count: number) {
  return splitSentences(chunk.text).slice(0, count);
}

function extractDefinitionCandidates(chunk: ChunkPayload) {
  const sentences = splitSentences(chunk.text);
  const candidates: string[] = [];

  for (const sentence of sentences) {
    const matchedDefinition = sentence.match(/\b(?:an?|the)\s+([A-Za-z][A-Za-z0-9()/-]{2,80}(?:\s+[A-Za-z][A-Za-z0-9()/-]{1,40}){0,4})\s+is\b/i)?.[1];
    if (matchedDefinition) {
      candidates.push(matchedDefinition);
    }

    const headingStyle = sentence.match(/^([A-Za-z][A-Za-z0-9()/-]{2,80}(?:\s+[A-Za-z][A-Za-z0-9()/-]{1,40}){0,4})\s*[:-]/)?.[1];
    if (headingStyle) {
      candidates.push(headingStyle);
    }
  }

  if (chunk.heading) {
    const headingTopic = getHeadingTopicCandidate(chunk.heading, 72);
    if (headingTopic) {
      candidates.unshift(headingTopic);
    }
  }

  return uniqueTeachingIdeas(candidates.map((value) => sanitizeIdea(value, 72))).slice(0, 4);
}

function extractRelationshipCandidates(chunk: ChunkPayload, sentences: string[]) {
  return sentences
    .filter((sentence) => /\b(because|therefore|depends on|compared with|unlike|causes|leads to|results in|requires|associated with)\b/i.test(sentence))
    .map((sentence) => extractFocusFromSentence(sentence))
    .map((sentence) => sanitizeIdea(sentence, 92))
    .filter((sentence) => sentence.length > 8)
    .slice(0, 3);
}

function extractEdgeCaseCandidates(chunk: ChunkPayload, sentences: string[]) {
  return sentences
    .filter((sentence) => /\b(except|unless|however|but|limitation|fails|failure|caveat|boundary|special case|edge case)\b/i.test(sentence))
    .map((sentence) => extractFocusFromSentence(sentence))
    .map((sentence) => sanitizeIdea(sentence, 92))
    .filter((sentence) => sentence.length > 8)
    .slice(0, 3);
}

function extractWorkedExampleCandidates(chunk: ChunkPayload, sentences: string[]) {
  return sentences
    .filter((sentence) => /\b(example|for instance|consider|suppose|steps?|procedure|calculate|solve|case)\b/i.test(sentence))
    .map((sentence) => extractFocusFromSentence(sentence))
    .map((sentence) => sanitizeIdea(sentence, 92))
    .filter((sentence) => sentence.length > 8)
    .slice(0, 3);
}

function extractConceptCandidates(chunk: ChunkPayload, sentences: string[]) {
  const headingTopic = chunk.heading ? getHeadingTopicCandidate(chunk.heading, 84) : '';
  const candidates = [
    headingTopic,
    ...sentences.slice(0, 4).map((sentence) => extractFocusFromSentence(sentence)),
  ].filter((value): value is string => Boolean(value && value.trim()));

  return uniqueTeachingIdeas(candidates.map((value) => sanitizeIdea(value, 84))).slice(0, 4);
}

function extractPrimaryTopic(chunk: ChunkPayload) {
  const headingTopic = chunk.heading ? getHeadingTopicCandidate(chunk.heading, 72) : '';
  if (headingTopic) {
    return headingTopic;
  }

  const sentences = splitSentences(chunk.text);
  for (const sentence of sentences.slice(0, 3)) {
    const fromFocus = getHeadingTopicCandidate(extractFocusFromSentence(sentence), 72);
    if (fromFocus) {
      return fromFocus;
    }

    const fromSentence = getHeadingTopicCandidate(sentence, 72);
    if (fromSentence) {
      return fromSentence;
    }
  }

  return 'this topic';
}

function findSupportingSentences(chunk: ChunkPayload, idea: string, count: number) {
  const normalizedIdea = sanitizeIdea(idea, 120);
  const allSentences = splitSentences(chunk.text);
  const matching = allSentences.filter((sentence) => includesNormalized(sentence, normalizedIdea));

  if (matching.length >= count) {
    return matching.slice(0, count).map((sentence) => ensureSentence(sentence, 220));
  }

  return allSentences.slice(0, count).map((sentence) => ensureSentence(sentence, 220));
}

function renderTeacherExplanation(
  cardType: FlashcardCardType,
  idea: string,
  topic: string,
  support: string[],
  teacherCue: string | null,
) {
  const introByType: Record<FlashcardCardType, string> = {
    Concept: `${idea} is important in ${topic} because it explains how the system works.`,
    Definition: `${idea} should be defined precisely in ${topic} so it is not confused with nearby terms.`,
    Relationship: `The key relationship around ${idea} in ${topic} is what links cause, effect, and design choices.`,
    Edge_Case: `The main edge case around ${idea} in ${topic} appears when standard assumptions stop holding.`,
    Worked_Example: `A strong worked example for ${idea} in ${topic} should proceed in clear, checkable steps.`,
  };

  const evidence = support.length > 0
    ? support.slice(0, 1).join(' ')
    : `The source section emphasizes this idea as a core part of ${topic}.`;
  const cue = teacherCue
    ? `Exam cue: ${sanitizeIdea(teacherCue, 120)}.`
    : 'State the idea, justify it, and include one practical check.';

  return normalizeAnswerText(`${introByType[cardType]} ${evidence} ${cue}`);
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);
}

function extractFocusFromSentence(sentence: string) {
  const headClause = sentence
    .split(/(?:;|,|\bbecause\b|\btherefore\b|\bhowever\b|\bwhile\b|\bwhich\b)/i)[0]
    ?.trim();

  return sanitizeIdea(headClause || sentence, 110);
}

function sanitizeIdea(value: string, maxLength: number) {
  const cleaned = value
    .replace(/\s+/g, ' ')
    .replace(/^[-*•]+\s*/, '')
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/^(an?|the)\s+/i, '')
    .replace(/[\s:;,.!?-]+$/g, '')
    .trim();

  const deheaded = cleaned.replace(/^[^.!?]{3,90}\s[–—-]\s(?=(?:an?|the)\s)/i, '');
  const normalized = deheaded.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function stripTopicPrefixFromIdea(value: string, topic: string) {
  const cleaned = stripAuthoringArtifacts(value).replace(/\s+/g, ' ').trim();
  if (!cleaned || !topic || topic === 'this topic') {
    return sanitizeIdea(cleaned || value, 90);
  }

  const topicPattern = escapeRegExp(topic);
  const stripped = cleaned
    .replace(new RegExp(`^${topicPattern}\\s*[–—-:]\\s*`, 'i'), '')
    .replace(new RegExp(`^${topicPattern}\\s+(?=(?:an?|the)\\s)`, 'i'), '')
    .trim();

  return sanitizeIdea(stripped || cleaned, 90);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getHeadingTopicCandidate(value: string, maxLength: number) {
  const cleanedHeading = stripAuthoringArtifacts(value)
    .split(/\s[-–—]\s/)[0]
    ?.replace(/\s+/g, ' ')
    .trim() ?? '';

  if (!cleanedHeading) {
    return '';
  }

  const candidate = sanitizeIdea(cleanedHeading, maxLength);
  const words = candidate.split(/\s+/).filter(Boolean);

  if (words.length === 0 || words.length > 10) {
    return '';
  }

  if (words.length === 1 && candidate.length < 6) {
    return '';
  }

  if (/[,:;.!?]/.test(candidate)) {
    return '';
  }

  if (/(?:^|\s)(is|are|was|were|has|have|can|could|should|would|will|may|might)(?:\s|$)/i.test(candidate) && words.length > 5) {
    return '';
  }

  if (hasAuthoringArtifacts(candidate)) {
    return '';
  }

  return candidate;
}

function uniqueTeachingIdeas(items: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const item of items) {
    if (!item || item.length < 4) {
      continue;
    }

    const normalized = item.toLowerCase().replace(/\W+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(item);
  }

  return unique;
}

function hasEdgeCaseSignals(text: string) {
  return /\b(except|unless|however|limitation|fails|failure|caveat|boundary|special case|edge case)\b/i.test(text);
}

function hasWorkedExampleSignals(text: string) {
  return /\b(example|for instance|consider|suppose|steps?|procedure|calculate|solve|case)\b/i.test(text);
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

function limitWords(value: string, maxWords: number, appendEllipsis = true) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return value.trim();
  }

  const trimmed = words.slice(0, maxWords).join(' ').trimEnd();
  return appendEllipsis ? `${trimmed}...` : trimmed;
}

function clampText(value: string, maxLength: number) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return cleaned.slice(0, maxLength).trimEnd();
}

function normalizeQuestionFront(value: string, chunk: ChunkPayload) {
  const extractedTopic = extractPrimaryTopic(chunk);
  const topic = extractedTopic === 'this topic'
    ? 'this topic'
    : (getHeadingTopicCandidate(extractedTopic, 72) || 'this topic');
  const fallback = topic === 'this topic'
    ? 'What is the main idea here?'
    : `In ${topic}, what concept should you recall?`;

  const cleaned = stripAuthoringArtifacts(value)
    .replace(/\s+/g, ' ')
    .replace(/^[-*•]+\s*/, '')
    .replace(/\bthis section\b/gi, topic)
    .trim();

  const dePrefixed = stripTopicPrefixFromIdea(cleaned, topic);
  let normalized = dePrefixed.length >= 12 ? dePrefixed : fallback;
  normalized = clampText(limitWords(normalized, 20, false), 170).replace(/[.!]+$/, '');

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const hasQuestionSignal = /\b(what|why|how|when|where|which|who|explain|describe|compare|contrast|solve|calculate|identify)\b/i.test(normalized);

  if (wordCount <= 4 && !hasQuestionSignal) {
    normalized = `In ${topic}, what is ${normalized}?`;
  }

  if (hasAuthoringArtifacts(normalized) || hasNoisyHeadingLeak(normalized) || hasRepeatedQuestionFragment(normalized)) {
    normalized = fallback;
  }

  if (/^(operating systems?|introduction|overview|summary|basics?)$/i.test(normalized)) {
    normalized = fallback;
  }

  if (!normalized.endsWith('?')) {
    normalized = `${normalized}?`;
  }

  return clampText(limitWords(normalized, 20, false), 170);
}

function normalizeAnswerText(value: string) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return 'Review the source idea, define it precisely, and explain one practical implication.';
  }

  const extractedSentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  const concise = (extractedSentences.length > 0 ? extractedSentences : [cleaned])
    .slice(0, 3)
    .map((sentence) => sentence.replace(/[.!?]+$/g, '').trim())
    .filter((sentence) => sentence.length > 10)
    .map((sentence) => ensureSentence(limitWords(sentence, 18), 120))
    .join('. ')
    .trim();

  const normalized = concise || ensureSentence(limitWords(cleaned, 35), 220);
  const sentence = /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  return ensureSentence(limitWords(sentence, 55), 260);
}

function stripAuthoringArtifacts(value: string) {
  return value
    .replace(/\b(?:detailed notes?|long paragraph|teacher notes?|exam cues?|key ideas?|section heading)\b/gi, ' ')
    .replace(/\(\s*(?:detailed notes?|long paragraph)\s*\)/gi, ' ')
    .replace(/[–-]\s*(?:detailed notes?|long paragraph)\b/gi, ' ')
    .replace(/\bchunk\s*\d+\b/gi, ' ')
    .replace(/\(\s*[^)]{0,4}\s*\)/g, ' ')
    .replace(/\.{3,}$/, '')
    .replace(/^[\s–—\-:]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function hasAuthoringArtifacts(value: string) {
  if (/\b(detailed notes?|long paragraph|teacher notes?|exam cues?|key ideas?|chunk\s*\d+|section heading)\b/i.test(value)) {
    return true;
  }

  if (/\.{3,}/.test(value)) {
    return true;
  }

  if (/\(\s*[^)]{0,4}\s*\)/.test(value)) {
    return true;
  }

  return false;
}

function hasNoisyHeadingLeak(value: string) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return false;
  }

  if (/\s[-–—]\s[^?]*\b(is|are|was|were|has|have|can|could|should|would|will|may|might)\b/i.test(cleaned)) {
    return true;
  }

  if (/^[A-Z][A-Za-z0-9\s]{4,90}\s[–—-]\s(?:an?|the)\s[A-Za-z]/.test(cleaned)) {
    return true;
  }

  if (/\b(?:an?|the)\s+[A-Za-z][A-Za-z0-9()/-]{2,40}\s+is\s+[A-Za-z]/i.test(cleaned) && cleaned.split(/\s+/).length > 18) {
    return true;
  }

  if (/system software th\b/i.test(cleaned)) {
    return true;
  }

  return false;
}

function hasRepeatedQuestionFragment(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 10) {
    return false;
  }

  const seen = new Set<string>();
  for (let index = 0; index <= words.length - 5; index += 1) {
    const phrase = words.slice(index, index + 5).join(' ');
    if (seen.has(phrase)) {
      return true;
    }
    seen.add(phrase);
  }

  return false;
}

async function generateContentWithRetry(
  operation: string,
  request: {
    model: string;
    contents: string;
    config: {
      responseMimeType: 'application/json';
      responseJsonSchema: object;
    };
  },
  metadata: Record<string, unknown> = {},
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await gemini!.models.generateContent(request);
    } catch (error) {
      lastError = error;
      const status = getGeminiStatusCode(error);

      if (!isRetryableGeminiStatus(status) || attempt >= GEMINI_MAX_ATTEMPTS) {
        throw error;
      }

      const delayMs = GEMINI_RETRY_BASE_MS * (2 ** (attempt - 1));
      logger.warn(
        {
          ...metadata,
          status,
          attempt,
          maxAttempts: GEMINI_MAX_ATTEMPTS,
          delayMs,
        },
        `${operation} failed; retrying`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function getGeminiStatusCode(error: unknown) {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

function isRetryableGeminiStatus(status: number | undefined) {
  return typeof status === 'number' && GEMINI_RETRYABLE_STATUS_CODES.has(status);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
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
