import { CONFIG } from './config.js';

export function getColorByPercent(val) {
  const t = CONFIG.thresholds;
  if (val <= t.low.max)    return t.low.color;
  if (val <= t.medium.max) return t.medium.color;
  if (val <= t.good.max)   return t.good.color;
  return t.great.color;
}

export function percent(part, total) {
  return total > 0 ? ((part / total) * 100).toFixed(2) : '0.00';
}

export function calcTotals(storesData) {
  const v = Object.values(storesData);
  return {
    prevReviews:   v.reduce((a,c) => a + c.prev, 0),
    currentReviews:v.reduce((a,c) => a + c.current, 0),
    sales:         v.reduce((a,c) => a + c.sales, 0),
    evaluated:     v.reduce((a,c) => a + c.evaluated, 0)
  };
}

export function animateValue(id, end) {
  const el = document.getElementById(id);
  if (!el) return;
  
  const start = parseInt(el.textContent.replace(/\./g, '')) || 0;
  if (start === end) return;
  
  const t0 = performance.now();
  const dur = 1000;
  
  (function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 4);
    el.textContent = Math.floor(ease * (end - start) + start).toLocaleString(CONFIG.currency);
    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = end.toLocaleString(CONFIG.currency);
    }
  })(t0);
}

export function updateMetrics(storesData) {
  const t = calcTotals(storesData);
  animateValue('total-prev-reviews',  t.prevReviews);
  animateValue('total-reviews',       t.currentReviews);
  animateValue('total-sales',         t.sales);
  animateValue('total-evaluated',     t.evaluated);
}
