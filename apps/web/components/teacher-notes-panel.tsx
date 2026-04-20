'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Loader2, Sparkles } from 'lucide-react';
import type { TeacherNotes } from '@flashcard/types';

// ─── motion presets ──────────────────────────────────────────────────────────
const SPRING = { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 } as const;
const SPRING_SLOW = { type: 'spring', stiffness: 280, damping: 28, mass: 1 } as const;

// ─── palette ─────────────────────────────────────────────────────────────────
const SECTIONS = {
  detailedNotes:  { emoji: '📝', label: 'Detailed Notes',   accent: '#5B4FE8', tab: 'bg-indigo-50  border-indigo-200 text-indigo-700',  rule: 'border-l-indigo-400',  dot: 'bg-indigo-400' },
  misconceptions: { emoji: '⚠️', label: 'Watch Out',        accent: '#D97706', tab: 'bg-amber-50   border-amber-200  text-amber-700',   rule: 'border-l-amber-400',   dot: 'bg-amber-400'  },
  workedExamples: { emoji: '🔬', label: 'Worked Examples',  accent: '#059669', tab: 'bg-emerald-50 border-emerald-200 text-emerald-700', rule: 'border-l-emerald-400', dot: 'bg-emerald-400' },
  examCues:       { emoji: '🎯', label: 'Exam Cues',        accent: '#E11D48', tab: 'bg-rose-50    border-rose-200   text-rose-700',    rule: 'border-l-rose-400',    dot: 'bg-rose-400'   },
} as const;
type SectionKey = keyof typeof SECTIONS;

