/**
 * @file image-loader.ts
 * @description Utilitários para carregamento otimizado de imagens.
 * Detecta suporte a WebP e fornece URLs adequadas.
 *
 * @author Kilo Assistant
 * @date 2026-05-21
 */

let webpSupportCache: boolean | null = null;

/**
  * Verifica se o navegador suporta WebP (cacheado).
  */
 export async function supportsWebP(): Promise<boolean> {
   if (webpSupportCache !== null) return webpSupportCache;

   return new Promise((resolve) => {
     const img = new Image();
     img.onload = img.onerror = () => {
       const supported = img.naturalWidth > 0 && img.naturalHeight > 0;
       webpSupportCache = supported;
       resolve(supported);
     };
     img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
   });
 }

/**
 * Retorna a URL da logo no formato otimizado.
 * Se suportar WebP e existir .webp, retorna .webp, senão .png.
 *
 * @param pngUrl - URL da imagem PNG original
 * @returns URL otimizada
 */
export async function getOptimizedLogoUrl(pngUrl: string): Promise<string> {
  const webpUrl = pngUrl.replace('.png', '.webp');
  try {
    if (await supportsWebP()) {
      // Verificar se o arquivo WebP existe (HEAD request)
      const resp = await fetch(webpUrl, { method: 'HEAD' });
      if (resp.ok) return webpUrl;
    }
  } catch {
    // Ignora erros e usa PNG
  }
  return pngUrl;
}

/**
 * Aplica lazy loading a um elemento de imagem.
 * @param img - Elemento <img>
 */
export function applyLazyLoading(img: HTMLImageElement): void {
  // Método moderno
  if ('loading' in img) {
    img.loading = 'lazy';
    return;
  }

  // Fallback: não implementado, mas mantida assinatura para uso futuro
  // Esta função pode ser expandida conforme necessidade.
  console.debug('Lazy loading não suportado nativamente, use polyfill se necessário');
}
