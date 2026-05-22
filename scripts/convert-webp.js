/**
 * Script para converter logos PNG para WebP (opcional)
 * Requer: sharp (npm install sharp)
 *
 * Uso: node scripts/convert-webp.js
 */

// import sharp from 'sharp'; // Descomente se instalar sharp
import { readdir, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const PUBLIC_DIR = join(process.cwd(), 'public');
const LOGOS = [
  'Untitled-dom pedro.png',
  'Untitled-kassouf.png',
  'Untitled-premium.png',
  'Untitled-realme.png',
  'Untitled-xv.png',
];

async function convertToWebP() {
  console.log('⚠️  Este script requer a biblioteca sharp instalada.');
  console.log('   Execute: npm install sharp\n');

  // try {
  //   const sharp = (await import('sharp')).default;
  //
  //   for (const logo of LOGOS) {
  //     const inputPath = join(PUBLIC_DIR, logo);
  //     const outputPath = join(PUBLIC_DIR, logo.replace('.png', '.webp'));
  //
  //     console.log(`Convertendo ${logo}...`);
  //     await sharp(inputPath)
  //       .webp({ quality: 85, effort: 6 })
  //       .toFile(outputPath);
  //
  //     console.log(`✓ ${outputPath} criado`);
  //   }
  //
  //   console.log('\n✅ Conversão completa!');
  //   console.log('Nota: Atualize CONFIG.storeLogos para usar .webp');
  // } catch (err) {
  //   console.error('Erro:', err.message);
  // }

  console.log('📝 Instruções manuais:');
  console.log('1. Use ferramenta online: https://squoosh.app');
  console.log('2. Ou ImageMagick: convert logo.png logo.webp');
  console.log('3. Ou instale sharp: npm install sharp e descomente o código');
}

convertToWebP();
