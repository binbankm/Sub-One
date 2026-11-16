import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * Toast 提示类型
 */
type ToastType = 'info' | 'success' | 'error' | 'warning';

/**
 * Toast 提示接口定义
 */
interface Toast {
    /** Toast 唯一标识符 */
    id: string;
    /** 提示消息内容 */
    message: string;
    /** 提示类型 */
    type: ToastType;
}

/**
 * 通知管理 Store (合并了原 UI Store 和 Toast Store)
 */
export const useNotificationStore = defineStore('notification', () => {
    // ==================== UI 状态 ====================

    /** 设置模态框可见性 */
    const isSettingsModalVisible = ref(false);

    /** 显示设置模态框 */
    function showSettings() {
        isSettingsModalVisible.value = true;
    }

    /** 隐藏设置模态框 */
    function hideSettings() {
        isSettingsModalVisible.value = false;
    }

    // ==================== Toast 状态 ====================

    /** Toast 提示列表 */
    const toasts = ref<Toast[]>([]);

    /** 最近展示消息的时间戳记录，用于短时间内防抖去重 */
    const recentMessages = new Map<string, number>();

    /**
     * 显示 Toast 提示
     */
    function showToast(message: string, type: ToastType = 'info', duration = 3000) {
        if (!message || !message.trim()) return;
        const cleanMsg = message.trim();

        // 1. 去重检查：当前已在列表中展示的相同消息直接忽略
        const existingToast = toasts.value.find((t) => t.message === cleanMsg && t.type === type);
        if (existingToast) {
            return;
        }

        // 2. 时间防抖：同一消息 1.2 秒内不重复弹出
        const now = Date.now();
        const lastShown = recentMessages.get(cleanMsg);
        if (lastShown && now - lastShown < 1200) {
            return;
        }
        recentMessages.set(cleanMsg, now);

        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        const toast: Toast = { id, message: cleanMsg, type };
        toasts.value.push(toast);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        if (toasts.value.length > 5) {
            toasts.value.shift();
        }
    }

    /**
     * 移除指定的 Toast 提示
     */
    function removeToast(id: string) {
        const index = toasts.value.findIndex((t) => t.id === id);
        if (index !== -1) {
            toasts.value.splice(index, 1);
        }
    }

    return {
        // UI
        isSettingsModalVisible,
        showSettings,
        hideSettings,
        show: showSettings, // Alias for backward compatibility
        hide: hideSettings, // Alias for backward compatibility

        // Toast
        toasts,
        showToast,
        removeToast
    };
});

// 为了兼容旧代码，导出原来的 Store 名称
export const useUIStore = useNotificationStore;
export const useToastStore = useNotificationStore;
