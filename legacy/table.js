import { CONFIG } from './config.js';
import { percent, getColorByPercent } from './metrics.js';

function sortStoresByPerformance(data) {
  return Object.keys(data)
    .map(loja => ({ loja, ...data[loja], aproveitamento: percent(data[loja].evaluated, data[loja].sales) }))
    .sort((a, b) => parseFloat(b.aproveitamento) - parseFloat(a.aproveitamento));
}

export function createTableRows(data) {
  const tbody = document.getElementById('dataTable');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  sortStoresByPerformance(data).forEach(i => {
    const { loja, prev, current, sales, evaluated, aproveitamento } = i;
    const numericAproveitamento = parseFloat(aproveitamento);
    const color = getColorByPercent(numericAproveitamento);
    
    // Clamp the progress bar width to 100% to prevent visual layout overflow
    const displayProgress = Math.min(100, Math.max(0, numericAproveitamento));
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <img src="${CONFIG.storeLogos[loja]}" alt="Logo ${loja}" class="store-logo">
        <span class="store-name">${loja}</span>
      </td>
      <td class="text-center">${prev}</td>
      <td class="text-center">${current}</td>
      <td class="text-center">${sales}</td>
      <td class="text-center">${evaluated}</td>
      <td class="text-center percent-value">${aproveitamento}%</td>
      <td class="progress-cell">
        <div class="progress-container">
          <div class="progress-bar" style="width:${displayProgress}%;background-color:${color}"></div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
