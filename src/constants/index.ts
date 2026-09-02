/**
 * @file constants/index.ts
 * @description Constantes e configuração padronizada da aplicação Avaliação 2026.
 *
 * @author Kilo Assistant
 * @date 2026-05-19
 */

import { AppConfig } from '../types';

/**
 * Configuração principal do sistema.
 * @see {@link AppConfig}
 */
export const CONFIG: AppConfig = {
  /** Período padrão selecionado ao iniciar a aplicação. */
  defaultPeriod: '2026-08',

  /** Localidade para formatação de números e moedas. */
  currency: 'pt-BR',

  /** Mapeamento de nomes de loja para arquivos de logotipo. */
  storeLogos: {
    'DOM PEDRO': '/Untitled-dom pedro.png',
    'KASSOUF': '/Untitled-kassouf.png',
    'PREMIUM': '/Untitled-premium.png',
    'REALME': '/Untitled-realme.png',
    'XV': '/Untitled-xv.png',
  },

  /** Extensão de imagem preferida */
  preferredImageFormat: '.webp' as const,

  /** Paletas de cores por loja, utilizadas em gráficos e indicadores visuais. */
  colors: {
    'DOM PEDRO': ['#add8e6', '#2196f3'],
    'KASSOUF': ['#ff4500', '#ff7e01'],
    'REALME': ['#ffea00', '#f4c430'],
    'PREMIUM': ['#bf953f', '#fcf6ba'],
    'XV': ['#000000', '#434343'],
  },

  /** Limites (thresholds) para coloração de indicadores de aproveitamento. */
  thresholds: {
    low: { max: 30, color: '#ef4444' },
    medium: { max: 50, color: '#f59e0b' },
    good: { max: 75, color: '#3b82f6' },
    great: { max: 100, color: '#10b981' },
  },
};