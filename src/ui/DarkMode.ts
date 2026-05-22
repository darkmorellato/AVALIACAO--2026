/**
 * @file ui/DarkMode.ts
 * @description Gerenciador profissional do tema escuro (dark mode).
 * Detecta preferência do sistema, persiste em localStorage e emite eventos
 * de mudança de tema via EventBus.
 *
 * @author Kilo Assistant
 * @date 2026-05-19
 */

import { Logger } from '../services/Logger';
import { EventBus } from '../services/EventBus';

/** Chave utilizada no localStorage para persistir a preferência de tema. */
const STORAGE_KEY = 'theme-preference';

/** EventBus único para emitir mudanças de tema */
const eventBus = EventBus.getInstance();

/**
 * Gerenciador de tema escuro com detecção de preferência do sistema,
 * persistência e emissão de eventos.
 */
export class DarkModeManager {
   private toggleCallback: (() => void) | null = null;
   private wrapper: HTMLElement | null = null;
   private logger: Logger;

   constructor() {
     this.logger = new Logger('DarkModeManager');
   }

   /**
    * Inicializa o gerenciador de tema escuro.
    * Busca o wrapper do switch no DOM, restaura a preferência salva
    * (ou detecta a do sistema) e registra os eventos.
    *
    * @param onToggle - Função opcional chamada sempre que o tema for alternado.
    */
   init(onToggle?: () => void): void {
     this.logger.debug('Inicializando DarkModeManager...');

     this.toggleCallback = onToggle ?? null;
     this.wrapper = document.getElementById('themeSwitch');

     if (!this.wrapper) {
       this.logger.warn('Switch de tema não encontrado no DOM');
       return;
     }

this.restoreTheme();
      this.updateSwitchState();
      this.bindEvents();
   }

  /**
   * Verifica se o modo escuro está ativo no documento.
   *
   * @returns `true` se o modo escuro estiver ativo.
   */
  isDarkMode(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  /**
   * Retorna o tema atual como string calculada.
   *
   * @returns `'dark'` ou `'light'`.
   */
  getTheme(): 'dark' | 'light' {
    return this.isDarkMode() ? 'dark' : 'light';
  }

  /** Restaura o tema a partir do localStorage ou da preferência do sistema. */
  private restoreTheme(): void {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const isDark = stored === 'dark';
      this.applyTheme(isDark);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark);
    }
  }

  /**
   * Aplica o tema diretamente no documento e persiste a escolha.
   *
   * @param isDark - Indica se o tema escuro deve ser aplicado.
   */
  private applyTheme(isDark: boolean): void {
    const html = document.documentElement;

    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    this.logger.debug(`Tema aplicado: ${isDark ? 'dark' : 'light'}`);
    // Emite evento para notificar outros módulos
    eventBus.emit('theme:change');
  }

/** Alterna entre os temas claro e escuro. */
   private toggleTheme(): void {
     const isDark = this.isDarkMode();
     this.applyTheme(!isDark);
     this.updateSwitchState();
     this.toggleCallback?.();
     this.logger.info('Tema alternado via interação do usuário');
   }

/** Atualiza o estado visual do switch de acordo com o tema atual. */
    private updateSwitchState(): void {
      if (!this.wrapper) return;

      const isDark = this.isDarkMode();
      // ON = light mode, OFF = dark mode
      if (isDark) {
        this.wrapper.classList.add('is-off');
        this.wrapper.classList.remove('is-on');
      } else {
        this.wrapper.classList.add('is-on');
        this.wrapper.classList.remove('is-off');
      }
      this.wrapper.setAttribute('aria-checked', String(!isDark));
    }

/** Liga o evento de clique ao wrapper do switch. */
   private bindEvents(): void {
     this.wrapper?.addEventListener('click', () => this.toggleTheme());

     // Suporte a teclado (Enter/Espaço)
     this.wrapper?.addEventListener('keydown', (e) => {
       if (e.key === 'Enter' || e.key === ' ') {
         e.preventDefault();
         this.toggleTheme();
       }
     });

     // Escuta mudanças na preferência do sistema
     window
       .matchMedia('(prefers-color-scheme: dark)')
       .addEventListener('change', (e) => {
         // Só aplica se o usuário nunca tiver definido manualmente
         if (!localStorage.getItem(STORAGE_KEY)) {
           this.applyTheme(e.matches);
           this.updateSwitchState();
         }
       });
   }
}
