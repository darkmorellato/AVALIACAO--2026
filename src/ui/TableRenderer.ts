/**
 * @file ui/TableRenderer.ts
 * @description Renderizador profissional de tabela de lojas com ordenação por
 * aproveitamento, barra de progresso e integração com o sistema de tema.
 *
 * @author Kilo Assistant
 * @date 2026-05-19
 */

import { RawStoreData } from '../types/index';
import { CONFIG } from '../constants/index';
import { percent, getColorByPercent } from '../utils/metrics';
import { getRequiredElement } from '../utils/dom-utils';
import { Logger } from '../services/Logger';

/** Extensão de RawStoreData com o aproveitamento calculado. */
interface StoreWithPerformance {
  /** Nome da loja. */
  loja: string;
  /** Número de avaliações do período anterior. */
  prev: number;
  /** Número de avaliações do período atual. */
  current: number;
  /** Valor total de vendas no período. */
  sales: number;
  /** Quantidade de itens ou transações avaliadas. */
  evaluated: number;
  /** Índice de aproveitamento calculado (0–100). */
  aproveitamento: number;
}

/**
 * Renderizador da tabela de dados detalhados das lojas.
 * Responsável por gerar dinamicamente as linhas da tabela com ordenação
 * por performance e barras de progresso visuais.
 */
export class TableRenderer {
  private tbody: HTMLTableSectionElement;
  private logger: Logger;

  /**
   * @param tbodyId - O identificador do elemento `<tbody>` no DOM. Padrão: `'dataTable'`.
   */
  constructor(tbodyId: string = 'dataTable') {
    this.logger = new Logger('TableRenderer');
    this.tbody = getRequiredElement<HTMLTableSectionElement>(tbodyId);
    this.logger.debug(`TableRenderer inicializado com tbodyId: "${tbodyId}"`);
  }

  /**
   * Renderiza a tabela com os dados fornecidos, ordenando as lojas
   * por aproveitamento decrescente e adicionando barras de progresso.
   *
   * @param data - Mapeamento de nome da loja para seus dados brutos.
   */
  render(data: Record<string, RawStoreData>): void {
    this.logger.debug('Iniciando renderização da tabela');

    const sorted = this.sortStoresByPerformance(data);
    this.tbody.innerHTML = '';

    for (const item of sorted) {
      const row = document.createElement('tr');
      const color = getColorByPercent(item.aproveitamento);
      const logoUrl = CONFIG.storeLogos[item.loja] || '';
      const colors = CONFIG.colors[item.loja];
      const brandColor = colors && colors.length > 0 ? colors[0] : '#6366f1';

      row.innerHTML = `
        <td>
          <div class="store-cell">
            <div class="store-logo-wrapper" style="--brand-color: ${brandColor}; border-color: var(--brand-color);">
              <img src="${logoUrl}" alt="Logo ${item.loja}" class="store-logo-img">
            </div>
            <span class="store-name-text">${item.loja}</span>
          </div>
        </td>
        <td class="text-center">${item.prev}</td>
        <td class="text-center">${item.current}</td>
        <td class="text-center">${item.sales.toLocaleString('pt-BR')}</td>
        <td class="text-center">${item.evaluated}</td>
        <td class="text-center">
          <span class="perf-badge ${item.aproveitamento >= 70 ? 'perf-badge-high' : 'perf-badge-low'}" style="background-color: ${color}0D; border-color: ${color}33; color: ${color};">
            ${item.aproveitamento.toFixed(2)}%
          </span>
        </td>
        <td>${this.createProgressBar(item.aproveitamento, color)}</td>
      `;

      this.tbody.appendChild(row);
    }

    const count = sorted?.length ?? 0;
    this.logger.info(`Tabela renderizada com ${count} loja${count !== 1 ? 's' : ''}`);
  }

  /**
   * Ordena as lojas por aproveitamento (decrescente).
   *
   * @param data - Mapeamento de lojas para dados brutos.
   * @returns Array de lojas ordenado com o aproveitamento calculado.
   */
  private sortStoresByPerformance(
    data: Record<string, RawStoreData>,
  ): StoreWithPerformance[] {
    const entries = Object.entries(data);
    const withPerformance: StoreWithPerformance[] = entries.map(([loja, raw]) => {
      const aproveitamento = raw.sales > 0 ? (raw.evaluated / raw.sales) * 100 : 0;
      return {
        loja,
        prev: raw.prev,
        current: raw.current,
        sales: raw.sales,
        evaluated: raw.evaluated,
        aproveitamento,
      };
    });

    return withPerformance.sort((a, b) => b.aproveitamento - a.aproveitamento);
  }

  /**
   * Cria o HTML da barra de progresso com clamp de 0–100%.
   *
   * @param value - Valor percentual (pode ser negativo ou exceder 100).
   * @param color - Cor da barra em hexadecimal.
   * @returns String HTML da barra de progresso.
   */
  private createProgressBar(value: number, color: string): string {
    const clamped = Math.min(Math.max(value, 0), 100);
    return `
      <div class="progress-cell-wrapper">
        <div class="progress-track">
          <div class="progress-fill" style="width: ${clamped}%; background-color: ${color};">
            <div class="progress-shimmer"></div>
          </div>
        </div>
      </div>
    `;
  }
}
