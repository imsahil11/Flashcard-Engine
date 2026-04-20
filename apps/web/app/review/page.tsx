'use client';

import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Instrument_Serif, Inter } from 'next/font/google';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  NotebookTabs,
  XCircle,
} from 'lucide-react';
import type { ReviewRating, StudyQueueCard, TeacherNotes } from '@flashcard/types';
import { useDeck, useReview, useStudyQueue } from '../../hooks/use-api';
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

type StudyMode = 'questions' | 'notes';

type TeacherNoteCard = {
  id: string;
  section: string;
  prompt: string;
  note: string;
};

type McqPack = {
  options: string[];
  correctIndex: number;
};

type StageCard = {
  id: string;
  eyebrow: string;
  front: string;
  backTitle: string;
  back: string;
  context?: string;
  mcq?: McqPack;
};

export default function ReviewPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [mode, setMode] = useState<StudyMode>('questions');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [noteIndex, setNoteIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  const queueQuery = useStudyQueue({ limit: 36, newLimit: 8 });
  const review = useReview();

  const queue = useMemo(() => queueQuery.data ?? [], [queueQuery.data]);
  const activeQuestion = queue[questionIndex] ?? null;
  const activeDeckQuery = useDeck(activeQuestion?.deck.id);

  const noteCards = useMemo(
    () => buildTeacherNoteCards(activeDeckQuery.data?.teacherNotes),
    [activeDeckQuery.data?.teacherNotes],
  );

  const questionStageCards = useMemo<StageCard[]>(
    () =>
      queue.map((card, index) => ({
        id: card.id,
        eyebrow: `${card.deck.title} - ${card.cardType.replace('_', ' ')}`,
        front: normalizeFlashcardPrompt(card.question, card.cardType, card.context),
        backTitle: 'Explanation',
        back: normalizeFlashcardExplanation(card.answer),
        context: stripEmbeddedMcqMetadata(card.context),
        mcq: buildMcqPackFromCards(queue, index),
      })),
    [queue],
  );

  const noteStageCards = useMemo<StageCard[]>(
    () =>
      noteCards.map((card) => ({
        id: card.id,
        eyebrow: `${card.section} flashcard`,
        front: card.prompt,
        backTitle: 'Teacher note',
        back: card.note,
      })),
    [noteCards],
  );

  const activeCards = mode === 'questions' ? questionStageCards : noteStageCards;
  const activeIndex = mode === 'questions' ? questionIndex : noteIndex;
  const activeCard = activeCards[activeIndex] ?? null;
  const activeDeckTitle = activeQuestion?.deck.title ?? 'No active deck';

  useEffect(() => {
    if (hasHydrated && !token) {
      router.replace('/login');
    }
  }, [hasHydrated, router, token]);

  useEffect(() => {
    if (questionIndex > questionStageCards.length - 1) {
      setQuestionIndex(Math.max(questionStageCards.length - 1, 0));
    }
  }, [questionIndex, questionStageCards.length]);

  useEffect(() => {
    if (noteIndex > noteStageCards.length - 1) {
      setNoteIndex(Math.max(noteStageCards.length - 1, 0));
    }
  }, [noteIndex, noteStageCards.length]);

  useEffect(() => {
    setIsFlipped(false);
    setSelectedChoice(null);
  }, [mode, questionIndex, noteIndex]);

  useEffect(() => {
    if (mode === 'notes' && noteStageCards.length === 0) {
      setMode('questions');
    }
  }, [mode, noteStageCards.length]);

  const stats = useMemo(() => {
    const due = queue.filter((card) => card.queueType === 'due').length;
    const fresh = queue.filter((card) => card.queueType === 'new').length;

    return {
      total: queue.length,
      due,
      fresh,
    };
  }, [queue]);

  const themeVariables = {
    '--fm-bg': '#F7F6F2',
    '--fm-bg-soft': '#EFEEE8',
    '--fm-surface': '#FFFFFF',
    '--fm-line': '#DDD8CB',
    '--fm-text': '#0B0B0B',
    '--fm-muted': '#5B574D',
    '--fm-indigo': '#3851E7',
  } as CSSProperties;

  function goPrevious() {
    if (mode === 'questions') {
      setQuestionIndex((current) => Math.max(current - 1, 0));
      return;
    }

    setNoteIndex((current) => Math.max(current - 1, 0));
  }

  function goNext() {
    if (mode === 'questions') {
      setQuestionIndex((current) => Math.min(current + 1, Math.max(questionStageCards.length - 1, 0)));
      return;
    }

    setNoteIndex((current) => Math.min(current + 1, Math.max(noteStageCards.length - 1, 0)));
  }

  function onChooseOption(optionIndex: number) {
    if (mode !== 'questions') {
      return;
    }

    setSelectedChoice(optionIndex);
    setIsFlipped(true);
  }

  async function onRate(rating: ReviewRating) {
    if (!activeQuestion) {
      return;
    }

    try {
      await review.mutateAsync({ flashcardId: activeQuestion.id, rating });
      setIsFlipped(false);
      setSelectedChoice(null);
      setQuestionIndex((current) => Math.min(current + 1, Math.max(questionStageCards.length - 1, 0)));
    } catch {
      // Error is surfaced by React Query state.
    }
  }

  if (!hasHydrated) {
    return (
      <div
        className={`${instrumentSerif.variable} ${inter.variable} min-h-screen bg-[var(--fm-bg)] px-4 py-12 md:px-8`}
        style={themeVariables}
      >
        <div className="mx-auto grid max-w-5xl gap-5">
          <div className="h-[520px] animate-pulse rounded-3xl border border-[var(--fm-line)] bg-white" />
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
            radial-gradient(circle at 12% 8%, rgba(56, 81, 231, 0.14), transparent 30%),
            radial-gradient(circle at 90% 14%, rgba(255, 255, 255, 0.94), transparent 35%);
        }
      `}</style>

      <div className="review-atmosphere pointer-events-none fixed inset-0" />

      <main className="relative mx-auto w-full max-w-5xl px-4 pb-12 pt-8 md:px-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-[32px] border border-[var(--fm-line)] bg-white px-4 py-5 shadow-[0_22px_58px_rgba(13,13,13,0.11)] md:px-6"
        >
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.19em] text-[var(--fm-muted)]">Review Studio</p>
              <h1 className="mt-2 font-[var(--font-display)] text-5xl leading-[0.96] md:text-6xl">One flashcard hero.</h1>
              <p className="mt-3 max-w-2xl text-base leading-8 text-[var(--fm-muted)]">
                Toggle between questions and notes. Use arrows to move in 3D. Tap an MCQ option to reveal the explanation.
              </p>
            </div>
            <Link
              href={activeQuestion ? `/deck/${activeQuestion.deck.id}` : '/dashboard'}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] px-4 text-sm font-semibold text-[var(--fm-text)]"
            >
              Open deck room
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex h-11 items-center rounded-full border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] p-1">
              <button
                type="button"
                onClick={() => setMode('questions')}
                className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                  mode === 'questions'
                    ? 'bg-white text-[var(--fm-text)] shadow-[0_8px_16px_rgba(13,13,13,0.12)]'
                    : 'text-[var(--fm-muted)]'
                }`}
              >
                <BookOpenText className="h-4 w-4" />
                Questions
              </button>
              <button
                type="button"
                onClick={() => setMode('notes')}
                disabled={noteStageCards.length === 0}
                className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                  mode === 'notes'
                    ? 'bg-white text-[var(--fm-text)] shadow-[0_8px_16px_rgba(13,13,13,0.12)]'
                    : 'text-[var(--fm-muted)]'
                } disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <NotebookTabs className="h-4 w-4" />
                Notes
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-[var(--fm-muted)]">
              <span className="rounded-full border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] px-3 py-1">Queue {stats.total}</span>
              <span className="rounded-full border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] px-3 py-1">Due {stats.due}</span>
              <span className="rounded-full border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] px-3 py-1">New {stats.fresh}</span>
              <span className="rounded-full border border-[var(--fm-line)] bg-[var(--fm-bg-soft)] px-3 py-1">{activeDeckTitle}</span>
            </div>
          </div>

          {queueQuery.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {queueQuery.error.message}
            </div>
          ) : null}

          {queueQuery.isLoading ? (
            <div className="h-[430px] animate-pulse rounded-3xl border border-[var(--fm-line)] bg-[var(--fm-bg-soft)]" />
          ) : (
            <>
              <ThreeDFlashcardStage
                cards={activeCards}
                index={activeIndex}
                flipped={isFlipped}
                selectedChoice={selectedChoice}
                onFlip={() => setIsFlipped((value) => !value)}
                onSelectChoice={onChooseOption}
                emptyMessage={
                  mode === 'questions'
                    ? 'No cards are due right now. Upload or review later.'
                    : 'No teacher-note flashcards for this deck yet.'
                }
              />

              {activeCards.length > 0 ? (
                <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={goPrevious}
                      disabled={activeIndex <= 0}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--fm-line)] bg-white px-4 text-sm font-semibold text-[var(--fm-text)] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={activeIndex >= activeCards.length - 1}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--fm-line)] bg-white px-4 text-sm font-semibold text-[var(--fm-text)] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFlipped((value) => !value)}
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--fm-indigo)] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(56,81,231,0.28)]"
                    >
                      {isFlipped ? 'Show prompt' : 'Show explanation'}
                    </button>
                  </div>

                  {mode === 'questions' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => onRate(rating as ReviewRating)}
                          disabled={!isFlipped || review.isPending || !activeQuestion}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--fm-line)] bg-white text-sm font-semibold text-[var(--fm-text)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}

          {mode === 'questions' && activeCard?.mcq && !isFlipped ? (
            <p className="mt-4 text-sm text-[var(--fm-muted)]">
              Pick an option directly on the flashcard to flip and see the explanation.
            </p>
          ) : null}
        </motion.section>
      </main>
    </div>
  );
}

