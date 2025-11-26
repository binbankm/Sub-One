<template>
  <nav class="breadcrumb flex items-center space-x-2 text-sm mb-6 px-1">
    <a href="#" @click.prevent class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      <span>首页</span>
    </a>
    
    <svg class="h-4 w-4 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
    
    <span class="text-gray-900 dark:text-white font-medium">{{ currentPageName }}</span>
  </nav>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  currentPage: {
    type: String,
    required: true
  }
});

const pageNames = {
  subscriptions: '订阅管理',
  profiles: '订阅组',
  generator: '链接生成',
  nodes: '手动节点'
};

const currentPageName = computed(() => pageNames[props.currentPage] || '未知页面');
</script>

<style scoped>
.breadcrumb a {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.breadcrumb a:hover {
  background-color: rgba(107, 114, 128, 0.1);
}

.dark .breadcrumb a:hover {
  background-color: rgba(156, 163, 175, 0.1);
}
</style>
