/**
 * @file Logger.ts
 * @description Serviço de logging profissional com controle de nível de verbosidade,
 * prefixo customizável e suporte para argumentos adicionais.
 *
 * @author Kilo Assistant
 * @date 2026-05-19
 */

/// <reference types="vite/client" />

 /**
  * Níveis de verbosidade do log, em ordem crescente de restrição.
  */
 export enum LogLevel {
  /** Nível mais baixo, útil para depuração. */
  DEBUG = 0,
  /** Nível informativo, útil para fluxo geral da aplicação. */
  INFO = 1,
  /** Nível de aviso, útil para situações não fatais. */
  WARN = 2,
  /** Nível de erro, para situações críticas. */
  ERROR = 3,
}

const LogLevelMap: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * Serviço de logging com controle de níveis e prefixo.
 * Permite logar mensagens condicionalmente com base no nível configurado.
 */
export class Logger {
  private readonly prefix: string;
  private level: LogLevel;

  /**
   * @param prefix Prefixo identificador da instância do logger (ex.: 'App', 'DataService').
   * @param level  Nível mínimo para que uma mensagem seja exibida. Padrão é DEBUG.
   */
  constructor(prefix: string = 'App', level: LogLevel = LogLevel.DEBUG) {
    this.prefix = prefix;
    this.level = level;
  }

  /**
   * Loga uma mensagem no nível DEBUG (se habilitado).
   */
  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * Loga uma mensagem no nível INFO (se habilitado).
   */
  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * Loga uma mensagem no nível WARN (se habilitado).
   */
  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * Loga uma mensagem no nível ERROR (se habilitado).
   */
  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * Método privado interno para processar e exibir a mensagem.
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    // Em produção, suprime logs abaixo de WARN para reduzir overhead
    // Vite define import.meta.env.DEV como true em desenvolvimento
    if (!import.meta.env.DEV && level < LogLevel.WARN) return;
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const levelLabel = LogLevelMap[level];
    const logMessage = `[${timestamp}] [${levelLabel}] [${this.prefix}] ${message}`;

    // Usa console[level] apropriado se disponível
    const consoleMethod = level === LogLevel.ERROR ? console.error :
                         level === LogLevel.WARN ? console.warn :
                         console.log;

    if (args.length > 0) {
      consoleMethod(logMessage, ...args);
    } else {
      consoleMethod(logMessage);
    }
  }
}
