import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16).default('development-secret-change-me'),
  GEMINI_API_KEY: z.string().optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);
