import { AppShell } from '../../components/app-shell';
import { DeckList } from '../../components/deck-list';
import { IngestionQualityShowcase } from '../../components/ingestion-quality-showcase';
import { ProgressStats } from '../../components/progress-stats';
import { UploadPdf } from '../../components/upload-pdf';

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="grid gap-8">
        <section className="teacher-paper lesson-fade-in rounded-[32px] px-6 py-8">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_320px] lg:items-start">
            <div>
              <p className="teacher-hand text-base text-teal-700">Today&apos;s lesson board</p>
              <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900">
                Teach the material, then train recall.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
                This workspace is meant to feel like a master teacher&apos;s notebook: guided notes, rich examples,
                visible progress, and decks that feel coached instead of auto-filled.
              </p>
            </div>
            <div className="teacher-sticky lesson-float rounded-[28px] px-5 py-5 text-amber-950">
              <p className="teacher-hand text-lg">Notebook rhythm</p>
              <ol className="mt-3 grid gap-2 text-sm leading-6">
                <li>1. Upload source material.</li>
                <li>2. Read the teacher notes.</li>
                <li>3. Review cards like a guided lesson.</li>
              </ol>
            </div>
          </div>
        </section>
        <IngestionQualityShowcase />
        <ProgressStats />
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <UploadPdf />
          <section className="grid gap-4">
            <div className="grid gap-1">
              <p className="teacher-hand text-sm text-teal-700">Shelf of lessons</p>
              <h2 className="text-2xl font-semibold text-zinc-900">Decks</h2>
              <p className="mt-1 text-sm text-zinc-600">Find a deck fast and see what needs attention.</p>
            </div>
            <DeckList />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
