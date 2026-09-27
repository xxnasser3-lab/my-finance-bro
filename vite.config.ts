import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

// GitHub Pages serves the app from /<repo>/
const base = process.env.BASE_PATH ?? '/my-finance-bro/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // where the price robot's ticker list lives, for the "add this ticker" link
    __REPO__: JSON.stringify(process.env.GITHUB_REPOSITORY ?? 'xxnasser3-lab/my-finance-bro'),
    __BRANCH__: JSON.stringify(process.env.GITHUB_REF_NAME ?? 'claude/gifted-johnson-tdf1pv')
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: 'بوصلة · مالي',
        short_name: 'بوصلة',
        description: 'تتبع فلوسك وديونك وخطة التحرر منها',
        lang: 'ar',
        dir: 'rtl',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0E0B09',
        theme_color: '#0E0B09',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // pdf.js (statement import) is large and rarely used — don't make every install
        // download it; fetch it lazily on first use and cache it after that instead.
        globIgnores: ['**/pdf-*.js', '**/pdf.worker*.mjs'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\/assets\/pdf(\.worker)?[\w.-]*\.(m?js)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'pdfjs', expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            // Investment prices update on their own schedule (see prices.yml) — always try
            // the network first so a re-opened tab gets the latest, falling back to the last
            // fetched copy when offline.
            urlPattern: /\/prices\.json(\?.*)?$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'prices', networkTimeoutSeconds: 4, expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          }
        ]
      }
    })
  ]
});
