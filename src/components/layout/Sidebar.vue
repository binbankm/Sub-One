<script setup>
import { computed } from 'vue';
import { useThemeStore } from '../../stores/theme.js';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'subscriptions'
  },
  subscriptionsCount: {
    type: Number,
    default: 0
  },
  profilesCount: {
    type: Number,
    default: 0
  },
  manualNodesCount: {
    type: Number,
    default: 0
  },
  generatorCount: {
    type: Number,
    default: 0
  },
  isLoggedIn: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'logout']);
const themeStore = useThemeStore();

const menuItems = [
  {
    id: 'subscriptions',
    name: '订阅管理',
    icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
    count: computed(() => props.subscriptionsCount),
    color: 'text-blue-500'
  },
  {
    id: 'profiles',
    name: '订阅组',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    count: computed(() => props.profilesCount),
    color: 'text-purple-500'
  },
  {
    id: 'generator',
    name: '链接生成',
    icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    count: computed(() => props.generatorCount),
    color: 'text-orange-500'
  },
  {
    id: 'nodes',
    name: '手动节点',
    icon: 'M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4',
    count: computed(() => props.manualNodesCount),
    color: 'text-green-500'
  }
];

const switchTab = (id) => {
  emit('update:modelValue', id);
};
</script>

<template>
  <aside class="fixed inset-y-0 left-0 z-50 w-64 bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 transform lg:translate-x-0 flex flex-col"
         :class="{ '-translate-x-full': !isLoggedIn }"> <!-- 登录前隐藏侧边栏 -->
    
    <!-- Logo 区域 -->
    <div class="h-20 flex items-center px-8 border-b border-gray-100 dark:border-gray-800/50">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          Sub-One
        </span>
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
      <div v-for="item in menuItems" :key="item.id">
        <button
          @click="switchTab(item.id)"
          class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden"
          :class="[
            modelValue === item.id 
              ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
          ]"
        >
          <!-- 选中状态的光条指示器 -->
          <div v-if="modelValue === item.id" class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full"></div>

          <div class="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 transition-colors" :class="[modelValue === item.id ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
            </svg>
            <span>{{ item.name }}</span>
          </div>
          
          <span v-if="item.count > 0" 
            class="px-2 py-0.5 text-xs rounded-md font-medium transition-colors"
            :class="[
              modelValue === item.id 
                ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            ]"
          >
            {{ item.count }}
          </span>
        </button>
      </div>
    </nav>

    <!-- 底部工具栏 -->
    <div class="p-4 border-t border-gray-100 dark:border-gray-800/50 space-y-2">
      <!-- 主题切换 -->
      <button 
        @click="themeStore.toggleTheme"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <svg v-if="themeStore.isDark" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        <span>{{ themeStore.isDark ? '浅色模式' : '深色模式' }}</span>
      </button>

      <!-- 退出登录 -->
      <button 
        @click="emit('logout')"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>退出登录</span>
      </button>
    </div>
  </aside>
</template>
