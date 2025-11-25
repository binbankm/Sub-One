import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([]);

  function showToast(message, type = 'info', duration = 3000) {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    const toast = { id, message, type };
    toasts.value.push(toast);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    // 限制最大显示数量，防止刷屏
    if (toasts.value.length > 5) {
      toasts.value.shift();
    }
  }

  function removeToast(id) {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  return { toasts, showToast, removeToast };
});
