
/**
 * Toast消息管理Store
 * 管理全局消息提示的显示、隐藏和队列
 */
import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';

export const useToastStore = defineStore('toast', () => {
  // === 状态定义 ===
  const toast = reactive({
    id: null,
    message: '',
    type: 'info', // info, success, warning, error
    duration: 3000,
    position: 'top-right' // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
  });

  const toastQueue = ref([]);
  const isVisible = ref(false);
  let timeoutId = null;

  // === 消息类型配置 ===
  const toastTypes = {
    info: { icon: 'ℹ️', color: 'blue' },
    success: { icon: '✅', color: 'green' },
    warning: { icon: '⚠️', color: 'yellow' },
    error: { icon: '❌', color: 'red' }
  };

  // === 核心方法 ===
  function showToast(message, type = 'info', duration = 3000, position = 'top-right') {
    // 如果当前有消息在显示，加入队列
    if (isVisible.value) {
      toastQueue.value.push({ message, type, duration, position });
      return;
    }

    // 清除之前的定时器
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // 设置新的toast
    toast.id = Date.now();
    toast.message = message;
    toast.type = type;
    toast.duration = duration;
    toast.position = position;
    isVisible.value = true;

    // 设置自动隐藏
    timeoutId = setTimeout(() => {
      hideToast();
    }, duration);
  }

  function hideToast() {
    isVisible.value = false;
    toast.id = null;
    
    // 显示队列中的下一个消息
    if (toastQueue.value.length > 0) {
      const nextToast = toastQueue.value.shift();
      setTimeout(() => {
        showToast(nextToast.message, nextToast.type, nextToast.duration, nextToast.position);
      }, 300); // 延迟300ms显示下一个消息
    }
  }

  // === 便捷方法 ===
  function showSuccess(message, duration = 3000) {
    showToast(message, 'success', duration);
  }

  function showError(message, duration = 5000) {
    showToast(message, 'error', duration);
  }

  function showWarning(message, duration = 4000) {
    showToast(message, 'warning', duration);
  }

  function showInfo(message, duration = 3000) {
    showToast(message, 'info', duration);
  }

  // === 队列管理 ===
  function clearQueue() {
    toastQueue.value = [];
  }

  function getQueueLength() {
    return toastQueue.value.length;
  }

  // === 获取类型信息 ===
  function getToastTypeInfo(type) {
    return toastTypes[type] || toastTypes.info;
  }

  return {
    // 状态
    toast,
    toastQueue,
    isVisible,
    
    // 核心方法
    showToast,
    hideToast,
    
    // 便捷方法
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // 队列管理
    clearQueue,
    getQueueLength,
    
    // 工具方法
    getToastTypeInfo
  };
});
