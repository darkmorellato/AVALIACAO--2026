/**
 * @file types/index.ts
 * @description Definições de tipos e interfaces utilizadas em todo o sistema de Avaliação 2026.
 * Este módulo centraliza os contratos de dados para garantir consistência e facilitar manutenção.
 *
 * @author Kilo Assistant
 * @date 2026-05-19
 */

// --------------------------------------------------------------------------
// Tipos Primitivos Auxiliares
// --------------------------------------------------------------------------

/** Representa o valor percentual de aproveitamento, entre 0 e 100. */
export type Percentage = number;

/** Identificador único de uma loja (ex: 'DOM PEDRO', 'XV'). */
export type StoreId = string;

/** Rótulo descritivo de um período (ex: '2026-03', 'Janeiro/2026'). */
export type PeriodLabel = string;

// --------------------------------------------------------------------------
// Dados de Loja
// --------------------------------------------------------------------------

/**
 * Dados brutos extraídos diretamente da fonte para uma loja específica.
 * Contém as métricas originais antes de qualquer processamento ou cálculo.
 */
export interface RawStoreData {
  /** Número de avaliações do período anterior. */
  prev: number;

  /** Número de avaliações do período atual. */
  current: number;

  /** Valor total de vendas no período. */
  sales: number;

  /** Quantidade de itens ou transações avaliadas. */
  evaluated: number;
}

/**
 * Dados processados de uma loja, incluindo o índice de aproveitamento calculado.
 * Extende {@link RawStoreData} adicionando a métrica derivada `aproveitamento`.
 */
export interface StoreData extends RawStoreData {
  /** Índice de aproveitamento calculado em percentual (0–100). */
  aproveitamento: Percentage;
}

// --------------------------------------------------------------------------
// Período e Banco de Dados
// --------------------------------------------------------------------------

/**
 * Estrutura de um período de avaliação, contendo o rótulo descritivo
 * e um mapeamento de lojas para seus dados brutos.
 */
export interface Period {
  /** Rótulo legível do período (ex: 'Mar/2026'). */
  label: string;

  /** Mapeamento das lojas participantes neste período. */
  data: Record<StoreId, RawStoreData>;
}

/**
 * Banco de dados completo da aplicação.
 * Mapeia identificadores de períodos para as respectivas estruturas de dados.
 */
export type Database = Record<PeriodLabel, Period>;

// --------------------------------------------------------------------------
// Configuração do Sistema
// --------------------------------------------------------------------------

/**
 * Limite (threshold) para classificação visual por cor.
 * @property max   - Valor máximo do intervalo (exclusive para o próximo).
 * @property color - Cores hexadecimais associadas ao nível.
 */
export interface Threshold {
  max: number;
  color: string;
}

/**
 * Configuração centralizada da aplicação.
 * Define período padrão, moeda, logotipos, paletas de cores e limites de classificação.
 */
export interface AppConfig {
  /** Período selecionado por padrão na inicialização. */
  defaultPeriod: string;

  /** Código da moeda / localidade (ex: 'pt-BR'). */
  currency: string;

  /** Mapeia o nome da loja para o nome do arquivo de logotipo correspondente. */
  storeLogos: Record<string, string>;

  /** Extensão de imagem preferida (ex: '.webp', '.png') */
  preferredImageFormat: string;

  /** Mapeia o nome da loja para o par de cores [cor1, cor2] utilizadas nos gráficos. */
  colors: Record<string, [string, string]>;

  /** Limites de classificação para coloração de indicadores. */
  thresholds: Record<'low' | 'medium' | 'good' | 'great', Threshold>;
}

// --------------------------------------------------------------------------
// Tema e Visualização
// --------------------------------------------------------------------------

/**
 * Paleta de cores para customização de temas de gráficos.
 */
export interface ChartTheme {
  textColor: string;
  secondaryColor: string;
  gridColor: string;
  datalabelColor: string;
  tooltipBg: string;
  tooltipColor: string;
}

// --------------------------------------------------------------------------
// Métricas e Estado
// --------------------------------------------------------------------------

/**
 * Agregado de métricas calculadas para um determinado conjunto de dados.
 * Útil para exibir totais em dashboards e relatórios.
 */
export interface MetricTotals {
  /** Soma de avaliações do período anterior. */
  prevReviews: number;

  /** Soma de avaliações do período atual. */
  currentReviews: number;

  /** Soma de vendas. */
  sales: number;

  /** Total de itens avaliados. */
  evaluated: number;
}

/** Estados possíveis de uma operação assíncrona de carregamento de dados. */
export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';
