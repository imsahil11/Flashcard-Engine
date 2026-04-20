import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { decksRouter } from './routes/decks.js';
import { uploadRouter } from './routes/upload.js';
import { logger } from './utils/logger.js';

const httpLogger = pinoHttp({
  logger,
  // Never log Authorization headers — keeps JWTs out of logs
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  // In development: compact single-line summary instead of full req/res dump
  ...(env.NODE_ENV === 'development' && {
    customLogLevel: (_req, res) => (res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} ${res.statusCode} — ${(res as { responseTime?: number }).responseTime ?? 0}ms`,
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
});

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(httpLogger);

app.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});

app.use('/auth', authRouter);
app.use('/decks', decksRouter);
app.use('/upload', uploadRouter);

app.use(errorHandler);
