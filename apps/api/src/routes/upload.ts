import { Router } from 'express';
import multer from 'multer';
import { prisma, Prisma } from '@flashcard/database';
import type { FlashcardCardType } from '@flashcard/types';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import { extractPdfText } from '../services/pdf.service.js';
import { generateFlashcards } from '../services/flashcard.service.js';
import { getPdfQueue } from '../jobs/queues.js';
import { generateTeacherNotes } from '../services/teacher-notes.service.js';
import { logger } from '../utils/logger.js';
import {
  getUploadProgress,
  initializeUploadProgress,
  updateUploadProgress,
} from '../services/upload-progress.service.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== 'application/pdf') {
      callback(new AppError('Only PDF uploads are supported', 400));
      return;
    }
    callback(null, true);
  },
});

router.get('/progress/:uploadId', requireAuth, (req, res) => {
  const { user } = req as AuthenticatedRequest;
  const uploadId = req.params.uploadId;
  if (!uploadId) {
    return res.status(400).json({ message: 'Upload progress id is required' });
  }

  const progress = getUploadProgress(user.id, uploadId);

  if (!progress) {
    return res.json({
      data: {
        uploadId,
        stage: 'queued',
        message: 'Waiting for upload to start...',
        progressPercent: 0,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  return res.json({ data: progress });
});

router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  const { user } = req as AuthenticatedRequest;
  const uploadId = typeof req.body.uploadId === 'string' && req.body.uploadId.trim()
    ? req.body.uploadId.trim()
    : crypto.randomUUID();

  initializeUploadProgress(user.id, uploadId);

  try {
    if (!req.file) {
      throw new AppError('PDF file is required', 400);
    }

    updateUploadProgress(user.id, uploadId, {
      stage: 'queued',
      message: 'Upload received. Preparing ingestion...',
      progressPercent: 10,
    });

    queueUploadJob({
      userId: user.id,
      filename: req.file.originalname,
      queuedAt: new Date().toISOString(),
    });

    updateUploadProgress(user.id, uploadId, {
      stage: 'parsing_pdf',
      message: 'Parsing PDF...',
      progressPercent: 22,
    });

    const text = await extractPdfText(req.file.buffer);
    if (!text) {
      throw new AppError('No readable text found in PDF', 400);
    }

    updateUploadProgress(user.id, uploadId, {
      stage: 'planning_concepts',
      message: 'Preparing teacher notes...',
      progressPercent: 30,
    });

    const teacherNotes = await generateTeacherNotes(text);

    const flashcards = await generateFlashcards(text, {
      teacherNotes,
      onProgress: (progress) =>
        updateUploadProgress(user.id, uploadId, progress),
    });
    if (flashcards.length === 0) {
      throw new AppError('AI generation service is temporarily unavailable. Please retry this upload shortly.', 503);
    }

    updateUploadProgress(user.id, uploadId, {
      stage: 'finalizing_deck',
      message: 'Finalizing deck...',
      progressPercent: 90,
    });

    const deckInput = {
      title: req.body.title || req.file.originalname.replace(/\.pdf$/i, ''),
      description: req.body.description || 'Generated from uploaded PDF',
      teacherNotes,
      sourceText: text,
      userId: user.id,
      flashcards: {
        create: flashcards.map((card) => ({
          question: card.front,
          answer: card.back,
          cardType: card.cardType,
          context: card.context,
          difficulty: difficultyFromCardType(card.cardType),
        })),
      },
    };

    const deck = await createDeckWithSourceFallback(deckInput);

    updateUploadProgress(user.id, uploadId, {
      stage: 'completed',
      message: 'Deck ready.',
      progressPercent: 100,
    });

    res.status(201).json({ data: deck });
  } catch (error) {
    updateUploadProgress(user.id, uploadId, {
      stage: 'failed',
      message: 'Upload failed.',
      progressPercent: 100,
      error: error instanceof Error ? error.message : 'Upload failed',
    });
    next(error);
  }
});

export { router as uploadRouter };

function queueUploadJob(payload: { userId: string; filename: string; queuedAt: string }) {
  const queue = getPdfQueue();
  if (!queue) {
    logger.info({ filename: payload.filename }, 'PDF queue unavailable; continuing without enqueue');
    return;
  }

  void Promise.race([
    queue.add('uploaded', payload),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PDF queue enqueue timed out')), 1_500);
    }),
  ]).catch((error) => {
    logger.warn({ error, filename: payload.filename }, 'Skipping PDF queue enqueue');
  });
}

function difficultyFromCardType(cardType: FlashcardCardType) {
  switch (cardType) {
    case 'Definition':
      return 1;
    case 'Concept':
      return 2;
    case 'Relationship':
      return 3;
    case 'Edge_Case':
      return 4;
    case 'Worked_Example':
      return 5;
    default:
      return 2;
  }
}

async function createDeckWithSourceFallback(
  data: {
    title: string;
    description: string;
    teacherNotes: Prisma.InputJsonValue;
    sourceText: string;
    userId: string;
    flashcards: {
      create: Array<{
        question: string;
        answer: string;
        cardType: FlashcardCardType;
        context: string;
        difficulty: number;
      }>;
    };
  },
) {
  try {
    return await prisma.deck.create({
      data,
      include: { flashcards: true },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientValidationError) || !error.message.includes('Unknown argument `sourceText`')) {
      throw error;
    }

    logger.warn('Retrying deck creation without sourceText because runtime Prisma client is stale');
    const { sourceText: _sourceText, ...fallbackData } = data;

    return prisma.deck.create({
      data: fallbackData,
      include: { flashcards: true },
    });
  }
}
