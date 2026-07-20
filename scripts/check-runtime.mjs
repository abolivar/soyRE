import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SUPPORTED_NODE_MAJOR = 22;
export const LOCAL_NODE_VERSION = '22.22.2';
export const EXPECTED_PNPM_VERSION = '10.33.2';

export function parseNodeVersion(version) {
  const match = String(version)
    .trim()
    .match(/^v?(\d+)\.(\d+)\.(\d+)/);

  if (!match) {
    return undefined;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function getRuntimeProblems({
  nodeVersion = process.version,
  pnpmVersion,
} = {}) {
  const problems = [];
  const parsedNodeVersion = parseNodeVersion(nodeVersion);

  if (!parsedNodeVersion || parsedNodeVersion.major !== SUPPORTED_NODE_MAJOR) {
    problems.push(
      [
        `SoyPMS requiere Node ${SUPPORTED_NODE_MAJOR}.x; el proceso actual usa ${nodeVersion}.`,
        `La version local reproducible es ${LOCAL_NODE_VERSION}.`,
        'Ejecuta `nvm use` desde la raiz del repositorio o inicia el comando mediante `pnpm`.',
      ].join(' '),
    );
  }

  if (pnpmVersion !== EXPECTED_PNPM_VERSION) {
    problems.push(
      [
        `SoyPMS requiere pnpm ${EXPECTED_PNPM_VERSION}; se detecto ${pnpmVersion ?? 'ninguna version'}.`,
        'Activa Corepack y respeta el campo `packageManager` del package.json.',
      ].join(' '),
    );
  }

  return problems;
}

export function detectPnpmVersion() {
  const userAgentMatch = process.env.npm_config_user_agent?.match(
    /\bpnpm\/(\d+\.\d+\.\d+)\b/,
  );

  if (userAgentMatch) {
    return userAgentMatch[1];
  }

  try {
    return execFileSync('pnpm', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return undefined;
  }
}

export function runRuntimeCheck({
  nodeVersion = process.version,
  pnpmVersion = detectPnpmVersion(),
  nodeExecutable = process.execPath,
} = {}) {
  const problems = getRuntimeProblems({ nodeVersion, pnpmVersion });

  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(`[runtime:check] ${problem}`);
    }

    console.error(`[runtime:check] Ejecutable Node: ${nodeExecutable}`);
    return 1;
  }

  console.log('Runtime SoyPMS listo.');
  console.log(`Node: ${nodeVersion} (${nodeExecutable})`);
  console.log(`pnpm: ${pnpmVersion}`);
  return 0;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;

if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = runRuntimeCheck();
}