function ThreeDFlashcardStage({
  cards,
  index,
  flipped,
  selectedChoice,
  onFlip,
  onSelectChoice,
  emptyMessage,
}: {
  cards: StageCard[];
  index: number;
  flipped: boolean;
  selectedChoice: number | null;
  onFlip: () => void;
  onSelectChoice: (optionIndex: number) => void;
  emptyMessage: string;
}) {
  const current = cards[index];
  const shadowOne = cards[index + 1];
  const shadowTwo = cards[index + 2];

  if (!current) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--fm-line)] bg-[var(--fm-bg-soft)] px-5 py-10 text-center text-sm text-[var(--fm-muted)]">
        {emptyMessage}
      </div>
    );
  }

  const answeredMcq = Boolean(current.mcq && selectedChoice !== null);
  const isCorrect = Boolean(current.mcq && selectedChoice !== null && selectedChoice === current.mcq.correctIndex);

  return (
    <div className="relative mx-auto w-full max-w-4xl pb-2 pt-3" style={{ perspective: 1800 }}>
      {shadowTwo ? (
        <div
          className="pointer-events-none absolute left-6 right-6 top-[52px] h-[400px] rounded-[28px] border border-[var(--fm-line)] bg-white/75 md:h-[430px]"
          style={{ transform: 'translateZ(-140px) translateY(24px) scale(0.93)' }}
        />
      ) : null}

      {shadowOne ? (
        <div
          className="pointer-events-none absolute left-4 right-4 top-[36px] h-[430px] rounded-[28px] border border-[var(--fm-line)] bg-white/85 md:h-[470px]"
          style={{ transform: 'translateZ(-72px) translateY(12px) scale(0.965)' }}
        />
      ) : null}

      <motion.div
        role="button"
        tabIndex={0}
        onClick={onFlip}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) {
            return;
          }

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onFlip();
          }
        }}
        whileHover={{ y: -2 }}
        className="relative h-[500px] w-full rounded-[30px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fm-indigo)] md:h-[540px]"
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div
            className="absolute inset-0 flex h-full flex-col overflow-hidden rounded-[30px] border border-[var(--fm-line)] bg-white px-7 py-7 shadow-[0_24px_56px_rgba(13,13,13,0.14)]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fm-muted)]">{current.eyebrow}</p>
            <p className="mt-4 break-words text-xl font-semibold leading-8 text-[var(--fm-text)] md:text-[1.85rem] md:leading-[2.45rem]">
              {current.front}
            </p>

            {current.mcq ? (
              <div className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {current.mcq.options.map((option, optionIndex) => {
                  const isSelected = selectedChoice === optionIndex;
                  return (
                    <button
                      key={`${current.id}-option-${optionIndex}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectChoice(optionIndex);
                      }}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? 'border-[var(--fm-indigo)] bg-[rgba(56,81,231,0.08)] text-[var(--fm-text)]'
                          : 'border-[var(--fm-line)] bg-[var(--fm-bg-soft)] text-[var(--fm-text)] hover:border-[var(--fm-indigo)]'
                      }`}
                    >
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-semibold">
                        {optionLabel(optionIndex)}
                      </span>
                      <span className="min-w-0 break-words leading-6">{option}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-5 text-sm font-medium text-[var(--fm-muted)]">
                Tap card or press Show explanation to flip.
              </p>
            )}
          </div>

          <div
            className="absolute inset-0 flex h-full flex-col overflow-hidden rounded-[30px] border border-zinc-700 bg-zinc-950 px-7 py-7 text-zinc-100 shadow-[0_24px_56px_rgba(13,13,13,0.3)]"
            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">{current.backTitle}</p>

            {current.mcq ? (
              <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {answeredMcq ? (
                  <div
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      isCorrect
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {isCorrect ? 'Correct choice' : 'Good attempt'}
                    </div>
                    {!isCorrect ? (
                      <p className="mt-1 text-xs text-zinc-200">
                        Correct option: {optionLabel(current.mcq.correctIndex)}. {current.mcq.options[current.mcq.correctIndex]}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <p className="whitespace-pre-wrap text-base leading-7 text-zinc-100">{current.back}</p>

                {current.context ? (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Context</p>
                    <p className="mt-2 text-sm leading-7 text-zinc-300">{current.context}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
                <p className="whitespace-pre-wrap text-base leading-7 text-zinc-100">{current.back}</p>

                {current.context ? (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Context</p>
                    <p className="mt-2 text-sm leading-7 text-zinc-300">{current.context}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function buildTeacherNoteCards(notes: TeacherNotes | null | undefined): TeacherNoteCard[] {
  if (!notes) {
    return [];
  }

  const cards: TeacherNoteCard[] = [];

  splitTeachingBites(notes.overview, 2, 240).forEach((bite, biteIndex) => {
    const focus = extractFocusPhrase(bite, 7);
    cards.push({
      id: `overview-${biteIndex}`,
      section: 'Overview',
      prompt: biteIndex === 0
        ? ensureQuestionPrompt(
            focus ? `What is the big-picture idea behind ${focus}` : 'What is the big-picture idea and why does it matter',
            'What is the big-picture idea and why does it matter?',
          )
        : ensureQuestionPrompt(
            focus
              ? `What practical takeaway about ${focus} should you remember`
              : 'What practical takeaway should you remember from the overview',
            'What practical takeaway should you remember from the overview?',
          ),
      note: bite,
    });
  });

  notes.keyIdeas.forEach((idea, index) => {
    const focus = normalizeSpaces(idea);
    if (!focus) {
      return;
    }

    const sourceNote =
      notes.detailedNotes[index] ||
      notes.detailedNotes.find((item) => includesNormalized(item, focus)) ||
      `Define ${focus}, explain the mechanism, and include one practical implication.`;

    splitTeachingBites(sourceNote, 2, 250).forEach((bite, biteIndex) => {
      cards.push({
        id: `key-${index}-${biteIndex}`,
        section: 'Key Idea',
        prompt: biteIndex === 0
          ? `Explain this clearly: ${focus}`
          : `What detail strengthens your understanding of ${focus}?`,
        note: bite,
      });
    });
  });

  notes.misconceptions.forEach((item, index) => {
    splitTeachingBites(item, 2, 240).forEach((bite, biteIndex) => {
      const focus = extractFocusPhrase(bite, 6);
      cards.push({
        id: `mis-${index}-${biteIndex}`,
        section: 'Misconception',
        prompt: biteIndex === 0
          ? ensureQuestionPrompt(
              focus
                ? `What is the common mistake about ${focus} and how do you correct it`
                : 'What is the common mistake and how do you correct it',
              'What is the common mistake and how do you correct it?',
            )
          : ensureQuestionPrompt(
              focus
                ? `Why does the misconception about ${focus} look plausible at first`
                : 'Why does this misconception look plausible at first',
              'Why does this misconception look plausible at first?',
            ),
        note: bite,
      });
    });
  });

  notes.workedExamples.forEach((item, index) => {
    splitTeachingBites(item, 2, 260).forEach((bite, biteIndex) => {
      const focus = extractFocusPhrase(bite, 7);
      cards.push({
        id: `work-${index}-${biteIndex}`,
        section: 'Worked Example',
        prompt: biteIndex === 0
          ? ensureQuestionPrompt(
              focus
                ? `How would you solve this ${focus} example step by step`
                : 'Walk through this example step by step',
              'Walk through this example step by step?',
            )
          : ensureQuestionPrompt(
              focus
                ? `What checkpoint confirms the ${focus} method is correct`
                : 'What checkpoint confirms the method is correct',
              'What checkpoint confirms the method is correct?',
            ),
        note: bite,
      });
    });
  });

  notes.examCues.forEach((item, index) => {
    const text = normalizeSpaces(item);
    if (!text) {
      return;
    }

    cards.push({
      id: `cue-${index}`,
      section: 'Exam Cue',
      prompt: ensureQuestionPrompt(text, 'What should you explain from this exam cue?'),
      note: 'Answer with definition, mechanism, distinction, and one limitation or edge case when relevant.',
    });
  });

  return cards.slice(0, 36);
}

function buildMcqPackFromCards(
  cards: Array<Pick<StudyQueueCard, 'id' | 'question' | 'answer' | 'context'>>,
  index: number,
): McqPack {
  const current = cards[index];
  if (!current) {
    return {
      options: [
        'No option available.',
        'No option available.',
        'No option available.',
        'No option available.',
      ],
      correctIndex: 0,
    };
  }

  const embeddedMcq = parseEmbeddedMcqFromContext(current.context);
  if (embeddedMcq) {
    return embeddedMcq;
  }

  const correct = buildOptionText(current.answer);
  const distractors = cards
    .map((card, cardIndex) => (cardIndex === index ? '' : buildOptionText(card.answer)))
    .filter((option) => option.length > 8)
    .filter((option) => normalizeComparable(option) !== normalizeComparable(correct));

  const fallbackDistractors = buildFallbackDistractors(current.question);
  const pool = uniqueStrings([correct, ...distractors, ...fallbackDistractors]).slice(0, 4);

  while (pool.length < 4) {
    pool.push(`Alternative interpretation ${pool.length + 1}`);
  }

  const shuffled = deterministicShuffle(pool, current.id);
  const correctIndex = shuffled.findIndex((option) => normalizeComparable(option) === normalizeComparable(correct));

  return {
    options: shuffled,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
  };
}

function buildOptionText(answer: string) {
  const cleaned = normalizeSpaces(answer);
  if (!cleaned) {
    return 'Review the source and identify the central mechanism.';
  }

  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  const stripped = firstSentence
    .replace(/^(answer|key insight|in short|therefore|thus)\s*[:,-]?\s*/i, '')
    .replace(/[.!?]+$/g, '')
    .trim();

  return truncateText(stripped || cleaned, 190);
}

function buildFallbackDistractors(question: string) {
  const focus = truncateText(
    normalizeSpaces(question)
      .replace(/[?]+$/g, '')
      .split(/\s+/)
      .slice(0, 7)
      .join(' '),
    60,
  );

  return [
    `It treats ${focus || 'the topic'} as pure memorization with no mechanism.`,
    `It assumes ${focus || 'the idea'} works identically in every case.`,
    `It claims ${focus || 'this concept'} has no practical limitation.`,
    `It frames ${focus || 'the concept'} as unrelated to surrounding concepts.`,
  ].map((item) => truncateText(item, 190));
}

function deterministicShuffle<T>(items: T[], seed: string) {
  const result = [...items];
  let hash = hashSeed(seed);

  for (let index = result.length - 1; index > 0; index -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const nextIndex = hash % (index + 1);
    [result[index], result[nextIndex]] = [result[nextIndex] as T, result[index] as T];
  }

  return result;
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function splitTeachingBites(text: string, maxSentences: number, maxLength: number) {
  const normalized = normalizeSpaces(text);
  if (!normalized) {
    return [];
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20);

  if (sentences.length === 0) {
    return [truncateText(normalized, maxLength)];
  }

  const bites: string[] = [];
  let current: string[] = [];

  for (const sentence of sentences) {
    const candidate = [...current, sentence].join(' ');
    if (current.length >= maxSentences || candidate.length > maxLength) {
      if (current.length > 0) {
        bites.push(truncateText(current.join(' '), maxLength));
      }
      current = [sentence];
      continue;
    }

    current.push(sentence);
  }

  if (current.length > 0) {
    bites.push(truncateText(current.join(' '), maxLength));
  }

  return uniqueStrings(bites).filter((bite) => bite.length > 16);
}

function optionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function normalizeComparable(value: string) {
  return value.toLowerCase().replace(/\W+/g, ' ').trim();
}

function includesNormalized(source: string, target: string) {
  const sourceNorm = normalizeComparable(source);
  const targetNorm = normalizeComparable(target);
  return sourceNorm.includes(targetNorm) || targetNorm.includes(sourceNorm);
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const normalized = normalizeComparable(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(value.trim());
  }

  return unique;
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function stripEmbeddedMcqMetadata(value: string | undefined) {
  if (!value) {
    return '';
  }

  return normalizeSpaces(value.replace(/\s*\[MCQ_META:[A-Za-z0-9_-]+\]\s*$/g, ' '));
}

function parseEmbeddedMcqFromContext(value: string | undefined): McqPack | null {
  if (!value) {
    return null;
  }

  const match = value.match(/\[MCQ_META:([A-Za-z0-9_-]+)\]\s*$/);
  const encoded = match?.[1];
  if (!encoded) {
    return null;
  }

  try {
    const decoded = decodeBase64Url(encoded);
    const parsed = JSON.parse(decoded) as { options?: unknown; correctIndex?: unknown };
    if (!Array.isArray(parsed.options)) {
      return null;
    }

    const options = parsed.options
      .map((option) => normalizeSpaces(String(option)))
      .filter((option) => option.length > 0)
      .slice(0, 4);

    if (options.length < 2) {
      return null;
    }

    const correctIndex = typeof parsed.correctIndex === 'number'
      ? Math.min(Math.max(Math.trunc(parsed.correctIndex), 0), options.length - 1)
      : 0;

    return {
      options,
      correctIndex,
    };
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = `${normalized}${'='.repeat((4 - (normalized.length % 4)) % 4)}`;
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function stripPromptArtifacts(value: string) {
  return value
    .replace(/\b(?:detailed notes?|long paragraph|teacher notes?|chunk\s*\d+)\b/gi, ' ')
    .replace(/\(\s*(?:long paragraph|detailed notes?)\s*\)/gi, ' ')
    .replace(/[–-]\s*(?:detailed notes?|long paragraph)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeFlashcardPrompt(question: string, cardType: string, context?: string) {
  const cleaned = stripPromptArtifacts(normalizeSpaces(question));
  const contextFocus = extractFocusPhrase(context ?? '', 7);

  let prompt = cleaned;
  if (!prompt || prompt.length < 12) {
    const focus = contextFocus || cardType.replace('_', ' ') || 'this concept';
    prompt = `What should you explain about ${focus}`;
  }

  return ensureQuestionPrompt(truncateText(prompt, 180), 'What is the key idea you should recall?');
}

function normalizeFlashcardExplanation(answer: string) {
  const cleaned = normalizeSpaces(answer);
  if (!cleaned) {
    return 'State the core idea, explain why it works, and add one practical check.';
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .slice(0, 3);

  return truncateText((sentences.join(' ') || cleaned).trim(), 360);
}

function ensureQuestionPrompt(value: string, fallback: string) {
  const normalized = normalizeSpaces(value).replace(/[.!]+$/g, '').trim();
  const candidate = normalized || fallback.replace(/[.!]+$/g, '').trim();
  return candidate.endsWith('?') ? candidate : `${candidate}?`;
}

function extractFocusPhrase(value: string, maxWords: number) {
  const normalized = normalizeSpaces(value)
    .replace(/^step\s*\d+\s*[:.-]?\s*/i, '')
    .split(/(?<=[.!?])\s+/)[0]
    ?.replace(/^(however|therefore|thus|because|note that)\s*,?\s*/i, '')
    .trim();

  if (!normalized) {
    return '';
  }

  return truncateText(
    normalized
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, Math.max(maxWords, 1))
      .join(' '),
    72,
  );
}

function truncateText(value: string, maxLength: number) {
  const normalized = normalizeSpaces(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}
