/**
 * @file TrendChart.ts
 * @description Gerenciador do gráfico de tendência temporal.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

import { Chart, CategoryScale, LinearScale, LineController, LineElement, PointElement, Tooltip, Legend } from 'chart.js';

// Registra os componentes necessários para gráficos de linha
Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Tooltip, Legend);
import { RawStoreData } from '../types/index';
import { eventBus } from '../services/EventBus';
import { buildTrendChartData } from './TrendChartData';
import { buildTrendChartOptions } from './TrendChartOptions';
import { TrendChartLegend } from './TrendChartLegend';

export class TrendChartManager {
  private chart: Chart<'line'> | null = null;
  private ctx: HTMLCanvasElement;
  private legend: TrendChartLegend;
  private unsubscribeTheme: (() => void) | null = null;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId);
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('[TrendChartManager] Canvas não encontrado ou inválido: ' + canvasId);
    }
    this.ctx = canvas;
    this.legend = new TrendChartLegend(canvas);
  }

  render(
    database: Record<string, { label: string; data: Record<string, RawStoreData> }>,
  ): void {
    // Destrói instância anterior de forma mais robusta
    this.destroy();

    // Verifica se há qualquer gráfico Chart.js ainda associado a este canvas
    const existingChart = Chart.getChart(this.ctx);
    if (existingChart) {
      console.log('[TrendChartManager] Gráfico existente encontrado no canvas, destruindo...');
      existingChart.destroy();
    }

    // Limpa o canvas completamente
    const ctx2d = this.ctx.getContext('2d');
    if (ctx2d) {
      ctx2d.clearRect(0, 0, this.ctx.width, this.ctx.height);
    }

    // Obtém um novo contexto após limpeza
    const ctxFresh = this.ctx.getContext('2d');
    if (!ctxFresh) {
      console.error('[TrendChartManager] Não foi possível obter o contexto 2D.');
      return;
    }

    const chartData = buildTrendChartData(database);
    const options = buildTrendChartOptions();

    this.chart = new Chart(ctxFresh, { type: 'line', data: chartData, options });
    this.legend.setChart(this.chart);
    this.legend.render(chartData);

    this.unsubscribeTheme = eventBus.on('theme:change', () => this.applyTheme());
  }

  private applyTheme(): void {
    if (!this.chart) return;
    this.chart.options = buildTrendChartOptions();
    this.chart.update('none');
    this.legend.render(this.chart.data);
  }

  destroy(): void {
    if (this.unsubscribeTheme) {
      this.unsubscribeTheme();
      this.unsubscribeTheme = null;
    }

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    this.legend.remove();

    // Limpa o canvas para remover qualquer resíduo visual
    const ctx2d = this.ctx.getContext('2d');
    if (ctx2d) {
      ctx2d.clearRect(0, 0, this.ctx.width, this.ctx.height);
    }
  }
}