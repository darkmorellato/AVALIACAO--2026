/**
 * @file TrendChartData.ts
 * @description Constrói os dados do gráfico de tendência.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

import { ChartData } from 'chart.js';
import { RawStoreData } from '../types/index';
import { CONFIG } from '../constants/index';

const DEFAULT_LINE_COLORS = [
  '#EF4444', '#F59E0B', '#3B82F6', '#10B981',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1',
];

/** Conjunto de períodos indexados, no formato entregue pelo DataService. */
type PeriodDatabase = Record<string, { label: string; data: Record<string, RawStoreData> }>;

/**
 * Resolve o nome canônico de uma loja, seguindo renomeações.
 *
 * Uma loja que muda de nome (ex.: DOM PEDRO -> HONOR) precisa continuar
 * na mesma série do gráfico de tendência. A chave mais recente vence:
 * se o período mais recente já usa o nome novo, toda a série passa a
 * exibir o nome novo e a linha permanece contínua.
 *
 * @param database - Todos os períodos, em qualquer ordem.
 * @returns Função que mapeia um nome de loja ao seu nome canônico.
 */
function createAliasResolver(
  database: PeriodDatabase,
): (storeName: string) => string {
  const latestPeriod = Object.keys(database).sort().pop();
  const latestStores = latestPeriod ? (database[latestPeriod]?.data ?? {}) : {};

  return (storeName: string): string => {
    const alias = CONFIG.storeAliases[storeName];
    // Só aplica o alias se o nome novo realmente existir no período mais
    // recente; caso contrário a loja não foi renomeada ainda.
    return alias && alias in latestStores ? alias : storeName;
  };
}

/**
 * Calcula o aproveitamento percentual de uma loja em um período.
 *
 * @returns O percentual, ou `null` quando a loja não existe no período ou
 *   não houve vendas — nesses casos a série deve ter um intervalo (gap),
 *   e não um zero artificial.
 */
function resolveAproveitamento(store: RawStoreData | undefined): number | null {
  if (!store || store.sales === 0) return null;
  return (store.evaluated / store.sales) * 100;
}

export function buildTrendChartData(database: PeriodDatabase): ChartData<'line'> {
  const periods = Object.keys(database).sort();
  const labels = periods.map((key) => database[key]?.label || key);
  const resolveStore = createAliasResolver(database);

  // Agrupa as lojas pelo nome canônico, para que uma renomeação produza
  // uma única série contínua atravessando o limite entre os meses.
  const series = new Map<string, (number | null)[]>();
  const lastKnownName = new Map<string, string>();

  periods.forEach((period, periodIndex) => {
    const periodData = database[period]?.data ?? {};

    for (const [rawName, store] of Object.entries(periodData)) {
      const storeName = resolveStore(rawName);

      if (!series.has(storeName)) {
        series.set(storeName, new Array<number | null>(periods.length).fill(null));
      }
      series.get(storeName)![periodIndex] = resolveAproveitamento(store);
      lastKnownName.set(storeName, rawName);
    }
  });

  const datasets = Array.from(series.keys())
    .sort()
    .map((storeName, index) => {
      const data = series.get(storeName)!;
      const color = resolveStoreLineColor(storeName, index);

      return {
        // Exibe o nome mais recente da loja (ex.: HONOR, e não DOM PEDRO).
        label: lastKnownName.get(storeName) ?? storeName,
        data,
        borderColor: color,
        backgroundColor: color,
        fill: false,
        tension: 0.3,
        spanGaps: false,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: color,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        borderWidth: 3,
      };
    });

  return { labels, datasets };
}

export function resolveStoreLineColor(storeName: string, index: number): string {
  const configColors = CONFIG.colors[storeName];
  if (configColors && configColors.length > 0) return configColors[0];
  return DEFAULT_LINE_COLORS[index % DEFAULT_LINE_COLORS.length];
}
