import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Cheta's API has no CORS headers; proxy it (production: public/_redirects).
    proxy: {
      '/cheta-api': {
        target: 'https://www.cheta.africa',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cheta-api/, '/api'),
      },
    },
  },
})
