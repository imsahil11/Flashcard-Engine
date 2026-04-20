'use client';

import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Instrument_Serif, Inter } from 'next/font/google';
import { animate, motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  Clock3,
  Filter,
  Flame,
  Layers3,
  LogOut,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';
import type { Deck, UploadProgress, UploadProgressStage } from '@flashcard/types';
import { Input } from '@flashcard/ui';
import { useDecks, useUploadPdf, useUploadProgress } from '../../hooks/use-api';
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

const sectionTransition = {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1] as const,
};

const stageOrder: UploadProgressStage[] = [
  'queued',
  'parsing_pdf',
  'planning_concepts',
  'crafting_cards',
  'finalizing_deck',
  'completed',
];

const stageLabels: Record<UploadProgressStage, string> = {
  queued: 'Upload queued',
  parsing_pdf: 'Parsing PDF structure',
  planning_concepts: 'Mapping concepts and definitions',
  crafting_cards: 'Drafting flashcards and edge cases',
  finalizing_deck: 'Finalizing deck quality checks',
  completed: 'Deck ready',
  failed: 'Upload failed',
};

type SortMode = 'recent' | 'reviews' | 'mastery';

export default function DashboardPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const logout = useAuthStore((state) => state.logout);

  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

  const {
    data: decks = [],
    isLoading,
    error,
  } = useDecks();
  const upload = useUploadPdf();
  const progressQuery = useUploadProgress(activeUploadId ?? undefined, Boolean(activeUploadId));

  useEffect(() => {
    if (hasHydrated && !token) {
      router.replace('/login');
    }
  }, [hasHydrated, router, token]);

  const metrics = useMemo(() => {
    const totalCards = decks.reduce((sum, deck) => sum + (deck.flashcardCount ?? 0), 0);
    const reviewsDue = decks.reduce((sum, deck) => sum + (deck.progress?.reviewsNeeded ?? 0), 0);
    const mastered = decks.reduce((sum, deck) => sum + (deck.progress?.mastered ?? 0), 0);
    const masteryRate = Math.round((mastered / Math.max(totalCards, 1)) * 100);
    const duePressure = Math.min(100, Math.round((reviewsDue / Math.max(totalCards, 1)) * 100));
    const learning = decks.reduce((sum, deck) => sum + (deck.progress?.learning ?? 0), 0);
    const focusRatio = Math.min(100, Math.round((learning / Math.max(totalCards, 1)) * 100));

    const hottestDeck = [...decks]
      .sort((a, b) => (b.progress?.reviewsNeeded ?? 0) - (a.progress?.reviewsNeeded ?? 0))[0]
      ?.title;

    return {
      deckCount: decks.length,
      totalCards,
      reviewsDue,
      masteryRate,
      duePressure,
      focusRatio,
      hottestDeck,
    };
  }, [decks]);

  const filteredDecks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const visible = decks.filter((deck) => {
      if (!normalizedSearch) {
        return true;
      }

      return [deck.title, deck.description ?? ''].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      );
    });

    return visible.sort((a, b) => {
      if (sortMode === 'reviews') {
        return (b.progress?.reviewsNeeded ?? 0) - (a.progress?.reviewsNeeded ?? 0);
      }

      if (sortMode === 'mastery') {
        const masteryA = (a.progress?.mastered ?? 0) / Math.max(a.progress?.total ?? a.flashcardCount ?? 0, 1);
        const masteryB = (b.progress?.mastered ?? 0) / Math.max(b.progress?.total ?? b.flashcardCount ?? 0, 1);
        return masteryB - masteryA;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [decks, search, sortMode]);

  const priorityDecks = useMemo(
    () =>
      [...decks]
        .sort((a, b) => (b.progress?.reviewsNeeded ?? 0) - (a.progress?.reviewsNeeded ?? 0))
        .slice(0, 3),
    [decks],
  );

  async function onUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      return;
    }

    const formData = new FormData();
    const uploadId = createUploadId();
    formData.set('file', file);
    formData.set('uploadId', uploadId);
    if (title.trim()) {
      formData.set('title', title.trim());
    }

    setActiveUploadId(uploadId);
    let uploadSucceeded = false;

    try {
      await upload.mutateAsync({ formData, uploadId });
      uploadSucceeded = true;
    } catch {
      // Error state is surfaced by React Query via upload.error.
    } finally {
      window.setTimeout(() => setActiveUploadId(null), 2500);
    }

    if (uploadSucceeded) {
      setTitle('');
      setFile(null);
    }
  }

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
        <div className="mx-auto grid max-w-7xl gap-5">
          <div className="h-20 animate-pulse rounded-3xl border border-[var(--fm-line)] bg-white/80" />
          <div className="h-56 animate-pulse rounded-3xl border border-[var(--fm-line)] bg-white/80" />
          <div className="grid gap-5 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-3xl border border-[var(--fm-line)] bg-white/80"
              />
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
        .dashboard-atmosphere {
          background:
            radial-gradient(circle at 16% 16%, rgba(91, 79, 232, 0.08), transparent 26%),
            radial-gradient(circle at 84% 12%, rgba(245, 243, 239, 0.9), transparent 36%),
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.98), transparent 42%);
        }
      `}</style>

      <div className="dashboard-atmosphere pointer-events-none fixed inset-0" />

      <header className="sticky top-0 z-30 border-b border-[var(--fm-line)] bg-[var(--fm-bg)]/88 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--fm-indigo)]" />
            <span className="font-[var(--font-display)] text-2xl italic">FlashMind</span>
          </Link>
          <div className="flex items-center gap-3 md:gap-4">
            <Link
              href="/review"
              className="rounded-full border border-[var(--fm-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--fm-text)] transition hover:-translate-y-0.5"
            >
              Review Queue
            </Link>
            <span className="hidden rounded-full border border-[var(--fm-line)] bg-white px-4 py-2 text-sm text-[var(--fm-muted)] md:inline">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--fm-indigo)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(91,79,232,0.28)] transition hover:scale-[1.02]"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 pb-14 pt-10 md:px-8">
        <Reveal>
          <section className="relative overflow-hidden rounded-[34px] border border-[var(--fm-line)] bg-white px-6 py-7 shadow-[0_22px_52px_rgba(13,13,13,0.06)] md:px-10 md:py-10">
            <motion.div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--fm-indigo)]/8"
              animate={{ scale: [1, 1.08, 1], opacity: [0.65, 0.95, 0.65] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="pointer-events-none absolute -bottom-16 left-[12%] h-40 w-40 rounded-full border border-[var(--fm-indigo)]/20"
              animate={{ y: [0, -10, 0], opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative grid gap-8 lg:grid-cols-[1.4fr_390px] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--fm-muted)]">
                  Study Command Center
                </p>
                <h1 className="mt-3 max-w-3xl font-[var(--font-display)] text-5xl leading-[0.95] md:text-7xl">
                  Build recall like an editorial workflow.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--fm-muted)] md:text-lg">
                  Upload source material, monitor mastery, and choose what to practice next from one calm,
                  high-clarity workspace.
                </p>
              </div>
              <div className="grid gap-4">
                <div className="rounded-3xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fm-muted)]">Queue pressure</p>
                  <div className="mt-3 grid grid-cols-[88px_1fr] gap-3">
                    <motion.div
                      className="relative grid h-[88px] w-[88px] place-items-center rounded-full"
                      style={{
                        background: `conic-gradient(var(--fm-indigo) ${metrics.duePressure * 3.6}deg, var(--fm-line) 0deg)`,
                      }}
                      animate={{ rotate: [0, 4, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-white text-sm font-semibold text-[var(--fm-text)]">
                        {metrics.duePressure}%
                      </div>
                    </motion.div>
                    <div>
                      <p className="font-[var(--font-display)] text-3xl leading-none">{metrics.reviewsDue}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--fm-muted)]">
                        Cards due now. Keep the queue below 30% for smoother daily sessions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-[var(--fm-line)] bg-white p-5 shadow-[0_12px_24px_rgba(13,13,13,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fm-muted)]">Top priority</p>
                  <p className="mt-2 break-words font-[var(--font-display)] text-xl leading-snug line-clamp-2">
                    {metrics.hottestDeck ?? 'No active deck yet'}
                  </p>
                  <Link
                    href="/review"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--fm-indigo)]"
                  >
                    Start focused review
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {error ? (
          <Reveal>
            <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error instanceof Error ? error.message : 'Could not load dashboard data.'}
            </section>
          </Reveal>
        ) : null}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <CountMetric icon={<BookOpenText className="h-4 w-4" />} label="Active Decks" value={metrics.deckCount} />
          <CountMetric icon={<Layers3 className="h-4 w-4" />} label="Total Cards" value={metrics.totalCards} />
          <CountMetric icon={<Clock3 className="h-4 w-4" />} label="Due Today" value={metrics.reviewsDue} />
          <CountMetric
            icon={<Sparkles className="h-4 w-4" />}
            label="Mastery Rate"
            value={metrics.masteryRate}
            suffix="%"
          />
        </section>

        <Reveal>
          <section className="rounded-[30px] border border-[var(--fm-line)] bg-white p-5 shadow-[0_18px_40px_rgba(13,13,13,0.05)] md:p-6">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
              <div className="rounded-2xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] p-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[var(--fm-indigo)]" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fm-muted)]">Momentum board</p>
                </div>
                <h3 className="mt-3 font-[var(--font-display)] text-4xl leading-tight">Learning velocity at a glance</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--fm-muted)]">
                  Keep these ratios in range to sustain progress without overload.
                </p>

                <div className="mt-5 grid gap-4">
                  <MetricRail
                    icon={<Target className="h-4 w-4" />}
                    label="Mastery confidence"
                    value={metrics.masteryRate}
                    caption="Strong decks trend above 60%."
                  />
                  <MetricRail
                    icon={<BrainCircuit className="h-4 w-4" />}
                    label="Active learning load"
                    value={metrics.focusRatio}
                    caption="Ideal range is 20-40% in learning state."
                  />
                  <MetricRail
                    icon={<Flame className="h-4 w-4" />}
                    label="Due queue pressure"
                    value={metrics.duePressure}
                    caption="Lower is calmer. Under 30% is excellent."
                    warn={metrics.duePressure > 40}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--fm-line)] bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fm-muted)]">Priority queue</p>
                  <Link href="/review" className="text-xs font-semibold text-[var(--fm-indigo)]">
                    Open all
                  </Link>
                </div>

                <div className="mt-4 grid gap-3">
                  {priorityDecks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--fm-line)] bg-[var(--fm-bg)] px-3 py-6 text-center text-sm text-[var(--fm-muted)]">
                      Upload a deck to populate your queue.
                    </div>
                  ) : (
                    priorityDecks.map((deck, index) => (
                      <motion.div
                        key={deck.id}
                        initial={{ opacity: 0, x: 16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.45, delay: index * 0.07 }}
                        className="rounded-xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] p-3"
                      >
                        <p className="line-clamp-1 text-sm font-semibold text-[var(--fm-text)]">{deck.title}</p>
                        <div className="mt-1 flex items-center justify-between text-xs text-[var(--fm-muted)]">
                          <span>{deck.flashcardCount ?? 0} cards</span>
                          <span>{deck.progress?.reviewsNeeded ?? 0} due</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <Reveal>
            <section className="rounded-[30px] border border-[var(--fm-line)] bg-white p-5 shadow-[0_18px_40px_rgba(13,13,13,0.05)] md:p-6">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-[var(--fm-indigo)]" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fm-muted)]">New Deck</p>
              </div>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl leading-tight">Drop a PDF</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--fm-muted)]">
                Create a new deck with AI-generated cards in under a minute.
              </p>

              <form className="mt-6 grid gap-4" onSubmit={onUploadSubmit}>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[var(--fm-text)]">Deck title</span>
                  <Input
                    className="h-11 rounded-xl border-[var(--fm-line)] bg-[var(--fm-bg)] focus:ring-[var(--fm-indigo)]"
                    placeholder="e.g. Signals and Systems"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[var(--fm-text)]">PDF file</span>
                  <input
                    className="h-11 w-full rounded-xl border border-[var(--fm-line)] bg-[var(--fm-bg)] px-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[var(--fm-indigo)]/12 file:px-3 file:py-1.5 file:font-medium file:text-[var(--fm-indigo)]"
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                </label>

                {upload.error ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {upload.error.message}
                  </p>
                ) : null}

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  disabled={!file || upload.isPending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--fm-indigo)] px-5 font-semibold text-white shadow-[0_12px_24px_rgba(91,79,232,0.32)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {upload.isPending ? 'Generating deck...' : 'Generate deck'}
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </form>
            </section>
          </Reveal>

          <Reveal>
            <section className="rounded-[30px] border border-[var(--fm-line)] bg-white p-5 shadow-[0_18px_40px_rgba(13,13,13,0.05)] md:p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--fm-indigo)]" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fm-muted)]">Generation Status</p>
              </div>
              <h2 className="mt-3 font-[var(--font-display)] text-4xl leading-tight">Pipeline clarity</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--fm-muted)]">
                Watch every stage from parsing to final deck assembly.
              </p>
              <div className="mt-6">
                <UploadPipelinePanel progress={progressQuery.data} />
              </div>
            </section>
          </Reveal>
        </div>

        <Reveal>
          <section className="rounded-[30px] border border-[var(--fm-line)] bg-white p-5 shadow-[0_18px_40px_rgba(13,13,13,0.05)] md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fm-muted)]">Deck Library</p>
                <h2 className="mt-2 font-[var(--font-display)] text-4xl md:text-5xl">Your study shelves</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--fm-muted)]">
                  Search instantly, sort by urgency, and jump into focused review from the deck you need most.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fm-muted)]" />
                  <Input
                    className="h-11 min-w-[250px] rounded-full border-[var(--fm-line)] bg-[var(--fm-bg)] pl-10 focus:ring-[var(--fm-indigo)]"
                    placeholder="Search by title or topic"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <div className="inline-flex h-11 items-center rounded-full border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] p-1">
                  {([
                    { key: 'recent', label: 'Recent' },
                    { key: 'reviews', label: 'Due' },
                    { key: 'mastery', label: 'Mastery' },
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
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm text-[var(--fm-muted)]">
              <Filter className="h-4 w-4" />
              Showing {filteredDecks.length} of {decks.length} deck{decks.length === 1 ? '' : 's'}
            </div>

            <div className="mt-6">
              {isLoading ? (
                <DeckSkeletonGrid />
              ) : filteredDecks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--fm-line)] bg-[var(--fm-bg)] px-5 py-8 text-center text-sm text-[var(--fm-muted)]">
                  {decks.length === 0
                    ? 'No decks yet. Upload your first PDF to create a study library.'
                    : 'No decks match your search right now.'}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredDecks.map((deck, index) => (
                    <DeckCard key={deck.id} deck={deck} index={index} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </Reveal>
      </main>
    </div>
  );
}

function Reveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={sectionTransition}
    >
      {children}
    </motion.div>
  );
}

function CountMetric({
  icon,
  label,
  value,
  suffix = '',
}: {
  icon: ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!inView) {
      return;
    }

    const controls = animate(0, value, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplay(new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(latest));
      },
    });

    return () => controls.stop();
  }, [inView, value]);

  return (
    <motion.div
      ref={ref}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-3xl border border-[var(--fm-line)] bg-white p-5 shadow-[0_14px_28px_rgba(13,13,13,0.05)]"
    >
      <motion.div
        className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[var(--fm-indigo)]/10"
        animate={{ scale: [1, 1.06, 1], opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] px-2.5 py-1 text-[var(--fm-muted)]">
          {icon}
        </div>
        <p className="mt-4 font-[var(--font-display)] text-5xl leading-none">
          {display}
          {suffix}
        </p>
        <p className="mt-2 text-sm text-[var(--fm-muted)]">{label}</p>
      </div>
    </motion.div>
  );
}

function MetricRail({
  icon,
  label,
  value,
  caption,
  warn = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  caption: string;
  warn?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="rounded-xl border border-[var(--fm-line)] bg-white p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2 text-[var(--fm-muted)]">
          {icon}
          <span className="font-medium text-[var(--fm-text)]">{label}</span>
        </div>
        <span className="font-semibold text-[var(--fm-text)]">{clamped}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--fm-line)]">
        <motion.div
          className={`h-full ${warn ? 'bg-amber-500' : 'bg-[var(--fm-indigo)]'}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${clamped}%` }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--fm-muted)]">{caption}</p>
    </div>
  );
}

function UploadPipelinePanel({ progress }: { progress: UploadProgress | null | undefined }) {
  if (!progress) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--fm-line)] bg-[var(--fm-bg)] px-4 py-6 text-sm text-[var(--fm-muted)]">
        Start an upload to watch real-time ingestion progress.
      </div>
    );
  }

  const activeIndex = Math.max(stageOrder.indexOf(progress.stage), 0);

  return (
    <div className="grid gap-4">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-[var(--fm-muted)]">
          <span>{progress.message || stageLabels[progress.stage]}</span>
          <span>{progress.progressPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--fm-line)]">
          <motion.div
            className={`h-full ${progress.stage === 'failed' ? 'bg-red-500' : 'bg-[var(--fm-indigo)]'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress.progressPercent}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="grid gap-2">
        {stageOrder.map((stage, index) => {
          const completed = index < activeIndex || progress.stage === 'completed';
          const active = stage === progress.stage;

          return (
            <div
              key={stage}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                active
                  ? 'border-[var(--fm-indigo)]/30 bg-[var(--fm-indigo)]/10 text-[var(--fm-text)]'
                  : completed
                    ? 'border-[var(--fm-line)] bg-[var(--fm-bg)] text-[var(--fm-muted)]'
                    : 'border-[var(--fm-line)] bg-white text-[var(--fm-muted)]'
              }`}
            >
              <span>{stageLabels[stage]}</span>
              <span className="text-xs">{active ? 'Working' : completed ? 'Done' : 'Pending'}</span>
            </div>
          );
        })}
      </div>

      {progress.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{progress.error}</p>
      ) : null}
    </div>
  );
}

function DeckCard({ deck, index }: { deck: Deck; index: number }) {
  const progress = deck.progress ?? {
    total: deck.flashcardCount ?? 0,
    mastered: 0,
    learning: 0,
    new: deck.flashcardCount ?? 0,
    reviewsNeeded: 0,
  };

  const total = Math.max(progress.total || deck.flashcardCount || 0, 1);
  const masteredPercent = (progress.mastered / total) * 100;
  const learningPercent = (progress.learning / total) * 100;
  const newPercent = (progress.new / total) * 100;
  const createdAt = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(deck.createdAt));
  const masteryRate = Math.round((progress.mastered / total) * 100);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ ...sectionTransition, delay: index * 0.05 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative overflow-hidden rounded-3xl border border-[var(--fm-line)] bg-[var(--fm-surface)] p-5 shadow-[0_12px_24px_rgba(13,13,13,0.04)]"
    >
      <motion.div
        className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[var(--fm-indigo)]/10"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      />
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
        {deck.description ?? 'Focused deck generated from your source material.'}
      </p>

      <div className="mt-5 rounded-xl border border-[var(--fm-line)] bg-[var(--fm-bg)] p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--fm-muted)]">
          <span>Mastery split</span>
          <span>{masteryRate}% mastered</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--fm-line)]">
          <div className="flex h-full">
            <div className="bg-[var(--fm-indigo)]" style={{ width: `${masteredPercent}%` }} />
            <div className="bg-[var(--fm-indigo)]/55" style={{ width: `${learningPercent}%` }} />
            <div className="bg-[var(--fm-indigo)]/25" style={{ width: `${newPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-[var(--fm-line)] bg-white px-2 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--fm-muted)]">Cards</p>
          <p className="mt-1 text-sm font-semibold">{deck.flashcardCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-[var(--fm-line)] bg-white px-2 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--fm-muted)]">Learning</p>
          <p className="mt-1 text-sm font-semibold">{progress.learning}</p>
        </div>
        <div className="rounded-xl border border-[var(--fm-line)] bg-white px-2 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--fm-muted)]">Mastered</p>
          <p className="mt-1 text-sm font-semibold">{progress.mastered}</p>
        </div>
      </div>

      <Link
        href={`/deck/${deck.id}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--fm-indigo)] transition group-hover:translate-x-0.5"
      >
        Open deck
        <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.article>
  );
}

function DeckSkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[290px] animate-pulse rounded-3xl border border-[var(--fm-line)] bg-[var(--fm-bg)]"
        />
      ))}
    </div>
  );
}

function createUploadId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `upload-${Date.now()}`;
}
