'use client';

import type { TeacherNotes } from '@flashcard/types';

export function TeacherNotesPreview({
  notes,
  compact = false,
}: {
  notes: TeacherNotes | null | undefined;
  compact?: boolean;
}) {
  if (!notes) {
    return null;
  }

  return (
    <div className="teacher-paper grid gap-3 rounded-3xl px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="teacher-hand text-sm text-teal-700">Teacher preview</span>
        {notes.keyIdeas.length > 0 ? (
          <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-zinc-500">
            {notes.keyIdeas.length} key ideas
          </span>
        ) : null}
      </div>
      <p className={`pr-2 text-sm leading-7 text-zinc-700 ${compact ? 'line-clamp-3' : 'line-clamp-4'}`}>
        {notes.overview}
      </p>
      {notes.keyIdeas.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {notes.keyIdeas.slice(0, compact ? 2 : 3).map((idea, index) => (
            <span
              key={`${idea}-${index}`}
              className="rounded-full bg-white px-3 py-1 text-xs text-zinc-600 shadow-sm"
            >
              {idea}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
