/**
 * @file AppLoading.ts
 * @description Gerencia estados de loading e erro da UI.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

import { Logger } from '../services/Logger';
import { MetricsPanel } from './MetricsPanel';

export class AppLoading {
  private isLoading = false;
  private logger: Logger;
  private metricsPanel: MetricsPanel;

  constructor(metricsPanel: MetricsPanel) {
    this.logger = new Logger('AppLoading');
    this.metricsPanel = metricsPanel;
  }

  show(): void {
    this.isLoading = true;
    document.body.classList.add('is-loading');
  }

  hide(): void {
    this.isLoading = false;
    document.body.classList.remove('is-loading');
  }

  showError(message: string): void {
    this.logger.error('Exibindo estado de erro:', message);

    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    document.getElementById('app-error-state')?.remove();

    const errorContainer = document.createElement('div');
    errorContainer.id = 'app-error-state';
    errorContainer.className = 'app-error-state';
    errorContainer.innerHTML = `
      <div class="error-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <h3>Ocorreu um erro</h3>
      <p>${message}</p>
      <button id="retryBtn" class="btn btn-retry">
        <i class="fa-solid fa-rotate-right"></i> Tentar novamente
      </button>
    `;

    mainContent.insertBefore(errorContainer, mainContent.children[1]);
    this.metricsPanel.showError(message);
  }
}