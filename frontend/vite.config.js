/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const usePolling = process.env.CHOKIDAR_USEPOLLING === 'true'
const pollingInterval = Number(process.env.CHOKIDAR_INTERVAL ?? 300)

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 8081,
    strictPort: true,
    watch: {
      usePolling,
      interval: pollingInterval,
    },
    proxy: {
      '/api': { target: 'http://api:3000', changeOrigin: true },
    },
  },
})
