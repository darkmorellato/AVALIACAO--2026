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

/** Valores de thresholds padrão extraídos da configuração. */
const THRESHOLDS = {
  low: 30,
  medium: 50,
  good: 75,
  great: 100,
} as const;

/**
 * Retorna uma cor hexadecimal baseada no valor percentual fornecido.
 * A escala de cores segue o padrão: vermelho < laranja < amarelo < verde.
 *
 * @param value - O valor percentual a ser avaliado.
 * @returns A cor hexadecimal correspondente ao threshold.
 *
 * @example
 * ```ts
 * getColorByPercent(45); // '#EF4444'
 * getColorByPercent(80); // '#F59E0B'
 * ```
 */
export function getColorByPercent(value: number): string {
  if (value <= THRESHOLDS.low) return '#EF4444'; // vermelho
  if (value <= THRESHOLDS.medium) return '#F97316'; // laranja
  if (value <= THRESHOLDS.good) return '#F59E0B'; // amarelo
  return '#22C55E'; // verde
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
  return `${result.toFixed(2).replace('.', ',')}%`;
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
export function animateValue(id: string, end: number): void {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`[metrics] Elemento com id "${id}" não encontrado para animação.`);
    return;
  }

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
      requestAnimationFrame(update);
    }
  };

  requestAnimationFrame(update);
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
