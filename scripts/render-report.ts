/**
 * @file render-report.ts
 * @description Renderiza o relatório por loja em Node, para inspeção do layout.
 *
 * Reaproveita `StoreReportData` e a rotina de desenho de `StoreReportPdf`,
 * mas substitui o download por escrita em disco e lê os logos do filesystem.
 * Não faz parte do bundle do app: é usado apenas por `scripts/render-report.js`.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildAllStoreReports, type StoreReport } from '../src/services/StoreReportData';
import type { Database } from '../src/types/index';

/** jsPDF mínimo, com o mesmo layout de `StoreReportPdf`. */
const PAGE = { width: 210, height: 297 };
const MARGIN = 16;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

const INK = '#111827';
const INK_SOFT = '#6b7280';
const INK_FAINT = '#9ca3af';
const LINE = '#e5e7eb';
const SURFACE = '#f9fafb';
const POSITIVE = '#10b981';
const NEGATIVE = '#ef4444';
const NEUTRAL = '#6366f1';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

const num = (v: number) => Math.round(v).toLocaleString('pt-BR');
const pct = (v: number, d = 1) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
const pPoints = (v: number) =>
  `${v >= 0 ? '+' : '−'}${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.`;

export async function render(
  database: Database,
  period: string,
  publicDir: string,
): Promise<{ filename: string; data: Buffer; pages: number } | null> {
  const { jsPDF } = await import('jspdf');
  const reports = buildAllStoreReports(database as Database, period);
  if (reports.length === 0) return null;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const periodLabel = database[period]?.label || period;
  const totalPages = reports.length + 1;

  const logos = new Map<string, { dataUrl: string; width: number; height: number } | null>();
  for (const report of reports) {
    const file = report.logoUrl ? join(publicDir, report.logoUrl.replace(/^\//, '')) : '';
    if (!file || !existsSync(file)) {
      logos.set(report.storeName, null);
      continue;
    }
    const dataUrl = `data:image/png;base64,${readFileSync(file).toString('base64')}`;
    // Lê o IHDR do PNG para obter a proporção real.
    const buf = readFileSync(file);
    logos.set(report.storeName, {
      dataUrl,
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    });
  }

  drawSummary(doc as never, reports, periodLabel, totalPages);
  reports.forEach((report, index) => {
    doc.addPage();
    drawStorePage(doc as never, report, logos.get(report.storeName) ?? null, index + 2, totalPages);
  });

  const out = Buffer.from(doc.output('arraybuffer'));
  return {
    filename: `desempenho-por-loja-${period}.pdf`,
    data: out,
    pages: totalPages,
  };
}

function drawPageChrome(
  doc: any,
  title: string,
  subtitle: string,
  page: number,
  total: number,
): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...hexToRgb(INK_FAINT));
  doc.text(title, MARGIN, 10);
  doc.text(subtitle, PAGE.width - MARGIN, 10, { align: 'right' });
  doc.setDrawColor(...hexToRgb(LINE));
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 13, MARGIN + CONTENT_WIDTH, 13);
  doc.setFontSize(7);
  doc.text('Avaliação 2026 — Mi Place', MARGIN, 289);
  doc.text(`${page} / ${total}`, PAGE.width - MARGIN, 289, { align: 'right' });
}

function drawSectionTitle(doc: any, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(INK_SOFT));
  doc.text(title.toUpperCase(), MARGIN, y, { charSpace: 0.6 });
  doc.setDrawColor(...hexToRgb(LINE));
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + 2.4, MARGIN + CONTENT_WIDTH, y + 2.4);
  return y + 8;
}

function drawMetricCard(
  doc: any,
  x: number,
  y: number,
  width: number,
  value: string,
  label: string,
  note: string,
  accent: string,
): void {
  const height = 26;
  doc.setFillColor(...hexToRgb(SURFACE));
  doc.setDrawColor(...hexToRgb(LINE));
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, height, 1.5, 1.5, 'FD');
  doc.setFillColor(...hexToRgb(accent));
  doc.rect(x, y, 1.2, height, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...hexToRgb(INK_FAINT));
  doc.text(label.toUpperCase(), x + 5, y + 6, { charSpace: 0.4 });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...hexToRgb(INK));
  doc.text(value, x + 5, y + 15.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...hexToRgb(INK_SOFT));
  doc.text(note, x + 5, y + 21.5);
}

