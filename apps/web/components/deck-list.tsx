'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Deck } from '@flashcard/types';
import { Clock3, Layers3, Sparkles } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@flashcard/ui';
import { useDecks } from '../hooks/use-api';
import { MasteryBar, MasteryLegend, MasteryRing } from './mastery-visual';
import { TaxonomySummary, emptyTaxonomySummary } from './taxonomy-summary';
import { TeacherNotesPreview } from './teacher-notes-preview';

type SortMode = 'recent' | 'reviews';

export function DeckList() {
  const { data: decks, isLoading, error } = useDecks();
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const filteredDecks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const visibleDecks = (decks ?? []).filter((deck) => {
      if (!normalizedSearch) {
        return true;
      }

      return [deck.title, deck.description ?? ''].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );
    });

    return visibleDecks.sort((a, b) => {
      if (sortMode === 'reviews') {
        return (b.progress?.reviewsNeeded ?? 0) - (a.progress?.reviewsNeeded ?? 0);
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [decks, search, sortMode]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="teacher-paper h-full border-0 bg-transparent">
            <CardHeader className="grid gap-3">
              <div className="h-6 w-40 animate-pulse rounded-md bg-zinc-200" />
              <div className="h-4 w-full animate-pulse rounded-md bg-zinc-100" />
              <div className="h-4 w-5/6 animate-pulse rounded-md bg-zinc-100" />
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="h-3 w-full animate-pulse rounded-md bg-zinc-100" />
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="h-16 animate-pulse rounded-md bg-zinc-100" />
                <div className="h-16 animate-pulse rounded-md bg-zinc-100" />
                <div className="h-16 animate-pulse rounded-md bg-zinc-100" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error.message}</p>;
  }

  if (!decks?.length) {
    return (
      <Card className="teacher-paper border-dashed border-zinc-300 bg-transparent">
        <CardContent className="py-8 text-sm text-zinc-600">
          Upload your first PDF to create a deck. Once cards exist, you&apos;ll see search, sorting, and mastery
          progress here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="teacher-paper flex flex-col gap-3 rounded-[28px] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <Input
            className="border-amber-100 bg-white/80 sm:max-w-sm"
            placeholder="Search decks by title or topic"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <p className="text-sm text-zinc-500">
            {filteredDecks.length} of {decks.length} deck{decks.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={sortMode === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortMode('recent')}
          >
            Recent
          </Button>
          <Button
            type="button"
            variant={sortMode === 'reviews' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortMode('reviews')}
          >
            Most reviews needed
          </Button>
        </div>
      </div>

      {filteredDecks.length === 0 ? (
        <p className="text-sm text-zinc-600">No decks match that search.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDecks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeckCard({ deck }: { deck: Deck }) {
  const progress = deck.progress ?? {
    total: deck.flashcardCount ?? 0,
    mastered: 0,
    learning: 0,
    new: deck.flashcardCount ?? 0,
    reviewsNeeded: 0,
  };
  const masteryRate = Math.round((progress.mastered / Math.max(progress.total, 1)) * 100);
  const createdAt = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(deck.createdAt));
  const taxonomySummary = deck.taxonomySummary ?? emptyTaxonomySummary();

  return (
    <Link href={`/deck/${deck.id}`}>
      <Card className="teacher-paper h-full border-0 bg-transparent transition hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(120,113,108,0.16)]">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="teacher-hand text-sm text-teal-700">Deck lesson</p>
              <CardTitle className="break-words">{deck.title}</CardTitle>
              <p className="mt-1 text-sm text-zinc-600">
                {deck.description ?? 'Focused review set ready for spaced repetition.'}
              </p>
            </div>
            <div className="teacher-sticky shrink-0 rounded-2xl px-3 py-2 text-right">
              <p className="text-lg font-semibold text-amber-700">{progress.reviewsNeeded}</p>
              <p className="text-xs text-amber-700/80">due today</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <DeckStat
                  icon={<Layers3 className="h-4 w-4 text-zinc-500" />}
                  label="Cards"
                  value={deck.flashcardCount ?? 0}
                />
                <DeckStat
                  icon={<Clock3 className="h-4 w-4 text-zinc-500" />}
                  label="Recent"
                  value={createdAt}
                />
                <DeckStat
                  icon={<Sparkles className="h-4 w-4 text-zinc-500" />}
                  label="Mastery"
                  value={`${masteryRate}%`}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-800">Mastery breakdown</span>
                  <span className="text-zinc-500">{progress.total} tracked cards</span>
                </div>
                <MasteryBar progress={progress} />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-800">Teacher mix</span>
                  <span className="text-zinc-500">card types</span>
                </div>
                <TaxonomySummary summary={taxonomySummary} compact />
              </div>
              <TeacherNotesPreview notes={deck.teacherNotes} compact />
            </div>
            <MasteryRing progress={progress} valueLabel={`${masteryRate}%`} detailLabel="mastered" />
          </div>
          <MasteryLegend progress={progress} dense />
        </CardContent>
      </Card>
    </Link>
  );
}

function DeckStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
