import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(moduleDir, '..');
const workspaceRoot = resolve(apiRoot, '..', '..');

const envFiles = [
  join(apiRoot, '.env.local'),
  join(workspaceRoot, '.env.local'),
  join(apiRoot, '.env'),
  join(workspaceRoot, '.env'),
];

for (const envPath of envFiles) {
  if (!existsSync(envPath)) {
    continue;
  }

  // Do not override shell-provided environment variables.
  loadDotenv({ path: envPath, override: false });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16).default('development-secret-change-me'),
  GEMINI_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);
