import { getChartTheme } from './theme-helper.js';

let compareChartInstance = null;

export function renderCompareChart(storesData) {
  const labels = Object.keys(storesData);
  const ctx = document.getElementById('compareChart');
  if (!ctx) return;
  
  if (compareChartInstance) compareChartInstance.destroy();
  
  const theme = getChartTheme();

  compareChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Vendas',
          data: labels.map(l => storesData[l].sales),
          backgroundColor: 'rgba(59, 130, 246, 0.75)'
        },
        {
          label: 'Avaliadas',
          data: labels.map(l => storesData[l].evaluated),
          backgroundColor: 'rgba(16, 185, 129, 0.75)'
        }
      ]
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
