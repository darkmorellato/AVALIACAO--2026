/**
 * @file DropdownController.ts
 * @description Controlador do dropdown de seleção de período.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

import { Logger } from '../services/Logger';
import {
  createDropdownTrigger,
  createDropdownMenu,
  setupDropdownToggle,
  setupClickOutside,
  cleanupListeners,
} from './DropdownUtils';

interface ListenerEntry {
  target: EventTarget;
  type: string;
  handler: EventListener;
}

const MONTHS: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Marco', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
};

export class DropdownController {
  private logger: Logger;
  private listeners: ListenerEntry[] = [];

  constructor() {
    this.logger = new Logger('DropdownController');
  }

  formatPeriodLabel(period: string): string {
    const match = period.match(/^(\d{4})-(\d{2})$/);
    if (!match) return period;
    const [, year, month] = match;
    return `${MONTHS[month] ?? month} ${year}`;
  }

  render(
    container: HTMLElement,
    periods: readonly string[],
    currentPeriod: string,
    onSelect: (period: string) => void,
  ): void {
    container.innerHTML = '';

    const dropdown = document.createElement('div');
    dropdown.className = 'custom-dropdown';
    dropdown.id = 'periodDropdown';

    const trigger = createDropdownTrigger(currentPeriod, (p) => this.formatPeriodLabel(p));
    const menu = createDropdownMenu(periods, currentPeriod);

    dropdown.appendChild(trigger);
    dropdown.appendChild(menu);
    container.appendChild(dropdown);

    this.listeners.push(...setupDropdownToggle(trigger, dropdown));
    this.listeners.push(setupClickOutside(dropdown));

    this.setupPeriodSelection(menu, currentPeriod, onSelect, dropdown);
    this.logger.debug(`Dropdown renderizado com ${periods?.length ?? 0} períodos.`);
  }

  private setupPeriodSelection(
    menu: HTMLElement,
    currentPeriod: string,
    onSelect: (period: string) => void,
    dropdown: HTMLElement,
  ): void {
    const items = menu.querySelectorAll('.dropdown-item');

    items.forEach((item) => {
      const el = item as HTMLElement;
      const period = el.dataset.period ?? '';

      const handler: EventListener = (e) => {
        e.stopPropagation();
        onSelect(period);
        dropdown.classList.remove('open');
        const trigger = dropdown.querySelector('.dropdown-trigger');
        trigger?.setAttribute('aria-expanded', 'false');
      };

      el.addEventListener('click', handler);
      this.listeners.push({ target: el, type: 'click', handler });
    });
  }

  updateActivePeriod(container: HTMLElement, period: string): void {
    const triggerValue = container.querySelector('.trigger-value');
    if (triggerValue) triggerValue.textContent = this.formatPeriodLabel(period);

    container.querySelectorAll('.dropdown-item').forEach((item) => {
      const el = item as HTMLElement;
      if (el.dataset.period === period) {
        el.classList.add('active');
        el.setAttribute('aria-selected', 'true');
      } else {
        el.classList.remove('active');
        el.removeAttribute('aria-selected');
      }
    });
  }

  destroy(): void {
    cleanupListeners(this.listeners);
    this.listeners = [];
  }
}