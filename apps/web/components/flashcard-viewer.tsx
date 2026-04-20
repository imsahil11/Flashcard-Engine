'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@flashcard/ui';
import type { Flashcard, ReviewRating } from '@flashcard/types';
import { useReview } from '../hooks/use-api';

export function FlashcardViewer({ flashcards }: { flashcards: Flashcard[] }) {
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const review = useReview();
  const card = flashcards[index];

  if (!card) {
    return <p className="text-sm text-zinc-600">No flashcards in this deck yet.</p>;
  }

  async function rate(rating: ReviewRating) {
    const currentCard = card;
    if (!currentCard) {
      return;
    }

    try {
      await review.mutateAsync({ flashcardId: currentCard.id, rating });
      setShowAnswer(false);
      setIndex((current) => Math.min(current + 1, flashcards.length - 1));
    } catch {
      // Error state is managed by React Query; keep current card visible.
    }
  }

  return (
    <Card className="overflow-hidden border-zinc-200 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <CardHeader className="gap-3 border-b border-zinc-200/80 bg-gradient-to-r from-white via-teal-50/40 to-amber-50/50">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-1">
            <span className="teacher-hand text-sm text-teal-700">Study card walkthrough</span>
            <CardTitle>
              Card {index + 1} of {flashcards.length}
            </CardTitle>
          </div>
          <div className="teacher-sticky rounded-2xl px-4 py-2.5 text-sm text-amber-900">
            <p className="teacher-hand text-base">Review flow</p>
            <p className="mt-1 text-xs leading-5">
              Think first, reveal second, then rate recall honestly from 1 to 5.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="teacher-paper lesson-fade-in min-h-44 rounded-[28px] p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {card.cardType.replace('_', ' ')}
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-zinc-500">
              Difficulty {card.difficulty}
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            <p className="teacher-hand text-sm text-zinc-500">Question prompt</p>
            <p className="pr-2 text-xl font-medium leading-9 text-zinc-900">{card.question}</p>
          </div>
          {showAnswer ? (
            <div className="lesson-reveal mt-6 grid gap-4">
              <div className="rounded-[24px] border border-teal-100 bg-white/90 px-5 py-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="teacher-hand text-base text-teal-700">Teacher answer</p>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-teal-700">
                    Show your reasoning
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">{card.answer}</p>
              </div>
              <div className="rounded-[24px] border border-amber-100 bg-amber-50/70 px-4 py-4">
                <p className="teacher-hand text-sm text-amber-800">Margin note</p>
                <p className="mt-2 text-sm leading-7 text-amber-950/85">{card.context}</p>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowAnswer((value) => !value)}>
            {showAnswer ? 'Hide answer' : 'Show answer'}
          </Button>
          {[1, 2, 3, 4, 5].map((rating) => (
            <Button
              key={rating}
              variant={rating < 3 ? 'outline' : 'default'}
              onClick={() => rate(rating as ReviewRating)}
              disabled={!showAnswer || review.isPending}
            >
              {rating}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
