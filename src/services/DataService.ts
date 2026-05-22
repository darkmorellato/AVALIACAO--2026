/**
 * @file DataService.ts
 * @description Serviço gerenciador de dados da aplicação.
 * Centraliza carregamento, validação e acesso ao banco de dados por período,
 * implementando padrão Observer para notificação de mudanças de estado.
 *
 * @author Kilo Assistant
 * @date 2026-05-19
 */

import { type Database, type Period } from '../types/index';
import { isValidPeriod, isValidDatabase } from '../utils/validators';
import { Logger } from './Logger';

interface PeriodsResponse {
  readonly periods: readonly string[];
}

/**
 * Classe singleton para gerenciar dados do aplicativo.
 * Responsável por carregar, validar e disponibilizar dados de forma centralizada,
 * notificando os inscritos sempre que houver mudanças de estado.
 */
export class DataService {
  private readonly logger = new Logger('DataService');
  private database: Database = {};
  private periods: readonly string[] = [];
  private currentPeriod = '';
  private readonly listeners = new Set<(db: Database) => void>();
  private readonly cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Carrega os períodos do arquivo periods.json, depois carrega
   * os dados de cada período em paralelo.
   */
  async init(): Promise<void> {
    this.logger.info('Inicializando DataService...');
    try {
      const periodsResponse = await this.fetchJSON('/periods.json');
      const { periods } = (periodsResponse) as PeriodsResponse;

      if (!Array.isArray(periods)) {
        throw new Error('Formato inválido em periods.json: "periods" deve ser um array.');
      }

      const dataEntries = await Promise.all(
        periods.map(async (period) => {
          this.logger.debug(`Carregando dados do período: ${period}`);
          const data = await this.fetchJSON(`/data-${period}.json`);
          if (!isValidPeriod(data)) {
            throw new Error(`Dados inválidos para o período ${period}: estrutura não conforme.`);
          }
          return [period, data] as const;
        }),
      );

      const loadedDatabase: Record<string, Period> = Object.fromEntries(dataEntries);

      if (!isValidDatabase(loadedDatabase)) {
        throw new Error('Banco de dados carregado não passou na validação');
      }

       this.database = { ...loadedDatabase };
       this.periods = Object.freeze([...periods]);
       this.currentPeriod = this.periods[0] ?? '';

       this.logger.debug('Database carregado com', Object.keys(this.database).length, 'períodos');
       this.logger.info('DataService inicializado com sucesso. Períodos carregados:', this.periods);
    } catch (error) {
      this.logger.error('Erro durante a inicialização do DataService:', error);
      throw error;
    }
  }

  /**
   * Retorna os dados de um período específico.
   */
  getPeriodData(period: string): Period | undefined {
    return this.database[period];
  }

  /**
   * Retorna o banco de dados completo (somente leitura).
   */
  getDatabase(): Readonly<Database> {
    return Object.freeze({ ...this.database });
  }

  /**
   * Retorna os períodos disponíveis (somente leitura).
   */
  getPeriods(): ReadonlyArray<string> {
    return [...this.periods];
  }

  /**
   * Retorna o período atual.
   */
  getCurrentPeriod(): string {
    return this.currentPeriod;
  }

  /**
   * Define o período atual e notifica os inscritos.
   */
  setCurrentPeriod(period: string): void {
    if (!this.periods.includes(period)) {
      this.logger.warn(`Período inválido: ${period}. Períodos disponíveis:`, this.periods);
      return;
    }
    if (this.currentPeriod === period) return;

    this.currentPeriod = period;
    this.notify();
    this.logger.info(`Período atual alterado para: ${period}`);
  }

  /**
   * Adiciona um listener de mudanças e retorna função de unsubscribe.
   */
  subscribe(callback: (db: Database) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notifica todos os listeners com o estado atual do banco de dados.
   */
  private notify(): void {
    for (const callback of this.listeners) {
      try {
        callback(this.database);
      } catch (error) {
        this.logger.error('Erro ao notificar listener:', error);
      }
    }
  }

  /**
   * Busca JSON com cache em memória.
   * @param url - URL do recurso.
   */
  private async fetchJSON(url: string): Promise<any> {
    const now = Date.now();
    const cached = this.cache.get(url);

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`[Cache] Usando dados cacheados para ${url}`);
      return cached.data;
    }

    this.logger.debug(`[Fetch] Buscando ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao carregar ${url}: ${response.statusText}`);
    }
    const data = await response.json();
    this.cache.set(url, { data, timestamp: now });
    return data;
  }

  /** Limpa o cache interno (útil para testes). */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Cache limpo');
  }
}
