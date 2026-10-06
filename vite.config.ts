import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'sheet-proxy-middleware',
        configureServer(server) {
          server.middlewares.use('/api/proxy', async (req, res) => {
            try {
              const reqUrl = new URL(req.url || '', 'http://localhost');
              const targetUrl = reqUrl.searchParams.get('url');
              if (!targetUrl) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing url parameter' }));
                return;
              }

              const response = await fetch(targetUrl, {
                method: req.method || 'GET',
                redirect: 'follow',
              });

              const contentType = response.headers.get('content-type') || 'application/json';
              const body = await response.text();

              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', '*');
              res.setHeader('Content-Type', contentType);
              res.statusCode = response.status;
              res.end(body);
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Proxy request failed' }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
