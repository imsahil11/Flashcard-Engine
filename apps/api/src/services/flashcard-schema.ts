import { z } from 'zod';
import { FLASHCARD_CARD_TYPES } from '@flashcard/types';

export const flashcardCardTypeSchema = z.enum(FLASHCARD_CARD_TYPES);

export const generatedFlashcardSchema = z.object({
  cardType: flashcardCardTypeSchema,
  front: z
    .string()
    .min(12)
    .max(280),
  back: z
    .string()
    .min(20)
    .max(2_000),
  context: z
    .string()
    .min(20)
    .max(500),
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
        description: 'An active-recall question or prompt that can stand alone without the PDF.',
      },
      back: {
        type: 'string',
        description: 'A detailed answer with the needed explanation, distinctions, and steps.',
      },
      context: {
        type: 'string',
        description: 'A short grounding snippet copied or paraphrased from the source chunk.',
      },
    },
    required: ['cardType', 'front', 'back', 'context'],
  },
} as const;
