import { existsSync } from 'fs';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

/* Firebase cleanUrls serves /app as public/app.html. Vite has no such alias,
   so /app fell through to the marketing index. Rewrite before the SPA fallback. */
/** Browser pages import the QR encoder; Node tests keep the CommonJS file. */
function qrForBrowser() {
  return {
    name: 'sukoda-qr-esm',
    transform(code, id) {
      const file = id.split('?')[0].replace(/\\/g, '/');
      if (!file.endsWith('/functions/lib/qr.js')) return null;
      if (!code.includes('module.exports')) return null;
      return code.replace(
        'module.exports = { qrMatrix, qrSvg, chooseVersion };',
        'export { qrMatrix, qrSvg, chooseVersion };',
      );
    },
  };
}

function appShellRoute(root) {
  const file = resolve(root, 'public/app.html');
  const rewrite = (req) => {
    if (!existsSync(file)) return;
    const raw = req.url || '/';
    const q = raw.indexOf('?');
    const path = q === -1 ? raw : raw.slice(0, q);
    const search = q === -1 ? '' : raw.slice(q);
    const clean = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    if (clean === '/app') req.url = '/app.html' + search;
    if (clean === '/too') req.url = '/too.html' + search;
    if (clean === '/kaart') req.url = '/kaart.html' + search;
  };
  const attach = (server) => {
    server.middlewares.use((req, _res, next) => {
      rewrite(req);
      next();
    });
  };
  return {
    name: 'sukoda-app-shell',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig({
  plugins: [qrForBrowser(), appShellRoute(__dirname), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: 'https://sukoda.ee', changeOrigin: true, secure: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        lugu: resolve(__dirname, 'lugu.html'),
        lunasta: resolve(__dirname, 'lunasta.html'),
        kaart: resolve(__dirname, 'kaart.html'),
        success: resolve(__dirname, 'success.html'),
        admin: resolve(__dirname, 'admin.html'),
        privaatsus: resolve(__dirname, 'privaatsus.html'),
        tingimused: resolve(__dirname, 'tingimused.html'),
        '404': resolve(__dirname, '404.html'),
        minu: resolve(__dirname, 'minu.html'),
        haldus: resolve(__dirname, 'haldus.html'),
        muuk: resolve(__dirname, 'muuk.html'),
        sales: resolve(__dirname, 'sales.html'),
        arendajale: resolve(__dirname, 'arendajale.html'),
      },
    },
  },
});
