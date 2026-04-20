import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Validation failed', issues: error.flatten() });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  logger.error(error);
  return res.status(500).json({ message: 'Internal server error' });
};
