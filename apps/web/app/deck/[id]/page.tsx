'use client';

import { AppShell } from '../../../components/app-shell';
import { FlashcardViewer } from '../../../components/flashcard-viewer';
import { TeacherNotesPanel } from '../../../components/teacher-notes-panel';
import { useDeck, useFlashcards } from '../../../hooks/use-api';

export default function DeckPage({ params }: { params: { id: string } }) {
  const deckQuery = useDeck(params.id);
  const flashcardsQuery = useFlashcards(params.id);

  return (
    <AppShell>
      <div className="grid gap-6">
        <div>
          <h1 className="text-3xl font-bold">{deckQuery.data?.title ?? 'Deck review'}</h1>
          <p className="mt-2 text-zinc-600">
            Read the teacher notes, then move through the deck and rate recall quality from 1 to 5.
          </p>
        </div>
        {deckQuery.isLoading ? <p className="text-sm text-zinc-600">Loading deck notes...</p> : null}
        {deckQuery.error ? <p className="text-sm text-red-600">{deckQuery.error.message}</p> : null}
        <TeacherNotesPanel notes={deckQuery.data?.teacherNotes} />
        {flashcardsQuery.isLoading ? <p className="text-sm text-zinc-600">Loading flashcards...</p> : null}
        {flashcardsQuery.error ? <p className="text-sm text-red-600">{flashcardsQuery.error.message}</p> : null}
        {flashcardsQuery.data ? <FlashcardViewer flashcards={flashcardsQuery.data} /> : null}
      </div>
    </AppShell>
  );
}
