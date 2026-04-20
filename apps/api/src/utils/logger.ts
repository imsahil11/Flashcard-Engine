import pino from 'pino';
import { env } from '../config.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : process.env.LOG_LEVEL ?? 'info',
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
});
