import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'src'),
  publicDir: resolve(__dirname, 'public'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: true, // Necessário para análise
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
      },
      output: {
        // Code splitting automático, mas podemos forçar chunks menores
        manualChunks: {
          vendor: ['chart.js', 'chartjs-plugin-datalabels'],
          pdf: ['jspdf', 'html2canvas'],
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    include: ['jspdf', 'html2canvas']
  }
});
