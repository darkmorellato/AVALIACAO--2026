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

export function buildTrendChartData(
  database: Record<string, { label: string; data: Record<string, RawStoreData> }>,
): ChartData<'line'> {
  const periods = Object.keys(database).sort();
  const labels = periods.map((key) => database[key]?.label ?? '').filter(label => label);

  const allStores = new Set<string>();
  periods.forEach((p) => {
    const periodData = database[p];
    if (periodData?.data) {
      Object.keys(periodData.data).forEach((store) => allStores.add(store));
    }
  });
  const sortedStores = Array.from(allStores).sort();

  const datasets = sortedStores.map((storeName, index) => {
    const data = periods.map((period) => {
      const periodData = database[period];
      if (!periodData?.data) return 0;
      const storeData = periodData.data[storeName];
      if (!storeData || storeData.sales === 0) return 0;
      return (storeData.evaluated / storeData.sales) * 100;
    });

    const color = resolveStoreLineColor(storeName, index);

    return {
      label: storeName,
      data,
      borderColor: color,
      backgroundColor: color,
      fill: false,
      tension: 0.3,
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