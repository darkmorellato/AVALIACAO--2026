/**
 * @file CompareChart.ts
 * @description Gerenciador do gráfico comparativo de vendas vs avaliadas.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

import {
  Chart,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { RawStoreData } from '../types/index';
import { buildCompareChartData, buildCompareChartOptions } from './CompareChartData';
import { Logger } from '../services/Logger';

// Registra os componentes necessários para gráficos de barra
Chart.register(CategoryScale, LinearScale, BarController, BarElement, Tooltip, Legend);

export class CompareChartManager {
  private chart: Chart<'bar'> | null = null;
  private ctx: HTMLCanvasElement;
  private logger: Logger;

  constructor(canvasId: string) {
    this.logger = new Logger('CompareChartManager');
    const canvas = document.getElementById(canvasId);
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('[CompareChartManager] Canvas não encontrado ou inválido: ' + canvasId);
    }
    this.ctx = canvas;
  }

  render(storesData: Record<string, RawStoreData>): void {
    if (!storesData || typeof storesData !== 'object') {
      this.logger.error('storesData inválido ou undefined');
      return;
    }

    this.destroy();

    const ctx = this.ctx.getContext('2d');
    if (!ctx) {
      this.logger.error('Não foi possível obter o contexto 2D.');
      return;
    }

    const data = buildCompareChartData(storesData);
    const options = buildCompareChartOptions(storesData);

    this.chart = new Chart(ctx, { type: 'bar', data, options });
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    // Limpa o canvas para evitar resíduos
    const ctx2d = this.ctx.getContext('2d');
    if (ctx2d) {
      ctx2d.clearRect(0, 0, this.ctx.width, this.ctx.height);
    }
  }
}