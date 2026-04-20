'use client';

import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Instrument_Serif, Inter } from 'next/font/google';
import { motion } from 'framer-motion';
import { ArrowRight, Clock3, Filter, Layers3, Search, Sparkles } from 'lucide-react';
import type { Deck } from '@flashcard/types';
import { Input } from '@flashcard/ui';
import { useDecks } from '../../hooks/use-api';
import { useAuthStore } from '../../store/use-app-store';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: '400',
  variable: '--font-display',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

type SortMode = 'due' | 'mastery' | 'recent';

export default function ReviewPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('due');

  const { data: decks = [], isLoading, error } = useDecks();

  useEffect(() => {
    if (hasHydrated && !token) {
      router.replace('/login');
    }
  }, [hasHydrated, router, token]);

  const stats = useMemo(() => {
    const due = decks.reduce((sum, deck) => sum + (deck.progress?.reviewsNeeded ?? 0), 0);
    const totalCards = decks.reduce((sum, deck) => sum + (deck.flashcardCount ?? 0), 0);
    const mastered = decks.reduce((sum, deck) => sum + (deck.progress?.mastered ?? 0), 0);
    const mastery = Math.round((mastered / Math.max(totalCards, 1)) * 100);

    return { due, totalCards, mastery };
  }, [decks]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visible = decks.filter((deck) => {
      if (!normalizedQuery) {
        return true;
      }

      return [deck.title, deck.description ?? ''].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });

    return visible.sort((a, b) => {
      if (sortMode === 'due') {
        return (b.progress?.reviewsNeeded ?? 0) - (a.progress?.reviewsNeeded ?? 0);
      }

      if (sortMode === 'mastery') {
        const masteryA = (a.progress?.mastered ?? 0) / Math.max(a.progress?.total ?? a.flashcardCount ?? 0, 1);
        const masteryB = (b.progress?.mastered ?? 0) / Math.max(b.progress?.total ?? b.flashcardCount ?? 0, 1);
        return masteryB - masteryA;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [decks, query, sortMode]);

  const themeVariables = {
    '--fm-bg': '#FAFAF8',
    '--fm-bg-soft': '#F5F3EF',
    '--fm-surface': '#FFFFFF',
    '--fm-line': '#E8E3DA',
    '--fm-text': '#0D0D0D',
    '--fm-muted': '#5E5A57',
    '--fm-indigo': '#5B4FE8',
  } as CSSProperties;

  if (!hasHydrated) {
    return (
      <div
        className={`${instrumentSerif.variable} ${inter.variable} min-h-screen bg-[var(--fm-bg)] px-4 py-12 md:px-8`}
        style={themeVariables}
      >
        <div className="mx-auto grid max-w-7xl gap-6">
          <div className="h-48 animate-pulse rounded-3xl border border-[var(--fm-line)] bg-white" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-3xl border border-[var(--fm-line)] bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <div
      className={`${instrumentSerif.variable} ${inter.variable} min-h-screen bg-[var(--fm-bg)] text-[var(--fm-text)]`}
      style={themeVariables}
    >
      <style jsx global>{`
        .review-atmosphere {
          background:
            radial-gradient(circle at 8% 12%, rgba(91, 79, 232, 0.08), transparent 26%),
            radial-gradient(circle at 90% 8%, rgba(245, 243, 239, 0.9), transparent 34%);
        }
      `}</style>

      <div className="review-atmosphere pointer-events-none fixed inset-0" />

      <main className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 pb-12 pt-10 md:px-8">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[34px] border border-[var(--fm-line)] bg-white px-6 py-8 shadow-[0_22px_52px_rgba(13,13,13,0.06)] md:px-10"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--fm-muted)]">Review Studio</p>
              <h1 className="mt-3 font-[var(--font-display)] text-5xl leading-[0.95] md:text-7xl">
                Practice what matters today.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--fm-muted)]">
                Choose a deck by urgency, move into active recall, and clear your due queue with intention.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <StatPill label="Due" value={stats.due} />
              <StatPill label="Cards" value={stats.totalCards} />
              <StatPill label="Mastery" value={stats.mastery} suffix="%" />
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[30px] border border-[var(--fm-line)] bg-white p-5 shadow-[0_18px_40px_rgba(13,13,13,0.05)] md:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fm-muted)]" />
              <Input
                className="h-11 rounded-full border-[var(--fm-line)] bg-[var(--fm-bg)] pl-10 focus:ring-[var(--fm-indigo)]"
                placeholder="Search deck by title or topic"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="inline-flex h-11 items-center rounded-full border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] p-1">
              {([
                { key: 'due', label: 'Due' },
                { key: 'mastery', label: 'Mastery' },
                { key: 'recent', label: 'Recent' },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSortMode(option.key)}
                  className={`h-9 rounded-full px-4 text-sm font-medium transition ${
                    sortMode === option.key
                      ? 'bg-white text-[var(--fm-text)] shadow-[0_8px_16px_rgba(13,13,13,0.08)]'
                      : 'text-[var(--fm-muted)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-[var(--fm-muted)]">
            <Filter className="h-4 w-4" />
            Showing {filtered.length} of {decks.length} deck{decks.length === 1 ? '' : 's'}
          </div>
        </motion.section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error.message}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[270px] animate-pulse rounded-3xl border border-[var(--fm-line)] bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--fm-line)] bg-[var(--fm-bg-soft)] px-5 py-10 text-center text-sm text-[var(--fm-muted)]">
            {decks.length === 0
              ? 'No decks yet. Upload a PDF from dashboard to start reviewing.'
              : 'No decks match your search right now.'}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((deck, index) => (
              <ReviewDeckCard key={deck.id} deck={deck} index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatPill({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--fm-muted)]">{label}</p>
      <p className="mt-1 font-[var(--font-display)] text-3xl leading-none">
        {value}
        {suffix}
      </p>
    </div>
  );
}

function ReviewDeckCard({ deck, index }: { deck: Deck; index: number }) {
  const progress = deck.progress ?? {
    total: deck.flashcardCount ?? 0,
    mastered: 0,
    learning: 0,
    new: deck.flashcardCount ?? 0,
    reviewsNeeded: 0,
  };
  const total = Math.max(progress.total || deck.flashcardCount || 0, 1);
  const mastery = Math.round((progress.mastered / total) * 100);
  const createdAt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
    new Date(deck.createdAt),
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group rounded-3xl border border-[var(--fm-line)] bg-white p-5 shadow-[0_12px_24px_rgba(13,13,13,0.05)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--fm-muted)]">{createdAt}</p>
          <h3 className="mt-2 break-words font-[var(--font-display)] text-xl leading-snug line-clamp-3">{deck.title}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--fm-indigo)]/10 px-3 py-1 text-xs font-semibold text-[var(--fm-indigo)]">
          {progress.reviewsNeeded} due
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-7 text-[var(--fm-muted)]">
        {deck.description ?? 'Focused deck generated for active recall and exam confidence.'}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <StatCell icon={<Layers3 className="h-4 w-4" />} label="Cards" value={deck.flashcardCount ?? 0} />
        <StatCell icon={<Clock3 className="h-4 w-4" />} label="Due" value={progress.reviewsNeeded} />
        <StatCell icon={<Sparkles className="h-4 w-4" />} label="Mastery" value={`${mastery}%`} />
      </div>

      <Link
        href={`/deck/${deck.id}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--fm-indigo)] transition group-hover:translate-x-0.5"
      >
        Start review
        <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.article>
  );
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] px-2 py-2.5">
      <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-[0.12em] text-[var(--fm-muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-[var(--fm-text)]">{value}</p>
    </div>
  );
}