// ─── Animated height helper ───────────────────────────────────────────────────
// Animates height 0 → auto without ever blocking inner scroll.
// Key: overflow is 'hidden' during collapse animation only; 'auto' when open.
function CollapsePanel({ open, children }: { open: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1, transition: reduced ? { duration: 0 } : SPRING_SLOW }}
          exit={{ height: 0, opacity: 0, transition: { ...SPRING_SLOW, stiffness: 380 } }}
          // ← overflow MUST be visible/auto once open so inner scrolls work
          style={{ overflowY: open ? 'visible' : 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Single note card — click anywhere to expand ─────────────────────────────
function NoteCard({ text, ruleClass, dotClass, index }: { text: string; ruleClass: string; dotClass: string; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_CHARS = 180;
  const isLong = text.length > PREVIEW_CHARS;
  const preview = isLong && !expanded ? text.slice(0, PREVIEW_CHARS).trimEnd() : text;

  return (
    <motion.div
      initial={{ x: -14, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ ...SPRING, delay: index * 0.04 }}
      onClick={() => isLong && setExpanded((p) => !p)}
      className={`group relative border-l-[3px] ${ruleClass} bg-[#fefcf6] transition-colors duration-150 ${isLong ? 'cursor-pointer hover:bg-[#f7f4ee]' : ''}`}
    >
      {/* Ruled lines */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(transparent, transparent 27px, #d6ccba44 27px, #d6ccba44 28px)',
          backgroundPositionY: '12px',
        }}
      />
      {/* Dot */}
      <span className={`absolute -left-[5px] top-4 h-2.5 w-2.5 rounded-full border-2 border-[#fefcf6] ${dotClass}`} />

      {/* Text */}
      <div className="relative px-4 pt-3 pb-2">
        <p
          className="text-[15px] leading-7 text-slate-700"
          style={{ fontFamily: 'Caveat, cursive', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {preview}
          {isLong && !expanded && <span className="text-slate-400">…</span>}
        </p>
      </div>

      {/* Expand bar */}
      {isLong && (
        <div
          className={`relative flex items-center justify-center gap-1.5 border-t border-[#d6ccba55] py-1.5 transition-colors duration-150 ${
            expanded ? 'text-indigo-400 group-hover:text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'
          }`}
          style={{ fontFamily: 'Caveat, cursive', fontSize: '13px', fontWeight: 600 }}
        >
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={SPRING} className="inline-flex">
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.span>
          {expanded ? 'Show less' : 'Click to read full note'}
        </div>
      )}
    </motion.div>
  );
}


// ─── Scrollable collapsible section ──────────────────────────────────────────
function NoteSection({ sectionKey, items }: { sectionKey: SectionKey; items: string[] }) {
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const s = SECTIONS[sectionKey];
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#d6ccba] shadow-[0_2px_12px_rgba(0,0,0,0.05)]">

      {/* ── Tab header ── */}
      <motion.button
        type="button"
        onClick={() => setOpen((p) => !p)}
        whileHover={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
        whileTap={{ scale: 0.985 }}
        transition={SPRING}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left border-b border-[#d6ccba] ${s.tab}`}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{s.emoji}</span>
          <span className="text-[15px] font-semibold" style={{ fontFamily: 'Caveat, cursive' }}>
            {s.label}
          </span>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold">
            {items.length}
          </span>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={SPRING}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/50"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.span>
      </motion.button>

      {/* ── Body: animated height, scrollable list ── */}
      <CollapsePanel open={open}>
        {/*
          Scroll container: fixed max-height so the list scrolls independently.
          The CollapsePanel parent is overflow:visible once open so this scroll works.
        */}
        <div
          ref={scrollRef}
          className="overflow-y-auto"
          style={{
            maxHeight: 380,
            scrollbarWidth: 'thin',
            scrollbarColor: '#d6ccba transparent',
          }}
        >
          <div className="divide-y divide-[#d6ccba55]">
            {items.map((item, i) => (
              <NoteCard
                key={i}
                index={i}
                text={item}
                ruleClass={s.rule}
                dotClass={s.dot}
              />
            ))}
          </div>

          {/* Scroll-hint gradient — only visible when list is longer than viewport */}
          {items.length > 3 && (
            <div className="sticky bottom-0 h-6 bg-gradient-to-t from-[#fefcf6] to-transparent pointer-events-none" />
          )}
        </div>
      </CollapsePanel>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
type TeacherNotesPanelProps = {
  notes: TeacherNotes | null | undefined;
  isGenerating?: boolean;
  onGenerate?: () => void;
};

// ─── Main panel ───────────────────────────────────────────────────────────────
export function TeacherNotesPanel({ notes, isGenerating = false, onGenerate }: TeacherNotesPanelProps) {
  const [sectionsOpen, setSectionsOpen] = useState(false);

  // ── Generating state ──────────────────────────────────────────────────────
  if (isGenerating && !notes) {
    return (
      <div className="relative overflow-hidden rounded-[30px] border border-[#d6ccba] px-8 py-12 shadow-[0_18px_40px_rgba(13,13,13,0.06)]" style={{ background: '#fefcf6' }}>
        <RuledLines />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <motion.div
            animate={{ rotate: [0, 15, -15, 10, -10, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="text-5xl"
          >📓</motion.div>
          <p className="text-xl text-slate-600" style={{ fontFamily: 'Caveat, cursive' }}>
            Your teacher is writing notes…
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analysing every concept in depth
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!notes) {
    return (
      <div className="relative overflow-hidden rounded-[30px] border border-[#d6ccba] shadow-[0_18px_40px_rgba(13,13,13,0.06)]" style={{ background: '#fefcf6' }}>
        <RuledLines />
        <div className="relative flex flex-col items-center gap-5 px-8 py-10 text-center sm:flex-row sm:text-left">
          <motion.div
            animate={{ rotate: [0, -4, 4, -2, 2, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
            className="text-5xl"
          >📓</motion.div>
          <div className="flex-1">
            <p className="text-2xl text-slate-600" style={{ fontFamily: 'Caveat, cursive' }}>No teacher notes yet</p>
            <p className="mt-1 text-sm leading-7 text-slate-500">
              Click generate to get a deep, handwritten-style breakdown of every concept.
            </p>
          </div>
          {onGenerate && (
            <motion.button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={SPRING}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(91,79,232,0.36)] disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />Generate Notes
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  const hasDetails =
    notes.detailedNotes.length > 0 ||
    notes.misconceptions.length > 0 ||
    notes.workedExamples.length > 0 ||
    notes.examCues.length > 0;

  // ── Notes available ───────────────────────────────────────────────────────
  return (
    <div
      className="relative rounded-[30px] border border-[#d6ccba] shadow-[0_18px_40px_rgba(13,13,13,0.06)]"
      style={{ background: '#fefcf6' }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap');`}</style>
      <RuledLines />
      {/* Red margin */}
      <div className="pointer-events-none absolute bottom-0 left-[68px] top-0 w-px bg-rose-300/40" />

      {/* ── Header ── */}
      <div className="relative flex items-start justify-between gap-4 px-8 pb-5 pt-7">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <motion.span
            className="mt-1 shrink-0 text-3xl"
            animate={{ rotate: [0, -6, 6, -3, 3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
          >📓</motion.span>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Teacher Notes</p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.08 }}
              className="mt-2 text-[17px] leading-8 text-slate-700"
              style={{ fontFamily: 'Caveat, cursive' }}
            >
              {notes.overview}
            </motion.p>

            {notes.keyIdeas.length > 0 && (
              <motion.div
                className="mt-4 flex flex-wrap gap-2"
                initial="hidden" animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.055 } } }}
              >
                {notes.keyIdeas.map((idea, i) => (
                  <motion.span
                    key={i}
                    variants={{ hidden: { opacity: 0, scale: 0.8, y: 6 }, show: { opacity: 1, scale: 1, y: 0 } }}
                    transition={SPRING}
                    whileHover={{ y: -2, scale: 1.04 }}
                    className="inline-block rounded-sm border border-yellow-300 bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800 shadow-[2px_2px_0_rgba(0,0,0,0.07)] cursor-default"
                    style={{ fontFamily: 'Caveat, cursive', fontSize: '13px' }}
                  >
                    {idea}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {onGenerate && (
            <motion.button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              transition={SPRING}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d6ccba] bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {isGenerating ? 'Regenerating…' : 'Regenerate'}
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Sections toggle ── */}
      {hasDetails && (
        <>
          <motion.button
            type="button"
            onClick={() => setSectionsOpen((p) => !p)}
            whileTap={{ scale: 0.98 }}
            transition={SPRING}
            className="relative flex w-full items-center justify-center gap-2 border-t border-[#d6ccba] py-3 text-slate-400 hover:text-indigo-500"
            aria-expanded={sectionsOpen}
          >
            <motion.span animate={{ rotate: sectionsOpen ? 180 : 0 }} transition={SPRING}>
              <ChevronDown className="h-4 w-4" />
            </motion.span>
            <span style={{ fontFamily: 'Caveat, cursive', fontSize: '15px' }}>
              {sectionsOpen ? 'Hide detailed notes' : 'Show detailed notes, misconceptions & exam cues'}
            </span>
          </motion.button>

          {/* Grid of sections — CollapsePanel handles height animation */}
          <CollapsePanel open={sectionsOpen}>
            <motion.div
              className="grid gap-4 px-6 pb-6 pt-2 md:grid-cols-2"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            >
              {(
                [
                  ['detailedNotes',  notes.detailedNotes],
                  ['misconceptions', notes.misconceptions],
                  ['workedExamples', notes.workedExamples],
                  ['examCues',       notes.examCues],
                ] as [SectionKey, string[]][]
              ).map(([key, items]) =>
                items.length > 0 ? (
                  <motion.div
                    key={key}
                    variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
                    transition={SPRING}
                  >
                    <NoteSection sectionKey={key} items={items} />
                  </motion.div>
                ) : null
              )}
            </motion.div>
          </CollapsePanel>
        </>
      )}
    </div>
  );
}

// ─── Notebook ruled lines ─────────────────────────────────────────────────────
function RuledLines() {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[30px] opacity-[0.17]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(transparent, transparent 31px, #c8c0a8 31px, #c8c0a8 32px)',
        backgroundPositionY: '80px',
      }}
    />
  );
}
