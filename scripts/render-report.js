/**
 * @file render-report.js
 * @description Gera o relatório por loja fora do navegador, para inspeção.
 *
 * Usa os mesmos geradores de dados e de PDF do app, com jsPDF em Node e os
 * logos lidos do disco. Serve para validar o layout sem abrir a interface.
 *
 * Uso: node scripts/render-report.js [periodo]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const period = process.argv[2] || '2026-09';

const bundle = await (async () => {
  execFileSync(
    join(ROOT, 'node_modules/.bin/esbuild'),
    [
      'scripts/render-report.ts',
      '--bundle',
      '--platform=node',
      '--format=esm',
      '--outfile=.vite-tmp/render-report.mjs',
      '--log-level=warning',
    ],
    { stdio: 'inherit' },
  );
  return import(join(ROOT, '.vite-tmp/render-report.mjs'));
})();

const database = {};
const { periods } = JSON.parse(readFileSync(join(PUBLIC, 'periods.json'), 'utf8'));
for (const p of periods) {
  database[p] = JSON.parse(readFileSync(join(PUBLIC, `data-${p}.json`), 'utf8'));
}

const output = await bundle.render(database, period, PUBLIC);

if (output) {
  writeFileSync(join(ROOT, '.vite-tmp', output.filename), output.data);
  console.log(`\nGerado: .vite-tmp/${output.filename} (${(output.data.length / 1024).toFixed(1)} KB)`);
  console.log(`Páginas: ${output.pages}`);
} else {
  console.error('Falha ao gerar o relatório.');
  process.exit(1);
}
