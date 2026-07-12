import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const repoRoot = process.cwd();

type ApiChildProcess = ReturnType<typeof spawn>;

export type ApiServer = {
  baseUrl: string;
  stop: () => Promise<void>;
};

export function resolveApiBaseUrl() {
  const raw =
    process.env.SOYRE_API_BASE_URL ??
    process.env.API_SMOKE_BASE_URL ??
    'http://127.0.0.1:4000/api';
  const url = new URL(raw);

  if (url.pathname === '/' || url.pathname === '') {
    url.pathname = '/api';
  }

  return url.toString().replace(/\/$/, '');
}

export async function ensureApiServer(): Promise<ApiServer> {
  const baseUrl = resolveApiBaseUrl();

  if (await isHealthy(baseUrl)) {
    return {
      baseUrl,
      stop: async () => undefined,
    };
  }

  const child = spawn('pnpm', ['--filter', '@soyre/api', 'start'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      API_PORT: String(portFromBaseUrl(baseUrl)),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = collectOutput(child);

  try {
    await waitForHealth(baseUrl, child, output);
  } catch (error) {
    await stopChild(child);
    throw error;
  }

  return {
    baseUrl,
    stop: async () => stopChild(child),
  };
}

async function waitForHealth(
  baseUrl: string,
  child: ApiChildProcess,
  output: () => string,
) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`API server exited before health check passed.\n${output()}`);
    }

    if (await isHealthy(baseUrl)) {
      return;
    }

    await delay(1_000);
  }

  throw new Error(`API server did not become healthy in time.\n${output()}`);
}

async function isHealthy(baseUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_000);

  try {
    const response = await fetch(`${baseUrl}/health`, {
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function collectOutput(child: ApiChildProcess) {
  let output = '';
  const append = (chunk: Buffer) => {
    output += chunk.toString();
    output = output.slice(-10_000);
  };

  child.stdout?.on('data', append);
  child.stderr?.on('data', append);

  return () => output;
}

async function stopChild(child: ApiChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill('SIGINT');

  await Promise.race([once(child, 'exit'), delay(2_000)]);

  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await Promise.race([once(child, 'exit'), delay(1_000)]);
  }
}

function portFromBaseUrl(baseUrl: string) {
  const url = new URL(baseUrl);

  if (url.port) {
    return Number(url.port);
  }

  return url.protocol === 'https:' ? 443 : 80;
}
