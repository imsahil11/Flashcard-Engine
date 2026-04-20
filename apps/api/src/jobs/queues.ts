import { Queue } from 'bullmq';
import { env } from '../config.js';
import { logger } from '../utils/logger.js';

const connection = {
  url: env.REDIS_URL,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
};

let pdfQueue: Queue | null = null;
let queueDisabled = false;

function disableQueue(error: unknown) {
  if (queueDisabled) {
    return;
  }

  queueDisabled = true;
  logger.warn({ error }, 'Redis queue unavailable. PDF enqueue will be skipped until API restart.');

  const queue = pdfQueue;
  pdfQueue = null;

  if (queue) {
    // BullMQ can emit a late initialization error after close removes listeners.
    // Wait for readiness/rejection to settle, then close to avoid process crashes.
    void queue
      .waitUntilReady()
      .catch(() => {
        // Ignore readiness failures while shutting down a broken queue connection.
      })
      .finally(() => {
        void queue.close().catch(() => {
          // Ignore close errors while shutting down a broken queue connection.
        });
      });
  }
}

export function getPdfQueue() {
  if (!env.REDIS_URL || queueDisabled) {
    return null;
  }

  if (!pdfQueue) {
    pdfQueue = new Queue('pdf-processing', { connection });

    // Prevent noisy unhandled error events when Redis is down.
    pdfQueue.on('error', (error) => {
      disableQueue(error);
    });
  }

  return pdfQueue;
}
