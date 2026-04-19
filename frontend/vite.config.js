import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['luup-logo.svg', 'icon.svg'],
      manifest: {
        name: 'LUUP',
        short_name: 'LUUP',
        description: 'Ephemeral proximity chat and photo sharing',
        theme_color: '#0ea5e9',
        background_color: '#fafaf7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/ws/],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\.r2\.cloudflarestorage\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'luup-photos',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 2 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'luup-api',
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
