/**
 * @file main.ts
 * @description Entry point do aplicativo Avaliacao 2026.
 * Inicializa o AppController e gerencia o lifecycle basico do app.
 *
 * @author Kilo Assistant
 * @date 2026-05-20
 */

'use strict';

/// <reference types="vite/client" />

import { AppController } from './App';
import './styles/main.css';
import { initWebVitalsMonitoring } from './utils/web-vitals';

// Inicia monitoramento de Web Vitals
if (import.meta.env.DEV) {
  initWebVitalsMonitoring();
}

// Registrar Service Worker para cache offline (PWA) apenas em produção.
// Em desenvolvimento, garante que qualquer Service Worker registrado seja removido
// para evitar cache local e conflitos com o HMR do Vite.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      let unregistered = false;
      const promises = registrations.map((r) =>
        r.unregister().then((ok) => {
          if (ok) unregistered = true;
        })
      );
      Promise.all(promises).then(() => {
        if (unregistered) {
          console.log('[SW] Service Worker desregistrado no ambiente de desenvolvimento.');
          if (window.caches) {
            caches.keys().then((keys) => {
              Promise.all(keys.map((k) => caches.delete(k))).then(() => {
                window.location.reload();
              });
            });
          } else {
            window.location.reload();
          }
        }
      });
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registrado: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW falhou: ', registrationError);
        });
    });
  }
}

// --------------------------------------------------------------------------
// Inicializacao do aplicativo
// --------------------------------------------------------------------------

const app = new AppController();

app.init().catch((error: unknown) => {
  console.error('Falha critica na inicializacao do aplicativo:', error);
  // Exibe o erro na tela para ficar visível
  const errorMsg = error instanceof Error ? error.message : String(error);
  document.body.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Inter,sans-serif;color:#ef4444;background:#fef2f2;padding:20px;text-align:center;">
      <div>
        <h1 style="font-size:2rem;margin-bottom:1rem;">Erro ao carregar o dashboard</h1>
        <p style="font-size:1.1rem;max-width:600px;">${errorMsg}</p>
        <p style="margin-top:1rem;color:#6b7280;">Verifique o console (F12) para mais detalhes.</p>
      </div>
    </div>
  `;
});

// --------------------------------------------------------------------------
// Cleanup ao fechar a pagina
// --------------------------------------------------------------------------

window.addEventListener('beforeunload', () => {
  app.destroy();
});
