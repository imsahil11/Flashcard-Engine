'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpenText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  NotebookTabs,
  XCircle,
} from 'lucide-react';
import type { Flashcard, ReviewRating, TeacherNotes } from '@flashcard/types';
import { useReview } from '../hooks/use-api';

type StudyMode = 'questions' | 'notes';

type NoteFlashcard = {
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

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  notes?: TeacherNotes | null;
}

export function FlashcardViewer({ flashcards, notes }: FlashcardViewerProps) {
  const [mode, setMode] = useState<StudyMode>('questions');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [noteIndex, setNoteIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  const review = useReview();

  const noteCards = useMemo(() => buildTeacherNoteFlashcards(notes), [notes]);

  const questionCards = useMemo<StageCard[]>(
    () =>
      flashcards.map((card, index) => ({
        id: card.id,
        eyebrow: card.cardType.replace('_', ' '),
        front: normalizeFlashcardPrompt(card.question, card.cardType, card.context),
        backTitle: 'Explanation',
        back: normalizeFlashcardExplanation(card.answer),
        context: stripEmbeddedMcqMetadata(card.context),
        mcq: buildMcqPackFromCards(flashcards, index),
      })),
    [flashcards],
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

  const activeCards = mode === 'questions' ? questionCards : noteStageCards;
  const activeIndex = mode === 'questions' ? questionIndex : noteIndex;
  const activeCard = activeCards[activeIndex] ?? null;
  const activeQuestion = flashcards[questionIndex] ?? null;

  useEffect(() => {
    if (questionIndex > questionCards.length - 1) {
      setQuestionIndex(Math.max(questionCards.length - 1, 0));
    }
  }, [questionCards.length, questionIndex]);

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

  function goPrevious() {
    if (mode === 'questions') {
      setQuestionIndex((current) => Math.max(current - 1, 0));
      return;
    }

    setNoteIndex((current) => Math.max(current - 1, 0));
  }

  function goNext() {
    if (mode === 'questions') {
      setQuestionIndex((current) => Math.min(current + 1, Math.max(questionCards.length - 1, 0)));
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
      setQuestionIndex((current) => Math.min(current + 1, Math.max(questionCards.length - 1, 0)));
    } catch {
      // Error is handled by React Query state.
    }
  }

  return (
    <section className="rounded-[28px] border border-[#ddd8cb] bg-white/95 p-4 shadow-[0_16px_40px_rgba(13,13,13,0.07)] md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex h-11 items-center rounded-full border border-[#ddd8cb] bg-[#efeee8] p-1">
          <button
            type="button"
            onClick={() => setMode('questions')}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
              mode === 'questions'
                ? 'bg-white text-[#0b0b0b] shadow-[0_8px_16px_rgba(13,13,13,0.12)]'
                : 'text-[#5b574d]'
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
                ? 'bg-white text-[#0b0b0b] shadow-[0_8px_16px_rgba(13,13,13,0.12)]'
                : 'text-[#5b574d]'
            } disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <NotebookTabs className="h-4 w-4" />
            Notes
          </button>
        </div>

        <div className="rounded-full border border-[#ddd8cb] bg-[#f7f6f2] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#5b574d]">
          {mode === 'questions'
            ? `${questionIndex + 1}/${Math.max(questionCards.length, 1)}`
            : `${noteIndex + 1}/${Math.max(noteStageCards.length, 1)}`}
        </div>
      </div>

      <ThreeDDeckCardStage
        cards={activeCards}
        index={activeIndex}
        flipped={isFlipped}
        selectedChoice={selectedChoice}
        onFlip={() => setIsFlipped((value) => !value)}
        onSelectChoice={onChooseOption}
        emptyMessage={
          mode === 'questions'
            ? 'No question flashcards available yet.'
            : 'No note flashcards available yet.'
        }
      />

      {activeCards.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={goPrevious}
              disabled={activeIndex <= 0}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#ddd8cb] bg-white px-4 text-sm font-semibold text-[#0b0b0b] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={activeIndex >= activeCards.length - 1}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#ddd8cb] bg-white px-4 text-sm font-semibold text-[#0b0b0b] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsFlipped((value) => !value)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#3851e7] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(56,81,231,0.28)]"
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ddd8cb] bg-white text-sm font-semibold text-[#0b0b0b] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {rating}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'questions' && activeCard?.mcq && !isFlipped ? (
        <p className="mt-4 text-sm text-[#5b574d]">
          Tap an option on the card to reveal the explanation and see if your choice was correct.
        </p>
      ) : null}
    </section>
  );
}

