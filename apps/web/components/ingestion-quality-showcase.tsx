'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';

const coveragePillars = [
  'Key concepts',
  'Definitions',
  'Relationships',
  'Edge cases',
  'Worked examples'
];

const sceneCards = [
  {
    label: 'Definition',
    prompt: 'Q: What is opportunity cost?',
    answer: 'A: The value of the next best alternative you give up when choosing something else.'
  },
  {
    label: 'Relationship',
    prompt: 'Q: How does increased demand affect equilibrium price and quantity?',
    answer: 'A: Both usually rise, assuming supply stays the same.'
  },
  {
    label: 'Edge case',
    prompt: 'Q: When can a price ceiling fail to lower prices for consumers?',
    answer: 'A: If it is set above the market equilibrium, it is non-binding and changes nothing.'
  },
  {
    label: 'Worked example',
    prompt: 'Q: A cafe chooses rent over a smaller location. What hidden cost should the owner compare?',
    answer: 'A: The profit they could have earned from the next best location or use of that money.'
  }
];

const productSignals = [
  {
    eyebrow: 'Spaced repetition',
    value: 'Smart review cadence',
    detail: 'Known cards fade back. Shaky cards return sooner.'
  },
  {
    eyebrow: 'Progress and mastery',
    value: 'Clear momentum',
    detail: 'Show mastered, shaky, and upcoming review without overload.'
  },
  {
    eyebrow: 'Deck management',
    value: 'Find any deck fast',
    detail: 'Browse, search, revisit, and continue where you left off.'
  },
  {
    eyebrow: 'Delight',
    value: 'Memorable experience',
    detail: 'Motion, clarity, and polish make studying feel alive.'
  }
];

export function IngestionQualityShowcase() {
  const [tilt, setTilt] = useState({ x: -10, y: 16 });

  return (
    <section className="teacher-paper lesson-fade-in overflow-hidden rounded-[36px] px-6 py-8 lg:px-8 lg:py-10">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="relative z-10">
          <p className="teacher-hand text-base text-teal-700">Ingestion quality</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Better source understanding creates cards that feel taught, not scraped.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            A lazy approach gives you 10 shallow cards. A great approach gives you cards that cover the
            material comprehensively: key concepts, definitions, relationships, edge cases, worked examples.
            Cards that feel like they were written by a great teacher, not scraped by a bot.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {coveragePillars.map((pillar) => (
              <span
                key={pillar}
                className="rounded-full border border-teal-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
              >
                {pillar}
              </span>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-rose-200/80 bg-rose-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Lazy ingestion</p>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Generic prompts, weak coverage, and cards that test trivia instead of understanding.
              </p>
            </div>
            <div className="rounded-[24px] border border-teal-200/80 bg-teal-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Teacher-quality</p>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Strong question-answer pairs, broad coverage, and prompts that coach reasoning, not copying.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {productSignals.map((signal) => (
              <div key={signal.eyebrow} className="rounded-[22px] border border-white/70 bg-white/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  {signal.eyebrow}
                </p>
                <p className="mt-2 text-base font-semibold text-zinc-900">{signal.value}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{signal.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="ingestion-stage"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width;
            const py = (event.clientY - rect.top) / rect.height;

            setTilt({
              x: (py - 0.5) * -18,
              y: (px - 0.5) * 26
            });
          }}
          onMouseLeave={() => setTilt({ x: -10, y: 16 })}
        >
          <div className="ingestion-glow ingestion-glow-a" />
          <div className="ingestion-glow ingestion-glow-b" />
          <div
            className="ingestion-stack"
            style={{
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
            }}
          >
            {sceneCards.map((card, index) => (
              <article
                key={card.prompt}
                className="ingestion-card"
                style={
                  {
                    '--card-index': index,
                    '--card-depth': `${index * 52}px`
                  } as CSSProperties
                }
              >
                <div className="ingestion-card-face ingestion-card-front">
                  <span className="ingestion-card-label">{card.label}</span>
                  <span className="ingestion-card-side">Prompt</span>
                  <h3>{card.prompt}</h3>
                  <p>Hover to reveal the teacher-quality answer.</p>
                </div>
                <div className="ingestion-card-face ingestion-card-back">
                  <span className="ingestion-card-label">{card.label}</span>
                  <span className="ingestion-card-side">Answer</span>
                  <h3>{card.answer}</h3>
                  <p>Strong cards stay concise, accurate, and grounded in understanding.</p>
                </div>
              </article>
            ))}
            <div className="ingestion-ring ingestion-ring-a" />
            <div className="ingestion-ring ingestion-ring-b" />
          </div>
          <div className="ingestion-caption">
            <span className="ingestion-caption-dot" />
            Comprehension expands deck coverage before memorization begins.
          </div>
        </div>
      </div>
    </section>
  );
}