function drawSummary(
  doc: any,
  reports: StoreReport[],
  periodLabel: string,
  totalPages: number,
): void {
  drawPageChrome(doc, 'Relatório de desempenho por loja', periodLabel, 1, totalPages);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...hexToRgb(INK));
  doc.text('Desempenho por loja', MARGIN, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(INK_SOFT));
  doc.text(`${periodLabel} — Rede Mi Place`, MARGIN, 37);

  const totalSales = reports.reduce((s, r) => s + r.current.sales, 0);
  const totalEvaluated = reports.reduce((s, r) => s + r.current.evaluated, 0);
  const network = reports[0]?.networkAproveitamento ?? 0;

  let y = 50;
  y = drawSectionTitle(doc, 'Rede no período', y);
  const cw = (CONTENT_WIDTH - 8) / 3;
  drawMetricCard(doc, MARGIN, y, cw, pct(network, 2), 'Aproveitamento da rede', `${reports.length} lojas com vendas`, NEUTRAL);
  drawMetricCard(doc, MARGIN + cw + 4, y, cw, num(totalSales), 'Vendas no mês', 'soma das lojas', NEUTRAL);
  drawMetricCard(
    doc,
    MARGIN + (cw + 4) * 2,
    y,
    cw,
    totalEvaluated < 0 ? `−${num(-totalEvaluated)}` : num(totalEvaluated),
    'Avaliações recebidas',
    'no mês',
    totalEvaluated < 0 ? NEGATIVE : NEUTRAL,
  );

  y += 34;
  y = drawSectionTitle(doc, 'Ranking das lojas', y);
  const c = { pos: MARGIN + 2, name: MARGIN + 14, sales: MARGIN + 96, appr: MARGIN + 124, bar: MARGIN + 132 };
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...hexToRgb(INK_FAINT));
  doc.text('#', c.pos, y - 2);
  doc.text('LOJA', c.name, y - 2, { charSpace: 0.4 });
  doc.text('VENDAS', c.sales, y - 2, { align: 'right' });
  doc.text('APROVEIT.', c.appr, y - 2, { align: 'right' });

  y += 2;
  reports.forEach((report, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(...hexToRgb(SURFACE));
      doc.rect(MARGIN, y - 4.2, CONTENT_WIDTH, 7, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...hexToRgb(index === 0 ? POSITIVE : INK_SOFT));
    doc.text(String(index + 1), c.pos, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(INK));
    doc.text(report.storeName, c.name, y);
    doc.setTextColor(...hexToRgb(INK_SOFT));
    doc.text(num(report.current.sales), c.sales, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(report.aproveitamento < 0 ? NEGATIVE : INK));
    doc.text(pct(report.aproveitamento, 2), c.appr, y, { align: 'right' });

    const tw = CONTENT_WIDTH - 134;
    doc.setFillColor(...hexToRgb(LINE));
    doc.roundedRect(c.bar, y - 1.5, tw, 1.8, 0.9, 0.9, 'F');
    const ratio = Math.min(Math.abs(report.aproveitamento) / 100, 1);
    if (ratio > 0) {
      doc.setFillColor(...hexToRgb(report.aproveitamento < 0 ? NEGATIVE : POSITIVE));
      doc.roundedRect(c.bar, y - 1.5, Math.max(tw * ratio, 1), 1.8, 0.9, 0.9, 'F');
    }
    y += 6;
  });

  y += 6;
  y = drawSectionTitle(doc, 'Como ler este relatório', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(INK_SOFT));
  [
    'Aproveitamento é a razão entre as vendas avaliadas e as vendas totais do mês.',
    'A média histórica considera todos os meses com vendas registradas.',
    'O aproveitamento da rede soma as avaliadas e divide pelas vendas do período.',
    'Valores negativos indicam avaliações removidas da plataforma.',
  ].forEach((line) => {
    doc.text(`•  ${line}`, MARGIN, y);
    y += 5;
  });
}

