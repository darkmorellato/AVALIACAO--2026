/**
 * @file ui/MetricsPanel.ts
 * @description Gerenciador das métricas superiores do dashboard.
 * Atualiza os 4 cards de métricas com animação de contador e exibe
 * estado de erro quando necessário.
 *
 * @author Kilo Assistant
 * @date 2026-05-19
 */

import { RawStoreData } from '../types/index';
import { calcTotals, animateValue } from '../utils/metrics';
import { Logger } from '../services/Logger';

/** IDs dos elementos DOM usados pelas métricas principais. */
const METRIC_IDS = [
  'total-prev-reviews',
  'total-reviews',
  'total-sales',
  'total-evaluated',
] as const;

/**
 * Gerenciador profissional das métricas superiores do dashboard.
 * Responsável por atualizar os 4 cards com animação e exibir mensagens de erro.
 */
export class MetricsPanel {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MetricsPanel');
  }

  /**
   * Atualiza as 4 métricas com animação de contador.
   * Calcula os totais a partir dos dados das lojas e anima cada card.
   *
   * @param storesData - Mapeamento de nome da loja para seus dados brutos.
   */
  update(storesData: Record<string, RawStoreData>): void {
    this.logger.debug('Atualizando métricas do painel...');

    const totals = calcTotals(storesData);

    this.clearError();

    animateValue('total-prev-reviews', totals.prevReviews);
    animateValue('total-reviews', totals.currentReviews);
    animateValue('total-sales', totals.sales);
    animateValue('total-evaluated', totals.evaluated);

    this.logger.info('Métricas atualizadas com sucesso');
  }

  /**
   * Mostra estado de erro nos cards de métricas.
   * Substitui o valor de todos os cards por um traço e exibe uma mensagem
   * de erro opcional no console.
   *
   * @param message - Mensagem descritiva do erro.
   */
  showError(message: string): void {
    this.logger.error('Exibindo estado de erro nos painéis:', message);

    for (const id of METRIC_IDS) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = '\u2014';
        element.classList.add('metric-error');
      }
    }
  }

  /** Remove o estado de erro dos cards de métricas. */
  private clearError(): void {
    for (const id of METRIC_IDS) {
      const element = document.getElementById(id);
      if (element) {
        element.classList.remove('metric-error');
      }
    }
  }
}
