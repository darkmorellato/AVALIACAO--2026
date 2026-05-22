import { CONFIG } from './config.js';
import { percent } from './metrics.js';
import { getChartTheme } from './theme-helper.js';

Chart.register(ChartDataLabels);

let barChartInstance = null;
const loadedImages = {};

export function preloadLogos() {
  Object.keys(CONFIG.storeLogos).forEach(k => {
    const img = new Image();
    img.src = CONFIG.storeLogos[k];
    loadedImages[k] = img;
  });
}

function makeGradient(ctx, colors) {
  const g = ctx.createLinearGradient(0, 0, 0, 350);
  g.addColorStop(0, colors[0]);
  g.addColorStop(1, colors[1]);
  return g;
}

export function renderBarChart(storesData) {
  const labels = Object.keys(storesData);
  const values = labels.map(l => parseFloat(percent(storesData[l].evaluated, storesData[l].sales)));
  const ctx = document.getElementById('conversionChart');
  if (!ctx) return;
  
  const c2d = ctx.getContext('2d');
  if (barChartInstance) barChartInstance.destroy();
  
  const yMax = Math.max(...values);
  const axisMax = yMax > 0 ? Math.ceil((yMax * 1.1) / 10) * 10 : 100;
  const theme = getChartTheme();

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Aproveitamento (%)',
        data: values,
        backgroundColor: labels.map(l => makeGradient(c2d, CONFIG.colors[l])),
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        datalabels: {
          color: theme.datalabelColor,
          anchor: 'end',
          align: 'top',
          offset: 4,
          font: { weight: '800', size: 13 },
          formatter: v => v + '%'
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label(context) {
              const d = storesData[context.label];
              return [
                `Vendas: ${d.sales}`,
                `Avaliadas: ${d.evaluated}`,
                `Aproveitamento: ${context.parsed.y}%`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          max: axisMax,
          title: { display: true, text: 'Aproveitamento (%)', color: theme.secondaryColor },
          ticks: { color: theme.secondaryColor },
          grid: { color: theme.gridColor }
        },
        x: {
          ticks: { color: 'transparent', padding: 8 },
          grid: { color: theme.gridColor }
        }
      }
    },
    plugins: [ChartDataLabels, {
      id: 'logoPlugin',
      afterDraw(chart) {
        const c = chart.ctx;
        const xa = chart.scales.x;
        const ya = chart.scales.y;
        c.save();
        c.font = '600 12px Inter';
        c.fillStyle = theme.secondaryColor;
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        
        xa.ticks.forEach((tk, i) => {
          const l = xa.getLabelForValue(tk.value);
          const img = loadedImages[l];
          const tw = c.measureText(l).width;
          const sp = 6;
          const sz = 14;
          const tot = tw + (img?.complete ? sp + sz : 0);
          const cx = xa.getPixelForTick(i);
          const x = cx - tot / 2;
          const y = ya.bottom + 16;
          
          c.fillText(l, x, y);
          
          if (img?.complete) {
            c.save();
            c.beginPath();
            c.arc(x + tw + sp + sz / 2, y, sz / 2, 0, Math.PI * 2);
            c.clip();
            c.drawImage(img, x + tw + sp, y - sz / 2, sz, sz);
            c.restore();
          }
        });
        c.restore();
      }
    }]
  });
}
