/**
 * @file AppRefresh.ts
 * @description Lógica de refresh dos componentes visuais.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

import { RawStoreData } from './types/index';
import { Logger } from './services/Logger';
import { DataService } from './services/DataService';
import { BarChartManager } from './charts/BarChart';
import { TrendChartManager } from './charts/TrendChart';
import { CompareChartManager } from './charts/CompareChart';
import { TableRenderer } from './ui/TableRenderer';
import { MetricsPanel } from './ui/MetricsPanel';

interface DatabaseEntry {
  label: string;
  data: Record<string, RawStoreData>;
}

export class AppRefresh {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('AppRefresh');
  }

  refresh(
    currentPeriod: string,
    dataService: DataService,
    barChart: BarChartManager,
    trendChart: TrendChartManager,
    compareChart: CompareChartManager,
    tableRenderer: TableRenderer,
    metricsPanel: MetricsPanel,
  ): void {
    this.logger.debug('Iniciando refresh dos componentes visuais...');

    const periodData = dataService.getPeriodData(currentPeriod);

    if (!periodData) {
      const db = dataService.getDatabase();
      const available = Object.keys(db).join(', ');
      this.logger.error(`Dados do período "${currentPeriod}" não encontrados. Períodos disponíveis: ${available}`);
      throw new Error(`Dados do período "${currentPeriod}" não encontrados.`);
    }

    const storesData = periodData.data;
    
    if (!storesData || Object.keys(storesData).length === 0) {
      this.logger.error(`Nenhuma loja encontrada no período "${currentPeriod}". Verifique o arquivo de dados.`);
      throw new Error(`Nenhuma loja encontrada no período "${currentPeriod}".`);
    }

    const database = this.buildDatabase(storesData, dataService);

    metricsPanel.update(storesData);
    barChart.render(storesData);
    trendChart.render(database);
    compareChart.render(storesData);
    tableRenderer.render(storesData);

    this.logger.info('Refresh completo.');
  }

  private buildDatabase(
    storesData: Record<string, RawStoreData>,
    dataService: DataService,
  ): Record<string, DatabaseEntry> {
    const db = dataService.getDatabase();
    const result: Record<string, DatabaseEntry> = {};

    for (const [key, period] of Object.entries(db)) {
      if (!period) continue;
      result[key] = { 
        label: period.label ?? '', 
        data: period.data ?? {} 
      };
    }

    return result;
  }
}