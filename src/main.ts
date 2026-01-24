/**
 * ==================== 应用入口文件 ====================
 *
 * 功能说明：
 * - 初始化 Vue 应用实例
 * - 配置 Pinia 状态管理
 * - 导入全局样式
 * - 挂载根组件到 DOM
 *
 * =====================================================
 */
// 导入 Vue 核心函数
// 导入 Pinia 状态管理库
import { createApp } from 'vue';

import { createPinia } from 'pinia';

// 导入根组件
import App from './App.vue';
// 导入全局样式文件（包含 Tailwind CSS 和自定义样式）
import './assets/styles/main.css';

// 创建 Pinia 实例（全局状态管理）
const pinia = createPinia();
// 创建 Vue 应用实例
const app = createApp(App);

// 注册 Pinia 插件
app.use(pinia);
// 将应用挂载到 id 为 'app' 的 DOM 元素
app.mount('#app');
