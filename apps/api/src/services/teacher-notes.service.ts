import { GoogleGenAI } from '@google/genai';
import type { TeacherNotes } from '@flashcard/types';
import { z } from 'zod';
import { env } from '../config.js';
import { logger } from '../utils/logger.js';
import { chunkPdfText } from './pdf.service.js';

const gemini = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;
const TEACHER_NOTES_MODEL = resolveFreeGeminiModel(
  process.env.GEMINI_NOTES_MODEL,
  'gemini-2.5-flash',
);
const GEMINI_RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_RETRY_BASE_MS = 400;

// Strict schema — used to validate Gemini output during generation.
export const teacherNotesSchema = z.object({
  overview: z.string().min(60).max(700),
  keyIdeas: z.array(z.string().min(8).max(160)).min(3).max(10),
  detailedNotes: z.array(z.string().min(40).max(420)).min(4).max(14),
  misconceptions: z.array(z.string().min(24).max(300)).max(8),
  workedExamples: z.array(z.string().min(28).max(380)).max(8),
  examCues: z.array(z.string().min(12).max(180)).max(10),
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
  'You are a senior teacher creating high-quality flashcard notes from a student PDF.',
  'Write like a brilliant human tutor: clear, concrete, exam-focused, and practical.',
  'Never mention prompts, chunks, generation, or model behavior.',
  '',
  'Coverage checklist:',
  '  • What is the core mechanism or principle?',
  '  • Why does this matter in practice or exams?',
  '  • How does it connect to other ideas in the material?',
  '  • Where do students typically get confused?',
  '  • If there is a procedure, show steps and checkpoints.',
  '',
  'Writing style:',
  '  • These notes are converted directly into flashcard notes and MCQ study prompts.',
  '  • Each detailedNote must be concise and flashcard-friendly: 2-3 sentences, one idea per note.',
  '  • Keep each note under roughly 320 characters and avoid long paragraphs.',
  '  • Never output heading-only notes like "Operating Systems" without a concrete explanation.',
  '  • Never output labels or metadata inside note text (for example: "Detailed Notes", "Long Paragraph", "Chunk 2").',
  '  • Use specific concepts and conditions from the source; no vague summaries.',
  '  • For misconceptions: state the trap, then the correction.',
  '  • For workedExamples: include clear steps (Step 1, Step 2...) when relevant.',
  '  • For examCues: phrase natural examiner-style prompts in one line.',
  '',
  'Output strict JSON with these sections:',
  '- overview: concise high-level explanation (2-4 sentences)',
  '- keyIdeas: the 5-10 essential concepts the student must explain fluently',
  '- detailedNotes: compact teaching notes, one focused idea per item',
  '- misconceptions: common traps and precise corrections',
  '- workedExamples: concise step-by-step walkthroughs when present in source',
  '- examCues: specific recall prompts that a smart examiner would use, phrased naturally',
  '',
  'Rules:',
  '  • Ground every sentence in the provided source text — do not invent facts.',
  '  • If a section has no examples, return an empty workedExamples array rather than fabricating one.',
  '  • Prefer crisp, teachable notes over long narrative blocks.',
  '  • Keep wording direct and classroom-ready.',
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
    const response = await generateContentWithRetry(
      {
        model: TEACHER_NOTES_MODEL,
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
      },
      { chunkCount: chunks.length },
    );

    // Use the permissive readSchema so minor length misses in Gemini's output
    // don't silently trigger the fallback — we want the real AI content.
    const parsed = teacherNotesReadSchema.safeParse(JSON.parse(response.text ?? '{}'));
    if (parsed.success) {
      return normalizeTeacherNotes(parsed.data);
    }

    logger.warn({ issues: parsed.error.issues }, 'Teacher notes Zod parse failed — falling back');
    return buildFallbackTeacherNotes(text);
  } catch (error) {
    logger.warn({ error }, 'Teacher notes Gemini call failed — falling back');
    return buildFallbackTeacherNotes(text);
  }
}

