'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@flashcard/ui';
import { useDecks } from '../hooks/use-api';
import { MasteryBar, MasteryLegend, MasteryRing } from './mastery-visual';
import { TaxonomySummary, emptyTaxonomySummary } from './taxonomy-summary';
import { TeacherNotesPreview } from './teacher-notes-preview';

export function ProgressStats() {
  const { data: decks = [], isLoading, error } = useDecks();
  const totalCards = decks.reduce((sum, deck) => sum + (deck.flashcardCount ?? 0), 0);
  const reviewsNeeded = decks.reduce((sum, deck) => sum + (deck.progress?.reviewsNeeded ?? 0), 0);
  const mastered = decks.reduce((sum, deck) => sum + (deck.progress?.mastered ?? 0), 0);
  const learning = decks.reduce((sum, deck) => sum + (deck.progress?.learning ?? 0), 0);
  const newCards = decks.reduce((sum, deck) => sum + (deck.progress?.new ?? 0), 0);
  const masteryRate = Math.round((mastered / Math.max(totalCards, 1)) * 100);
  const taxonomySummary = decks.reduce(
    (summary, deck) => {
      const deckSummary = deck.taxonomySummary ?? emptyTaxonomySummary();
      summary.Concept += deckSummary.Concept;
      summary.Definition += deckSummary.Definition;
      summary.Relationship += deckSummary.Relationship;
      summary.Edge_Case += deckSummary.Edge_Case;
      summary.Worked_Example += deckSummary.Worked_Example;
      return summary;
    },
    emptyTaxonomySummary(),
  );
  const featuredDeck = decks.find((deck) => deck.teacherNotes) ?? null;

  if (error) {
    return <p className="text-sm text-red-600">{error.message}</p>;
  }

  const statCards = [
    { title: decks.length, label: 'Active decks' },
    { title: totalCards, label: 'Flashcards generated' },
    { title: reviewsNeeded, label: 'Reviews needed today' },
    { title: `${masteryRate}%`, label: 'Mastery rate' },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {statCards.map((card) => (
        <Card key={card.label} className="teacher-paper border-0 bg-transparent">
          <CardHeader className="pb-3">
            <span className="teacher-hand text-sm text-teal-700">{card.label}</span>
            <CardTitle>
              {isLoading ? <span className="block h-8 w-16 animate-pulse rounded-md bg-zinc-200" /> : card.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-600">Live notebook metric</CardContent>
        </Card>
      ))}

      <Card className="teacher-paper overflow-hidden border-0 bg-transparent lg:col-span-4">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="teacher-hand text-sm text-teal-700">Notebook analytics</p>
            <CardTitle>Mastery snapshot</CardTitle>
            <p className="text-sm text-zinc-600">Every deck in one view, from first-pass cards to long-term recall.</p>
          </div>
          <MasteryRing
            progress={{ total: totalCards, mastered, learning, new: newCards }}
            size={112}
            valueLabel={isLoading ? '' : `${masteryRate}%`}
            detailLabel={isLoading ? 'loading' : totalCards === 0 ? 'no cards yet' : 'mastered'}
          />
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-800">Card distribution</span>
            <span className="text-zinc-500">{totalCards} total cards</span>
          </div>
          <MasteryBar progress={{ total: totalCards, mastered, learning, new: newCards }} />
          <MasteryLegend progress={{ total: totalCards, mastered, learning, new: newCards }} />
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-zinc-800">Teacher-quality mix</span>
              <span className="text-zinc-500">all decks</span>
            </div>
            <TaxonomySummary summary={taxonomySummary} />
          </div>
          {featuredDeck?.teacherNotes ? (
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-800">Featured teaching note</span>
                <span className="text-zinc-500">{featuredDeck.title}</span>
              </div>
              <TeacherNotesPreview notes={featuredDeck.teacherNotes} />
            </div>
          ) : null}
          {!isLoading && totalCards === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-4 py-3 text-sm text-zinc-600">
              No study data yet. Upload a PDF to create your first deck and start building progress.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
