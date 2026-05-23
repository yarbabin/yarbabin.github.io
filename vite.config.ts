import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// User site https://yarbabin.github.io/ is served from repo root — base must be '/'.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api/db': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
