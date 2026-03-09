import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        kingitus: resolve(__dirname, 'kingitus.html'),
        lugu: resolve(__dirname, 'lugu.html'),
        partnerlus: resolve(__dirname, 'partnerlus.html'),
        lunasta: resolve(__dirname, 'lunasta.html'),
        success: resolve(__dirname, 'success.html'),
        admin: resolve(__dirname, 'admin.html'),
        privaatsus: resolve(__dirname, 'privaatsus.html'),
        tingimused: resolve(__dirname, 'tingimused.html'),
        '404': resolve(__dirname, '404.html'),
        minu: resolve(__dirname, 'minu.html'),
      },
    },
  },
});
