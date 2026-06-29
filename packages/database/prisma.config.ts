import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const fallbackDatabaseUrl =
  'postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public&sslmode=require';

const migrationUrl =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? fallbackDatabaseUrl;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: migrationUrl,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
