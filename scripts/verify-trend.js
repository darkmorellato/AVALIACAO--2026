/**
 * @file verify-trend.js
 * @description Verifica a série do gráfico de tendência com os dados reais.
 *
 * Confirma que a renomeação DOM PEDRO -> HONOR produz uma única série
 * contínua, que lojas ausentes viram intervalo (null) e não zero, e que
 * o aproveitamento negativo é preservado.
 *
 * Uso: node scripts/verify-trend.js
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildTrendChartData } from '../src/charts/TrendChartData.ts';

// O bundle é gerado em .vite-tmp/ dentro do projeto, então o caminho público
// é relativo ao diretório de execução em vez de ao do arquivo original.
const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(process.cwd(), 'public');

const { periods } = JSON.parse(readFileSync(resolve(PUBLIC, 'periods.json'), 'utf8'));
const database = {};
for (const period of periods) {
  database[period] = JSON.parse(readFileSync(resolve(PUBLIC, `data-${period}.json`), 'utf8'));
}

const chart = buildTrendChartData(database);
const failures = [];
const check = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    console.log(`  FAIL ${label} ${detail}`);
    failures.push(label);
  }
};

console.log(`Rótulos: ${chart.labels.length} períodos, ${chart.datasets.length} séries\n`);

const honor = chart.datasets.find((d) => d.label === 'HONOR');
check('existe uma série HONOR', Boolean(honor));
check('não existe série DOM PEDRO separada', !chart.datasets.some((d) => d.label === 'DOM PEDRO'));

if (honor) {
  console.log(`\n  HONOR: ${JSON.stringify(honor.data)}`);
  const augustIndex = chart.labels.indexOf('Agosto 2026');
  const septemberIndex = chart.labels.indexOf('Setembro 2026');
  const augustValue = honor.data[augustIndex];
  const septemberValue = honor.data[septemberIndex];

  check('setembro tem valor', septemberValue !== null && septemberValue !== undefined);
  check('agosto tem valor (série atravessa a renomeação)', augustValue !== null && augustValue !== undefined);
  check('agosto = 62.71% (delta 74 / 118 vendas)', Math.abs(augustValue - 62.711864) < 0.001, `= ${augustValue}`);
  check('setembro = -4.00% (delta -4 / 100 vendas)', Math.abs(septemberValue + 4) < 0.001, `= ${septemberValue}`);
  check('negativo preservado (não foi clampado para 0)', septemberValue < 0);
}

const premium = chart.datasets.find((d) => d.label === 'PREMIUM');
check('existe série PREMIUM', Boolean(premium));
if (premium) {
  const septemberIndex = chart.labels.indexOf('Setembro 2026');
  console.log(`\n  PREMIUM: ${JSON.stringify(premium.data)}`);
  check('PREMIUM tem valor em setembro (32 vendas, delta 7)', premium.data[septemberIndex] !== null);
  check(
    'PREMIUM setembro = 21,88% (delta 7 / 32 vendas)',
    Math.abs(premium.data[septemberIndex] - 21.875) < 0.001,
    `= ${premium.data[septemberIndex]}`,
  );
  check(
    'PREMIUM é uma série própria, distinta da XV PRIME',
    chart.datasets.filter((d) => d.label === 'XV PRIME' || d.label === 'PREMIUM').length === 2,
  );
}

const xvPrime = chart.datasets.find((d) => d.label === 'XV PRIME');
check('existe uma série XV PRIME', Boolean(xvPrime));
check('não existe série XV separada', !chart.datasets.some((d) => d.label === 'XV'));
if (xvPrime) {
  console.log(`\n  XV PRIME: ${JSON.stringify(xvPrime.data)}`);
  const augustIndex = chart.labels.indexOf('Agosto 2026');
  check(
    'XV PRIME atravessa a renomeação (agosto tem valor)',
    xvPrime.data[augustIndex] !== null,
    `= ${xvPrime.data[augustIndex]}`,
  );
  check(
    'XV PRIME agosto = 30,19% (delta 16 / 53 vendas)',
    Math.abs(xvPrime.data[augustIndex] - 30.188679) < 0.001,
    `= ${xvPrime.data[augustIndex]}`,
  );
  check('XV PRIME tem 10 pontos, um por período', xvPrime.data.length === chart.labels.length);
  check('XV PRIME é distinta da PREMIUM', chart.datasets.some((d) => d.label === 'PREMIUM'));
}

// Setembro tem as 5 lojas: nenhuma série pode ter intervalo no último mês.
const septemberIndex = chart.labels.indexOf('Setembro 2026');
const withGap = chart.datasets.filter((d) => d.data[septemberIndex] === null);
check(
  'nenhuma série tem gap em setembro (5 lojas reportadas)',
  withGap.length === 0,
  `= ${withGap.map((d) => d.label).join(', ')}`,
);
check('exatamente 5 séries no gráfico', chart.datasets.length === 5, `= ${chart.datasets.length}`);

console.log('');
if (failures.length) {
  console.error(`${failures.length} verificação(ões) falharam.`);
  process.exit(1);
}
console.log('OK: série de tendência consistente.');
