/**
 * @file StoreReportData.ts
 * @description Calcula os indicadores de um relatório individual por loja.
 *
 * Reúne, para uma loja em um período, o aproveitamento do mês, a variação
 * contra o mês anterior, o histórico completo, a média histórica, o ranking
 * entre as lojas e a comparação com o aproveitamento da rede.
 *
 * @author Kilo Assistant
 * @date 2026-10-01
 */

import { type Database, type PeriodLabel, type RawStoreData } from '../types/index';
import { CONFIG } from '../constants/index';
import { getColorByPercent } from '../utils/metrics';

/** Uma observação mensal de uma loja. */
export interface StoreMonthPoint {
  /** Rótulo do período (ex.: 'Setembro 2026'). */
  label: string;
  /** Identificador do período (ex.: '2026-09'). */
  period: string;
  /** Vendas do mês. */
  sales: number;
  /** Avaliações recebidas no mês. */
  evaluated: number;
  /** Aproveitamento percentual, ou `null` se não houve vendas. */
  aproveitamento: number | null;
}

/** Indicadores consolidados de uma loja. */
export interface StoreReport {
  /** Nome exibido da loja (nome atual, pós-renomeação). */
  storeName: string;
  /** Rótulo do período de referência. */
  periodLabel: string;
  /** Identificador do período de referência. */
  period: string;
  /** Dados brutos do mês. */
  current: RawStoreData;
  /** Aproveitamento do mês (percentual). */
  aproveitamento: number;
  /** Variação em pontos percentuais contra o mês anterior. */
  variation: number | null;
  /** Aproveitamento do mês anterior, usado na variação. */
  previousAproveitamento: number | null;
  /** Série histórica, do mais antigo ao mais recente. */
  history: StoreMonthPoint[];
  /** Média do aproveitamento em todos os meses com vendas. */
  historicalAverage: number;
  /** Diferença do mês contra a média histórica da própria loja. */
  gapToAverage: number;
  /** Posição no ranking do período (1 = melhor). Empates compartilham a posição. */
  rank: number;
  /** `true` quando outra loja do período tem exatamente o mesmo aproveitamento. */
  tied: boolean;
  /** Total de lojas participantes no período. */
  totalStores: number;
  /** Aproveitamento da rede no período. */
  networkAproveitamento: number;
  /** Diferença contra o aproveitamento da rede. */
  gapToNetwork: number;
  /** Cor da faixa de identificação da loja. */
  color: string;
  /** URL do logo da loja. */
  logoUrl: string;
}

/**
 * Resolve o nome de uma loja, seguindo renomeações nos dois sentidos.
 *
 * Um mesmo nome pode aparecer como chave antiga em um mês e como chave nova
 * em outro (`DOM PEDRO` -> `HONOR`, `XV` -> `XV PRIME`).
 *
 * @param database - Todos os períodos carregados.
 * @param period - Período a consultar.
 * @param storeName - Nome da loja em qualquer uma das grafias.
 * @returns Os dados da loja no período, ou `undefined` se não houver.
 */
function resolveStoreData(
  database: Database,
  period: PeriodLabel,
  storeName: string,
): RawStoreData | undefined {
  const stores = database[period]?.data;
  if (!stores) return undefined;

  if (stores[storeName]) return stores[storeName];

  // Formas equivalentes do mesmo nome, para cobrir os dois sentidos do alias.
  const candidates = [
    CONFIG.storeAliases[storeName],
    Object.entries(CONFIG.storeAliases).find(([, target]) => target === storeName)?.[0],
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (stores[candidate]) return stores[candidate];
  }

  return undefined;
}

/** Calcula o aproveitamento, ou `null` quando não houve vendas. */
function toAproveitamento(store: RawStoreData | undefined): number | null {
  if (!store || store.sales === 0) return null;
  return (store.evaluated / store.sales) * 100;
}

/**
 * Monta o relatório individual de uma loja em um período.
 *
 * @param database - Todos os períodos, com os rótulos já carregados.
 * @param period - Período de referência do relatório.
 * @param storeName - Nome da loja (aceita grafia antiga ou nova).
 * @returns Os indicadores consolidados, ou `null` se a loja não tiver
 *   dados no período.
 */
