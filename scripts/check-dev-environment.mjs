import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultWorkspaceRoot = path.resolve(scriptDirectory, '..');

export function getDevEnvironmentProblems(workspaceRoot = defaultWorkspaceRoot) {
  const problems = [];
  const legacyStorePath = path.join(workspaceRoot, '.pnpm-store');

  if (existsSync(legacyStorePath)) {
    problems.push(
      [
        'Existe un almacén pnpm heredado dentro del workspace: .pnpm-store.',
        'Turbopack observa la raíz del monorepo y ese directorio puede provocar EMFILE o bloquear el watcher.',
        'Muévelo fuera del repositorio y vuelve a ejecutar pnpm install antes de iniciar el entorno.',
      ].join(' '),
    );
  }

  return problems;
}

export function runDevEnvironmentCheck(workspaceRoot = defaultWorkspaceRoot) {
  const problems = getDevEnvironmentProblems(workspaceRoot);

  if (problems.length === 0) {
    console.log('Entorno de desarrollo listo: el store de pnpm está fuera del workspace.');
    return 0;
  }

  for (const problem of problems) {
    console.error(`[dev:check] ${problem}`);
  }

  return 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;

if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = runDevEnvironmentCheck();
}
