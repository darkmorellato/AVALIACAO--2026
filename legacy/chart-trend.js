import { CONFIG } from './config.js';
import { percent } from './metrics.js';
import { getChartTheme } from './theme-helper.js';

let trendChartInstance = null;

// Helper to get the best contrasting store color for lines
function getStoreLineColor(storeName) {
  const pair = CONFIG.colors[storeName];
  if (!pair) return '#6b7280';
  // Use the darker of the two colors to ensure contrast
  return (storeName === 'PREMIUM' || storeName === 'XV') ? pair[0] : pair[1];
}

export function renderTrendChart(database) {
  const periods = Object.keys(database).sort();
  if (periods.length === 0) return;
  
  const labels = periods.map(p => database[p].label);
  const stores = Object.keys(database[periods[0]].data);
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  
  if (trendChartInstance) trendChartInstance.destroy();
  
  const theme = getChartTheme();

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: stores.map(s => {
        const lineColor = getStoreLineColor(s);
        return {
          label: s,
          data: periods.map(p => {
            const d = database[p].data[s];
            return d ? parseFloat(percent(d.evaluated, d.sales)) : 0;
          }),
          borderColor: lineColor,
          backgroundColor: lineColor + '15', // light transparent fill
          tension: 0.3,
          fill: true
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: theme.textColor,
            font: { family: 'Inter', weight: '600' }
          }
        }
      },
      scales: {
        y: {
          ticks: { color: theme.secondaryColor },
          grid: { color: theme.gridColor }
        },
        x: {
          ticks: { color: theme.secondaryColor },
          grid: { color: theme.gridColor }
        }
      }
    }
  });
}
