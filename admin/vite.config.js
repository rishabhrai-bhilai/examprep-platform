import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'

// The admin app: a separate site built from admin/ into dist-admin.
//   npm run dev:admin     http://localhost:5174 (API proxied to the server on :5000)
//   npm run build:admin   dist-admin/, served by the server for ADMIN_HOST, or deploy it as its own static site
const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root,
  // Its own dependency cache, so running both dev servers at once doesn't clash
  cacheDir: fileURLToPath(new URL('../node_modules/.vite-admin', import.meta.url)),
  plugins: [react(), tailwindcss()],
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL('../dist-admin', import.meta.url)),
    emptyOutDir: true
  },
  server: {
    port: 5174,
    host: true,
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true, secure: false }
    }
  }
})
