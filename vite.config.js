import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@/components', replacement: '/components' },
      { find: '@', replacement: '/src' }
    ]
  },
  // Base path so built assets resolve correctly on GitHub Pages (served at /Junapedia/)
  base: isProd ? '/Junapedia/' : '/',
  server: {
    port: 3000,
    open: true
  },
  // default optimizeDeps/ssr settings (let Vite handle deps normally)
})

