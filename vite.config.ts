import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // PENTING: Memastikan asset dimuat dengan benar di hosting statis
  build: {
    chunkSizeWarningLimit: 1000,
    outDir: 'dist',
  }
})
