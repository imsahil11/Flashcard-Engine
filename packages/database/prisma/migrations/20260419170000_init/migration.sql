-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 0,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "nextReview" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deckId" TEXT NOT NULL,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_data" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "flashcard_id" TEXT NOT NULL,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "next_review_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_history" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "flashcardId" TEXT NOT NULL,

    CONSTRAINT "review_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "decks_userId_idx" ON "decks"("userId");

-- CreateIndex
CREATE INDEX "flashcards_deckId_idx" ON "flashcards"("deckId");

-- CreateIndex
CREATE INDEX "flashcards_nextReview_idx" ON "flashcards"("nextReview");

-- CreateIndex
CREATE UNIQUE INDEX "study_data_user_id_flashcard_id_key" ON "study_data"("user_id", "flashcard_id");

-- CreateIndex
CREATE INDEX "study_data_user_id_next_review_date_idx" ON "study_data"("user_id", "next_review_date");

-- CreateIndex
CREATE INDEX "study_data_flashcard_id_idx" ON "study_data"("flashcard_id");

-- CreateIndex
CREATE INDEX "review_history_flashcardId_idx" ON "review_history"("flashcardId");

-- AddForeignKey
ALTER TABLE "decks" ADD CONSTRAINT "decks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_data" ADD CONSTRAINT "study_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_data" ADD CONSTRAINT "study_data_flashcard_id_fkey" FOREIGN KEY ("flashcard_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_history" ADD CONSTRAINT "review_history_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
