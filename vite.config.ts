import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // IMPORTANT: Makes asset paths relative, fixing loading issues on Vercel
  build: {
    chunkSizeWarningLimit: 1500,
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  }
})