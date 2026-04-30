import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from 'vite-plugin-pwa';
import path from "path";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: { clientPort: 8080 },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['favicon.ico', 'logo-dark-compact.png', 'italostudy-logo.png', 'sidebar-logo.png', 'pwa-logo.png', 'pwa-logo-ios.png'],
      manifest: {
        id: '/',
        name: 'ItaloStudy',
        short_name: 'ItaloStudy',
        description: 'Your ultimate companion for medical and academic studies in Italy.',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-logo-ios.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        // Increase the maximum size for precaching (to 5MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                // Fallback: Show the prompt anyway after 3 seconds to "introduce" the feature
                // if it's not already visible.
                // window.debugPWA = true;
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/ik\.imagekit\.io\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'imagekit-images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // <== 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    }),

  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  // Drop console/debugger statements from production builds only
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // ─── Heavy Standalone Engines ──────────────────────────────────────
          if (id.includes('@tensorflow') || id.includes('@mediapipe') || id.includes('tesseract.js')) return 'chunk-ai';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'chunk-pdf';

          // ─── Large Services ───────────────────────────────────────────────
          if (id.includes('@supabase')) return 'chunk-supabase';
          if (id.includes('@aws-sdk')) return 'chunk-aws';
          if (id.includes('livekit')) return 'chunk-livekit';

          // ─── Animations & Charts ──────────────────────────────────────────
          if (id.includes('framer-motion')) return 'chunk-motion';
          if (id.includes('recharts')) return 'chunk-charts';

          // ─── Vendor Catch-all ─────────────────────────────────────────────
          // Let Three.js, Radix, and React stay together in vendor to avoid 
          // complex circular dependency chains and initialization errors.
          return 'vendor';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    },
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    target: ['es2020', 'chrome96', 'safari15', 'firefox95'],
    cssMinify: true,
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      '@supabase/supabase-js', 'framer-motion',
      'clsx', 'tailwind-merge',
      'recharts',
    ],
  },
}));
