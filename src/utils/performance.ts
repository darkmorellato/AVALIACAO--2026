/**
 * @file performance.ts
 * @description Funções utilitárias para otimização de performance.
 * Detectornação de dispositivo, preferências de redução de movimento, etc.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

let isMobileCache: boolean | null = null;

/**
 * Detecta se o dispositivo é móvel baseado em largura de tela.
 * Usa cache para evitar recálculos frequentes.
 *
 * @returns `true` se for dispositivo móvel (largura < 768px)
 */
export function isMobile(): boolean {
  if (isMobileCache === null) {
    isMobileCache = window.innerWidth < 768;
  }
  return isMobileCache;
}

/**
 * Detecta se o usuário prefere reduzir animações (acessibilidade).
 *
 * @returns `true` se preferir reduzir movement
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Retorna a duração de animação apropriada baseada nas preferências do usuário.
 *
 * @param desktopDuration - Duração para desktop (ms)
 * @param mobileDuration - Duração para mobile (ms)
 * @returns Duração em ms
 */
export function getAnimationDuration(desktopDuration: number = 800, mobileDuration: number = 0): number {
  if (prefersReducedMotion()) return 0;
  return isMobile() ? mobileDuration : desktopDuration;
}

/**
 * Retorna se o canvas deve usar devicePixelRatio otimizado.
 * Em mobile, limitar para 1 ou 1.5 pode melhorar performance.
 *
 * @returns fator de pixel ratio
 */
export function getOptimalPixelRatio(): number {
  if (isMobile()) {
    return Math.min(window.devicePixelRatio || 1, 1.5);
  }
  return window.devicePixelRatio || 1;
}

/**
 * Debounce simples para eventos de resize.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}
