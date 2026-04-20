import type { ReviewRating } from '@flashcard/types';

export type ReviewInput = {
  rating: ReviewRating;
  previousInterval: number;
  previousEaseFactor?: number;
  reviewedAt?: Date;
};

export type ReviewResult = {
  difficulty: number;
  interval: number;
  easeFactor: number;
  nextReview: Date;
};

export type Sm2ReviewResult = {
  quality: ReviewRating;
  reviewCount: number;
  easeFactor: number;
  interval: number;
  nextReviewDate: Date;
};

export type ChunkTextOptions = {
  maxChunkLength?: number;
  overlapParagraphs?: number;
};

const DEFAULT_CHUNK_LENGTH = 10_000;

export function chunkText(text: string, options: ChunkTextOptions | number = {}): string[] {
  const maxChunkLength =
    typeof options === 'number' ? options : options.maxChunkLength ?? DEFAULT_CHUNK_LENGTH;
  const overlapParagraphs = typeof options === 'number' ? 1 : options.overlapParagraphs ?? 1;

  const normalized = normalizePdfText(text);
  if (!normalized) {
    return [];
  }

  const blocks = splitIntoSemanticBlocks(normalized);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLength = 0;
  let activeHeading = '';

  for (const block of blocks) {
    const preparedBlock = isLikelyHeading(block)
      ? block
      : activeHeading && !block.startsWith(activeHeading)
        ? `${activeHeading}\n${block}`
        : block;

    if (isLikelyHeading(block)) {
      activeHeading = block;
    }

    if (preparedBlock.length > maxChunkLength) {
      flushCurrentChunk();
      chunks.push(...splitLongBlock(preparedBlock, maxChunkLength));
      continue;
    }

    const nextLength = currentLength + preparedBlock.length + 2;
    if (current.length > 0 && nextLength > maxChunkLength) {
      flushCurrentChunk();
      current = chunks.length > 0 ? getOverlapBlocks(blocks, block, overlapParagraphs) : [];
      currentLength = current.join('\n\n').length;
    }

    current.push(preparedBlock);
    currentLength += preparedBlock.length + 2;
  }

  flushCurrentChunk();

  return chunks.filter(Boolean);

  function flushCurrentChunk() {
    const chunk = current.join('\n\n').trim();
    if (chunk) {
      chunks.push(chunk);
    }
    current = [];
    currentLength = 0;
  }
}

function normalizePdfText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitIntoSemanticBlocks(text: string) {
  const rawBlocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return rawBlocks.flatMap((block) => {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      return [block];
    }

    const blocks: string[] = [];
    let paragraph: string[] = [];

    for (const line of lines) {
      if (isLikelyHeading(line)) {
        if (paragraph.length > 0) {
          blocks.push(paragraph.join(' '));
          paragraph = [];
        }
        blocks.push(line);
      } else {
        paragraph.push(line);
      }
    }

    if (paragraph.length > 0) {
      blocks.push(paragraph.join(' '));
    }

    return blocks;
  });
}

function isLikelyHeading(block: string) {
  const trimmed = block.trim();
  if (trimmed.length < 3 || trimmed.length > 120 || /[.!?]$/.test(trimmed)) {
    return false;
  }

  return (
    /^(chapter|section|unit|module|part|lesson|topic|appendix)\b/i.test(trimmed) ||
    /^\d+(\.\d+)*\s+[\w(]/.test(trimmed) ||
    /^[A-Z][A-Z0-9\s:,-]{5,}$/.test(trimmed) ||
    /^#{1,6}\s+/.test(trimmed)
  );
}

function splitLongBlock(block: string, maxChunkLength: number) {
  const sentences = block.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (sentence.length > maxChunkLength) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      for (let cursor = 0; cursor < sentence.length; cursor += maxChunkLength) {
        chunks.push(sentence.slice(cursor, cursor + maxChunkLength).trim());
      }
      continue;
    }

    if (current.length + sentence.length + 1 > maxChunkLength) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = `${current} ${sentence}`.trim();
    }
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
}

function getOverlapBlocks(blocks: string[], nextBlock: string, overlapParagraphs: number) {
  if (overlapParagraphs <= 0) {
    return [];
  }

  const nextIndex = blocks.indexOf(nextBlock);
  if (nextIndex <= 0) {
    return [];
  }

  return blocks.slice(Math.max(0, nextIndex - overlapParagraphs), nextIndex);
}

export function calculateNextReview(
  quality: ReviewRating,
  reviewCount: number,
  easeFactor: number,
  interval: number,
  reviewedAt = new Date(),
): Sm2ReviewResult {
  const boundedQuality = Math.max(0, Math.min(5, quality)) as ReviewRating;
  const currentEaseFactor = Math.max(1.3, easeFactor || 2.5);
  const easeDelta = 0.1 - (5 - boundedQuality) * (0.08 + (5 - boundedQuality) * 0.02);
  const nextEaseFactor = Math.max(1.3, Number((currentEaseFactor + easeDelta).toFixed(2)));

  let nextReviewCount: number;
  let nextInterval: number;

  if (boundedQuality < 3) {
    nextReviewCount = 0;
    nextInterval = 1;
  } else {
    nextReviewCount = reviewCount + 1;

    if (nextReviewCount === 1) {
      nextInterval = 1;
    } else if (nextReviewCount === 2) {
      nextInterval = 6;
    } else {
      nextInterval = Math.max(1, Math.round(interval * nextEaseFactor));
    }
  }

  const nextReviewDate = new Date(reviewedAt);
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

  return {
    quality: boundedQuality,
    reviewCount: nextReviewCount,
    easeFactor: nextEaseFactor,
    interval: nextInterval,
    nextReviewDate,
  };
}

export function calculateLegacyNextReview({
  rating,
  previousInterval,
  previousEaseFactor = 2.5,
  reviewedAt = new Date(),
}: ReviewInput): ReviewResult {
  const next = calculateNextReview(rating, previousInterval > 0 ? 1 : 0, previousEaseFactor, previousInterval, reviewedAt);
  const boundedRating = next.quality;

  return {
    difficulty: 5 - boundedRating,
    interval: next.interval,
    easeFactor: next.easeFactor,
    nextReview: next.nextReviewDate,
  };
}
