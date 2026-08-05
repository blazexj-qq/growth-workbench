import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 让构建产物用相对路径，方便静态托管（CloudStudio）/ 子路径访问
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, host: true },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 }
})
