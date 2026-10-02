/**
 * @file StoreReportPdf.ts
 * @description Gera o relatório de desempenho individual por loja em PDF.
 *
 * Diferente do `PdfExporter`, que rasteriza a tela com html2canvas, este
 * módulo desenha o documento com os primitives do jsPDF. O resultado é
 * texto real — pesquisável e selecionável — e um arquivo de poucos KB.
 *
 * Cada loja ocupa uma página, precedida de uma página de resumo com o
 * ranking geral do período.
 *
 * @author Kilo Assistant
 * @date 2026-10-01
 */

import { Logger } from './Logger';
import {
  buildAllStoreReports,
  type StoreMonthPoint,
  type StoreReport,
} from './StoreReportData';

/** Margem lateral em mm. */
const MARGIN = 16;
/** Largura útil da área de conteúdo. */
const CONTENT_WIDTH = 210 - MARGIN * 2;

const INK = '#111827';
const INK_SOFT = '#6b7280';
const INK_FAINT = '#9ca3af';
const LINE = '#e5e7eb';
const SURFACE = '#f9fafb';

/** Paleta do PDF, independente do tema da tela. */
const COLORS = {
  ink: INK,
  inkSoft: INK_SOFT,
  inkFaint: INK_FAINT,
  line: LINE,
  surface: SURFACE,
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6366f1',
};

/** Formata um número no padrão brasileiro, sem casas decimais. */
const num = (value: number): string => Math.round(value).toLocaleString('pt-BR');

