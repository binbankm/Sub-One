/**
 * ==================== Vite 环境类型声明文件 ====================
 * 
 * 功能说明：
 * - 为 Vite 提供 TypeScript 类型支持
 * - 声明 .vue 单文件组件的模块类型
 * - 确保 TypeScript 能正确识别 Vue 组件导入
 * 
 * ===============================================================
 */

// 引用 Vite 客户端类型定义
/// <reference types="vite/client" />

/**
 * 声明 .vue 文件模块类型
 * 
 * 说明：
 * - TypeScript 默认不识别 .vue 文件
 * - 此声明告诉 TypeScript .vue 文件导出的是 Vue 组件
 * - DefineComponent<any, any, any> 表示一个通用的 Vue 组件类型
 */
declare module '*.vue' {
    // 导入 Vue 组件类型定义
    import type { DefineComponent } from 'vue'
    // 声明 .vue 文件默认导出一个 Vue 组件
    const component: DefineComponent<any, any, any>
    export default component
}