function buildFallbackTeacherNotes(text: string): TeacherNotes {
  const titleMatch = text.match(/^Deck title:\s*(.+)/m);
  const title = titleMatch?.[1]?.trim() ?? 'this material';

  const chunks = chunkPdfText(text)
    .filter((chunk) => {
      const t = chunk.text.trim();
      return !t.startsWith('Deck title:') && !t.startsWith('The following flashcards') && t.length > 40;
    })
    .slice(0, 6);

  const sentences = chunks.flatMap((chunk) => splitSentences(chunk.text));
  const keyIdeas = uniqueText(
    [
      ...chunks
        .map((chunk) => chunk.heading ?? '')
        .filter((heading) => heading.length > 0 && !isLowSignalTeachingText(heading)),
      ...sentences.slice(0, 8).map((sentence) => extractFocusFromSentence(sentence)),
    ]
      .filter((value) => !isLowSignalTeachingText(value))
      .map((value) => normalizeText(value, 96))
      .filter((value) => value.length > 8 && !isLowSignalTeachingText(value)),
  ).slice(0, 8);

  const detailedNotes = uniqueText(
    sentences
      .slice(0, 10)
      .map((sentence) => normalizeText(sentence, 380))
      .filter((sentence) => sentence.length > 40),
  ).slice(0, 10);

  const misconceptions = uniqueText(
    sentences
      .filter((sentence) => /\b(however|unless|except|limitation|fails|failure|caveat|boundary|special case|edge case)\b/i.test(sentence))
      .map((sentence) => normalizeText(sentence, 300))
      .filter((sentence) => sentence.length > 30),
  ).slice(0, 6);

  const workedExamples = uniqueText(
    sentences
      .filter((sentence) => /\b(example|for instance|consider|suppose|steps?|procedure|calculate|solve|case)\b/i.test(sentence))
      .map((sentence) => normalizeText(sentence, 340))
      .filter((sentence) => sentence.length > 35),
  ).slice(0, 6);

  const overviewSource = sentences.slice(0, 4).join(' ');
  const overview = normalizeText(
    overviewSource || `This deck explains the core concepts and exam-relevant distinctions in ${title}.`,
    420,
  );

  const examCues = (keyIdeas.length > 0 ? keyIdeas : ['the core ideas in this topic'])
    .slice(0, 8)
    .map((idea) => `Explain ${idea}, then give one distinction, limitation, or practical check.`);

  return normalizeTeacherNotes({
    overview,
    keyIdeas: keyIdeas.length > 0 ? keyIdeas : [`Core ideas in ${title}`, 'Main relationships', 'Common pitfalls'],
    detailedNotes: detailedNotes.length > 0
      ? detailedNotes
      : [`Start with the foundational concepts in ${title}, then connect them through cause-effect relationships and edge cases.`],
    misconceptions,
    workedExamples,
    examCues,
  });
}

function normalizeTeacherNotes(notes: TeacherNotes): TeacherNotes {
  const keyIdeas = uniqueText(
    notes.keyIdeas
      .map((idea: string) => idea.replace(/\s+/g, ' ').trim())
      .filter((idea: string) => idea.length > 8 && !isLowSignalTeachingText(idea))
      .map((idea: string) => normalizeText(idea, 120))
      .filter((idea: string) => idea.length > 8 && !isLowSignalTeachingText(idea)),
  ).slice(0, 10);

  const detailedSeed = notes.detailedNotes.length > 0
    ? notes.detailedNotes
    : keyIdeas.map((idea) => `${idea}: define it clearly, explain the mechanism, and give one practical implication.`);

  const detailedNotes = uniqueText(
    detailedSeed
      .flatMap((note: string) => splitIntoTeachingBites(note, 2, 320))
      .map((note: string) => normalizeParagraph(note, 320))
      .filter((note: string) => note.length > 32 && !isLowSignalTeachingText(note)),
  ).slice(0, 14);

  const misconceptions = uniqueText(
    notes.misconceptions
      .flatMap((note: string) => splitIntoTeachingBites(note, 2, 280))
      .map((note: string) => normalizeParagraph(note, 280))
      .filter((note: string) => note.length > 24 && !isLowSignalTeachingText(note)),
  ).slice(0, 8);

  const workedExamples = uniqueText(
    notes.workedExamples
      .flatMap((note: string) => splitIntoTeachingBites(note, 3, 340))
      .map((note: string) => normalizeParagraph(note, 340))
      .filter((note: string) => note.length > 28 && !isLowSignalTeachingText(note)),
  ).slice(0, 8);

  const examCues = uniqueText(
    notes.examCues
      .map((cue: string) => normalizeParagraph(cue, 170))
      .filter((cue: string) => cue.length > 12 && !isLowSignalTeachingText(cue)),
  ).slice(0, 10);

  let overview = normalizeParagraph(
    compressTeachingNote(notes.overview || keyIdeas.join('. '), 3, 420),
    420,
  );

  if (isLowSignalTeachingText(overview)) {
    overview = normalizeParagraph(
      detailedNotes[0] || 'This material focuses on core mechanisms, practical use, and common pitfalls.',
      420,
    );
  }

  return {
    overview: overview || 'This material focuses on the key mechanism, practical use, and common pitfalls.',
    keyIdeas: keyIdeas.length > 0 ? keyIdeas : ['Core mechanism', 'Main relationship', 'Common misconception'],
    detailedNotes: detailedNotes.length > 0
      ? detailedNotes
      : ['Define the core concept, explain how it works, and add one practical limitation or check.'],
    misconceptions,
    workedExamples,
    examCues,
  };
}

