import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves project sites from /bareshorts/, so assets must be relative.
export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'bareshorts', short_name: 'bareshorts', description: 'YouTube Shorts without the overlays',
        display: 'fullscreen', orientation: 'portrait', background_color: '#000000', theme_color: '#000000',
        start_url: './', scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      // Never cache YouTube/API traffic; only the app shell.
      workbox: { globPatterns: ['**/*.{js,css,html,png}'], navigateFallback: 'index.html' },
    }),
  ],
})
