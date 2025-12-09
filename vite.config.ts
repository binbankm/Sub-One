import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3055',
        changeOrigin: true,
      },
      '/sub': {
        target: 'http://127.0.0.1:3055',
        changeOrigin: true,
      }
    }
  }
})