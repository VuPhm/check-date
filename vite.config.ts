import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  base: './',
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
        enabled: false,
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
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
