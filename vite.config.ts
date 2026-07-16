import { defineConfig } from 'vite';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const enableDevServiceWorker = process.env.VITE_ENABLE_DEV_SW === 'true';
const localCertPath = process.env.LOCAL_HTTPS_CERT || 'dev-cert.pem';
const localKeyPath = process.env.LOCAL_HTTPS_KEY || 'dev-key.pem';
const localHttps = process.env.LOCAL_HTTPS === 'true' && existsSync(localCertPath) && existsSync(localKeyPath)
  ? { cert: readFileSync(localCertPath), key: readFileSync(localKeyPath) }
  : undefined;

export default defineConfig({
  base: './',
  server: {
    https: localHttps,
    // Cloudflare Quick Tunnel assigns a random *.trycloudflare.com hostname.
    // Keep this narrowly scoped to development instead of accepting all hosts.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: process.env.VITE_BRAND_API || 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    vue(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: null,
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{html,js,css,png,svg,ico,woff2,json}'],
      },
      devOptions: {
        enabled: enableDevServiceWorker,
        type: 'module',
      },
    }),
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'version.json', dest: '.' },
        { src: 'coopfood-logo.png', dest: '.' },
        { src: 'favicon_io', dest: '.' },
        { src: 'assets', dest: '.' },
      ],
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        app: resolve(process.cwd(), 'index.html'),
        lookupGuide: resolve(process.cwd(), 'docs/huong-dan/huong-dan-tra-han-lui.html'),
        kphGuide: resolve(process.cwd(), 'docs/huong-dan/huong-dan-kph.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/html5-qrcode')) return 'scanner-vendor';
          if (id.includes('node_modules/flatpickr')) return 'date-vendor';
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia')) return 'vue-vendor';
          if (id.includes('node_modules/dexie') || id.includes('node_modules/zod')) return 'data-vendor';
          return undefined;
        },
      },
    },
  },
  preview: {
    https: localHttps,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