export function buildStoreReport(
  database: Database,
  period: PeriodLabel,
  storeName: string,
): StoreReport | null {
  const current = resolveStoreData(database, period, storeName);
  const aproveitamento = toAproveitamento(current);
  if (!current || aproveitamento === null) return null;

  const periods = Object.keys(database).sort();
  const periodIndex = periods.indexOf(period);
  const previousPeriod = periodIndex > 0 ? periods[periodIndex - 1] : undefined;

  const history: StoreMonthPoint[] = periods.map((p) => {
    const store = resolveStoreData(database, p, storeName);
    return {
      period: p,
      label: database[p]?.label || p,
      sales: store?.sales ?? 0,
      evaluated: store?.evaluated ?? 0,
      aproveitamento: toAproveitamento(store),
    };
  });

  const withSales = history.filter((m) => m.aproveitamento !== null);
  const historicalAverage =
    withSales.length > 0
      ? withSales.reduce((sum, m) => sum + (m.aproveitamento as number), 0) / withSales.length
      : 0;

  const previousAproveitamento = previousPeriod
    ? toAproveitamento(resolveStoreData(database, previousPeriod, storeName))
    : null;
  const variation =
    previousAproveitamento === null ? null : aproveitamento - previousAproveitamento;

  // Ranking do período, considerando apenas lojas com vendas.
  const ranking = Object.keys(database[period]?.data ?? {})
    .map((name) => ({ name, value: toAproveitamento(database[period].data[name]) }))
    .filter((entry): entry is { name: string; value: number } => entry.value !== null)
    .sort((a, b) => b.value - a.value);

  // Compara o valor, não a identidade: se o próprio relatório foi construído
  // a partir do nome novo e o ranking usa o antigo (ou vice-versa), uma
  // busca por nome falharia. Empates compartilham a mesma posição.
  const rank = ranking.findIndex((entry) => entry.value === aproveitamento) + 1;

  // O aproveitamento da rede é ponderado por vendas, e não a média das lojas:
  // somar avaliadas e dividir por somar vendas é o mesmo cálculo do painel, e
  // evita que uma loja de poucas vendas pese tanto quanto uma de muitas.
  const networkSales = ranking.reduce(
    (sum, entry) => sum + (database[period].data[entry.name]?.sales ?? 0),
    0,
  );
  const networkEvaluated = ranking.reduce(
    (sum, entry) => sum + (database[period].data[entry.name]?.evaluated ?? 0),
    0,
  );
  const networkAproveitamento = networkSales > 0 ? (networkEvaluated / networkSales) * 100 : 0;

  const displayName =
    Object.entries(CONFIG.storeAliases).find(([, target]) => target === storeName)?.[1] ?? storeName;

  return {
    storeName: displayName,
    periodLabel: database[period]?.label || period,
    period,
    current,
    aproveitamento,
    variation,
    previousAproveitamento,
    history,
    historicalAverage,
    gapToAverage: aproveitamento - historicalAverage,
    rank: rank > 0 ? rank : ranking.length,
    tied: ranking.filter((entry) => entry.value === aproveitamento).length > 1,
    totalStores: ranking.length,
    networkAproveitamento,
    gapToNetwork: aproveitamento - networkAproveitamento,
    color: getColorByPercent(aproveitamento),
    logoUrl: CONFIG.storeLogos[displayName] || '',
  };
}

/**
 * Calcula os relatórios de todas as lojas com dados em um período,
 * ordenadas da melhor para a pior aproveitamento.
 *
 * @param database - Todos os períodos carregados.
 * @param period - Período de referência.
 * @returns A lista de relatórios, pronta para compor o PDF.
 */
export function buildAllStoreReports(
  database: Database,
  period: PeriodLabel,
): StoreReport[] {
  const stores = database[period]?.data ?? {};

  return Object.keys(stores)
    .map((name) => buildStoreReport(database, period, name))
    .filter((report): report is StoreReport => report !== null)
    .sort((a, b) => b.aproveitamento - a.aproveitamento);
}
