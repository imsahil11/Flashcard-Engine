'use client';

import { FormEvent, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@flashcard/ui';
import { useUploadPdf, useUploadProgress } from '../hooks/use-api';
import { UploadProgressState } from './upload-progress-state';

export function UploadPdf() {
  const upload = useUploadPdf();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const progressQuery = useUploadProgress(activeUploadId ?? undefined, Boolean(activeUploadId));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      return;
    }

    const formData = new FormData();
    const uploadId = createUploadId();
    formData.set('file', file);
    formData.set('uploadId', uploadId);
    if (title) {
      formData.set('title', title);
    }

    setActiveUploadId(uploadId);
    let uploadSucceeded = false;

    try {
      await upload.mutateAsync({ formData, uploadId });
      uploadSucceeded = true;
    } catch {
      // Error state is surfaced by React Query through upload.error.
    } finally {
      window.setTimeout(() => setActiveUploadId(null), 2500);
    }

    if (uploadSucceeded) {
      setTitle('');
      setFile(null);
    }
  }

  return (
    <div className="grid gap-4">
      <Card className="teacher-paper border-0 bg-transparent">
        <CardHeader className="gap-3">
          <p className="teacher-hand text-sm text-teal-700">Create a new lesson</p>
          <CardTitle>Upload PDF</CardTitle>
          <p className="text-sm text-zinc-600">Generate a study deck from lecture notes, papers, or chapters.</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <Input
              className="border-amber-100 bg-white/80"
              placeholder="Deck title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <Input
              className="border-amber-100 bg-white/80 file:mr-3 file:rounded-full file:border-0 file:bg-teal-50 file:px-3 file:py-1 file:text-sm file:text-teal-700"
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {upload.error ? <p className="text-sm text-red-600">{upload.error.message}</p> : null}
            <Button type="submit" disabled={!file || upload.isPending}>
              {upload.isPending ? 'Generating...' : 'Generate flashcards'}
            </Button>
          </form>
        </CardContent>
      </Card>
      {activeUploadId ? <UploadProgressState progress={progressQuery.data} /> : null}
    </div>
  );
}

function createUploadId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `upload-${Date.now()}`;
}
