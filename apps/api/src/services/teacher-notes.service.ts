import { GoogleGenAI } from '@google/genai';
import type { TeacherNotes } from '@flashcard/types';
import { z } from 'zod';
import { env } from '../config.js';
import { logger } from '../utils/logger.js';
import { chunkPdfText } from './pdf.service.js';

const gemini = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

// Strict schema — used to validate Gemini output during generation.
export const teacherNotesSchema = z.object({
  overview: z.string().min(80).max(2400),
  keyIdeas: z.array(z.string().min(8).max(320)).min(3).max(10),
  detailedNotes: z.array(z.string().min(60).max(1200)).min(4).max(14),
  misconceptions: z.array(z.string().min(30).max(420)).max(8),
  workedExamples: z.array(z.string().min(40).max(600)).max(8),
  examCues: z.array(z.string().min(12).max(320)).max(10),
});

// Permissive schema — used only to parse notes back from the DB.
// No min/max lengths so notes saved by fallback or older prompts are never dropped.
export const teacherNotesReadSchema = z.object({
  overview: z.string(),
  keyIdeas: z.array(z.string()),
  detailedNotes: z.array(z.string()),
  misconceptions: z.array(z.string()),
  workedExamples: z.array(z.string()),
  examCues: z.array(z.string()),
});

const teacherNotesJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overview: { type: 'string' },
    keyIdeas: { type: 'array', minItems: 3, maxItems: 10, items: { type: 'string' } },
    detailedNotes: { type: 'array', minItems: 4, maxItems: 14, items: { type: 'string' } },
    misconceptions: { type: 'array', maxItems: 8, items: { type: 'string' } },
    workedExamples: { type: 'array', maxItems: 8, items: { type: 'string' } },
    examCues: { type: 'array', maxItems: 10, items: { type: 'string' } },
  },
  required: ['overview', 'keyIdeas', 'detailedNotes', 'misconceptions', 'workedExamples', 'examCues'],
} as const;

const MASTER_NOTES_PROMPT = [
  'You are a senior teacher who has just read a student\'s PDF and is now writing personal handwritten notes on it.',
  'Your job is to explain every important concept as if you were sitting with the student and teaching them face-to-face.',
  'Do NOT just summarise headings. Write like a brilliant, caring human tutor who wants the student to truly understand.',
  '',
  'For each section of the source, ask yourself:',
  '  • What is the core mechanism or principle here?',
  '  • Why does this matter — what problem does it solve?',
  '  • How does it connect to the other ideas in this material?',
  '  • Where do students typically get confused or make wrong assumptions?',
  '  • If there are numbers, formulas, or procedures — walk through them step by step.',
  '',
  'Writing style:',
  '  • Write each detailedNote as a full paragraph (3–6 sentences minimum), not a one-liner.',
  '  • Use natural teaching language: "Notice that...", "The key insight is...", "Think of it this way...", "Students often forget that..."',
  '  • Be specific — name the concepts, quote key terms from the text, give exact conditions.',
  '  • For misconceptions: explain WHY the wrong assumption looks reasonable, then correct it.',
  '  • For workedExamples: label each step clearly (Step 1, Step 2...) if it is a procedure.',
  '  • For examCues: phrase them as the kind of question an examiner actually asks, with a hint of what the ideal answer covers.',
  '',
  'Output strict JSON with these sections:',
  '- overview: 3–5 sentence paragraph explaining what this material is really about and why it matters',
  '- keyIdeas: the 5–10 essential concepts the student must be able to explain cold',
  '- detailedNotes: one rich explanatory paragraph per major concept (cover every important idea in the source)',
  '- misconceptions: traps, false intuitions, or common errors — explain each one fully',
  '- workedExamples: step-by-step walkthroughs of examples, scenarios, or procedures found in the source',
  '- examCues: specific recall prompts that a smart examiner would use, phrased naturally',
  '',
  'Rules:',
  '  • Ground every sentence in the provided source text — do not invent facts.',
  '  • If a section has no examples, return an empty workedExamples array rather than fabricating one.',
  '  • Prefer depth over breadth: one thorough note beats three shallow ones.',
  '  • Write in confident, first-person instructional voice as the teacher.',
].join('\n');

export async function generateTeacherNotes(text: string): Promise<TeacherNotes> {
  const chunks = chunkPdfText(text).slice(0, 10);
  const source = chunks.map((chunk, index) => {
    const heading = chunk.heading ? `Heading: ${chunk.heading}\n` : '';
    return `Chunk ${index + 1}\n${heading}${chunk.text}`;
  }).join('\n\n');

  if (!gemini) {
    return buildFallbackTeacherNotes(text);
  }

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        MASTER_NOTES_PROMPT,
        '',
        '<source_text>',
        source,
        '</source_text>',
      ].join('\n'),
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: teacherNotesJsonSchema,
      },
    });

    // Use the permissive readSchema so minor length misses in Gemini's output
    // don't silently trigger the fallback — we want the real AI content.
    const parsed = teacherNotesReadSchema.safeParse(JSON.parse(response.text ?? '{}'));
    if (parsed.success) {
      return parsed.data;
    }

    logger.warn({ issues: parsed.error.issues }, 'Teacher notes Zod parse failed — falling back');
    return buildFallbackTeacherNotes(text);
  } catch (error) {
    logger.warn({ error }, 'Teacher notes Gemini call failed — falling back');
    return buildFallbackTeacherNotes(text);
  }
}

function buildFallbackTeacherNotes(text: string): TeacherNotes {
  // Extract the deck title from the first line if present (format: "Deck title: ...")
  const titleMatch = text.match(/^Deck title:\s*(.+)/m);
  const title = titleMatch?.[1]?.trim() ?? 'this material';

  // Extract real content chunks from the text using the semantic chunker
  const chunks = chunkPdfText(text)
    .filter((chunk) => {
      // Filter out chunks that are just the source header we constructed
      const t = chunk.text.trim();
      return !t.startsWith('Deck title:') && !t.startsWith('The following flashcards') && t.length > 40;
    })
    .slice(0, 6);

  const detailedNotes = chunks.length > 0
    ? chunks.map((chunk) => {
        const heading = chunk.heading ? `${chunk.heading}: ` : '';
        return `${heading}${chunk.contextSnippet || chunk.text.slice(0, 300)}`;
      })
    : [
        `This deck covers the key ideas and concepts from ${title}.`,
        'Review each flashcard carefully and focus on understanding the reasoning behind each answer, not just memorising it.',
      ];

  return {
    overview: `These notes accompany the "${title}" deck. The material has been broken into targeted flashcards covering concepts, definitions, relationships, edge cases, and worked examples. Read through the cards once before your first review session to prime your memory before active recall begins.`,
    keyIdeas: chunks
      .map((chunk) => chunk.heading ?? '')
      .filter((h) => h.length > 3)
      .slice(0, 6)
      .concat(['Review all cards', 'Focus on edge cases'])
      .slice(0, 6),
    detailedNotes,
    misconceptions: [],
    workedExamples: [],
    examCues: [
      `What are the most important concepts from ${title}?`,
      'Explain the key relationships between the major ideas in this material.',
      'What edge cases or exceptions should you be aware of?',
    ],
  };
}
