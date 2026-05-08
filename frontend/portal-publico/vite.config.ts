import { defineConfig } from 'vite';
import path from 'path';
import { readFileSync } from 'fs';

const devApiPlugin = {
  name: 'dev-api',
  configureServer(server: any) {
    const cvPath = path.resolve(__dirname, '../../backend/javascript/portal/data/cv.json');
    server.middlewares.use('/api/cv', (_req: any, res: any) => {
      try {
        const cv = readFileSync(cvPath, 'utf-8');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(cv);
      } catch {
        res.statusCode = 500;
        res.end('{}');
      }
    });
  },
};

export default defineConfig({
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
  plugins: [devApiPlugin],
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 4173,
  },
});
