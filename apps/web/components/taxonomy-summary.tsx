'use client';

import type { DeckTaxonomySummary, FlashcardCardType } from '@flashcard/types';

const taxonomyConfig: Array<{
  key: FlashcardCardType;
  label: string;
  shortLabel: string;
  tintClass: string;
  textClass: string;
}> = [
  { key: 'Concept', label: 'Concepts', shortLabel: 'C', tintClass: 'bg-emerald-50', textClass: 'text-emerald-700' },
  { key: 'Definition', label: 'Definitions', shortLabel: 'D', tintClass: 'bg-sky-50', textClass: 'text-sky-700' },
  {
    key: 'Relationship',
    label: 'Relationships',
    shortLabel: 'R',
    tintClass: 'bg-amber-50',
    textClass: 'text-amber-700',
  },
  {
    key: 'Edge_Case',
    label: 'Edge cases',
    shortLabel: 'E',
    tintClass: 'bg-rose-50',
    textClass: 'text-rose-700',
  },
  {
    key: 'Worked_Example',
    label: 'Worked examples',
    shortLabel: 'W',
    tintClass: 'bg-violet-50',
    textClass: 'text-violet-700',
  },
];

export function TaxonomySummary({
  summary,
  compact = false,
}: {
  summary: DeckTaxonomySummary;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-5' : 'sm:grid-cols-5'}`}>
      {taxonomyConfig.map((item) => (
        <div
          key={item.key}
          className={`rounded-md border border-zinc-200 px-2.5 py-2 ${item.tintClass}`}
          title={item.label}
        >
          <div className={`text-[11px] font-medium ${item.textClass}`}>{compact ? item.shortLabel : item.label}</div>
          <div className="mt-1 text-sm font-semibold text-zinc-900">{summary[item.key]}</div>
        </div>
      ))}
    </div>
  );
}

export function emptyTaxonomySummary(): DeckTaxonomySummary {
  return {
    Concept: 0,
    Definition: 0,
    Relationship: 0,
    Edge_Case: 0,
    Worked_Example: 0,
  };
}
