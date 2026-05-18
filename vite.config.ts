import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// User site https://yarbabin.github.io/ is served from repo root — base must be '/'.
// (Project sites under https://user.github.io/repo/ would use base: '/repo-name/'.)
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/api/db': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
