import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const generatedDir = join(scriptDir, '..', 'dist', 'generated', 'prisma');
const validExtensions = new Set(['.js', '.mjs', '.cjs', '.json', '.wasm', '.node']);

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const absolutePath = join(dir, entry);
    return statSync(absolutePath).isDirectory() ? walk(absolutePath) : [absolutePath];
  });
}

function withJsExtension(specifier) {
  if (!specifier.startsWith('.')) {
    return specifier;
  }

  if (validExtensions.has(extname(specifier))) {
    return specifier;
  }

  return `${specifier}.js`;
}

for (const filePath of walk(generatedDir)) {
  if (!filePath.endsWith('.js')) {
    continue;
  }

  const source = readFileSync(filePath, 'utf8');
  const updated = source
    .replace(/(from\s+['"])(\.{1,2}\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => {
      return `${prefix}${withJsExtension(specifier)}${suffix}`;
    })
    .replace(/(import\s+['"])(\.{1,2}\/[^'"]+)(['"])/g, (_match, prefix, specifier, suffix) => {
      return `${prefix}${withJsExtension(specifier)}${suffix}`;
    });

  if (updated !== source) {
    writeFileSync(filePath, updated);
  }
}
