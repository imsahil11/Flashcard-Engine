'use client';

import type { DeckProgress } from '@flashcard/types';
import { cn } from '@flashcard/ui';

type MasteryBreakdown = Pick<DeckProgress, 'total' | 'mastered' | 'learning' | 'new'>;

type SegmentKey = 'mastered' | 'learning' | 'new';

type Segment = {
  key: SegmentKey;
  label: string;
  value: number;
  percentage: number;
  colorClass: string;
  tintClass: string;
  textClass: string;
  colorHex: string;
};

const segmentConfig: Record<
  SegmentKey,
  Omit<Segment, 'value' | 'percentage'>
> = {
  mastered: {
    key: 'mastered',
    label: 'Mastered',
    colorClass: 'bg-emerald-600',
    tintClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    colorHex: '#059669',
  },
  learning: {
    key: 'learning',
    label: 'Learning',
    colorClass: 'bg-sky-500',
    tintClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    colorHex: '#0ea5e9',
  },
  new: {
    key: 'new',
    label: 'New',
    colorClass: 'bg-zinc-400',
    tintClass: 'bg-zinc-100',
    textClass: 'text-zinc-700',
    colorHex: '#a1a1aa',
  },
};

export function getMasterySegments(progress: MasteryBreakdown): Segment[] {
  const total = Math.max(progress.total, 1);

  return (Object.keys(segmentConfig) as SegmentKey[]).map((key) => ({
    ...segmentConfig[key],
    value: progress[key],
    percentage: (progress[key] / total) * 100,
  }));
}

export function MasteryRing({
  progress,
  size = 96,
  valueLabel,
  detailLabel,
}: {
  progress: MasteryBreakdown;
  size?: number;
  valueLabel: string;
  detailLabel: string;
}) {
  const segments = getMasterySegments(progress);
  const ringFill = createConicGradient(segments);
  const innerSize = Math.max(size - 26, 0);

  return (
    <div
      aria-hidden="true"
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: ringFill,
      }}
    >
      <div
        className="grid place-items-center rounded-full bg-white text-center"
        style={{ width: `${innerSize}px`, height: `${innerSize}px` }}
      >
        <span className="text-lg font-semibold leading-none">{valueLabel}</span>
        <span className="mt-1 text-[11px] text-zinc-500">{detailLabel}</span>
      </div>
    </div>
  );
}

export function MasteryBar({ progress }: { progress: MasteryBreakdown }) {
  const segments = getMasterySegments(progress);

  return (
    <div className="h-3 overflow-hidden rounded-md bg-zinc-200">
      <div className="flex h-full w-full">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={segment.colorClass}
            style={{ width: `${segment.percentage}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function MasteryLegend({
  progress,
  dense = false,
}: {
  progress: MasteryBreakdown;
  dense?: boolean;
}) {
  const segments = getMasterySegments(progress);

  return (
    <div className={cn('grid gap-2', dense ? 'sm:grid-cols-3' : 'md:grid-cols-3')}>
      {segments.map((segment) => (
        <div
          key={segment.key}
          className={cn(
            'grid gap-1 rounded-md border border-zinc-200 px-3 py-2',
            segment.tintClass,
            dense && 'px-2.5 py-2',
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-sm', segment.colorClass)} />
            <span className="text-xs font-medium text-zinc-700">{segment.label}</span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <span className={cn('text-base font-semibold leading-none', segment.textClass)}>
              {segment.value}
            </span>
            <span className="text-xs text-zinc-500">{Math.round(segment.percentage)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function createConicGradient(segments: Segment[]) {
  let current = 0;

  const stops = segments
    .filter((segment) => segment.percentage > 0)
    .map((segment) => {
      const start = current;
      current += segment.percentage;
      return `${segment.colorHex} ${start}% ${current}%`;
    });

  return stops.length > 0
    ? `conic-gradient(${stops.join(', ')})`
    : 'conic-gradient(#e4e4e7 0% 100%)';
}
