import { defineConfig } from 'vite';
import pugPlugin from 'vite-plugin-pug';
import path from 'path';
import { readFileSync } from 'fs';

const cvData = JSON.parse(
  readFileSync(path.resolve(__dirname, 'src/data/cv.json'), 'utf-8')
);

export default defineConfig({
  plugins: [pugPlugin({}, cvData)],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 4173,
  },
});
