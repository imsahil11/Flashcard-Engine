import { Queue } from 'bullmq';
import { env } from '../config.js';

const connection = {
  url: env.REDIS_URL,
};

let pdfQueue: Queue | null = null;

export function getPdfQueue() {
  pdfQueue ??= new Queue('pdf-processing', { connection });
  return pdfQueue;
}
