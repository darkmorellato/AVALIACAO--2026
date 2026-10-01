/**
 * @file dom-utils.ts
 * @description Funções utilitárias seguras para manipulação do DOM.
 * Centraliza a lógica de acesso e modificação de elementos HTML,
 * garantindo tipagem rigorosa e tratamento de er consistente.
 * 
 * @author Kilo Assistant
 * @date 2026-05-19
 */

/**
 * Obtém um elemento do DOM pelo seu identificador, garantindo o tipo genérico especificado.
 *
 * @template T - O tipo do elemento HTML esperado (padrão: {@link HTMLElement}).
 * @param id - O identificador do elemento (atributo `id`).
 * @returns O elemento encontrado do tipo `T`, ou `null` caso não exista.
 *
 * @example
 * ```ts
 * const btn = getElement<HTMLButtonElement>('submit-btn');
 * if (btn) btn.disabled = true;
 * ```
 */
export function getElement<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Obtém um elemento do DOM pelo seu identificador, lançando um erro caso não seja encontrado.
 * Útil em cenários onde a presença do elemento é obrigatória para a aplicação funcionar.
 *
 * @template T - O tipo do elemento HTML esperado (padrão: {@link HTMLElement}).
 * @param id - O identificador do elemento (atributo `id`).
 * @returns O elemento encontrado do tipo `T`.
 * @throws ElementNotFoundError - Se o elemento não for encontrado no DOM.
 *
 * @example
 * ```ts
 * // Lança erro se a âncora principal não existir
 * const app = getRequiredElement<HTMLDivElement>('app-root');
 * ```
 */
export function getRequiredElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = getElement<T>(id);
  if (!element) {
    throw new Error(`[dom-utils] Elemento obrigatório com id "${id}" não foi encontrado no DOM.`);
  }
  return element;
}

/**
 * Escapa os caracteres especiais de HTML em um texto.
 *
 * Uso obrigatório antes de interpolar qualquer dado em `innerHTML`, para
 * impedir que um nome de loja ou uma mensagem de erro seja interpretado
 * como marcação.
 *
 * @param text - O texto a ser escapado.
 * @returns O texto com `&`, `<`, `>`, `"` e `'` substituídos por entidades.
 *
 * @example
 * ```ts
 * escapeHtml('<img src=x onerror=alert(1)>');
 * // '&lt;img src=x onerror=alert(1)&gt;'
 * ```
 */
export function escapeHtml(text: unknown): string {
  return String(text ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] as string,
  );
}

/**
 * Define o conteúdo de texto de um elemento identificado pelo seu `id`.
 * Se o elemento não for encontrado, exibe um aviso no console e não realiza nenhuma ação.
 *
 * @param id - O identificador do elemento (atributo `id`).
 * @param text - O texto a ser definido no elemento.
 *
 * @example
 * ```ts
 * setTextContent('status-label', 'Processando...');
 * setTextContent('total-count', '150');
 * ```
 */
export function setTextContent(id: string, text: string): void {
  const element = getElement(id);
  if (!element) {
    console.warn(`[dom-utils] Não foi possível definir texto: elemento com id "${id}" não encontrado.`);
    return;
  }
  element.textContent = text;
}