/** Formata um percentual com uma casa decimal e sufixo. */
const pct = (value: number, decimals = 1): string =>
  `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;

/** Formata uma variação em pontos percentuais, com sinal explícito. */
const pPoints = (value: number): string =>
  `${value >= 0 ? '+' : '−'}${Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} p.p.`;

/** Converte uma cor hexadecimal em componentes RGB. */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Cache de logos já convertidas para data URL, evitando downloads repetidos. */
const logoCache = new Map<string, string>();

/**
 * Baixa um logo e o converte para data URL, memoizando o resultado.
 *
 * @param url - Caminho do logo em `public/`.
 * @returns A data URL, ou `null` se não foi possível carregar.
 */
async function loadLogo(url: string): Promise<string | null> {
  if (!url) return null;

  const cached = logoCache.get(url);
  if (cached) return cached;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    logoCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

/**
 * Desenha um cabeçalho de seção com título e linha divisória.
 *
 * @param doc - Instância do jsPDF em construção.
 * @param title - Texto do título.
 * @param y - Posição vertical do título, em mm.
 * @returns A posição vertical seguinte, em mm.
 */
function drawSectionTitle(
  doc: {
    setFont: Function;
    setFontSize: Function;
    setTextColor: Function;
    setDrawColor: Function;
    setLineWidth: Function;
    line: Function;
    text: Function;
  },
  title: string,
  y: number,
): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(INK_SOFT));
  doc.text(title.toUpperCase(), MARGIN, y, { charSpace: 0.6 });

  doc.setDrawColor(...hexToRgb(LINE));
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + 2.4, MARGIN + CONTENT_WIDTH, y + 2.4);

  return y + 8;
}

/**
 * Desenha um cartão com um valor em destaque, um rótulo e uma nota.
 *
 * @param doc - Instância do jsPDF.
 * @param x - Posição horizontal, em mm.
 * @param y - Posição vertical, em mm.
 * @param width - Largura do cartão, em mm.
 * @param value - Valor principal já formatado.
 * @param label - Rótulo do valor.
 * @param note - Texto secundário opcional, com cor derivada do sinal.
 * @param accent - Cor de destaque do valor.
 */
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

/**
 * Desenha uma linha da tabela de histórico.
 *
 * @param doc - Instância do jsPDF.
 * @param y - Posição vertical da linha, em mm.
 * @param point - Dados do mês.
 * @param isCurrent - Se a linha é o mês de referência (recebe destaque).
 * @returns A posição vertical seguinte, em mm.
 */
function drawHistoryRow(
  doc: any,
  y: number,
  point: StoreMonthPoint,
  isCurrent: boolean,
): number {
  if (isCurrent) {
    doc.setFillColor(...hexToRgb(SURFACE));
    doc.rect(MARGIN, y - 4.4, CONTENT_WIDTH, 7, 'F');
  }

  const value = point.aproveitamento;
  const valueText = value === null ? '—' : pct(value, 2);
  const valueColor = value === null ? INK_FAINT : value < 0 ? COLORS.negative : INK;

  doc.setFont('helvetica', isCurrent ? 'bold' : 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...hexToRgb(isCurrent ? INK : INK_SOFT));
  doc.text(point.label, MARGIN + 2, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(INK_SOFT));
  doc.text(num(point.sales), MARGIN + 62, y, { align: 'right' });
  doc.text(point.evaluated < 0 ? `−${num(-point.evaluated)}` : num(point.evaluated), MARGIN + 92, y, {
    align: 'right',
  });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(valueColor));
  doc.text(valueText, MARGIN + 124, y, { align: 'right' });

  // Barra proporcional ao aproveitamento, com trilho de fundo.
  const trackX = MARGIN + 132;
  const trackWidth = CONTENT_WIDTH - 134;
  const trackHeight = 1.8;
  const ratio = value === null ? 0 : Math.min(Math.abs(value) / 100, 1);

  doc.setFillColor(...hexToRgb(LINE));
  doc.roundedRect(trackX, y - 1.5, trackWidth, trackHeight, 0.9, 0.9, 'F');

  if (ratio > 0) {
    doc.setFillColor(...hexToRgb(value === null ? INK_FAINT : value < 0 ? COLORS.negative : COLORS.positive));
    doc.roundedRect(trackX, y - 1.5, Math.max(trackWidth * ratio, 1), trackHeight, 0.9, 0.9, 'F');
  }

  return y + 5.4;
}

/** Desenha o cabeçalho e o rodapé comuns a todas as páginas. */
function drawPageChrome(
  doc: any,
  title: string,
  subtitle: string,
  pageNumber: number,
  totalPages: number,
): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...hexToRgb(INK_FAINT));
  doc.text(title, MARGIN, 10);
  doc.text(subtitle, 210 - MARGIN, 10, { align: 'right' });

  doc.setDrawColor(...hexToRgb(LINE));
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 13, MARGIN + CONTENT_WIDTH, 13);

  doc.setFontSize(7);
  doc.text('Avaliação 2026 — Mi Place', MARGIN, 289);
  doc.text(`${pageNumber} / ${totalPages}`, 210 - MARGIN, 289, { align: 'right' });
}

/**
 * Descreve o desempenho em uma frase, cruzando mês, histórico e rede.
 *
 * @param report - Indicadores da loja.
 * @returns Um parágrafo curto e objetivo.
 */
function buildNarrative(report: StoreReport): string {
  const parts: string[] = [];

  if (report.variation === null) {
    parts.push('Primeiro mês com dados para comparação.');
  } else {
    const direction = report.variation >= 0 ? 'aumento' : 'queda';
    parts.push(
      `O aproveitamento teve ${direction} de ${Math.abs(report.variation).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} p.p. em relação ao mês anterior.`,
    );
  }

  const gapAvg = report.gapToAverage;
  if (Math.abs(gapAvg) < 0.01) {
    parts.push('O resultado está em linha com a média histórica da loja.');
  } else if (gapAvg < 0) {
    parts.push(
      `Fica ${Math.abs(gapAvg).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p. abaixo da ` +
        `média histórica de ${pct(report.historicalAverage, 2)}.`,
    );
  } else {
    parts.push(
      `Fica ${gapAvg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p. acima da média ` +
        `histórica de ${pct(report.historicalAverage, 2)}.`,
    );
  }

  const gapNet = report.gapToNetwork;
  parts.push(
    gapNet >= 0
      ? `Está ${gapNet.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p. acima do aproveitamento da rede (${pct(report.networkAproveitamento, 2)}).`
      : `Está ${Math.abs(gapNet).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p. abaixo do aproveitamento da rede (${pct(report.networkAproveitamento, 2)}).`,
  );

  return parts.join(' ');
}

/**
 * Lê as dimensões de uma imagem a partir do cabeçalho do PNG.
 *
 * Evita decodificar a imagem inteira só para descobrir a proporção, que é
 * o que o desenho precisa para não deformar o logo.
 *
 * @param dataUrl - A imagem em data URL.
 * @returns Largura e altura em pixels, ou 1x1 se não for PNG legível.
 */
async function readImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  try {
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const binary = atob(base64);
    // O IHDR do PNG fica nos bytes 16..24: largura e altura, big-endian.
    const view = new DataView(Uint8Array.from(binary, (c) => c.charCodeAt(0)).buffer);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  } catch {
    return { width: 1, height: 1 };
  }
}

export class StoreReportPdf {
  private readonly logger = new Logger('StoreReportPdf');
  private isExporting = false;

  /**
   * Gera o relatório de todas as lojas de um período e baixa o arquivo.
   *
   * @param database - Todos os períodos carregados.
   * @param period - Período de referência.
   */
  async export(database: import('../types/index').Database, period: string): Promise<void> {
    if (this.isExporting) {
      this.logger.warn('Exportação já em andamento...');
      return;
    }
    this.isExporting = true;

    try {
      const reports = buildAllStoreReports(database, period);
      if (reports.length === 0) {
        this.logger.warn(`Nenhuma loja com dados em "${period}".`);
        return;
      }

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const periodLabel = database[period]?.label || period;
      const totalPages = reports.length + 1;
      const logos = await this.preloadLogos(reports);

      this.drawSummary(doc, reports, periodLabel, totalPages);

      reports.forEach((report, index) => {
        doc.addPage();
        this.drawStorePage(doc, report, logos.get(report.storeName) ?? null, index + 2, totalPages);
        this.logger.debug(`Página ${index + 2}/${totalPages}: ${report.storeName}`);
      });

      const slug = periodLabel
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const filename = `desempenho-por-loja-${slug || 'periodo'}.pdf`;

      doc.save(filename);
      this.logger.info(`Relatório gerado: ${filename} (${totalPages} páginas)`);
    } catch (error) {
      this.logger.error('Erro ao gerar relatório por loja:', error);
      throw error;
    } finally {
      this.isExporting = false;
    }
  }

  /**
   * Carrega todos os logos de uma vez, em paralelo.
   *
   * Guarda a largura e a altura de cada imagem para que o desenho use a
   * proporção real: forçar um quadrado deformaria logos não quadradas.
   */
  private async preloadLogos(
    reports: StoreReport[],
  ): Promise<Map<string, { dataUrl: string; width: number; height: number } | null>> {
    const entries = await Promise.all(
      reports.map(async (report) => {
        const dataUrl = report.logoUrl ? await loadLogo(report.logoUrl) : null;
        if (!dataUrl) return [report.storeName, null] as const;

        const size = await readImageSize(dataUrl);
        return [report.storeName, { dataUrl, ...size }] as const;
      }),
    );
    return new Map(entries);
  }

  /** Desenha a primeira página: ranking geral do período. */
  private drawSummary(
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

    // Indicadores agregados da rede.
    const totalSales = reports.reduce((sum, r) => sum + r.current.sales, 0);
    const totalEvaluated = reports.reduce((sum, r) => sum + r.current.evaluated, 0);
    const network = reports.length ? reports[0].networkAproveitamento : 0;

    let y = 50;
    y = drawSectionTitle(doc, 'Rede no período', y);

    const cardWidth = (CONTENT_WIDTH - 8) / 3;
    drawMetricCard(doc, MARGIN, y, cardWidth, pct(network, 2), 'Aproveitamento da rede', `${reports.length} lojas com vendas`, COLORS.neutral);
    drawMetricCard(doc, MARGIN + cardWidth + 4, y, cardWidth, num(totalSales), 'Vendas no mês', 'soma das lojas', COLORS.neutral);
    drawMetricCard(
      doc,
      MARGIN + (cardWidth + 4) * 2,
      y,
      cardWidth,
      totalEvaluated < 0 ? `−${num(-totalEvaluated)}` : num(totalEvaluated),
      'Avaliações recebidas',
      'no mês',
      totalEvaluated < 0 ? COLORS.negative : COLORS.neutral,
    );

    y += 34;
    y = drawSectionTitle(doc, 'Ranking das lojas', y);

    // Cabeçalho da tabela de ranking.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...hexToRgb(INK_FAINT));
    const columns = { pos: MARGIN + 2, name: MARGIN + 14, sales: MARGIN + 96, appr: MARGIN + 124, bar: MARGIN + 132 };
    doc.text('#', columns.pos, y - 2);
    doc.text('LOJA', columns.name, y - 2, { charSpace: 0.4 });
    doc.text('VENDAS', columns.sales, y - 2, { align: 'right' });
    doc.text('APROVEIT.', columns.appr, y - 2, { align: 'right' });

    y += 2;
    for (const [index, report] of reports.entries()) {
      const isLast = index === reports.length - 1;
      if (isLast) {
        doc.setFillColor(...hexToRgb(SURFACE));
        doc.rect(MARGIN, y - 4.2, CONTENT_WIDTH, 7, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...hexToRgb(index === 0 ? COLORS.positive : INK_SOFT));
      doc.text(String(index + 1), columns.pos, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...hexToRgb(INK));
      doc.text(report.storeName, columns.name, y);

      doc.setTextColor(...hexToRgb(INK_SOFT));
      doc.text(num(report.current.sales), columns.sales, y, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...hexToRgb(report.aproveitamento < 0 ? COLORS.negative : INK));
      doc.text(pct(report.aproveitamento, 2), columns.appr, y, { align: 'right' });

      const trackX = columns.bar;
      const trackWidth = CONTENT_WIDTH - 134;
      doc.setFillColor(...hexToRgb(LINE));
      doc.roundedRect(trackX, y - 1.5, trackWidth, 1.8, 0.9, 0.9, 'F');

      const ratio = Math.min(Math.abs(report.aproveitamento) / 100, 1);
      if (ratio > 0) {
        doc.setFillColor(...hexToRgb(report.aproveitamento < 0 ? COLORS.negative : COLORS.positive));
        doc.roundedRect(trackX, y - 1.5, Math.max(trackWidth * ratio, 1), 1.8, 0.9, 0.9, 'F');
      }

      y += 6;
    }

    y += 6;
    y = drawSectionTitle(doc, 'Como ler este relatório', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(INK_SOFT));
    const lines = [
      'Aproveitamento é a razão entre as vendas avaliadas e as vendas_totais do mês.',
      'A média histórica considera todos os meses com vendas registradas.',
      'O aproveitamento da rede soma as avaliadas e divide pelas vendas do período.',
      'Valores negativos indicam avaliações removidas da plataforma.',
    ];
    for (const line of lines) {
      doc.text(`•  ${line}`, MARGIN, y);
      y += 5;
    }
  }

  /** Desenha a página individual de uma loja. */
  private drawStorePage(
    doc: any,
    report: StoreReport,
    logo: { dataUrl: string; width: number; height: number } | null,
    pageNumber: number,
    totalPages: number,
  ): void {
    drawPageChrome(doc, report.storeName, report.periodLabel, pageNumber, totalPages);

    let y = 26;
    let logoWidth = 0;

    // Logo e nome da loja. A altura é fixa e a largura deriva da proporção
    // real da imagem, para não deformar logos não quadradas.
    if (logo && logo.width > 0 && logo.height > 0) {
      const logoHeight = 20;
      const width = Math.min((logoHeight * logo.width) / logo.height, 40);
      try {
        doc.addImage(logo.dataUrl, 'PNG', MARGIN, y, width, logoHeight, undefined, 'FAST');
        logoWidth = width;
      } catch {
        // Logo incompatível: segue sem imagem.
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

    // Selo de posição no ranking. Empates são sinalizados, senão a posição
    // compartilhada parece um erro para quem recebe o relatório.
    const badgeText = report.tied
      ? `${report.rank}º de ${report.totalStores} (empate)`
      : `${report.rank}º de ${report.totalStores}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const badgeWidth = doc.getTextWidth(badgeText) + 8;
    doc.setFillColor(...hexToRgb(SURFACE));
    doc.setDrawColor(...hexToRgb(LINE));
    doc.roundedRect(210 - MARGIN - badgeWidth, y + 4, badgeWidth, 8, 4, 4, 'FD');
    doc.setTextColor(...hexToRgb(INK_SOFT));
    doc.text(badgeText, 210 - MARGIN - badgeWidth / 2, y + 9.4, { align: 'center' });

    y += 32;
    y = drawSectionTitle(doc, 'Indicadores do mês', y);

    const cardWidth = (CONTENT_WIDTH - 8) / 3;
    const variationNote =
      report.variation === null
        ? 'sem mês anterior'
        : `${pPoints(report.variation)} vs mês anterior`;
    const variationAccent =
      report.variation === null || report.variation >= 0 ? COLORS.positive : COLORS.negative;

    drawMetricCard(
      doc,
      MARGIN,
      y,
      cardWidth,
      pct(report.aproveitamento, 2),
      'Aproveitamento',
      variationNote,
      report.aproveitamento < 0 ? COLORS.negative : report.color,
    );
    drawMetricCard(doc, MARGIN + cardWidth + 4, y, cardWidth, num(report.current.sales), 'Vendas no mês', 'total de vendas', COLORS.neutral);
    drawMetricCard(
      doc,
      MARGIN + (cardWidth + 4) * 2,
      y,
      cardWidth,
      report.current.evaluated < 0 ? `−${num(-report.current.evaluated)}` : num(report.current.evaluated),
      'Avaliações recebidas',
      'no mês',
      report.current.evaluated < 0 ? COLORS.negative : COLORS.neutral,
    );

    y += 34;
    y = drawSectionTitle(doc, 'Comparações', y);

    const comparisons: { label: string; value: string; accent: string }[] = [
      {
        label: 'Média histórica da loja',
        value: pct(report.historicalAverage, 2),
        accent: COLORS.neutral,
      },
      {
        label: 'Aproveitamento da rede',
        value: pct(report.networkAproveitamento, 2),
        accent: COLORS.neutral,
      },
      {
        label: report.gapToAverage >= 0 ? 'Acima da média histórica' : 'Abaixo da média histórica',
        value: pPoints(report.gapToAverage),
        accent: report.gapToAverage >= 0 ? COLORS.positive : COLORS.negative,
      },
      {
        label: report.gapToNetwork >= 0 ? 'Acima da rede' : 'Abaixo da rede',
        value: pPoints(report.gapToNetwork),
        accent: report.gapToNetwork >= 0 ? COLORS.positive : COLORS.negative,
      },
    ];

    const rowHeight = 7;
    comparisons.forEach((item, index) => {
      const rowY = y + index * rowHeight;
      if (index % 2 === 0) {
        doc.setFillColor(...hexToRgb(SURFACE));
        doc.rect(MARGIN, rowY - 1, CONTENT_WIDTH, rowHeight - 0.6, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...hexToRgb(INK_SOFT));
      doc.text(item.label, MARGIN + 3, rowY + 3.6);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...hexToRgb(item.accent));
      doc.text(item.value, MARGIN + CONTENT_WIDTH - 3, rowY + 3.6, { align: 'right' });
    });

    y += comparisons.length * rowHeight + 8;
    y = drawSectionTitle(doc, 'Histórico de aproveitamento', y);

    // Cabeçalho da tabela de histórico. As posições acompanham exatamente as
    // colunas desenhadas em `drawHistoryRow`.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...hexToRgb(INK_FAINT));
    doc.text('PERÍODO', MARGIN + 2, y - 1, { charSpace: 0.4 });
    doc.text('VENDAS', MARGIN + 62, y - 1, { align: 'right' });
    doc.text('AVALIADAS', MARGIN + 92, y - 1, { align: 'right' });
    doc.text('APROVEIT.', MARGIN + 124, y - 1, { align: 'right' });

    y += 4;
    for (const point of report.history) {
      y = drawHistoryRow(doc, y, point, point.period === report.period);
    }

    // Leitura do período em texto.
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
    const narrative = buildNarrative(report);
    const lines = doc.splitTextToSize(narrative, CONTENT_WIDTH - 8) as string[];
    let lineY = y + 11;
    for (const line of lines.slice(0, 3)) {
      doc.text(line, MARGIN + 4, lineY);
      lineY += 4;
    }
  }
}
