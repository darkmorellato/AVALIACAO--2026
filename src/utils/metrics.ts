/**
 * @file metrics.ts
 * @description Funções utilitárias para cálculo de métricas, formatação de porcentagens e animações.
 *
 * @author Kilo Assistant
 * @date 2026-05-19
 */

import {
  type Percentage,
  type RawStoreData,
  type MetricTotals,
} from '../types/index';
import { CONFIG } from '../constants/index';

/**
 * Retorna uma cor hexadecimal baseada no valor percentual fornecido.
 *
 * Os limites e as cores vêm de `CONFIG.thresholds`, que é a única fonte de
 * verdade — antes havia uma cópia local com cores divergentes.
 *
 * @param value - O valor percentual a ser avaliado.
 * @returns A cor hexadecimal correspondente ao threshold.
 *
 * @example
 * ```ts
 * getColorByPercent(25); // '#ef4444'
 * getColorByPercent(90); // '#10b981'
 * ```
 */
export function getColorByPercent(value: number): string {
  const { low, medium, good, great } = CONFIG.thresholds;

  if (value <= low.max) return low.color;
  if (value <= medium.max) return medium.color;
  if (value <= good.max) return good.color;
  return great.color;
}

/**
 * Calcula a porcentagem de uma parte em relação ao total e a retorna formatada.
 *
 * @param part - O valor parcial.
 * @param total - O valor total para o cálculo da porcentagem.
 * @returns A porcentagem formatada em formato brasileiro (ex: '85,42%').
 *
 * @example
 * ```ts
 * percent(85, 100); // '85,00%'
 * percent(1, 3);   // '33,33%'
 * ```
 */
export function percent(part: number, total: number): string {
  if (total === 0) return '0,00%';
  const result = (part / total) * 100;
  // `toLocaleString` em vez de `.replace('.', ',')`: o replace quebrava
  // com separador de milhar (1234.56 virava "1234,56", sem o ponto).
  return `${result.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

/**
 * Soma todas as métricas de um conjunto de lojas e retorna os totais agregados.
 *
 * @param storesData - Mapeamento de identificadores de loja para seus dados brutos.
 * @returns Um objeto contendo os totais de todas as métricas relevantes.
 *
 * @example
 * ```ts
 * const totals = calcTotals({
 *   'LOJA_A': { prev: 10, current: 20, sales: 5000, evaluated: 15 },
 *   'LOJA_B': { prev: 5, current: 15, sales: 3000, evaluated: 10 },
 * });
 * // totals = { prevReviews: 15, currentReviews: 35, sales: 8000, evaluated: 25 }
 * ```
 */
export function calcTotals(
  storesData: Record<string, RawStoreData>,
): MetricTotals {
  const keys = Object.keys(storesData);

  return keys.reduce<MetricTotals>(
    (acc, key) => {
      const store = storesData[key];
      return {
        prevReviews: acc.prevReviews + store.prev,
        currentReviews: acc.currentReviews + store.current,
        sales: acc.sales + store.sales,
        evaluated: acc.evaluated + store.evaluated,
      };
    },
    {
      prevReviews: 0,
      currentReviews: 0,
      sales: 0,
      evaluated: 0,
    },
  );
}

/**
 * Anima um elemento numérico de 0 até o valor final especificado.
 * A animação é exibida em um elemento identificado pelo seu `id`.
 *
 * @param id - O identificador do elemento DOM onde o valor animado será exibido.
 * @param end - O valor final que o contador deve atingir.
 *
 * @example
 * ```ts
 * animateValue('total-reviews', 150);
 * ```
 */
const activeAnimations = new Map<string, number>();

/**
 * Cancela qualquer animação de contador em andamento para o elemento informado.
 *
 * Sem isso, trocas rápidas de período deixam vários laços de
 * `requestAnimationFrame` disputando o `textContent` do mesmo elemento,
 * e o contador pode parar em um valor intermediário errado.
 *
 * @param id - O identificador do elemento DOM.
 */
export function cancelAnimation(id: string): void {
  const frame = activeAnimations.get(id);
  if (frame !== undefined) {
    cancelAnimationFrame(frame);
    activeAnimations.delete(id);
  }
}

export function animateValue(id: string, end: number): void {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`[metrics] Elemento com id "${id}" não encontrado para animação.`);
    return;
  }

  cancelAnimation(id);

  const duration = 1000;
  const start = 0;
  const startTime = performance.now();

  const update = (currentTime: number): void => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out quart
    const easedProgress = 1 - Math.pow(1 - progress, 4);
    const current = Math.floor(start + (end - start) * easedProgress);

    element.textContent = current.toLocaleString('pt-BR');

    if (progress < 1) {
      const frame = requestAnimationFrame(update);
      activeAnimations.set(id, frame);
    } else {
      activeAnimations.delete(id);
    }
  };

  const frame = requestAnimationFrame(update);
  activeAnimations.set(id, frame);
}

/**
 * Restringe um número dentro de um intervalo fechado [min, max].
 *
 * @param num - O número a ser restringido.
 * @param min - O limite mínimo do intervalo.
 * @param max - O limite máximo do intervalo.
 * @returns O número restringido ao intervalo.
 *
 * @example
 * ```ts
 * clamp(15, 0, 10); // 10
 * clamp(-5, 0, 10); // 0
 * clamp(7, 0, 10);  // 7
 * ```
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}
