import pdf from 'pdf-parse';
import type { PdfSemanticChunk } from '@flashcard/types';

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parsed = await pdf(buffer);
  return parsed.text.trim();
}

type ChunkingOptions = {
  targetWordsPerChunk?: number;
  overlapWords?: number;
  minChunkWords?: number;
  maxSectionWords?: number;
};

const DEFAULT_TARGET_WORDS = 950;
const DEFAULT_OVERLAP_WORDS = 140;
const DEFAULT_MIN_CHUNK_WORDS = 180;
const DEFAULT_MAX_SECTION_WORDS = 1_800;

type SectionBlock = {
  heading: string | null;
  paragraphs: string[];
};

export function chunkPdfText(
  text: string,
  options: ChunkingOptions = {},
): PdfSemanticChunk[] {
  const targetWordsPerChunk = options.targetWordsPerChunk ?? DEFAULT_TARGET_WORDS;
  const overlapWords = options.overlapWords ?? DEFAULT_OVERLAP_WORDS;
  const minChunkWords = options.minChunkWords ?? DEFAULT_MIN_CHUNK_WORDS;
  const maxSectionWords = options.maxSectionWords ?? DEFAULT_MAX_SECTION_WORDS;

  const normalized = normalizePdfText(text);
  if (!normalized) {
    return [];
  }

  const sections = splitIntoSections(normalized);
  const chunks: PdfSemanticChunk[] = [];
  let globalWordCursor = 0;

  for (const section of sections) {
    const sectionText = section.paragraphs.join('\n\n').trim();
    if (!sectionText) {
      continue;
    }

    const windows = buildWordWindows(sectionText, {
      heading: section.heading,
      targetWordsPerChunk,
      overlapWords,
      minChunkWords,
      maxSectionWords,
    });

    for (const window of windows) {
      const startWord = globalWordCursor + window.startWord;
      const endWord = globalWordCursor + window.endWord;
      const sequence = chunks.length + 1;

      chunks.push({
        id: `chunk-${sequence}`,
        sequence,
        heading: section.heading,
        text: window.text,
        contextSnippet: buildContextSnippet(window.text),
        wordCount: window.wordCount,
        sourceStartWord: startWord,
        sourceEndWord: endWord,
      });
    }

    globalWordCursor += countWords(sectionText);
  }

  return chunks;
}

type BuiltWindow = {
  startWord: number;
  endWord: number;
  wordCount: number;
  text: string;
};

function normalizePdfText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitIntoSections(text: string): SectionBlock[] {
  const rawBlocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const sections: SectionBlock[] = [];
  let current: SectionBlock = { heading: null, paragraphs: [] };

  for (const block of rawBlocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      if (isLikelyHeading(line)) {
        if (current.heading || current.paragraphs.length > 0) {
          sections.push(current);
        }
        current = { heading: cleanupHeading(line), paragraphs: [] };
        continue;
      }

      current.paragraphs.push(line);
    }
  }

  if (current.heading || current.paragraphs.length > 0) {
    sections.push(current);
  }

  return sections;
}

function buildWordWindows(
  text: string,
  options: {
    heading: string | null;
    targetWordsPerChunk: number;
    overlapWords: number;
    minChunkWords: number;
    maxSectionWords: number;
  },
): BuiltWindow[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const windows: BuiltWindow[] = [];
  let activeParagraphs: string[] = [];
  let activeWordCount = 0;
  let currentStartWord = 0;
  let wordsConsumed = 0;

  for (const paragraph of paragraphs) {
    const paragraphWordCount = countWords(paragraph);
    if (paragraphWordCount === 0) {
      continue;
    }

    const exceedsTarget =
      activeParagraphs.length > 0 &&
      activeWordCount + paragraphWordCount > options.targetWordsPerChunk;
    const exceedsSectionCap = activeWordCount >= options.maxSectionWords;

    if (exceedsTarget || exceedsSectionCap) {
      pushWindow();
      const overlap = buildOverlapParagraphs(activeParagraphs, options.overlapWords);
      activeParagraphs = overlap.paragraphs;
      activeWordCount = overlap.wordCount;
      currentStartWord = Math.max(0, wordsConsumed - activeWordCount);
    }

    activeParagraphs.push(paragraph);
    activeWordCount += paragraphWordCount;
    wordsConsumed += paragraphWordCount;
  }

  pushWindow();

  return windows.length > 0
    ? windows
    : [
        {
          startWord: 0,
          endWord: countWords(text),
          wordCount: countWords(text),
          text: withHeading(options.heading, text),
        },
      ];

  function pushWindow() {
    if (activeParagraphs.length === 0) {
      return;
    }

    const merged = activeParagraphs.join('\n\n').trim();
    const windowWordCount = countWords(merged);
    if (windowWordCount === 0) {
      activeParagraphs = [];
      activeWordCount = 0;
      return;
    }

    const previous = windows[windows.length - 1];
    if (previous && windowWordCount < options.minChunkWords) {
      previous.text = `${previous.text}\n\n${merged}`.trim();
      previous.endWord += windowWordCount;
      previous.wordCount = countWords(previous.text);
    } else {
      windows.push({
        startWord: currentStartWord,
        endWord: currentStartWord + windowWordCount,
        wordCount: windowWordCount,
        text: withHeading(options.heading, merged),
      });
    }

    activeParagraphs = [];
    activeWordCount = 0;
  }
}

function buildOverlapParagraphs(paragraphs: string[], overlapWords: number) {
  if (overlapWords <= 0 || paragraphs.length === 0) {
    return { paragraphs: [] as string[], wordCount: 0 };
  }

  const selected: string[] = [];
  let wordCount = 0;

  for (let index = paragraphs.length - 1; index >= 0; index -= 1) {
    const paragraph = paragraphs[index];
    if (!paragraph) {
      continue;
    }
    selected.unshift(paragraph);
    wordCount += countWords(paragraph);
    if (wordCount >= overlapWords) {
      break;
    }
  }

  return { paragraphs: selected, wordCount };
}

function withHeading(heading: string | null, text: string) {
  return heading ? `${heading}\n${text}`.trim() : text.trim();
}

function buildContextSnippet(text: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length <= 240 ? cleaned : `${cleaned.slice(0, 237).trimEnd()}...`;
}

function cleanupHeading(line: string) {
  return line.replace(/^#{1,6}\s+/, '').trim();
}

function countWords(text: string) {
  const words = text.match(/\S+/g);
  return words ? words.length : 0;
}

function isLikelyHeading(line: string) {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 140 || /[.!?]$/.test(trimmed)) {
    return false;
  }

  return (
    /^(chapter|section|unit|module|part|lesson|topic|appendix)\b/i.test(trimmed) ||
    /^\d+(\.\d+)*\s+[\w(]/.test(trimmed) ||
    /^[A-Z][A-Z0-9\s:,&/-]{5,}$/.test(trimmed) ||
    /^#{1,6}\s+/.test(trimmed)
  );
}
