import { GoogleGenAI } from '@google/genai';
import type { TeacherNotes } from '@flashcard/types';
import { z } from 'zod';
import { env } from '../config.js';
import { chunkPdfText } from './pdf.service.js';

const gemini = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

export const teacherNotesSchema = z.object({
  overview: z.string().min(40).max(1800),
  keyIdeas: z.array(z.string().min(8).max(240)).min(3).max(8),
  detailedNotes: z.array(z.string().min(20).max(500)).min(3).max(10),
  misconceptions: z.array(z.string().min(12).max(280)).max(6),
  workedExamples: z.array(z.string().min(12).max(350)).max(6),
  examCues: z.array(z.string().min(8).max(220)).max(8),
});

const teacherNotesJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overview: { type: 'string' },
    keyIdeas: { type: 'array', minItems: 3, maxItems: 8, items: { type: 'string' } },
    detailedNotes: { type: 'array', minItems: 3, maxItems: 10, items: { type: 'string' } },
    misconceptions: { type: 'array', maxItems: 6, items: { type: 'string' } },
    workedExamples: { type: 'array', maxItems: 6, items: { type: 'string' } },
    examCues: { type: 'array', maxItems: 8, items: { type: 'string' } },
  },
  required: ['overview', 'keyIdeas', 'detailedNotes', 'misconceptions', 'workedExamples', 'examCues'],
} as const;

const MASTER_NOTES_PROMPT = [
  'You are a master teacher creating study notes from source material.',
  'Explain the PDF like a brilliant instructor preparing a student for deep understanding and recall.',
  'Write notes that teach, not just summarize.',
  '',
  'Output strict JSON with these sections:',
  '- overview: a clear explanation of what this material is really about',
  '- keyIdeas: the most important ideas the student must retain',
  '- detailedNotes: detailed explanatory notes in plain language',
  '- misconceptions: common traps, caveats, or misunderstandings',
  '- workedExamples: concrete examples, procedures, or scenarios when present',
  '- examCues: likely prompts, comparisons, or things worth active recall',
  '',
  'Rules:',
  '- Ground everything in the provided text only.',
  '- Prefer teaching language over bullet-point fragments.',
  '- Highlight why, how, tradeoffs, mechanisms, and edge cases when present.',
  '- If a category is thin in the source, return fewer items rather than inventing content.',
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

    return teacherNotesSchema.parse(JSON.parse(response.text ?? '{}'));
  } catch {
    return buildFallbackTeacherNotes(text);
  }
}

function buildFallbackTeacherNotes(text: string): TeacherNotes {
  const chunks = chunkPdfText(text).slice(0, 6);
  const overviewSource = chunks.map((chunk) => chunk.contextSnippet).join(' ');
  const overview =
    overviewSource.length > 500 ? `${overviewSource.slice(0, 497).trimEnd()}...` : overviewSource;
  const detailedNotes = chunks.slice(0, 5).map((chunk) => chunk.contextSnippet);

  return {
    overview: overview || 'This deck was generated from the uploaded PDF and highlights the major ideas in the material.',
    keyIdeas: chunks.slice(0, 5).map((chunk, index) => chunk.heading ?? `Key idea ${index + 1}`),
    detailedNotes,
    misconceptions: [],
    workedExamples: chunks
      .filter((chunk) => /\b(example|steps?|procedure|calculate|solve|case)\b/i.test(chunk.text))
      .slice(0, 3)
      .map((chunk) => chunk.contextSnippet),
    examCues: chunks.slice(0, 5).map((chunk, index) => `Explain the main takeaway from ${chunk.heading ?? `section ${index + 1}`}.`),
  };
}
