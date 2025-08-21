<template>
  <div v-if="error" class="error-boundary">
    <div class="max-w-md mx-auto text-center p-8">
      <div class="error-icon mb-4">
        <svg class="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        出现了一些问题
      </h3>
      <p class="text-gray-600 dark:text-gray-400 mb-4">
        {{ error.message || '组件加载失败，请刷新页面重试' }}
      </p>
      <div class="space-y-2">
        <button 
          @click="retry" 
          class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          重试
        </button>
        <button 
          @click="reset" 
          class="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          重置
        </button>
      </div>
      <details class="mt-4 text-left">
        <summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
          查看错误详情
        </summary>
        <pre class="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300 overflow-auto">
          {{ error.stack || error.toString() }}
        </pre>
      </details>
    </div>
  </div>
  <slot v-else />
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue';

const error = ref(null);

onErrorCaptured((err, instance, info) => {
  console.error('ErrorBoundary caught an error:', err, instance, info);
  error.value = err;
  return false; // 阻止错误继续传播
});

const retry = () => {
  error.value = null;
};

const reset = () => {
  error.value = null;
  window.location.reload();
};
</script>

<style scoped>
.error-boundary {
  @apply bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-lg shadow-lg;
}

.error-icon {
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}
</style>
