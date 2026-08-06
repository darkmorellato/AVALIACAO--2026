/**
 * @file theme-helper.ts
 * @description Helpers para controle e geração do tema de visualização de gráficos.
 * 
 * @author Kilo Assistant
 * @date 2026-05-19
 */

import { type ChartTheme } from '../types/index';

/**
 * Determina se o modo escuro está ativo com base nas configurações do sistema
 * ou na preferência salva localmente.
 *
 * @returns `true` se o modo escuro estiver ativo, caso contrário `false`.
 */
function isDarkMode(): boolean {
  const stored = localStorage.getItem('theme-preference');
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Retorna o tema de cores apropriado para os gráficos com base
 * no modo de exibição atual (escuro ou claro).
 *
 * @returns Um objeto {@link ChartTheme} contendo a paleta de cores configurada.
 *
 * @example
 * ```ts
 * const theme = getChartTheme();
 * console.log(theme.textColor); // '#F9FAFB' ou '#111827'
 * ```
 */
export function getChartTheme(): ChartTheme {
  const dark = isDarkMode();

  if (dark) {
    return {
      textColor: '#F9FAFB',
      secondaryColor: '#9CA3AF',
      gridColor: 'rgba(255, 255, 255, 0.1)',
      datalabelColor: '#E5E7EB',
      tooltipBg: '#0f172a',
      tooltipColor: '#F3F4F6',
    };
  }

  return {
    textColor: '#000000',
    secondaryColor: '#374151',
    gridColor: 'rgba(0, 0, 0, 0.08)',
    datalabelColor: '#000000',
    tooltipBg: '#0f172a',
    tooltipColor: '#F3F4F6',
  };
}
