import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

const envPaths = [
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '..', '.env.local'),
  resolve(process.cwd(), '..', '..', '.env'),
];

for (const envPath of new Set(envPaths)) {
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

const fallbackDatabaseUrl =
  'postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public&sslmode=require';

const migrationUrl =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? fallbackDatabaseUrl;
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL?.trim() || undefined;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: migrationUrl,
    shadowDatabaseUrl,
  },
});
