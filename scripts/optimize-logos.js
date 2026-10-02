#!/usr/bin/env node
/**
 * @file optimize-logos.js
 * @description Otimiza os logos das lojas para o dashboard e para o PDF.
 *
 * Os PNGs originais têm entre 1,8 MB e 6 MB em resoluções acima de 1000px,
 * mas são exibidos em ~22px no gráfico e ~40px na tabela. Redimensionar e
 * recomprimir corta o peso em mais de 99% sem perda visível, e evita que o
 * relatório em PDF carregue dezenas de MB só de logos.
 *
 * Requer ImageMagick (`convert`/`magick`) e `pngquant` no PATH.
 *
 * Uso: node scripts/optimize-logos.js [--force]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');

/** Lado máximo do logo. 256px cobre com folga o uso em 40px com @2x. */
const MAX_SIZE = 256;

const LOGOS = [
  'Untitled-dom pedro.png',
  'Untitled-kassouf.png',
  'Untitled-premium.png',
  'Untitled-realme.png',
  'Untitled-xv.png',
];

const force = process.argv.includes('--force');

function which(bin) {
  try {
    return execFileSync('which', [bin], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

const magick = which('magick') || which('convert');
const pngquant = which('pngquant');

if (!magick) {
  console.error('ImageMagick não encontrado. Instale com: apt install imagemagick');
  process.exit(1);
}
if (!pngquant) {
  console.error('pngquant não encontrado. Instale com: apt install pngquant');
  process.exit(1);
}

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

const formatBytes = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

console.log(`Otimizando logos para ${MAX_SIZE}px (use --force para reprocessar)\n`);

let totalBefore = 0;
let totalAfter = 0;
let changed = 0;

for (const logo of LOGOS) {
  const path = join(PUBLIC, logo);
  if (!existsSync(path)) {
    console.warn(`  ! ${logo}: arquivo não encontrado`);
    continue;
  }

  const before = readFileSync(path).length;
  totalBefore += before;

  // Identifica dimensões atuais via cabeçalho do PNG (IHDR), sem depender
  // de ferramenta externa para a leitura.
  const header = readFileSync(path).subarray(16, 24);
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);

  if (!force && width <= MAX_SIZE && before < 120 * 1024) {
    console.log(`  = ${logo}: já otimizado (${width}x${height}, ${formatBytes(before)})`);
    totalAfter += before;
    continue;
  }

  // Redimensiona mantendo proporção e o canal alfa, em /tmp para não
  // sobrescrever a origem antes de o comando terminar.
  const temp = `/tmp/opencode/opt-${Date.now()}-${logo}`;
  run(magick === 'convert' ? 'convert' : 'magick', [
    path,
    '-resize',
    `${MAX_SIZE}x${MAX_SIZE}`,
    '-strip',
    '-define',
    'png:compression-level=9',
    temp,
  ]);

  // pngquant reduz ainda mais, com qualidade visual indistinguível em
  // tamanho de exibição. Usa a variante estática, que não escreve no stdout.
  let optimized = temp;
  const quantized = temp.replace(/\.png$/, '-q.png');
  try {
    run(pngquant, ['--force', '--quality=70-95', '--speed', '1', '--output', quantized, temp]);
    optimized = quantized;
  } catch {
    // Sem pngquant funcional, mantém o resultado do ImageMagick.
  }

  const optimizedBytes = readFileSync(optimized);
  writeFileSync(path, optimizedBytes);

  run('rm', ['-f', temp]);
  if (quantized !== temp) run('rm', ['-f', quantized]);

  const after = optimizedBytes.length;
  totalAfter += after;
  changed++;

  const ratio = before > 0 ? ((1 - after / before) * 100).toFixed(1) : '0.0';
  console.log(
    `  ✓ ${logo}: ${width}x${height} -> ${MAX_SIZE}px  ` +
      `${formatBytes(before)} -> ${formatBytes(after)}  (-${ratio}%)`,
  );
}

console.log(
  `\n${changed} logo(s) otimizado(s). ` +
    `Total: ${formatBytes(totalBefore)} -> ${formatBytes(totalAfter)}`,
);
