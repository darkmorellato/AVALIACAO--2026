/**
 * @file validators.ts
 * @description Funções utilitárias para validação e guarda de tipos (type guards).
 * Garante que os dados recebidos conformem-se com os contratos definidos.
 *
 * @author Kilo Assistant
 * @date 2026-05-19
 */

import { type Period, type Database, type RawStoreData } from '../types/index';

/**
 * Verifica se um valor qualquer é um objeto válido.
 *
 * @param data - O valor a ser verificado.
 * @returns `true` se o valor for um objeto não-nulo.
 */
function isObject(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null;
}

/**
 * Type guard que verifica se um valor desconhecido conforma-se
 * com a interface {@link Period}.
 * 
 * Verifica as propriedades `label` (string) e `data` (objeto), além de validar
 * profundamente cada loja dentro de `data` via {@link isValidStoreData}.
 *
 * @param data - O valor a ser validado.
 * @returns `true` se o valor for um `Period` válido, caso contrário `false`.
 *
 * @example
 * ```ts
 * const input = { label: 'Mar/2026', data: { 'LOJA_A': { prev: 1, current: 2, sales: 100, evaluated: 1 } } };
 * if (isValidPeriod(input)) {
 *   console.log('Período válido:', input.label);
 * }
 * ```
 */
export function isValidPeriod(data: unknown): data is Period {
  if (!isObject(data)) return false;

  const hasLabel = typeof data.label === 'string';
  const hasData = typeof data.data === 'object' && data.data !== null;

  if (!hasLabel || !hasData) return false;

  // Cada loja precisa ter os quatro campos numéricos, senão o dashboard
  // quebra na renderização (ex.: `undefined.toLocaleString()` na tabela).
  return Object.entries(data.data as Record<string, unknown>).every(
    ([store, raw]) => isValidStoreData(raw, store),
  );
}

/**
 * Verifica se os dados brutos de uma loja estão estruturalmente corretos.
 *
 * Todos os campos devem ser números finitos. `evaluated` aceita valores
 * negativos (avaliações removidas da plataforma), assim como `current`
 * aceita valores menores que `prev` pelo mesmo motivo.
 *
 * @param raw - Os dados brutos da loja a serem validados.
 * @param store - Nome da loja, usado apenas na mensagem de erro.
 * @returns `true` se todos os campos forem números finitos.
 */
export function isValidStoreData(raw: unknown, store: string = 'loja'): boolean {
  if (!isObject(raw)) {
    console.warn(`[validators] Dados inválidos para "${store}": esperado um objeto.`);
    return false;
  }

  const fields: (keyof RawStoreData)[] = ['prev', 'current', 'sales', 'evaluated'];
  const invalid = fields.filter(
    (field) => typeof raw[field] !== 'number' || !Number.isFinite(raw[field] as number),
  );

  if (invalid.length > 0) {
    console.warn(
      `[validators] Loja "${store}" com campos inválidos: ${invalid.join(', ')}. ` +
        'Esperado números finitos.',
    );
    return false;
  }

  return true;
}

/**
 * Type guard que verifica se um valor desconhecido conforma-se
 * com o tipo {@link Database}.
 *
 * Realiza verificações profundas, garantindo que cada valor interno
 * seja um `Period` válido.
 *
 * @param data - O valor a ser validado.
 * @returns `true` se o valor for um `Database` válido, caso contrário `false`.
 *
 * @example
 * ```ts
 * const db = { '2026-03': { label: 'Mar/2026', data: {} } };
 * if (isValidDatabase(db)) {
 *   console.log('Database válido');
 * }
 * ```
 */
export function isValidDatabase(data: unknown): data is Database {
  if (!isObject(data)) return false;

  return Object.entries(data).every(([key, value]) => {
    return typeof key === 'string' && isValidPeriod(value);
  });
}

/**
 * Garante que um valor não seja `null` ou `undefined`.
 * Caso seja, lança um erro com uma mensagem customizável.
 *
 * @template T - O tipo esperado do valor.
 * @param value - O valor a ser verificado.
 * @param message - A mensagem de erro a ser lançada caso o valor seja nulo ou indefinido.
 * @returns O próprio valor, agora garantidamente não-nulo.
 * @throws Error - Se o valor for `null` ou `undefined`.
 *
 * @example
 * ```ts
 * const config = assertDefined(process.env.API_URL, 'A variável de ambiente API_URL é obrigatória.');
 * ```
 */
export function assertDefined<T>(
  value: T | undefined | null,
  message = 'Valor obrigatório não foi definido.',
): T {
  if (value === undefined || value === null) {
    throw new Error(`[validators] ${message}`);
  }
  return value;
}
