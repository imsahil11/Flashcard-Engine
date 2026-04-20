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

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});

app.use('/auth', authRouter);
app.use('/decks', decksRouter);
app.use('/upload', uploadRouter);

app.use(errorHandler);
