import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'WoR Guia de Heróis',
        short_name: 'WoR Guia',
        theme_color: '#0f1a2b',
        background_color: '#0f1a2b',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.includes('/rest/v1/'),
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'supabase-data' },
        }],
      },
    }),
  ],
});
