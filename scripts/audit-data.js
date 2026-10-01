/**
 * @file audit-data.js
 * @description Auditoria dos arquivos de dados do dashboard.
 *
 * Verifica, para todos os períodos declarados em periods.json:
 *   1. Existência e formato de cada data-YYYY-MM.json
 *   2. `evaluated === current - prev` (avaliações do próprio mês)
 *   3. Continuidade: `prev` de um mês === `current` do mês anterior
 *   4. Campos numéricos finitos e `sales >= 0`
 *   5. Que toda loja com dados possui logo e cor configurados
 *
 * Uso: node scripts/audit-data.js
 * Sai com código 1 se qualquer verificação falhar.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC = resolve(ROOT, 'public');

const errors = [];
const warnings = [];

/** Lê o CONFIG de constantes/index.ts para validar logos, cores e renomeações. */
function readConfig() {
  const source = readFileSync(resolve(ROOT, 'src/constants/index.ts'), 'utf8');

  /** Extrai as chaves de um bloco `nome: { ... }`. */
  const keysOf = (name) => {
    const match = source.match(new RegExp(`${name}:\\s*\\{([\\s\\S]*?)\\n  \\}`));
    if (!match) return [];
    return [...match[1].matchAll(/'([^']+)'\s*:/g)].map((m) => m[1]);
  };

  /** Extrai pares chave -> valor de um bloco de renomeações. */
  const pairsOf = (name) => {
    const match = source.match(new RegExp(`${name}:\\s*\\{([\\s\\S]*?)\\n  \\}`));
    if (!match) return {};
    return Object.fromEntries(
      [...match[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)].map((m) => [m[1], m[2]]),
    );
  };

  const aliases = pairsOf('storeAliases');

  return {
    logos: new Set(keysOf('storeLogos')),
    colors: new Set(keysOf('colors')),
    aliases,
    // Sentido inverso, para localizar o nome antigo a partir do novo.
    reverseAliases: Object.fromEntries(
      Object.entries(aliases).map(([from, to]) => [to, from]),
    ),
  };
}

const config = readConfig();
const { periods } = JSON.parse(readFileSync(resolve(PUBLIC, 'periods.json'), 'utf8'));

if (!Array.isArray(periods) || periods.length === 0) {
  console.error('periods.json não contém nenhum período.');
  process.exit(1);
}

const expected = [...periods].sort();
const databases = new Map();

for (const period of periods) {
  const file = resolve(PUBLIC, `data-${period}.json`);
  if (!existsSync(file)) {
    errors.push(`${period}: arquivo data-${period}.json não encontrado.`);
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${period}: JSON inválido — ${error.message}`);
    continue;
  }

  if (typeof parsed.label !== 'string' || !parsed.label) {
    errors.push(`${period}: campo "label" ausente ou vazio.`);
  }

  const stores = parsed.data;
  if (typeof stores !== 'object' || stores === null || Object.keys(stores).length === 0) {
    errors.push(`${period}: "data" está vazio ou ausente.`);
    continue;
  }

  databases.set(period, stores);

  for (const [store, raw] of Object.entries(stores)) {
    for (const field of ['prev', 'current', 'sales', 'evaluated']) {
      if (typeof raw[field] !== 'number' || !Number.isFinite(raw[field])) {
        errors.push(`${period}/${store}: "${field}" não é um número finito (${raw[field]}).`);
      }
    }

    if (typeof raw.sales === 'number' && raw.sales < 0) {
      errors.push(`${period}/${store}: "sales" negativo (${raw.sales}).`);
    }

    // Regra central do projeto: avaliadas do mês = delta do acumulado.
    if (typeof raw.evaluated === 'number' && raw.current - raw.prev !== raw.evaluated) {
      errors.push(
        `${period}/${store}: evaluated (${raw.evaluated}) !== current - prev ` +
          `(${raw.current} - ${raw.prev} = ${raw.current - raw.prev}).`,
      );
    }

    if (raw.evaluated < 0) {
      warnings.push(
        `${period}/${store}: avaliadas negativas (${raw.evaluated}) — ` +
          'avaliações removidas da plataforma; rendered como valor negativo.',
      );
    }

    if (raw.sales === 0) {
      warnings.push(`${period}/${store}: sem vendas — o gráfico de tendência exibirá um intervalo.`);
    }

    if (!config.logos.has(store)) {
      warnings.push(`${period}/${store}: sem logo em CONFIG.storeLogos.`);
    }
    if (!config.colors.has(store)) {
      warnings.push(`${period}/${store}: sem cor em CONFIG.colors.`);
    }
  }
}

// Continuidade entre meses consecutivos.
for (let i = 1; i < expected.length; i++) {
  const previous = databases.get(expected[i - 1]);
  const current = databases.get(expected[i]);
  if (!previous || !current) continue;

  for (const [store, raw] of Object.entries(current)) {
    const before = previous[store];
    if (!before) {
      // A loja pode ter sido renomeada. O mapa de alias é `antigo -> novo`,
      // então um nome novo no mês atual precisa ser procurado no sentido
      // inverso para encontrar o nome com que a loja aparecia antes.
      const previousName = config.aliases[store] ?? config.reverseAliases[store];
      if (previousName && previousName in previous) {
        warnings.push(
          `${expected[i]}/${store}: renomeada a partir de "${previousName}" — ` +
            'série contínua via CONFIG.storeAliases.',
        );
        continue;
      }
      warnings.push(`${expected[i]}/${store}: loja ausente em ${expected[i - 1]} — quebra de série.`);
      continue;
    }
    if (before.current !== raw.prev) {
      errors.push(
        `${expected[i]}/${store}: prev (${raw.prev}) !== current de ${expected[i - 1]} (${before.current}).`,
      );
    }
  }
}

// Lojas que saíram do painel, mas podem ter sido apenas renomeadas.
const latest = databases.get(expected[expected.length - 1]);
if (latest) {
  for (const period of expected.slice(0, -1)) {
    const stores = databases.get(period);
    if (!stores) continue;
    for (const store of Object.keys(stores)) {
      if (store in latest) continue;

      // Renomeações conhecidas não são um problema: o nome novo presente no
      // período mais recente já encadeia a série no gráfico de tendência.
      // O mapa é `nomeAntigo -> nomeAtual`, então procuramos a chave antiga.
      const currentName = config.aliases[store];
      if (currentName && currentName in latest) continue;
      const renamed = currentName ? [store, currentName] : null;

      warnings.push(
        `${store}: presente em ${period} e ausente em ${expected[expected.length - 1]}` +
          (renamed ? ` (renomeada para ${renamed[1]}, que também não está no último período).` : '.'),
      );
    }
  }
}

console.log(`Períodos auditados: ${databases.size}/${periods.length}`);
for (const period of expected) {
  const stores = databases.get(period);
  if (!stores) continue;
  const rows = Object.entries(stores).map(
    ([s, v]) => `${s} ${(((v.current - v.prev) / (v.sales || 1)) * 100).toFixed(1)}%`,
  );
  console.log(`  ${period}  ${rows.join(' | ')}`);
}

if (warnings.length) {
  console.log(`\nAvisos (${warnings.length}):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}

if (errors.length) {
  console.error(`\nFalhas (${errors.length}):`);
  for (const e of errors) console.error(`  x ${e}`);
  process.exit(1);
}

console.log('\nOK: todos os dados consistentes.');
