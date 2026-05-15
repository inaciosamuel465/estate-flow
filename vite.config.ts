import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      proxy: {
        // We'll handle /api via a custom middleware or proxy if needed
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    },
    plugins: [
      react(), 
      tailwindcss(),
      // Custom plugin to handle /api routes during local dev (simulating Vercel functions)
      {
        name: 'api-simulator',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/')) {
              // Simulação de Vercel Functions para desenvolvimento local
              res.setHeader('Content-Type', 'application/json');
              
              if (req.url === '/api/push/vapidPublicKey') {
                const publicKey = env.VITE_VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY;
                res.end(JSON.stringify({ publicKey }));
                return;
              }

              if (req.url === '/api/push/subscribe') {
                // Simulação de sucesso
                res.end(JSON.stringify({ success: true }));
                return;
              }

              if (req.url === '/api/push/send' || req.url === '/api/push/broadcast') {
                // Simulação de disparo de push
                res.end(JSON.stringify({ success: true, count: 1 }));
                return;
              }

              if (req.url === '/api/admin/provision') {
                // Simulação de provisionamento
                res.end(JSON.stringify({ success: true, message: 'Simulado com sucesso' }));
                return;
              }

              if (req.url === '/api/email/send') {
                // Aqui seria o nodemailer, mas para não complicar o config.js
                // vamos apenas simular o sucesso se as envs existirem
                const canSend = !!(env.SMTP_HOST && env.SMTP_USER);
                if (canSend) {
                    res.end(JSON.stringify({ success: true, message: 'Simulado com sucesso' }));
                } else {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'SMTP não configurado no .env' }));
                }
                return;
              }
            }
            next();
          });
        }
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'EstateFlow Suite',
          short_name: 'EstateFlow',
          description: 'Suíte completa para gestão imobiliária e vendas de imóveis.',
          theme_color: '#2b6cee',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],

    define: {
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
