import { CONFIG } from './config.js';
import { DataLoader } from './data-loader.js';
import { updateMetrics } from './metrics.js';
import { createTableRows } from './table.js';
import { renderBarChart, preloadLogos } from './chart-bar.js';
import { renderTrendChart } from './chart-trend.js';
import { renderCompareChart } from './chart-compare.js';
import { Exporter } from './export.js';
import { DarkMode } from './dark-mode.js';

const App = {
  currentPeriod: CONFIG.defaultPeriod,
  database: {},

  async init() {
    try {
      await DataLoader.init();
      this.database = DataLoader.database;
      this.renderPeriodButtons();
      preloadLogos();
      
      // Initialize dark mode with a theme-refresh callback
      DarkMode.init(() => this.refresh());
      
      this.refresh();
    } catch (error) {
      console.error("Falha ao inicializar o painel de vendas:", error);
      this.showErrorState(error.message);
    }
  },

  renderPeriodButtons() {
    const c = document.getElementById('dateFilter');
    if (!c) return;
    
    c.innerHTML = '';
    Object.keys(this.database).sort().forEach(p => {
      const b = document.createElement('button');
      b.id = `btn-${p}`;
      b.textContent = this.database[p].label;
      b.className = p === this.currentPeriod ? 'active' : '';
      b.addEventListener('click', () => this.switchPeriod(p));
      c.appendChild(b);
    });
  },

  switchPeriod(p) {
    if (!this.database[p] || this.currentPeriod === p) return;
    
    this.currentPeriod = p;
    document.querySelectorAll('.date-filter button').forEach(b => b.classList.remove('active'));
    
    const activeBtn = document.getElementById(`btn-${p}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    const t = document.querySelector('table');
    if (t) t.classList.add('loading');
    
    setTimeout(() => {
      const display = document.getElementById('period-display');
      if (display) display.textContent = this.database[p].label;
      if (t) t.classList.remove('loading');
      this.refresh();
    }, 500);
  },

  refresh() {
    const d = this.database[this.currentPeriod]?.data;
    if (!d) return;
    
    updateMetrics(d);
    renderBarChart(d);
    renderTrendChart(this.database);
    renderCompareChart(d);
    createTableRows(d);
  },

  export() {
    Exporter.downloadPDF();
  },

  showErrorState(message) {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="card" style="text-align: center; border: 2px solid var(--low); padding: 40px; opacity: 1; animation: none;">
          <i class="fa-solid fa-circle-exclamation" style="font-size: 48px; color: var(--low); margin-bottom: 20px;"></i>
          <h2 style="color: var(--low); justify-content: center; margin-bottom: 12px;">Erro ao carregar dados</h2>
          <p style="color: var(--secondary); margin-bottom: 20px;">Não foi possível carregar as informações do painel de vendas.</p>
          <div style="background: rgba(239, 68, 68, 0.1); color: var(--low); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 0.9em; margin-bottom: 20px; display: inline-block; word-break: break-all; max-width: 100%;">
            ${message}
          </div>
          <div>
            <button id="retryBtn" class="btn btn-export" style="background: var(--low); box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">Tentar Novamente</button>
          </div>
        </div>
      `;
      const retryBtn = document.getElementById('retryBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => window.location.reload());
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.addEventListener('beforeprint', () => {
  document.body.classList.add('is-printing');
  if (typeof Chart !== 'undefined' && Chart.instances) {
    for (let id in Chart.instances) {
      Chart.instances[id].resize();
    }
  }
});

window.addEventListener('afterprint', () => {
  document.body.classList.remove('is-printing');
  if (typeof Chart !== 'undefined' && Chart.instances) {
    for (let id in Chart.instances) {
      Chart.instances[id].resize();
    }
  }
});


