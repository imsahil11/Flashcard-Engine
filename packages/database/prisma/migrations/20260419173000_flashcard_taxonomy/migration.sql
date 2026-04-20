CREATE TYPE "FlashcardCardType" AS ENUM ('Concept', 'Definition', 'Relationship', 'Edge_Case', 'Worked_Example');

ALTER TABLE "flashcards"
ADD COLUMN "card_type" "FlashcardCardType" NOT NULL DEFAULT 'Concept',
ADD COLUMN "context" TEXT NOT NULL DEFAULT '';
