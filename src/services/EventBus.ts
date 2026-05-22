/**
 * @file EventBus.ts
 * @description Sistema de eventos leve para comunicação entre módulos,
 * implementando padrão pub/sub baseado em Map e Set para alta performance.
 *
 * @author Kilo Assistant
 * @date 2026-05-19
 */

export type EventName = 'period:change' | 'theme:change' | 'data:loaded';

type EventHandler = (...args: any[]) => void;

/**
 * Singleton de eventos para comunicação desacoplada entre módulos.
 * Utiliza Map e Set para garantir alta performance na gestão de handlers e eventos.
 * O construtor é privado para forçar a criação única da instância.
 */
export class EventBus {
  private static instance: EventBus;
  private readonly events: Map<EventName, Set<EventHandler>>;

  /**
   * Construtor privado para padrão singleton.
   * Inicializa a estrutura interna de eventos.
   */
  private constructor() {
    this.events = new Map<EventName, Set<EventHandler>>();
  }

  /**
   * Retorna a instância única do EventBus.
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Emite um evento, invocando todos os handlers inscritos.
   * @param event Nome do evento a ser emitido.
   * @param args Argumentos a serem repassados aos handlers.
   */
  emit(event: EventName, ...args: any[]): void {
    const handlers = this.events.get(event);
    if (!handlers) return;

    for (const callback of handlers) {
      try {
        callback(...args);
      } catch (error) {
        console.error(`[EventBus] Erro no handler do evento "${event}":`, error);
      }
    }
  }

  /**
   * Inscreve um handler para um evento.
   * @param event Nome do evento a ser escutado.
   * @param callback Função a ser chamada quando o evento for emitido.
   * @returns Função para remover o listener inscrito (unsubscribe).
   */
  on(event: EventName, callback: EventHandler): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set<EventHandler>());
    }
    this.events.get(event)!.add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Remove um callback específico de um evento.
   * @param event Nome do evento.
   * @param callback Função a ser removida.
   */
  off(event: EventName, callback: EventHandler): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(callback);
    }
  }
}

/**
 * Instância única e pré-resolvida do EventBus.
 */
export const eventBus = EventBus.getInstance();
