'use client';

import { AppShell } from '../../components/app-shell';
import { DeckList } from '../../components/deck-list';

export default function ReviewPage() {
  return (
    <AppShell>
      <div className="grid gap-6">
        <div>
          <h1 className="text-3xl font-bold">Choose a deck</h1>
          <p className="mt-2 text-zinc-600">Pick a deck and start reviewing cards due soonest.</p>
        </div>
        <DeckList />
      </div>
    </AppShell>
  );
}
