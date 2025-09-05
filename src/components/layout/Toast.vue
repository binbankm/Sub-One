<script setup>
import { ref, watch } from 'vue';
import { useToastStore } from '../../stores/toast.js';

const { toast } = useToastStore();
const isVisible = ref(false);

watch(() => toast.id, () => {
  if (toast.message) {
    isVisible.value = true;
    setTimeout(() => {
      isVisible.value = false;
    }, 3000);
  }
});

const getToastStyle = (type) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-gradient-to-r from-green-500/90 to-emerald-500/90',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        border: 'border-green-400/30'
      };
    case 'error':
      return {
        bg: 'bg-gradient-to-r from-red-500/90 to-pink-500/90',
        icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
        border: 'border-red-400/30'
      };
    case 'info':
      return {
        bg: 'bg-gradient-to-r from-blue-500/90 to-indigo-500/90',
        icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        border: 'border-blue-400/30'
      };
    default:
      return {
        bg: 'bg-gradient-to-r from-gray-500/90 to-slate-500/90',
        icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        border: 'border-gray-400/30'
      };
  }
};
</script>

<template>
  <Transition name="toast">
    <div
      v-if="isVisible"
      class="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl text-white font-medium text-sm border"
      :class="[
        getToastStyle(toast.type).bg,
        getToastStyle(toast.type).border
      ]"
    >
      <div class="flex items-center space-x-3">
        <!-- 图标 -->
        <div class="flex-shrink-0">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="getToastStyle(toast.type).icon" />
          </svg>
        </div>
        
        <!-- 消息内容 -->
        <div class="flex-1">
          <p class="font-semibold">{{ toast.message }}</p>
        </div>
        
        <!-- 关闭按钮 -->
        <button 
          @click="isVisible = false"
          class="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors duration-200"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      

    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-30px) translateX(-50%) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) translateX(-50%) scale(0.95);
}

.toast-enter-to,
.toast-leave-from {
  opacity: 1;
  transform: translateY(0) translateX(-50%) scale(1);
}
</style>