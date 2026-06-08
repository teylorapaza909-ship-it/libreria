import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Asegura rutas relativas para XAMPP
  build: {
    outDir: '../',
    emptyOutDir: false, // No borrar index.php y .htaccess de Laravel
  }
})
