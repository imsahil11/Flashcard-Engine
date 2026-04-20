'use client';

import type { TeacherNotes } from '@flashcard/types';
import { Card, CardContent, CardHeader, CardTitle } from '@flashcard/ui';

export function TeacherNotesPanel({ notes }: { notes: TeacherNotes | null | undefined }) {
  if (!notes) {
    return null;
  }

  return (
    <Card className="teacher-paper lesson-fade-in border-0 bg-transparent">
      <CardHeader className="relative gap-4 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid gap-2">
            <span className="teacher-hand text-sm text-teal-700">Master teacher notes</span>
            <CardTitle className="teacher-accent inline-block w-fit text-2xl text-zinc-900">
              Study this like a guided lesson
            </CardTitle>
            <p className="max-w-3xl text-sm leading-6 text-zinc-600">
              These notes are meant to coach the student before memorization begins, so the deck feels taught instead of scraped.
            </p>
          </div>
          <div className="teacher-sticky lesson-float max-w-xs rounded-2xl px-4 py-3 text-sm text-amber-900">
            <p className="teacher-hand text-base">Teacher tip</p>
            <p className="mt-1 leading-6">
              Read the overview first, then scan misconceptions before you flip the first card.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 pb-8">
        <section className="grid gap-3 rounded-3xl border border-amber-100 bg-white/80 px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="teacher-hand text-lg text-teal-800">Overview</h3>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">
              Lesson map
            </span>
          </div>
          <p className="text-sm leading-7 text-zinc-700">{notes.overview}</p>
        </section>
        <NotesList title="Key Ideas" items={notes.keyIdeas} />
        <NotesList title="Detailed Notes" items={notes.detailedNotes} />
        <NotesList title="Misconceptions" items={notes.misconceptions} />
        <NotesList title="Worked Examples" items={notes.workedExamples} />
        <NotesList title="Exam Cues" items={notes.examCues} />
      </CardContent>
    </Card>
  );
}

function NotesList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="teacher-hand text-lg text-zinc-900">{title}</h3>
        <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
          {items.length} note{items.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="grid gap-2">
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="lesson-reveal rounded-2xl border border-zinc-200/80 bg-white/85 px-4 py-3 text-sm leading-7 text-zinc-700"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
