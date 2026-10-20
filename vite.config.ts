import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://65.21.97.113:80/',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // GeoServer sends no Access-Control-Allow-Origin header at all, so any
      // direct fetch() to it (WFS GetFeature) fails CORS from the Vite dev
      // origin — proxied the same way /api already is, instead of hitting
      // it directly like VITE_GEOSERVER_URL does in production.
      '/geoserver': {
        target: 'http://65.21.97.113:443/',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
