import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Large JSON (the question bank) becomes JSON.parse("..."), which browsers parse
  // much faster than the same data as a JavaScript object literal
  json: { stringify: true },
  server: {
    host: true,
    watch: {
      ignored: ['**/server/**', '**/.git/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
