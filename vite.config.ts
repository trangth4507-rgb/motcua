import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';

function apiProxyPlugin(): Plugin {
  return {
    name: 'api-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        const parsedUrl = new URL(req.url || '', 'http://localhost:3000');
        const target = parsedUrl.searchParams.get('url');
        if (!target) {
          res.statusCode = 400;
          res.end('Missing url');
          return;
        }
        try {
          const resp = await fetch(target, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Cache-Control': 'no-cache',
            },
          });
          const contentType = resp.headers.get('content-type') || 'text/plain';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          const buf = await resp.arrayBuffer();
          res.end(Buffer.from(buf));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(err.message || 'Proxy error');
        }
      });
    },
  };
}

// Chạy hàm Vercel /api/auth ngay trong máy chủ dev (`npm run dev`)
function authApiPlugin(): Plugin {
  return {
    name: 'auth-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/auth', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/auth.ts');
          await mod.default(req, res);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(err?.message || 'Auth error');
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Nạp ADMIN_PASSWORD... từ file .env.local cho môi trường dev
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of ['ADMIN_USERNAME', 'ADMIN_PASSWORD', 'AUTH_SECRET']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }
  return {
    plugins: [react(), tailwindcss(), apiProxyPlugin(), authApiPlugin()],
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
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
