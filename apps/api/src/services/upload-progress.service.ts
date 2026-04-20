import type { UploadProgress, UploadProgressStage } from '@flashcard/types';

type UploadProgressRecord = UploadProgress & {
  userId: string;
};

const progressStore = new Map<string, UploadProgressRecord>();
const TTL_MS = 1000 * 60 * 30;

export function initializeUploadProgress(userId: string, uploadId: string) {
  const record: UploadProgressRecord = {
    userId,
    uploadId,
    stage: 'queued',
    message: 'Preparing upload...',
    progressPercent: 5,
    updatedAt: new Date().toISOString(),
  };
  progressStore.set(composeKey(userId, uploadId), record);
  pruneProgressStore();
  return record;
}

export function updateUploadProgress(
  userId: string,
  uploadId: string,
  update: {
    stage: UploadProgressStage;
    message: string;
    progressPercent: number;
    error?: string;
  },
) {
  const key = composeKey(userId, uploadId);
  const existing = progressStore.get(key) ?? initializeUploadProgress(userId, uploadId);
  const record: UploadProgressRecord = {
    ...existing,
    ...update,
    updatedAt: new Date().toISOString(),
  };
  progressStore.set(key, record);
  return record;
}

export function getUploadProgress(userId: string, uploadId: string) {
  pruneProgressStore();
  return progressStore.get(composeKey(userId, uploadId)) ?? null;
}

function composeKey(userId: string, uploadId: string) {
  return `${userId}:${uploadId}`;
}

function pruneProgressStore() {
  const cutoff = Date.now() - TTL_MS;
  for (const [key, value] of progressStore.entries()) {
    if (new Date(value.updatedAt).getTime() < cutoff) {
      progressStore.delete(key);
    }
  }
}
