import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const webRoot = join(root, 'apps/web');
const extensions = new Set(['.ts', '.tsx']);
const violations = [];

function extensionOf(filePath) {
  const index = filePath.lastIndexOf('.');
  return index === -1 ? '' : filePath.slice(index);
}

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'dist') {
      continue;
    }

    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      walk(path);
      continue;
    }

    if (!extensions.has(extensionOf(path))) {
      continue;
    }

    checkFile(path);
  }
}

function addViolation(filePath, lineNumber, message, line) {
  violations.push({
    file: relative(root, filePath),
    line: lineNumber,
    message,
    source: line.trim(),
  });
}

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (/from\s+['"]\.\/ui['"]/.test(line)) {
      addViolation(
        filePath,
        lineNumber,
        'Use @soyre/ui instead of apps/web/components/ui.',
        line,
      );
    }

    if (/className\s*=\s*\{?\s*['"`][^'"`]*\bbutton\s+(primary|secondary|ghost|danger)\b/.test(line)) {
      addViolation(
        filePath,
        lineNumber,
        'Use <Button variant="..."> instead of raw button classes.',
        line,
      );
    }

    if (
      /(className|style)\s*=/.test(line) &&
      /#[0-9a-fA-F]{6}\b/.test(line)
    ) {
      addViolation(
        filePath,
        lineNumber,
        'Use design tokens instead of hardcoded hex values in styling.',
        line,
      );
    }
  });
}

walk(webRoot);

if (violations.length > 0) {
  console.error('Design system check failed:\n');
  for (const violation of violations) {
    console.error(
      `${violation.file}:${violation.line} ${violation.message}\n  ${violation.source}`,
    );
  }
  process.exit(1);
}

console.log('Design system check passed.');
