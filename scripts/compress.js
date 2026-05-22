/**
 * Script para compressão Brotli dos assets de produção
 * Uso: node scripts/compress.js
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import brotli from 'brotli';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = join(__dirname, '..', 'dist', 'assets');
const OUTPUT_DIR = join(__dirname, '..', 'dist', 'assets-brotli');

async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    // já existe
  }
}

async function compressFile(filename) {
  const inputPath = join(DIST_DIR, filename);
  const outputPath = join(OUTPUT_DIR, filename + '.br');

  try {
    const data = await readFile(inputPath);
    const compressed = brotli.compress(data, {
      mode: 0, // 0=texto, 1=imagens, 2=fontes
      quality: 11, // máxima qualidade (menor tamanho)
      lgwin: 22, // janela de 2^22 bytes
    });

    await ensureDir(OUTPUT_DIR);
    await writeFile(outputPath, compressed);
    console.log(`✓ ${filename}: ${(data.length / 1024).toFixed(1)}KB → ${(compressed.length / 1024).toFixed(1)}KB (${((1 - compressed.length / data.length) * 100).toFixed(1)}% reduction)`);

    return { original: data.length, compressed: compressed.length };
  } catch (err) {
    console.error(`✗ Erro ao comprimir ${filename}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Iniciando compressão Brotli...\n');

  try {
    const files = await readdir(DIST_DIR);
    const jsFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.css'));

    if (jsFiles.length === 0) {
      console.log('Nenhum arquivo para comprimir.');
      return;
    }

    let totalOrig = 0, totalComp = 0;
    for (const file of jsFiles) {
      const result = await compressFile(file);
      if (result) {
        totalOrig += result.original;
        totalComp += result.compressed;
      }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Total original: ${(totalOrig / 1024).toFixed(1)}KB`);
    console.log(`   Total comprimido: ${(totalComp / 1024).toFixed(1)}KB`);
    console.log(`   Redução: ${((1 - totalComp / totalOrig) * 100).toFixed(1)}%`);
    console.log(`\n✅ Arquivos Brotli salvos em: ${OUTPUT_DIR}`);
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
}

main();
