/**
 * @file DropdownUtils.ts
 * @description Utilitários para construção de elementos do dropdown.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

interface ListenerEntry {
  target: EventTarget;
  type: string;
  handler: EventListener;
}

export function createDropdownTrigger(currentPeriod: string, formatLabel: (p: string) => string): HTMLButtonElement {
  const trigger = document.createElement('button');
  trigger.className = 'dropdown-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.type = 'button';

  const content = document.createElement('div');
  content.className = 'trigger-content';

  const label = document.createElement('span');
  label.className = 'trigger-label';
  label.textContent = 'Selecionar Período';

  const value = document.createElement('span');
  value.className = 'trigger-value';
  value.textContent = formatLabel(currentPeriod);

  content.appendChild(label);
  content.appendChild(value);

  const chevron = document.createElement('i');
  chevron.className = 'fa-solid fa-chevron-down chevron-icon';

  trigger.appendChild(content);
  trigger.appendChild(chevron);

  return trigger;
}

export function createDropdownMenu(periods: readonly string[], currentPeriod: string): HTMLDivElement {
  const menu = document.createElement('div');
  menu.className = 'dropdown-menu';
  menu.setAttribute('role', 'listbox');

  const grouped: Record<string, string[]> = {};
  periods.forEach((p) => {
    const [year] = p.split('-');
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(p);
  });

  Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach((year) => {
    grouped[year].sort((a, b) => b.localeCompare(a));
    menu.appendChild(createGroup(year, grouped[year], currentPeriod));
  });

  return menu;
}

function createGroup(year: string, periods: string[], currentPeriod: string): HTMLDivElement {
  const groupDiv = document.createElement('div');
  groupDiv.className = 'dropdown-group';

  const title = document.createElement('div');
  title.className = 'group-title';
  title.textContent = year;
  groupDiv.appendChild(title);

  const itemsDiv = document.createElement('div');
  itemsDiv.className = 'group-items';

  periods.forEach((period) => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.textContent = period.split('-')[1] + '/' + year.slice(2);
    item.dataset.period = period;
    item.setAttribute('role', 'option');

    if (period === currentPeriod) {
      item.classList.add('active');
      item.setAttribute('aria-selected', 'true');
    }

    itemsDiv.appendChild(item);
  });

  groupDiv.appendChild(itemsDiv);
  return groupDiv;
}

export function setupDropdownToggle(
  trigger: HTMLButtonElement,
  dropdown: HTMLElement,
): ListenerEntry[] {
  const listeners: ListenerEntry[] = [];

  const handler = (e: Event) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    dropdown.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(!isOpen));
  };

  trigger.addEventListener('click', handler);
  listeners.push({ target: trigger, type: 'click', handler });

  return listeners;
}

export function setupClickOutside(dropdown: HTMLElement): ListenerEntry {
  const handler = (e: Event) => {
    if (!dropdown.contains(e.target as Node)) {
      dropdown.classList.remove('open');
      const trigger = dropdown.querySelector('.dropdown-trigger');
      trigger?.setAttribute('aria-expanded', 'false');
    }
  };

  document.addEventListener('click', handler);
  return { target: document, type: 'click', handler };
}

export function cleanupListeners(listeners: ListenerEntry[]): void {
  listeners.forEach(({ target, type, handler }) => {
    try { target.removeEventListener(type, handler); } catch { /* ignore */ }
  });
}