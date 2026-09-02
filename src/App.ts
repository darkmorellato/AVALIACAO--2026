/**
 * @file App.ts
 * @description Controlador principal do aplicativo. Orquestra a inicialização,
 * atualização e destruição de todos os módulos visuais e de serviço.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

'use strict';

import { DataService } from './services/DataService';
import { DarkModeManager } from './ui/DarkMode';
import { DropdownController } from './ui/DropdownController';
import { AppLoading } from './ui/AppLoading';
import { AppRefresh } from './AppRefresh';
import { Logger } from './services/Logger';
import { eventBus } from './services/EventBus';
import { CONFIG } from './constants/index';
import { type AppState, DEFAULT_APP_STATE } from './AppState';
import { BarChartManager } from './charts/BarChart';
import { TrendChartManager } from './charts/TrendChart';
import { CompareChartManager } from './charts/CompareChart';
import { TableRenderer } from './ui/TableRenderer';
import { MetricsPanel } from './ui/MetricsPanel';
import { PdfExporter } from './services/PdfExporter';

export class AppController {
  private dataService: DataService;
  private barChart: BarChartManager | null = null;
  private trendChart: TrendChartManager | null = null;
  private compareChart: CompareChartManager | null = null;
  private tableRenderer: TableRenderer | null = null;
  private metricsPanel: MetricsPanel | null = null;
  private loading: AppLoading | null = null;
  private darkMode: DarkModeManager;
  private dropdown: DropdownController;
  private refresh: AppRefresh;
  private pdfExporter: PdfExporter;

  private logger: Logger;
  private isInitialized = false;
  private initInProgress = false;
  private state: AppState;

  private periodDisplay: HTMLElement | null = null;
  private dateFilter: HTMLElement | null = null;

  constructor() {
    this.logger = new Logger('AppController');
    this.dataService = new DataService();
    this.darkMode = new DarkModeManager();
    this.dropdown = new DropdownController();
    this.refresh = new AppRefresh();
    this.pdfExporter = new PdfExporter();
    this.state = { ...DEFAULT_APP_STATE };
  }

  async init(): Promise<void> {
    if (this.initInProgress) return;
    this.initInProgress = true;
    this.destroy();
    this.logger.info('Inicializando AppController...');

    try {
      this.metricsPanel = new MetricsPanel();
      this.loading = new AppLoading(this.metricsPanel);
      this.loading.show();

      await this.dataService.init();

      const periods = this.dataService.getPeriods();

      if (!periods || periods.length === 0) {
        throw new Error('Nenhum período disponível. Verifique o arquivo periods.json.');
      }

      const initialPeriod = periods.includes(CONFIG.defaultPeriod)
        ? CONFIG.defaultPeriod
        : periods[periods.length - 1];

      if (!initialPeriod) {
        throw new Error('Nenhum período válido encontrado.');
      }

      this.dataService.setCurrentPeriod(initialPeriod);
      this.state.currentPeriod = initialPeriod;

      this.periodDisplay = document.getElementById('period-display');
      this.dateFilter = document.getElementById('dateFilter');

      this.barChart = new BarChartManager('conversionChart');
      this.trendChart = new TrendChartManager('trendChart');
      this.compareChart = new CompareChartManager('compareChart');
      this.tableRenderer = new TableRenderer('dataTable');

      await this.barChart.preloadLogos();

      this.darkMode.init();
      this.renderPeriodButtons();
      this.setupEventListeners();
      this.updatePeriodDisplay(this.state.currentPeriod);

      this.doRefresh();
      this.isInitialized = true;
      this.logger.info('AppController inicializado com sucesso.');
    } catch (error) {
      this.logger.error('Falha na inicialização:', error);
      this.loading?.showError('Falha ao carregar os dados do dashboard.');
      throw error;
    } finally {
      this.loading?.hide();
      this.initInProgress = false;
    }
  }

  private renderPeriodButtons(): void {
    if (!this.dateFilter) return this.logger.warn('Elemento dateFilter não encontrado no DOM');
    this.dropdown.render(
      this.dateFilter,
      this.dataService.getPeriods(),
      this.state.currentPeriod,
      (p) => this.switchPeriod(p),
    );
  }

  private async switchPeriod(period: string): Promise<void> {
    if (period === this.state.currentPeriod) return;
    this.logger.info(`Trocando período: ${this.state.currentPeriod} -> ${period}`);
    this.state.currentPeriod = period;
    this.state.retryCount = 0;
    this.dataService.setCurrentPeriod(period);
    if (this.dateFilter) {
      this.dropdown.updateActivePeriod(this.dateFilter, period);
    }
    this.updatePeriodDisplay(period);
    eventBus.emit('period:change', period);
    this.loading?.show();
    try {
      this.doRefresh();
    } catch (error) {
      this.logger.error('Erro durante switchPeriod:', error);
    } finally {
      this.loading?.hide();
    }
  }

  private updatePeriodDisplay(period: string): void {
    if (this.periodDisplay) {
      this.periodDisplay.textContent = this.dropdown.formatPeriodLabel(period);
    }
  }

  private doRefresh(): void {
    if (
      !this.metricsPanel ||
      !this.barChart ||
      !this.trendChart ||
      !this.compareChart ||
      !this.tableRenderer
    ) {
      return this.logger.warn('Componentes não inicializados ainda');
    }
    try {
      this.refresh.refresh(
        this.state.currentPeriod,
        this.dataService,
        this.barChart,
        this.trendChart,
        this.compareChart,
        this.tableRenderer,
        this.metricsPanel,
      );
    } catch (error) {
      this.logger.error('Erro durante refresh:', error);
      this.loading?.showError(
        `Erro ao atualizar os dados do dashboard: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private setupEventListeners(): void {
    eventBus.on('period:change', (p: string) => this.logger.debug('EventBus: period:change ->', p));
    eventBus.on('theme:change', () => {
      if (this.isInitialized) this.doRefresh();
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const retryBtn = target.closest('#retryBtn');
      if (retryBtn && !this.isInitialized && !this.initInProgress) {
        this.state.retryCount++;
        this.logger.info(`Tentativa de retry #${this.state.retryCount}`);
        this.init().catch((err) => this.logger.error('Retry falhou:', err));
        return;
      }

      const exportBtn = target.closest('#exportPdfBtn');
      if (exportBtn) {
        this.pdfExporter.exportToPdf(this.state.currentPeriod);
      }
    });
  }

  destroy(): void {
    this.logger.info('Destruindo AppController...');
    document.getElementById('app-error-state')?.remove();
    this.barChart?.destroy();
    this.trendChart?.destroy();
    this.compareChart?.destroy();
    this.dropdown?.destroy();
    this.isInitialized = false;
    this.loading?.hide();
    this.logger.info('AppController destruído com sucesso.');
  }
}
