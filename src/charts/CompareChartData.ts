/**
 * @file CompareChartData.ts
 * @description Constrói dados e opções para o gráfico comparativo.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

import { ChartData, ChartOptions } from 'chart.js';
import { RawStoreData } from '../types/index';
import { getChartTheme } from '../utils/theme-helper';
import { getAnimationDuration } from '../utils/performance';

export function buildCompareChartData(
  storesData: Record<string, RawStoreData>,
): ChartData<'bar'> {
  const labels = Object.keys(storesData);

  const dataVendas = labels.map((name) => {
    const store = storesData[name];
    if (!store) return 0;
    return typeof store.sales === 'number' ? store.sales : 0;
  });
  const dataAvaliadas = labels.map((name) => {
    const store = storesData[name];
    if (!store) return 0;
    return typeof store.evaluated === 'number' ? store.evaluated : 0;
  });

  return {
    labels,
    datasets: [
      {
        label: 'Vendas',
        data: dataVendas,
        backgroundColor: '#3b82f6',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Avaliadas',
        data: dataAvaliadas,
        backgroundColor: '#10b981',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };
}

export function buildCompareChartOptions(
  storesData: Record<string, RawStoreData>,
): ChartOptions<'bar'> {
  const theme = getChartTheme();

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    layout: { padding: { top: 10, right: 10, bottom: 10, left: 10 } },
    indexAxis: 'x',
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { color: theme.textColor, boxWidth: 12, font: { size: 11, weight: 'bold' } },
      },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        titleColor: theme.tooltipColor,
        bodyColor: theme.tooltipColor,
        borderColor: 'rgba(99, 102, 241, 0.4)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: "'Inter', system-ui, sans-serif", weight: 'bold', size: 13 },
        bodyFont: { family: "'Inter', system-ui, sans-serif", size: 12 },
        footerFont: { family: "'Inter', system-ui, sans-serif", weight: 'bold', size: 12 },
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y ?? 0;
            const formatted = typeof value === 'number' ? value.toLocaleString('pt-BR') : value;
            return `${label === 'Vendas' ? 'Vendas Totais' : 'Vendas Avaliadas'}: ${formatted}`;
          },
          footer: (tooltipItems) => {
            const first = tooltipItems[0];
            if (!first) return '';
            const store = storesData[first.label];
            if (!store) return '';
            const aproveitamento = store.sales > 0 ? (store.evaluated / store.sales) * 100 : 0;
            return `Aproveitamento: ${aproveitamento.toFixed(2)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: theme.textColor, font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: theme.textColor, font: { size: 11 } },
        grid: { color: theme.gridColor },
        beginAtZero: true,
      },
    },
    animation: { duration: getAnimationDuration(800, 400), easing: 'easeOutQuart' },
    resizeDelay: 100,
  };
}