import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // PENTING: base './' membuat semua asset (js, css, gambar) dimuat secara relatif.
  // Ini wajib agar game bisa jalan di https://username.github.io/repo-name/
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'three', 'lucide-react'],
          gameLogic: ['./src/components/Minigame.tsx', './src/components/RodController.ts']
        }
      }
    }
  }
})