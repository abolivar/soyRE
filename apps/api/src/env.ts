import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

const envPaths = [
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '..', '.env.local'),
  resolve(process.cwd(), '..', '..', '.env'),
  resolve(currentDir, '..', '..', '..', '.env.local'),
  resolve(currentDir, '..', '..', '..', '.env'),
];

for (const envPath of new Set(envPaths)) {
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}
