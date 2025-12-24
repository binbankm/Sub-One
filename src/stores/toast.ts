/**
 * ==================== Toast 提示管理 Store ====================
 * 
 * 功能说明：
 * - 管理全局 Toast 提示消息
 * - 支持多种提示类型（info、success、error、warning）
 * - 自动控制提示的显示时长和移除
 * - 限制同时显示的提示数量，防止刷屏
 * 
 * =============================================================
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Toast 提示接口定义
 */
interface Toast {
  /** Toast 唯一标识符 */
  id: string;
  /** 提示消息内容 */
  message: string;
  /** 提示类型（info | success | error | warning） */
  type: string;
}

/**
 * Toast Store
 * 使用 Setup 语法定义 Pinia Store
 */
export const useToastStore = defineStore('toast', () => {
  // ==================== 响应式状态 ====================

  /** Toast 提示列表 */
  const toasts = ref<Toast[]>([]);

  // ==================== 方法定义 ====================

  /**
   * 显示 Toast 提示
   * 
   * @param {string} message - 提示消息内容
   * @param {string} type - 提示类型（默认为 'info'）
   * @param {number} duration - 显示时长（毫秒），0 表示不自动关闭（默认 3000ms）
   */
  function showToast(message: string, type = 'info', duration = 3000) {
    // 生成唯一 ID（时间戳 + 随机字符串）
    const id = Date.now() + Math.random().toString(36).substr(2, 9);

    // 创建 Toast 对象
    const toast = { id, message, type };

    // 添加到提示列表
    toasts.value.push(toast);

    // 如果设置了自动关闭时长
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    // 限制最大显示数量，防止刷屏
    // 超过 5 个时，移除最早的提示
    if (toasts.value.length > 5) {
      toasts.value.shift(); // 移除数组第一个元素
    }
  }

  /**
   * 移除指定的 Toast 提示
   * 
   * @param {string} id - 要移除的 Toast ID
   */
  function removeToast(id: string) {
    // 查找 Toast 位置
    const index = toasts.value.findIndex(t => t.id === id);

    // 如果找到，则移除
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  // ==================== 导出接口 ====================

  return {
    /** Toast 提示列表 */
    toasts,
    /** 显示 Toast 提示 */
    showToast,
    /** 移除 Toast 提示 */
    removeToast
  };
});