function ThreeDDeckCardStage({
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
      <div className="rounded-2xl border border-dashed border-[#ddd8cb] bg-[#efeee8] px-5 py-10 text-center text-sm text-[#5b574d]">
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
          className="pointer-events-none absolute left-6 right-6 top-[52px] h-[400px] rounded-[28px] border border-[#ddd8cb] bg-white/75 md:h-[430px]"
          style={{ transform: 'translateZ(-140px) translateY(24px) scale(0.93)' }}
        />
      ) : null}

      {shadowOne ? (
        <div
          className="pointer-events-none absolute left-4 right-4 top-[36px] h-[430px] rounded-[28px] border border-[#ddd8cb] bg-white/85 md:h-[470px]"
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
        className="relative h-[500px] w-full rounded-[30px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3851e7] md:h-[540px]"
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div
            className="absolute inset-0 flex h-full flex-col overflow-hidden rounded-[30px] border border-[#ddd8cb] bg-white px-7 py-7 shadow-[0_24px_56px_rgba(13,13,13,0.14)]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b574d]">{current.eyebrow}</p>
            <p className="mt-4 break-words text-xl font-semibold leading-8 text-[#0b0b0b] md:text-[1.85rem] md:leading-[2.45rem]">
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
                          ? 'border-[#3851e7] bg-[rgba(56,81,231,0.08)] text-[#0b0b0b]'
                          : 'border-[#ddd8cb] bg-[#f7f6f2] text-[#0b0b0b] hover:border-[#3851e7]'
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
              <p className="mt-5 text-sm font-medium text-[#5b574d]">Tap card or press Show explanation to flip.</p>
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

function buildTeacherNoteFlashcards(notes: TeacherNotes | null | undefined): NoteFlashcard[] {
  if (!notes) {
    return [];
  }

  const cards: NoteFlashcard[] = [];

  splitTeachingBites(notes.overview, 2, 240).forEach((bite, biteIndex) => {
    const focus = extractFocusPhrase(bite, 7);
    cards.push({
      id: `note-overview-${biteIndex}`,
      section: 'Overview',
      prompt: biteIndex === 0
        ? ensureQuestionPrompt(
            focus ? `What is the central idea behind ${focus}` : 'What is the central idea and why does it matter',
            'What is the central idea and why does it matter?',
          )
        : ensureQuestionPrompt(
            focus
              ? `What practical takeaway about ${focus} should you remember`
              : 'What practical takeaway should you remember from this overview',
            'What practical takeaway should you remember from this overview?',
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
      `Define ${focus}, explain how it works, and provide one practical implication.`;

    splitTeachingBites(sourceNote, 2, 250).forEach((bite, biteIndex) => {
      cards.push({
        id: `note-key-${index}-${biteIndex}`,
        section: 'Key Idea',
        prompt: biteIndex === 0
          ? `Teach this concept: ${focus}`
          : `What detail helps you apply ${focus} confidently?`,
        note: bite,
      });
    });
  });

  notes.misconceptions.forEach((item, index) => {
    splitTeachingBites(item, 2, 240).forEach((bite, biteIndex) => {
      const focus = extractFocusPhrase(bite, 6);
      cards.push({
        id: `note-mis-${index}-${biteIndex}`,
        section: 'Misconception',
        prompt: biteIndex === 0
          ? ensureQuestionPrompt(
              focus
                ? `What is the common misunderstanding about ${focus} and the correction`
                : 'What is the common misunderstanding and the correction',
              'What is the common misunderstanding and the correction?',
            )
          : ensureQuestionPrompt(
              focus
                ? `Why does the misconception about ${focus} feel convincing at first`
                : 'Why does this misconception feel convincing at first',
              'Why does this misconception feel convincing at first?',
            ),
        note: bite,
      });
    });
  });

  notes.workedExamples.forEach((item, index) => {
    splitTeachingBites(item, 2, 260).forEach((bite, biteIndex) => {
      const focus = extractFocusPhrase(bite, 7);
      cards.push({
        id: `note-work-${index}-${biteIndex}`,
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
                ? `What checkpoint verifies the ${focus} method is correct`
                : 'What checkpoint verifies the method is correct',
              'What checkpoint verifies the method is correct?',
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
      id: `note-cue-${index}`,
      section: 'Exam Cue',
      prompt: ensureQuestionPrompt(text, 'What should you explain from this exam cue?'),
      note: 'Answer with definition, mechanism, distinctions, and one edge case when relevant.',
    });
  });

  return cards.slice(0, 36);
}

function buildMcqPackFromCards(
  cards: Array<Pick<Flashcard, 'id' | 'question' | 'answer' | 'context'>>,
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