function drawStorePage(
  doc: any,
  report: StoreReport,
  logo: { dataUrl: string; width: number; height: number } | null,
  pageNumber: number,
  totalPages: number,
): void {
  drawPageChrome(doc, report.storeName, report.periodLabel, pageNumber, totalPages);

  let y = 26;
  let logoWidth = 0;
  if (logo && logo.width > 0 && logo.height > 0) {
    const logoHeight = 20;
    const width = Math.min((logoHeight * logo.width) / logo.height, 40);
    try {
      doc.addImage(logo.dataUrl, 'PNG', MARGIN, y, width, logoHeight, undefined, 'FAST');
      logoWidth = width;
    } catch {
      logoWidth = 0;
    }
  }

  const textX = MARGIN + (logoWidth ? logoWidth + 5 : 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...hexToRgb(INK));
  doc.text(report.storeName, textX, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...hexToRgb(INK_SOFT));
  doc.text(`Desempenho de ${report.periodLabel}`, textX, y + 16);

  const badge = report.tied
    ? `${report.rank}º de ${report.totalStores} (empate)`
    : `${report.rank}º de ${report.totalStores}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const bw = doc.getTextWidth(badge) + 8;
  doc.setFillColor(...hexToRgb(SURFACE));
  doc.setDrawColor(...hexToRgb(LINE));
  doc.roundedRect(PAGE.width - MARGIN - bw, y + 4, bw, 8, 4, 4, 'FD');
  doc.setTextColor(...hexToRgb(INK_SOFT));
  doc.text(badge, PAGE.width - MARGIN - bw / 2, y + 9.4, { align: 'center' });

  y += 32;
  y = drawSectionTitle(doc, 'Indicadores do mês', y);
  const cw = (CONTENT_WIDTH - 8) / 3;
  const variationNote =
    report.variation === null ? 'sem mês anterior' : `${pPoints(report.variation)} vs mês anterior`;
  drawMetricCard(
    doc,
    MARGIN,
    y,
    cw,
    pct(report.aproveitamento, 2),
    'Aproveitamento',
    variationNote,
    report.aproveitamento < 0 ? NEGATIVE : report.color,
  );
  drawMetricCard(doc, MARGIN + cw + 4, y, cw, num(report.current.sales), 'Vendas no mês', 'total de vendas', NEUTRAL);
  drawMetricCard(
    doc,
    MARGIN + (cw + 4) * 2,
    y,
    cw,
    report.current.evaluated < 0 ? `−${num(-report.current.evaluated)}` : num(report.current.evaluated),
    'Avaliações recebidas',
    'no mês',
    report.current.evaluated < 0 ? NEGATIVE : NEUTRAL,
  );

  y += 34;
  y = drawSectionTitle(doc, 'Comparações', y);
  const comparisons = [
    { label: 'Média histórica da loja', value: pct(report.historicalAverage, 2), accent: NEUTRAL },
    { label: 'Aproveitamento da rede', value: pct(report.networkAproveitamento, 2), accent: NEUTRAL },
    {
      label: report.gapToAverage >= 0 ? 'Acima da média histórica' : 'Abaixo da média histórica',
      value: pPoints(report.gapToAverage),
      accent: report.gapToAverage >= 0 ? POSITIVE : NEGATIVE,
    },
    {
      label: report.gapToNetwork >= 0 ? 'Acima da rede' : 'Abaixo da rede',
      value: pPoints(report.gapToNetwork),
      accent: report.gapToNetwork >= 0 ? POSITIVE : NEGATIVE,
    },
  ];

  const rh = 7;
  comparisons.forEach((item, index) => {
    const rowY = y + index * rh;
    if (index % 2 === 0) {
      doc.setFillColor(...hexToRgb(SURFACE));
      doc.rect(MARGIN, rowY - 1, CONTENT_WIDTH, rh - 0.6, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...hexToRgb(INK_SOFT));
    doc.text(item.label, MARGIN + 3, rowY + 3.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(item.accent));
    doc.text(item.value, MARGIN + CONTENT_WIDTH - 3, rowY + 3.6, { align: 'right' });
  });

  y += comparisons.length * rh + 8;
  y = drawSectionTitle(doc, 'Histórico de aproveitamento', y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...hexToRgb(INK_FAINT));
  doc.text('PERÍODO', MARGIN + 2, y - 1, { charSpace: 0.4 });
  doc.text('VENDAS', MARGIN + 62, y - 1, { align: 'right' });
  doc.text('AVALIADAS', MARGIN + 92, y - 1, { align: 'right' });
  doc.text('APROVEIT.', MARGIN + 124, y - 1, { align: 'right' });

  y += 4;
  for (const point of report.history) {
    const isCurrent = point.period === report.period;
    if (isCurrent) {
      doc.setFillColor(...hexToRgb(SURFACE));
      doc.rect(MARGIN, y - 4.4, CONTENT_WIDTH, 7, 'F');
    }
    const value = point.aproveitamento;
    doc.setFont('helvetica', isCurrent ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...hexToRgb(isCurrent ? INK : INK_SOFT));
    doc.text(point.label, MARGIN + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(INK_SOFT));
    doc.text(num(point.sales), MARGIN + 62, y, { align: 'right' });
    doc.text(point.evaluated < 0 ? `−${num(-point.evaluated)}` : num(point.evaluated), MARGIN + 92, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(value === null ? INK_FAINT : value < 0 ? NEGATIVE : INK));
    doc.text(value === null ? '—' : pct(value, 2), MARGIN + 124, y, { align: 'right' });

    const tx = MARGIN + 132;
    const tw = CONTENT_WIDTH - 134;
    doc.setFillColor(...hexToRgb(LINE));
    doc.roundedRect(tx, y - 1.5, tw, 1.8, 0.9, 0.9, 'F');
    const ratio = value === null ? 0 : Math.min(Math.abs(value) / 100, 1);
    if (ratio > 0) {
      doc.setFillColor(...hexToRgb((value ?? 0) < 0 ? NEGATIVE : POSITIVE));
      doc.roundedRect(tx, y - 1.5, Math.max(tw * ratio, 1), 1.8, 0.9, 0.9, 'F');
    }
    y += 5.4;
  }

  y += 4;
  doc.setFillColor(...hexToRgb(SURFACE));
  doc.setDrawColor(...hexToRgb(LINE));
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 18, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...hexToRgb(INK_FAINT));
  doc.text('LEITURA DO PERÍODO', MARGIN + 4, y + 5.5, { charSpace: 0.5 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(INK_SOFT));
  const lines = doc.splitTextToSize(narrative(report), CONTENT_WIDTH - 8) as string[];
  let ly = y + 11;
  for (const line of lines.slice(0, 3)) {
    doc.text(line, MARGIN + 4, ly);
    ly += 4;
  }
}

function narrative(report: StoreReport): string {
  const parts: string[] = [];
  if (report.variation === null) {
    parts.push('Primeiro mês com dados para comparação.');
  } else {
    parts.push(
      `O aproveitamento teve ${report.variation >= 0 ? 'aumento' : 'queda'} de ${Math.abs(report.variation).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p. em relação ao mês anterior.`,
    );
  }
  const g = report.gapToAverage;
  parts.push(
    Math.abs(g) < 0.01
      ? 'O resultado está em linha com a média histórica da loja.'
      : g < 0
        ? `Fica ${Math.abs(g).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p. abaixo da média histórica de ${pct(report.historicalAverage, 2)}.`
        : `Fica ${g.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p. acima da média histórica de ${pct(report.historicalAverage, 2)}.`,
  );
  const n = report.gapToNetwork;
  parts.push(
    n >= 0
      ? `Está ${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p. acima do aproveitamento da rede (${pct(report.networkAproveitamento, 2)}).`
      : `Está ${Math.abs(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p. abaixo do aproveitamento da rede (${pct(report.networkAproveitamento, 2)}).`,
  );
  return parts.join(' ');
}
