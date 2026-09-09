import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/technocore': {
        target: 'https://technocore.chat',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/technocore/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.method !== 'GET') {
              res.writeHead(405, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: 'Method Not Allowed',
                message: 'Technocore Pulse proxy is strictly read-only.' 
              }));
              return;
            }
            proxyReq.removeHeader('cookie');
            proxyReq.removeHeader('authorization');
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('User-Agent', 'TechnocorePulse-Dev/2.0');
          });
        },
      },
    },
  },
})
