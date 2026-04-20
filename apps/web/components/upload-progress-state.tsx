'use client';

import type { UploadProgress, UploadProgressStage } from '@flashcard/types';
import { Card, CardContent, CardHeader, CardTitle } from '@flashcard/ui';

const orderedStages: UploadProgressStage[] = [
  'parsing_pdf',
  'planning_concepts',
  'crafting_cards',
  'finalizing_deck',
  'completed',
];

const stageCopy: Record<UploadProgressStage, string> = {
  queued: 'Preparing upload...',
  parsing_pdf: 'Parsing PDF...',
  planning_concepts: 'Identifying core concepts...',
  crafting_cards: 'Crafting edge-case scenarios...',
  finalizing_deck: 'Finalizing deck...',
  completed: 'Deck ready.',
  failed: 'Upload failed.',
};

export function UploadProgressState({ progress }: { progress: UploadProgress | null | undefined }) {
  if (!progress) {
    return null;
  }

  const activeIndex = Math.max(orderedStages.indexOf(progress.stage), 0);

  return (
    <Card className="border-zinc-200 bg-white">
      <CardHeader>
        <CardTitle>Building your deck</CardTitle>
        <p className="text-sm text-zinc-600">{progress.message || stageCopy[progress.stage]}</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="h-2 overflow-hidden rounded-md bg-zinc-200">
          <div
            className={`h-full transition-all ${
              progress.stage === 'failed' ? 'bg-red-500' : 'bg-emerald-600'
            }`}
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
        <div className="grid gap-2">
          {orderedStages.map((stage, index) => {
            const isComplete = index < activeIndex || progress.stage === 'completed';
            const isActive = stage === progress.stage;
            return (
              <div
                key={stage}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                  isActive
                    ? 'border-emerald-200 bg-emerald-50'
                    : isComplete
                      ? 'border-zinc-200 bg-zinc-50'
                      : 'border-zinc-200 bg-white'
                }`}
              >
                <span className={isActive ? 'font-medium text-emerald-700' : 'text-zinc-700'}>
                  {stageCopy[stage]}
                </span>
                <span className="text-xs text-zinc-500">
                  {isActive ? 'Working' : isComplete ? 'Done' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
        {progress.error ? <p className="text-sm text-red-600">{progress.error}</p> : null}
      </CardContent>
    </Card>
  );
}
