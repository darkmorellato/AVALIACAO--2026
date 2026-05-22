/**
 * @file web-vitals.ts
 * @description Monitoramento de Core Web Vitals (LCP, FID, CLS).
 * Envia dados para console em desenvolvimento e pode ser integrado a analytics.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

// Polyfill simples para PerformanceObserver se não existir
if (typeof PerformanceObserver !== 'function') {
  (window as any).PerformanceObserver = class {
    observe() {}
    disconnect() {}
  };
}

// Tipos para Web Vitals
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

/**
 * Mede Largest Contentful Paint (LCP)
 */
export function measureLCP(onLCP: (value: number) => void): void {
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      onLCP(lastEntry.startTime);
    });
    po.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('LCP não suportado:', e);
  }
}

/**
 * Mede First Input Delay (FID)
 */
export function measureFID(onFID: (value: number) => void): void {
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstInput = entries[0] as PerformanceEventTiming;
      const processingTime = firstInput.processingStart - firstInput.startTime;
      onFID(processingTime);
    });
    po.observe({ entryTypes: ['first-input', 'input'] });
  } catch (e) {
    console.warn('FID não suportado:', e);
  }
}

/**
 * Mede Cumulative Layout Shift (CLS)
 */
export function measureCLS(onCLS: (value: number) => void): void {
  let clsValue = 0;
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries() as LayoutShift[];
      for (const entry of entries) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      onCLS(clsValue);
    });
    po.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    console.warn('CLS não suportado:', e);
  }
}

/**
 * Inicia monitoramento de todas as métricas Core Web Vitals.
 * Em produção, substitua os callbacks por envio a analytics.
 */
export function initWebVitalsMonitoring(): void {
  console.log('[WebVitals] Iniciando monitoramento...');

  measureLCP((lcp) => {
    console.log(`[WebVitals] LCP: ${Math.round(lcp)}ms`);
    // Aqui poderia enviar para analytics
  });

  measureFID((fid) => {
    console.log(`[WebVitals] FID: ${Math.round(fid)}ms`);
  });

  measureCLS((cls) => {
    console.log(`[WebVitals] CLS: ${cls.toFixed(3)}`);
  });
}
