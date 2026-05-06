import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/admin/',
  root: '.',
  publicDir: false,
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        admin: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    port: 3002,
    open: true,
    proxy: {
      '/api/admin': 'http://localhost:3001',
      '/admin': 'http://localhost:3001',
    },
  },
  preview: {
    port: 4174,
  },
});
