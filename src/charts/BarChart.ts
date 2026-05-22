import { Chart, ChartData, ChartOptions, CategoryScale, LinearScale, BarController, BarElement, Tooltip, Legend } from 'chart.js';
import { getAnimationDuration } from '../utils/performance';
import { CONFIG } from '../constants/index';
import { RawStoreData } from '../types/index';
import { getChartTheme } from '../utils/theme-helper';
import { logoPlugin } from './BarChartPlugin';
import { Logger } from '../services/Logger';

Chart.register(CategoryScale, LinearScale, BarController, BarElement, Tooltip, Legend);

export class BarChartManager {
  private chart: Chart<'bar'> | null = null;
  private ctx: HTMLCanvasElement;
  private loadedImages = new Map<string, HTMLImageElement>();
  private logger: Logger;

  constructor(canvasId: string) {
    this.logger = new Logger('BarChartManager');
    const canvas = document.getElementById(canvasId);
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error(`Canvas "${canvasId}" não encontrado.`);
    this.ctx = canvas;
  }

  async preloadLogos(): Promise<void> {
    const storeNames = Object.keys(CONFIG.storeLogos);
    const supportsWebP = await this.checkWebPSupport();
    const promises = storeNames.map(async (storeName) => {
      const originalUrl = CONFIG.storeLogos[storeName];
      const url = supportsWebP ? originalUrl.replace('.png', '.webp') : originalUrl;
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => { this.loadedImages.set(storeName, img); resolve(); };
        img.onerror = () => {
          if (url !== originalUrl) {
            const fallback = new Image();
            fallback.onload = () => { this.loadedImages.set(storeName, fallback); resolve(); };
            fallback.src = originalUrl;
          } else resolve();
        };
        img.src = url;
      });
    });
    await Promise.all(promises);
  }

  private checkWebPSupport(): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => resolve(img.naturalWidth > 0);
      img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
    });
  }

  render(storesData: Record<string, RawStoreData>): void {
    if (!storesData || typeof storesData !== 'object') {
      this.logger.error('storesData inválido ou undefined');
      return;
    }

    this.destroy();
    const existing = Chart.getChart(this.ctx);
    if (existing) existing.destroy();

    const tempCtx = this.ctx.getContext('2d');
    tempCtx?.clearRect(0, 0, this.ctx.width, this.ctx.height);

    const ctx = this.ctx.getContext('2d');
    if (!ctx) return;

    const theme = getChartTheme();
    const labels = Object.keys(storesData);
    
    if (labels.length === 0) {
      this.logger.warn('Nenhuma label encontrada em storesData');
      return;
    }
    const values: number[] = labels.map(name => {
      const store = storesData[name];
      if (!store || typeof store.sales !== 'number' || typeof store.evaluated !== 'number') return 0;
      return store.sales > 0 ? (store.evaluated / store.sales) * 100 : 0;
    }).map(v => Number(v) || 0);

    const maxLimit = Math.max(100, Math.round(Math.max(...values, 0) * 1.5));
    const colors = labels.map(name => {
      const palette = CONFIG.colors[name];
      return palette ? this.makeGradient(ctx, palette) : '#888888';
    });

    const data: ChartData<'bar'> = { labels, datasets: [{ label: 'Aproveitamento (%)', data: values, backgroundColor: colors, borderColor: 'transparent', borderWidth: 0, borderRadius: 8, borderSkipped: false }] };

    const options: ChartOptions<'bar'> & { logoImages?: Map<string, HTMLImageElement> } = {
      responsive: true, maintainAspectRatio: false, indexAxis: 'x',
      plugins: this.buildPlugins(theme, storesData),
      layout: { padding: { top: 60, right: 20, bottom: 10, left: 10 } },
      scales: {
        x: { ticks: { color: theme.textColor, font: { size: 11 } }, grid: { display: false } },
        y: { beginAtZero: true, max: maxLimit, ticks: { color: theme.textColor, font: { size: 11 }, callback: v => `${v}%` }, grid: { color: theme.gridColor } },
      },
      animation: { duration: getAnimationDuration(800, 400), easing: 'easeOutQuart' },
      resizeDelay: 100,
    };

    const logoImages = new Map<string, HTMLImageElement>();
    labels.forEach(label => {
      const img = this.loadedImages.get(label);
      if (img) logoImages.set(label, img);
    });
    options.logoImages = logoImages;

    this.chart = new Chart(ctx, { type: 'bar', data, options, plugins: [logoPlugin] });
  }

  private buildPlugins(theme: ReturnType<typeof getChartTheme>, storesData: Record<string, RawStoreData>) {
    return {
      legend: { display: false }, title: { display: false },
      tooltip: {
        backgroundColor: theme.tooltipBg, titleColor: theme.tooltipColor, bodyColor: theme.tooltipColor,
        borderColor: 'rgba(99, 102, 241, 0.4)', borderWidth: 1, padding: 12, cornerRadius: 8,
        titleFont: { family: "'Inter', system-ui, sans-serif", weight: "bold" as const, size: 13 },
        bodyFont: { family: "'Inter', system-ui, sans-serif", size: 12 },
        footerFont: { family: "'Inter', system-ui, sans-serif", weight: "bold" as const, size: 12 },
        callbacks: {
          label: (context: any) => {
            const label = context.label;
            const raw = context.raw;
            if (!label || raw == null) return '';
            const store = storesData[label];
            return [`Vendas Totais: ${store.sales.toLocaleString('pt-BR')}`, `Vendas Avaliadas: ${store.evaluated.toLocaleString('pt-BR')}`, `Aproveitamento: ${raw.toFixed(2)}%`];
          },
        },
      },
      // datalabels removido para evitar erro
    };
  }

  destroy(): void {
    this.chart?.destroy();
    this.chart = null;
    this.ctx.getContext('2d')?.clearRect(0, 0, this.ctx.width, this.ctx.height);
  }

  private makeGradient(ctx: CanvasRenderingContext2D, colors: [string, string]): CanvasGradient {
    const g = ctx.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, colors[0]);
    g.addColorStop(1, colors[1]);
    return g;
  }
}