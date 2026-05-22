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

// Interfaces para type hints dos módulos lazy
interface ChartModules {
  BarChartManager: new (canvasId: string) => any;
  TrendChartManager: new (canvasId: string) => any;
  CompareChartManager: new (canvasId: string) => any;
  preloadLogos?: () => Promise<void>;
}

interface UIModules {
  TableRenderer: new (tbodyId: string) => any;
  MetricsPanel: new () => any;
}

export class AppController {
  private dataService: DataService;
  private barChart: any = null;
  private trendChart: any = null;
  private compareChart: any = null;
  private tableRenderer: any = null;
  private metricsPanel: any = null;
  private loading: AppLoading | null = null;
  private darkMode: DarkModeManager;
  private dropdown: DropdownController;
  private refresh: AppRefresh;

   private logger: Logger;
   private isInitialized = false;
   private initInProgress = false;
   private state: AppState;

   private periodDisplay: HTMLElement | null = null;
   private dateFilter: HTMLElement | null = null;

   // Módulos carregados dinamicamente
   private static chartModules: ChartModules | null = null;
   private static uiModules: UIModules | null = null;

  constructor() {
    this.logger = new Logger('AppController');
    this.dataService = new DataService();
    this.darkMode = new DarkModeManager();
    this.dropdown = new DropdownController();
    this.refresh = new AppRefresh();
    this.state = { ...DEFAULT_APP_STATE };
  }

async init(): Promise<void> {
      if (this.initInProgress) return;
      this.initInProgress = true;
      this.destroy();
      this.logger.info('Inicializando AppController...');

      try {
        await this.loadModules();
        if (!AppController.chartModules || !AppController.uiModules) throw new Error('Falha ao carregar módulos');

        this.metricsPanel = new AppController.uiModules!.MetricsPanel();
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

        const charts = AppController.chartModules!;
        this.barChart = new charts.BarChartManager('conversionChart');
        this.trendChart = new charts.TrendChartManager('trendChart');
        this.compareChart = new charts.CompareChartManager('compareChart');
        this.tableRenderer = (AppController.uiModules || {}).TableRenderer
          ? new AppController.uiModules!.TableRenderer('dataTable')
          : null;

        if (this.barChart?.preloadLogos) await this.barChart.preloadLogos();

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

    private async loadModules(): Promise<void> {
     if (AppController.chartModules && AppController.uiModules) return;
     this.logger.info('Carregando módulos lazy...');
     const [bar, trend, compare, table, metrics] = await Promise.all([
       import('./charts/BarChart'),
       import('./charts/TrendChart'),
       import('./charts/CompareChart'),
       import('./ui/TableRenderer'),
       import('./ui/MetricsPanel'),
     ]);
     AppController.chartModules = { BarChartManager: bar.BarChartManager, TrendChartManager: trend.TrendChartManager, CompareChartManager: compare.CompareChartManager };
     AppController.uiModules = { TableRenderer: table.TableRenderer, MetricsPanel: metrics.MetricsPanel };
   }

   private renderPeriodButtons(): void {
     if (!this.dateFilter) return this.logger.warn('Elemento dateFilter não encontrado no DOM');
     this.dropdown.render(this.dateFilter, this.dataService.getPeriods(), this.state.currentPeriod, (p) => this.switchPeriod(p));
   }

    private async switchPeriod(period: string): Promise<void> {
      if (period === this.state.currentPeriod) return;
      this.logger.info(`Trocando período: ${this.state.currentPeriod} -> ${period}`);
      this.state.currentPeriod = period; this.state.retryCount = 0;
      this.dateFilter && this.dropdown.updateActivePeriod(this.dateFilter, period);
      this.updatePeriodDisplay(period);
      eventBus.emit('period:change', period);
      this.loading?.show();
      try { this.doRefresh(); }
      catch (error) { this.logger.error('Erro durante switchPeriod:', error); }
      finally { this.loading?.hide(); }
    }

    private updatePeriodDisplay(period: string): void {
      if (this.periodDisplay) {
        this.periodDisplay.textContent = this.dropdown.formatPeriodLabel(period);
      }
    }

   private doRefresh(): void {
     if (!this.metricsPanel || !this.barChart || !this.trendChart || !this.compareChart || !this.tableRenderer) {
       return this.logger.warn('Componentes não inicializados ainda');
     }
     try {
       this.refresh.refresh(this.state.currentPeriod, this.dataService, this.barChart, this.trendChart, this.compareChart, this.tableRenderer, this.metricsPanel);
     } catch (error) {
       this.logger.error('Erro durante refresh:', error);
       this.loading?.showError(`Erro ao atualizar os dados do dashboard: ${error instanceof Error ? error.message : String(error)}`);
     }
   }

   private setupEventListeners(): void {
     eventBus.on('period:change', (p: string) => this.logger.debug('EventBus: period:change ->', p));
     eventBus.on('theme:change', () => { this.isInitialized && this.doRefresh(); });
     document.addEventListener('click', (e) => {
       const btn = (e.target as HTMLElement).closest('#retryBtn');
       if (btn && !this.isInitialized && !this.initInProgress) {
         this.state.retryCount++;
         this.logger.info(`Tentativa de retry #${this.state.retryCount}`);
         this.init().catch(err => this.logger.error('Retry falhou:', err));
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
