'use client';

import { type CSSProperties, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Instrument_Serif, Inter } from 'next/font/google';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpenText, Clock3, Sparkles } from 'lucide-react';
import { FlashcardViewer } from '../../../components/flashcard-viewer';
import { TeacherNotesPanel } from '../../../components/teacher-notes-panel';
import { useDeck, useFlashcards, useGenerateTeacherNotes } from '../../../hooks/use-api';
import { useAuthStore } from '../../../store/use-app-store';

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

export default function DeckPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !token) {
      router.replace('/login');
    }
  }, [hasHydrated, router, token]);

  const deckQuery = useDeck(params.id);
  const flashcardsQuery = useFlashcards(params.id);
  const generateNotes = useGenerateTeacherNotes(params.id);

  const deck = deckQuery.data;
  const flashcards = flashcardsQuery.data;

  const progress = deck?.progress ?? {
    total: flashcards?.length ?? 0,
    mastered: 0,
    learning: 0,
    new: flashcards?.length ?? 0,
    reviewsNeeded: 0,
  };
  const total = Math.max(progress.total || flashcards?.length || 0, 1);
  const mastery = Math.round((progress.mastered / total) * 100);

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
        className={`${instrumentSerif.variable} ${inter.variable} min-h-screen bg-[var(--fm-bg)] px-4 py-10 md:px-8`}
        style={themeVariables}
      >
        <div className="mx-auto grid max-w-7xl gap-5">
          <div className="h-48 animate-pulse rounded-3xl border border-[var(--fm-line)] bg-white" />
          <div className="h-64 animate-pulse rounded-3xl border border-[var(--fm-line)] bg-white" />
          <div className="h-80 animate-pulse rounded-3xl border border-[var(--fm-line)] bg-white" />
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
        .deck-atmosphere {
          background:
            radial-gradient(circle at 12% 10%, rgba(91, 79, 232, 0.08), transparent 24%),
            radial-gradient(circle at 88% 8%, rgba(245, 243, 239, 0.9), transparent 30%);
        }
      `}</style>

      <div className="deck-atmosphere pointer-events-none fixed inset-0" />

      <main className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 pb-14 pt-10 md:px-8">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[34px] border border-[var(--fm-line)] bg-white px-6 py-8 shadow-[0_22px_52px_rgba(13,13,13,0.06)] md:px-10"
        >
          {/* ── Nav row ── */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] px-4 py-2 text-sm font-semibold text-[var(--fm-text)] shadow-[0_2px_8px_rgba(13,13,13,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(13,13,13,0.1)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/review"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--fm-indigo)] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(91,79,232,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(91,79,232,0.45)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Review Studio
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--fm-muted)]">Deck Session</p>
              <h1 className="mt-3 max-w-4xl font-[var(--font-display)] text-5xl leading-[0.95] md:text-7xl">
                {deck?.title ?? 'Deck review'}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--fm-muted)]">
                Read the notes first. Then review with honest recall ratings to keep spaced repetition calibrated.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <MetaPill icon={<BookOpenText className="h-4 w-4" />} label="Cards" value={flashcards?.length ?? 0} />
              <MetaPill icon={<Clock3 className="h-4 w-4" />} label="Due" value={progress.reviewsNeeded} />
              <MetaPill icon={<Sparkles className="h-4 w-4" />} label="Mastery" value={mastery} suffix="%" />
            </div>
          </div>
        </motion.section>


        {(deckQuery.isLoading || flashcardsQuery.isLoading) ? (
          <div className="grid gap-4">
            <div className="h-56 animate-pulse rounded-3xl border border-[var(--fm-line)] bg-white" />
            <div className="h-80 animate-pulse rounded-3xl border border-[var(--fm-line)] bg-white" />
          </div>
        ) : null}

        {deckQuery.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deckQuery.error.message}
          </div>
        ) : null}

        {flashcardsQuery.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {flashcardsQuery.error.message}
          </div>
        ) : null}

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <TeacherNotesPanel
            notes={deck?.teacherNotes}
            isGenerating={generateNotes.isPending}
            onGenerate={() => generateNotes.mutate()}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="rounded-[30px] border border-[var(--fm-line)] bg-white p-5 shadow-[0_18px_40px_rgba(13,13,13,0.05)] md:p-6"
        >
          {flashcards ? <FlashcardViewer flashcards={flashcards} notes={deck?.teacherNotes ?? null} /> : null}
        </motion.section>
      </main>
    </div>
  );
}

function MetaPill({
  icon,
  label,
  value,
  suffix = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] px-4 py-3">
      <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-[0.12em] text-[var(--fm-muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 font-[var(--font-display)] text-3xl leading-none">
        {value}
        {suffix}
      </p>
    </div>
  );
}
