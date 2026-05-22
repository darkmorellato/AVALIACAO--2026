/**
 * @file TrendChartLegend.ts
 * @description Renderiza a legenda HTML customizada para o gráfico de tendência.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

import { Chart, ChartData } from 'chart.js';
import { CONFIG } from '../constants/index';

export class TrendChartLegend {
  private ctx: HTMLCanvasElement;
  private chart: Chart<'line'> | null = null;

  constructor(ctx: HTMLCanvasElement) {
    this.ctx = ctx;
  }

  setChart(chart: Chart<'line'>): void {
    this.chart = chart;
  }

  render(chartData: ChartData<'line'>): void {
    const canvasContainer = this.ctx.parentNode as HTMLElement;
    if (!canvasContainer) return;

    const cardContainer = canvasContainer.parentNode as HTMLElement;
    if (!cardContainer) return;

    let legendContainer = cardContainer.querySelector('.trend-custom-legend') as HTMLElement | null;
    if (!legendContainer) {
      legendContainer = document.createElement('div');
      legendContainer.className = 'trend-custom-legend';
      cardContainer.appendChild(legendContainer);
    } else {
      legendContainer.innerHTML = '';
    }

    const topRow = document.createElement('div');
    topRow.className = 'legend-top-row';
    const bottomRow = document.createElement('div');
    bottomRow.className = 'legend-bottom-row';

    chartData.datasets.forEach((dataset, index) => {
      const storeName = dataset.label || '';
      const logoUrl = CONFIG.storeLogos[storeName] || '';
      const lineColor = dataset.borderColor as string || '#888888';

      const item = document.createElement('div');
      item.className = 'trend-legend-item';

      const isVisible = this.chart ? this.chart.isDatasetVisible(index) : true;
      if (!isVisible) item.classList.add('hidden-dataset');

      if (logoUrl) {
        const img = document.createElement('img');
        img.src = logoUrl;
        img.alt = `Logo ${storeName}`;
        img.className = 'trend-legend-img';
        item.appendChild(img);
      }

      const dot = document.createElement('span');
      dot.className = 'trend-legend-color';
      dot.style.backgroundColor = lineColor;
      item.appendChild(dot);

      const labelSpan = document.createElement('span');
      labelSpan.textContent = storeName;
      item.appendChild(labelSpan);

      item.addEventListener('click', () => {
        if (!this.chart) return;
        const currentVisible = this.chart.isDatasetVisible(index);
        this.chart.setDatasetVisibility(index, !currentVisible);
        this.chart.update();
        item.classList.toggle('hidden-dataset', currentVisible);
      });

      if (storeName === 'KASSOUF' || storeName === 'PREMIUM') {
        bottomRow.appendChild(item);
      } else if (storeName === 'DOM PEDRO' || storeName === 'XV' || storeName === 'REALME') {
        topRow.appendChild(item);
      } else {
        topRow.appendChild(item);
      }
    });

    legendContainer.appendChild(topRow);
    if (bottomRow.children.length > 0) {
      legendContainer.appendChild(bottomRow);
    }
  }

  remove(): void {
    const canvasContainer = this.ctx.parentNode as HTMLElement;
    const cardContainer = canvasContainer?.parentNode as HTMLElement;
    cardContainer?.querySelector('.trend-custom-legend')?.remove();
  }
}