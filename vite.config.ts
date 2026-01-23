/**
 * ==================== Vite 配置文件 ====================
 * 
 * 功能说明：
 * - 配置 Vite 构建工具
 * - 设置 Vue 插件
 * - 配置路径别名
 * - 设置开发服务器代理
 * 
 * ======================================================
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

/**
 * Vite 配置导出
 * 
 * 配置项说明：
 * - plugins: 使用的 Vite 插件列表
 * - resolve: 模块解析配置
 * - server: 开发服务器配置
 */
export default defineConfig({
  // ==================== 插件配置 ====================

  /**
   * 插件列表
   * - vue(): Vue 3 单文件组件支持
   */
  plugins: [vue()],

  // ==================== 模块解析配置 ====================

  resolve: {
    /**
     * 路径别名配置
     * 简化导入路径，提高代码可读性
     * 
     * 使用示例：
     * - import { MyComponent } from '@/components/MyComponent.vue'
     * - import { types } from '@shared/types'
     */
    alias: {
      // '@' 指向 src 目录
      '@': path.resolve(__dirname, './src'),
      // '@shared' 指向共享库目录
      '@shared': path.resolve(__dirname, './lib/shared')
    }
  },

  // ==================== 开发服务器配置 ====================

  server: {
    /**
     * API 代理配置
     * 
     * 说明：
     * - 开发环境下将 API 请求代理到本地后端服务器
     * - 避免跨域问题
     * - 本地后端服务器地址：http://127.0.0.1:8787
     */
    proxy: {
      /**
       * /api 路径代理
       * 所有以 /api 开头的请求都会被代理到后端服务器
       */
      '/api': {
        target: 'http://127.0.0.1:3055',  // 目标服务器地址
        changeOrigin: true,  // 改变源地址，解决跨域问题
      },

      /**
       * /sub 路径代理
       * 订阅链接相关请求代理
       */
      '/sub': {
        target: 'http://127.0.0.1:3055',  // 目标服务器地址
        changeOrigin: true,  // 改变源地址，解决跨域问题
      }
    }
  },

  // ==================== 构建配置 ====================

  build: {
    /** 
     * 消除块大小警告 
     * 默认 500kb -> 1000kb 
     */
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        /**
         * 手动分包策略
         * 将第三方依赖拆分到单独的 vendor chunk 中，利用浏览器缓存
         */
        manualChunks: {
          'vendor-core': ['vue', 'pinia'],
          'vendor-utils': ['lodash-es', 'js-base64', 'js-yaml', 'qrcode'],
          'vendor-ui': ['echarts', 'vuedraggable'] // 较大的 UI 库单独打包
        }
      }
    }
  }
})