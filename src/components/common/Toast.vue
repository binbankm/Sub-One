<script setup lang="ts">
import { useToastStore } from '../../stores/toast';

const toastStore = useToastStore();

const getToastStyle = (type: string) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-white dark:bg-gray-800',
        border: 'border-l-4 border-green-500',
        text: 'text-gray-800 dark:text-gray-100',
        iconColor: 'text-green-500',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
      };
    case 'error':
      return {
        bg: 'bg-white dark:bg-gray-800',
        border: 'border-l-4 border-red-500',
        text: 'text-gray-800 dark:text-gray-100',
        iconColor: 'text-red-500',
        icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
      };
    case 'info':
      return {
        bg: 'bg-white dark:bg-gray-800',
        border: 'border-l-4 border-blue-500',
        text: 'text-gray-800 dark:text-gray-100',
        iconColor: 'text-blue-500',
        icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      };
    default:
      return {
        bg: 'bg-white dark:bg-gray-800',
        border: 'border-l-4 border-gray-500',
        text: 'text-gray-800 dark:text-gray-100',
        iconColor: 'text-gray-500',
        icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      };
  }
};
</script>

<template>
  <div
    class="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-sm px-4">
    <TransitionGroup name="toast-list">
      <div v-for="toast in toastStore.toasts" :key="toast.id"
        class="pointer-events-auto w-full p-4 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 flex items-start gap-3 transform transition-all duration-300 hover:scale-[1.02]"
        :class="[
          getToastStyle(toast.type).bg,
          getToastStyle(toast.type).border
        ]">
        <!-- 图标 -->
        <div class="flex-shrink-0 mt-0.5" :class="getToastStyle(toast.type).iconColor">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="getToastStyle(toast.type).icon" />
          </svg>
        </div>

        <!-- 消息内容 -->
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm leading-5" :class="getToastStyle(toast.type).text">{{ toast.message }}</p>
        </div>

        <!-- 关闭按钮 -->
        <button @click="toastStore.removeToast(toast.id)"
          class="flex-shrink-0 -mr-1 -mt-1 p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-list-enter-active,
.toast-list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-list-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.toast-list-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.toast-list-move {
  transition: transform 0.4s ease;
}
</style>
