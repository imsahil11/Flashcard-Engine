import { Router } from 'express';
import { z } from 'zod';
import { prisma, type Prisma } from '@flashcard/database';
import { FLASHCARD_CARD_TYPES, type DeckTaxonomySummary, type ReviewRating, type TeacherNotes } from '@flashcard/types';
import { calculateNextReview } from '@flashcard/utils';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { teacherNotesReadSchema, generateTeacherNotes } from '../services/teacher-notes.service.js';


const router = Router();

const createDeckSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

const reviewSchema = z.object({
  flashcardId: z.string().min(1),
  rating: z.number().int().min(0).max(5),
});

const queueQuerySchema = z.object({
  deckId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  newLimit: z.coerce.number().int().min(0).max(20).default(5),
});

type DeckWithCount = {
  id: string;
  title: string;
  description: string | null;
  teacherNotes: Prisma.JsonValue | null;
  userId: string;
  createdAt: Date;
  _count: { flashcards: number };
  flashcards: Array<{
    id: string;
    cardType: (typeof FLASHCARD_CARD_TYPES)[number];
    studyData: Array<{
      easeFactor: number;
      interval: number;
      nextReviewDate: Date;
      reviewCount: number;
    }>;
  }>;
};

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { user } = req as unknown as AuthenticatedRequest;
    const dueThrough = new Date();
    dueThrough.setHours(23, 59, 59, 999);
    const decks: DeckWithCount[] = await prisma.deck.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { flashcards: true } },
        flashcards: {
          select: {
            id: true,
            cardType: true,
            studyData: {
              where: { userId: user.id },
              select: {
                easeFactor: true,
                interval: true,
                nextReviewDate: true,
                reviewCount: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    res.json({
      data: decks.map((deck) => {
        const { _count, flashcards, ...deckData } = deck;
        return {
          ...deckData,
          teacherNotes: parseTeacherNotes(deckData.teacherNotes),
          flashcardCount: _count.flashcards,
          progress: getDeckProgress(flashcards, dueThrough),
          taxonomySummary: getDeckTaxonomySummary(flashcards),
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { user } = req as unknown as AuthenticatedRequest;
    const body = createDeckSchema.parse(req.body);
    const deck = await prisma.deck.create({
      data: { ...body, userId: user.id },
    });
    res.status(201).json({ data: deck });
  } catch (error) {
    next(error);
  }
});

router.get('/study-queue', async (req, res, next) => {
  try {
    const { user } = req as unknown as AuthenticatedRequest;
    const query = queueQuerySchema.parse(req.query);
    const dueThrough = new Date();
    dueThrough.setHours(23, 59, 59, 999);
    const dueLimit = Math.max(0, query.limit - query.newLimit);
    const deckFilter = query.deckId ? { deckId: query.deckId } : {};

    const dueCards = await prisma.studyData.findMany({
      where: {
        userId: user.id,
        nextReviewDate: { lte: dueThrough },
        flashcard: {
          deck: { userId: user.id },
          ...deckFilter,
        },
      },
      orderBy: [{ nextReviewDate: 'asc' }, { reviewCount: 'desc' }],
      take: dueLimit,
      include: {
        flashcard: {
          include: {
            deck: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    const dueFlashcardIds = dueCards.map((card) => card.flashcardId);
    const newCards = await prisma.flashcard.findMany({
      where: {
        deck: { userId: user.id },
        ...deckFilter,
        id: { notIn: dueFlashcardIds },
        studyData: {
          none: { userId: user.id },
        },
      },
      orderBy: { id: 'asc' },
      take: Math.min(query.newLimit, Math.max(0, query.limit - dueCards.length)),
      include: {
        deck: {
          select: { id: true, title: true },
        },
      },
    });

    res.json({
      data: [
        ...dueCards.map(({ flashcard, ...studyData }) => ({
          ...flashcard,
          studyData,
          queueType: 'due' as const,
        })),
        ...newCards.map((flashcard) => ({
          ...flashcard,
          studyData: null,
          queueType: 'new' as const,
        })),
      ],
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/flashcards', async (req, res, next) => {
  try {
    const { user } = req as unknown as AuthenticatedRequest;
    const deck = await prisma.deck.findFirst({
      where: { id: req.params.id, userId: user.id },
      include: { flashcards: { orderBy: { nextReview: 'asc' } } },
    });

    if (!deck) {
      throw new AppError('Deck not found', 404);
    }

    res.json({ data: deck.flashcards });
  } catch (error) {
    next(error);
  }
});

// Generate (or regenerate) teacher notes for an existing deck.
// Uses stored PDF source text if available; falls back to flashcard Q&A reconstruction for legacy decks.
router.post('/:id/teacher-notes', async (req, res, next) => {
  try {
    const { user } = req as unknown as AuthenticatedRequest;
    const deck = await prisma.deck.findFirst({
      where: { id: req.params.id, userId: user.id },
      include: {
        flashcards: {
          select: { question: true, answer: true, context: true, cardType: true },
          orderBy: { cardType: 'asc' },
        },
      },
    });

    if (!deck) {
      throw new AppError('Deck not found', 404);
    }

    // Prefer the real extracted PDF text stored at upload time.
    // Fall back to Q&A reconstruction only for decks created before source_text was persisted.
    const sourceText = deck.sourceText?.trim()
      ? deck.sourceText
      : [
          `Deck title: ${deck.title}`,
          deck.description ? `Description: ${deck.description}` : '',
          '',
          'Cards from this material:',
          '',
          ...deck.flashcards.map((card, i) =>
            [
              `Card ${i + 1} [${card.cardType}]`,
              `Q: ${card.question}`,
              `A: ${card.answer}`,
              card.context ? `Context: ${card.context}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          ),
        ]
          .filter(Boolean)
          .join('\n');

    const notes = await generateTeacherNotes(sourceText);

    const updated = await prisma.deck.update({
      where: { id: deck.id },
      data: { teacherNotes: notes },
    });

    res.json({ data: { ...updated, teacherNotes: notes } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { user } = req as unknown as AuthenticatedRequest;
    const dueThrough = new Date();
    dueThrough.setHours(23, 59, 59, 999);
    const deck = await prisma.deck.findFirst({
      where: { id: req.params.id, userId: user.id },
      include: {
        _count: { select: { flashcards: true } },
        flashcards: {
          select: {
            id: true,
            cardType: true,
            studyData: {
              where: { userId: user.id },
              select: {
                easeFactor: true,
                interval: true,
                nextReviewDate: true,
                reviewCount: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!deck) {
      throw new AppError('Deck not found', 404);
    }

    const { _count, flashcards, ...deckData } = deck;
    res.json({
      data: {
        ...deckData,
        teacherNotes: parseTeacherNotes(deckData.teacherNotes),
        flashcardCount: _count.flashcards,
        progress: getDeckProgress(flashcards, dueThrough),
        taxonomySummary: getDeckTaxonomySummary(flashcards),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/review', async (req, res, next) => {
  try {
    const { user } = req as unknown as AuthenticatedRequest;
    const body = reviewSchema.parse(req.body);
    const flashcard = await prisma.flashcard.findFirst({
      where: { id: body.flashcardId, deck: { userId: user.id } },
      include: {
        studyData: {
          where: { userId: user.id },
          take: 1,
        },
      },
    });

    if (!flashcard) {
      throw new AppError('Flashcard not found', 404);
    }

    const existingStudyData = flashcard.studyData[0];
    const reviewedAt = new Date();
    const next = calculateNextReview(
      body.rating as ReviewRating,
      existingStudyData?.reviewCount ?? 0,
      existingStudyData?.easeFactor ?? 2.5,
      existingStudyData?.interval ?? 0,
      reviewedAt,
    );

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.reviewHistory.create({
        data: {
          rating: body.rating,
          flashcardId: flashcard.id,
        },
      });

      const studyData = await tx.studyData.upsert({
        where: {
          userId_flashcardId: {
            userId: user.id,
            flashcardId: flashcard.id,
          },
        },
        create: {
          userId: user.id,
          flashcardId: flashcard.id,
          reviewCount: next.reviewCount,
          easeFactor: next.easeFactor,
          interval: next.interval,
          nextReviewDate: next.nextReviewDate,
          lastReviewedAt: reviewedAt,
        },
        update: {
          reviewCount: next.reviewCount,
          easeFactor: next.easeFactor,
          interval: next.interval,
          nextReviewDate: next.nextReviewDate,
          lastReviewedAt: reviewedAt,
        },
      });

      const updatedFlashcard = await tx.flashcard.update({
        where: { id: flashcard.id },
        data: {
          difficulty: 5 - next.quality,
          interval: next.interval,
          easeFactor: next.easeFactor,
          nextReview: next.nextReviewDate,
        },
      });

      return { flashcard: updatedFlashcard, studyData };
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

export { router as decksRouter };

function getDeckProgress(
  flashcards: DeckWithCount['flashcards'],
  dueThrough: Date,
) {
  return flashcards.reduce(
    (progress, flashcard) => {
      const studyData = flashcard.studyData[0];
      if (!studyData) {
        progress.new += 1;
        return progress;
      }

      const mastered = studyData.easeFactor >= 2.8 && studyData.interval >= 21;
      if (mastered) {
        progress.mastered += 1;
      } else {
        progress.learning += 1;
      }

      if (studyData.nextReviewDate <= dueThrough) {
        progress.reviewsNeeded += 1;
      }

      return progress;
    },
    {
      total: flashcards.length,
      mastered: 0,
      learning: 0,
      new: 0,
      reviewsNeeded: 0,
    },
  );
}

function getDeckTaxonomySummary(flashcards: DeckWithCount['flashcards']): DeckTaxonomySummary {
  return flashcards.reduce<DeckTaxonomySummary>(
    (summary, flashcard) => {
      summary[flashcard.cardType] += 1;
      return summary;
    },
    {
      Concept: 0,
      Definition: 0,
      Relationship: 0,
      Edge_Case: 0,
      Worked_Example: 0,
    },
  );
}

function parseTeacherNotes(value: Prisma.JsonValue | null): TeacherNotes | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  // Use the permissive read schema so notes with any content length are accepted.
  const parsed = teacherNotesReadSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
