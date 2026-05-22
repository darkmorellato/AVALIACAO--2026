/**
 * @file BarChart.ts
 * @description Plugin customizado para renderização de logos nos gráficos de barras.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

import { Chart } from 'chart.js';

interface LogoPluginOptions {
  logoImages?: Map<string, HTMLImageElement>;
}

export const logoPlugin = {
  id: 'logoPlugin',

  afterDraw(chart: Chart): void {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const meta = chart.getDatasetMeta(0);
    if (!meta) return;

    const options = chart.options as unknown as LogoPluginOptions;
    const logoImages = options.logoImages;
    if (!logoImages || logoImages.size === 0) return;

    meta.data.forEach((element, index) => {
      const labels = chart.data.labels as (string | undefined)[];
      const label = labels[index];
      if (!label) return;

      const img = logoImages.get(label);
      if (!img || !img.complete) return;

      const bar = element as unknown as { x: number; y: number; width: number; height: number };
      const logoSize = 22;
      const logoX = bar.x - logoSize / 2;
      const logoY = Math.max(bar.y - logoSize - 26, chartArea.top + 2);

      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    });
  },
};