function compressTeachingNote(value: string, maxSentences: number, maxLength: number) {
  const sentences = splitSentences(value);
  const source = sentences.length > 0 ? sentences : [value.replace(/\s+/g, ' ').trim()];
  const joined = source.slice(0, maxSentences).join(' ');
  return normalizeParagraph(joined, maxLength);
}

function splitIntoTeachingBites(value: string, maxSentences: number, maxLength: number) {
  const sentences = splitSentences(value);
  if (sentences.length === 0) {
    return value.trim() ? [normalizeParagraph(value, maxLength)] : [];
  }

  const bites: string[] = [];
  let current: string[] = [];

  for (const sentence of sentences) {
    const candidate = [...current, sentence].join(' ');
    if (current.length >= maxSentences || candidate.length > maxLength) {
      if (current.length > 0) {
        bites.push(normalizeParagraph(current.join(' '), maxLength));
      }
      current = [sentence];
      continue;
    }

    current.push(sentence);
  }

  if (current.length > 0) {
    bites.push(normalizeParagraph(current.join(' '), maxLength));
  }

  return bites.filter((item) => item.length > 16);
}

function normalizeParagraph(value: string, maxLength: number) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return '';
  }

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 3).trimEnd()}...`;
}

function isLowSignalTeachingText(value: string) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return true;
  }

  // Evaluate full source text before any truncation-based normalization.
  if (/\b(detailed notes?|long paragraph|teacher notes?|chunk\s*\d+)\b/i.test(cleaned)) {
    return true;
  }

  // Catch truncated artifacts where word boundaries may be lost.
  if (/detailed notes|long paragraph|teacher notes?|exam cues?|key ideas?/i.test(cleaned)) {
    return true;
  }

  // Catch raw section-title artifacts like "Title - (Long Paragraph)".
  if (/^[A-Za-z\s()\-–]+[-–]\s*\(/i.test(cleaned)) {
    return true;
  }

  const words = cleaned.replace(/[.!?]+$/g, '').split(/\s+/).filter(Boolean);
  if (words.length <= 3) {
    return true;
  }

  return /^[A-Z0-9\s\-_/()]+$/.test(cleaned) && words.length <= 8;
}

function resolveFreeGeminiModel(modelName: string | undefined, fallback: string) {
  const candidate = (modelName ?? '').trim();
  if (!candidate) {
    return fallback;
  }

  if (/\bpro\b/i.test(candidate)) {
    return fallback;
  }

  return candidate;
}

async function generateContentWithRetry(
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
        'Teacher notes Gemini call failed; retrying',
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

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);
}

function extractFocusFromSentence(sentence: string) {
  const focus = sentence
    .split(/(?:;|,|\bbecause\b|\btherefore\b|\bhowever\b|\bwhile\b|\bwhich\b)/i)[0]
    ?.trim();

  return normalizeText(focus || sentence, 96);
}

function normalizeText(value: string, maxLength: number) {
  const cleaned = value
    .replace(/\s+/g, ' ')
    .replace(/^[-*•]+\s*/, '')
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/^(an?|the)\s+/i, '')
    .replace(/[\s:;,.!?-]+$/g, '')
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 3).trimEnd()}...`;
}

function uniqueText(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const normalized = value.toLowerCase().replace(/\W+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(value);
  }

  return unique;
}
