<script setup>
import { computed } from 'vue';

const currentYear = computed(() => new Date().getFullYear());
</script>

<template>
  <footer class="w-full text-center py-6 mt-8 relative">
    <!-- 装饰性背景 -->
    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent dark:from-transparent dark:via-gray-800/5 dark:to-transparent"></div>
    
    <div class="relative z-10">
      <div class="flex items-center justify-center space-x-4 mb-4">
        <div class="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
        <div class="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"></div>
        <div class="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
      </div>
      
      <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">
        Copyright © {{ currentYear }} 
        <a 
          href="https://github.com/binbankm/Sub-One" 
          target="_blank" 
          class="font-bold gradient-text hover:opacity-80 transition-opacity duration-300"
        >
          Sub-One Manager
        </a>
        <span class="mx-2">·</span>
        <span class="text-xs">All Rights Reserved</span>
      </p>
      
      <div class="mt-3 flex items-center justify-center space-x-6 text-xs text-gray-400 dark:text-gray-500">
        <span class="flex items-center space-x-1">
          <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>安全可靠</span>
        </span>
        <span class="flex items-center space-x-1">
          <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style="animation-delay: 0.5s;"></div>
          <span>高效管理</span>
        </span>
        <span class="flex items-center space-x-1">
          <div class="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style="animation-delay: 1s;"></div>
          <span>隐私保护</span>
        </span>
      </div>
    </div>
  </footer>
</template>