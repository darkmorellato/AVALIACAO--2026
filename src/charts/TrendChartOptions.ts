/**
 * @file TrendChartOptions.ts
 * @description Constrói as opções do gráfico de tendência.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

import { ChartOptions } from 'chart.js';
import { getChartTheme } from '../utils/theme-helper';
import { getAnimationDuration } from '../utils/performance';

export function buildTrendChartOptions(): ChartOptions<'line'> {
  const theme = getChartTheme();

  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 20, right: 20, bottom: 10, left: 10 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
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
            return `${label}: ${value.toFixed(2)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: theme.textColor, font: { size: 11 } },
        grid: { color: theme.gridColor },
      },
      y: {
        ticks: { color: theme.textColor, font: { size: 11 }, callback: (v) => `${v}%` },
        min: 0,
        suggestedMax: 100,
        grid: { color: theme.gridColor },
      },
    },
    animation: { duration: getAnimationDuration(1000, 500), easing: 'easeOutQuart' },
    resizeDelay: 100,
  };
}