import { z } from 'zod';
import { FLASHCARD_CARD_TYPES } from '@flashcard/types';

export const flashcardCardTypeSchema = z.enum(FLASHCARD_CARD_TYPES);

export const generatedFlashcardSchema = z.object({
  cardType: flashcardCardTypeSchema,
  front: z
    .string()
    .min(12)
    .max(180),
  back: z
    .string()
    .min(20)
    .max(420),
  context: z
    .string()
    .min(20)
    .max(260),
});

export const generatedFlashcardDeckSchema = z
  .array(generatedFlashcardSchema)
  .min(1)
  .max(18);

export const flashcardJsonSchema = {
  type: 'array',
  minItems: 1,
  maxItems: 18,
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      cardType: {
        type: 'string',
        enum: [...FLASHCARD_CARD_TYPES],
        description:
          'Flashcard taxonomy. Must be one of Concept, Definition, Relationship, Edge_Case, or Worked_Example.',
      },
      front: {
        type: 'string',
        maxLength: 180,
        description: 'An active-recall question or prompt that can stand alone without the PDF.',
      },
      back: {
        type: 'string',
        maxLength: 420,
        description: 'A concise teacher answer: direct answer first, then short explanation and distinction/check.',
      },
      context: {
        type: 'string',
        maxLength: 260,
        description: 'A short grounding snippet copied or paraphrased from the source chunk (one concise sentence).',
      },
    },
    required: ['cardType', 'front', 'back', 'context'],
  },
} as const;
