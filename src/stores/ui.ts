/**
 * ==================== UI 状态管理 Store ====================
 *
 * 功能说明：
 * - 管理全局 UI 组件的显示状态
 * - 控制设置模态框的打开和关闭
 * - 可扩展用于管理其他全局 UI 状态
 *
 * ===========================================================
 */
import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * UI Store
 * 使用 Setup 语法定义 Pinia Store
 */
export const useUIStore = defineStore('ui', () => {
    // ==================== 响应式状态 ====================

    /**
     * 设置模态框可见性
     * true - 显示
     * false - 隐藏
     */
    const isSettingsModalVisible = ref(false);

    // ==================== 方法定义 ====================

    /**
     * 显示设置模态框
     */
    function show() {
        isSettingsModalVisible.value = true;
    }

    /**
     * 隐藏设置模态框
     */
    function hide() {
        isSettingsModalVisible.value = false;
    }

    // ==================== 导出接口 ====================

    return {
        /** 设置模态框可见性 */
        isSettingsModalVisible,
        /** 显示设置模态框 */
        show,
        /** 隐藏设置模态框 */
        hide
    };
});
