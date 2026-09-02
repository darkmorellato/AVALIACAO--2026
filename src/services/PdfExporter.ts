/**
 * @file PdfExporter.ts
 * @description Serviço para exportação do dashboard em PDF de alta qualidade.
 * Carrega html2canvas e jsPDF sob demanda (lazy loading) para manter o bundle inicial leve.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

import { Logger } from './Logger';

export class PdfExporter {
  private logger: Logger;
  private isExporting = false;

  constructor() {
    this.logger = new Logger('PdfExporter');
  }

  /**
   * Exporta a visão atual do dashboard para um arquivo PDF no formato A4.
   *
   * @param currentPeriod - Identificador do período atual para nomeação do arquivo.
   */
  async exportToPdf(currentPeriod: string = 'dashboard'): Promise<void> {
    if (this.isExporting) {
      this.logger.warn('Exportação já em andamento...');
      return;
    }

    this.isExporting = true;
    this.logger.info(`Iniciando exportação PDF para o período: ${currentPeriod}`);

    const element = document.querySelector('.main-content') as HTMLElement | null;
    if (!element) {
      this.logger.error('Elemento principal .main-content não encontrado para exportação');
      this.isExporting = false;
      return;
    }

    const exportBtn = document.getElementById('exportPdfBtn') as HTMLButtonElement | null;
    const originalBtnText = exportBtn?.innerHTML ?? '';
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando PDF...';
    }

    try {
      // Carregamento sob demanda das bibliotecas pesadas de PDF
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      // Adiciona classe de impressão temporária para layout otimizado
      document.body.classList.add('is-printing');

      const canvas = await html2canvas(element, {
        scale: 2, // 2x para alta definição no PDF
        useCORS: true,
        logging: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        windowWidth: 1200,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth - 20; // 10mm margem cada lado
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = 10;
      let heightLeft = imgHeight;

      // Primeira página
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      // Páginas subsequentes caso o conteúdo exceda uma página
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      const filename = `relatorio-vendas-${currentPeriod}.pdf`;
      pdf.save(filename);
      this.logger.info(`PDF exportado com sucesso: ${filename}`);
    } catch (error) {
      this.logger.error('Erro ao gerar PDF com html2canvas/jsPDF, acionando fallback de impressão:', error);
      // Fallback nativo
      window.print();
    } finally {
      document.body.classList.remove('is-printing');
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalBtnText;
      }
      this.isExporting = false;
    }
  }
}
