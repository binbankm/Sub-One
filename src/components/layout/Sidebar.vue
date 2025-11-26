<script setup>
import { computed, ref, defineAsyncComponent } from 'vue';
import { useThemeStore } from '../../stores/theme.js';
import { useUIStore } from '../../stores/ui.js';

const HelpModal = defineAsyncComponent(() => import('../modals/HelpModal.vue'));

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
const uiStore = useUIStore();
const showHelpModal = ref(false);

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
  <aside class="fixed inset-y-0 left-0 z-50 w-72 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl text-slate-700 dark:text-slate-300 border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col shadow-2xl transition-transform duration-300 transform lg:translate-x-0"
         :class="{ '-translate-x-full': !isLoggedIn }">
    
    <!-- 顶部 Logo 区域 -->
    <div class="h-24 flex items-center px-6 relative overflow-hidden shrink-0">
      <!-- 背景光效 -->
      <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none"></div>
      
      <div class="flex items-center gap-4 relative z-10 w-full">
        <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div class="flex flex-col">
          <h1 class="text-lg font-bold text-slate-900 dark:text-white tracking-wide leading-tight">Sub-One</h1>
          <p class="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase leading-tight">Manager</p>
        </div>
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
      <div v-for="item in menuItems" :key="item.id">
        <button
          @click="switchTab(item.id)"
          class="w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden"
          :class="[
            modelValue === item.id 
              ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700/90 text-white shadow-md shadow-indigo-900/30 ring-1 ring-indigo-500/40' 
              : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white text-slate-500 dark:text-slate-400'
          ]"
        >
          <!-- 选中状态的光效 -->
          <div v-if="modelValue === item.id" class="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none"></div>

          <div class="flex items-center gap-3 relative z-10">
            <div class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-300 shrink-0" 
                 :class="[modelValue === item.id ? 'bg-white/20 text-white' : 'bg-slate-200/50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700']">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
              </svg>
            </div>
            <span class="font-medium tracking-wide text-sm">{{ item.name }}</span>
          </div>
          
          <span v-if="item.count > 0" 
            class="px-2 py-0.5 text-[10px] rounded-md font-bold transition-all duration-300 relative z-10 min-w-[1.25rem] text-center"
            :class="[
              modelValue === item.id 
                ? 'bg-white/20 text-white shadow-sm' 
                : 'bg-slate-200/50 dark:bg-slate-800 text-slate-500 dark:text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-700 dark:group-hover:text-slate-300'
            ]"
          >
            {{ item.count }}
          </span>
        </button>
      </div>
    </nav>

    <!-- 底部工具栏 -->
    <div class="p-3 mx-3 mb-4 rounded-2xl bg-slate-100/50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-700/30 backdrop-blur-sm flex flex-col gap-1 shrink-0">
      
      <!-- 工具按钮组 -->
      <div class="grid grid-cols-1 gap-1">
        <!-- 设置 -->
        <button 
          @click="uiStore.show()"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all duration-200 group"
        >
          <div class="w-7 h-7 flex items-center justify-center rounded-md bg-white/50 dark:bg-slate-800/50 text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.1.756-2.924-1.756-3.35 0a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span class="text-sm font-medium">系统设置</span>
        </button>

        <!-- 帮助 -->
        <button 
          @click="showHelpModal = true"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all duration-200 group"
        >
          <div class="w-7 h-7 flex items-center justify-center rounded-md bg-white/50 dark:bg-slate-800/50 text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-sm font-medium">使用帮助</span>
        </button>

        <!-- 主题切换 -->
        <button 
          @click="themeStore.toggleTheme"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all duration-200 group"
        >
          <div class="w-7 h-7 flex items-center justify-center rounded-md bg-white/50 dark:bg-slate-800/50 text-slate-500 group-hover:text-yellow-500 dark:group-hover:text-yellow-400 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors shrink-0">
            <svg v-if="themeStore.getThemeIcon() === 'sun'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </div>
          <span class="text-sm font-medium">{{ themeStore.getThemeIcon() === 'sun' ? '浅色模式' : '深色模式' }}</span>
        </button>
      </div>

      <!-- 分割线 -->
      <div class="h-px bg-slate-200/50 dark:bg-slate-700/50 my-1 mx-2"></div>

      <!-- 退出登录 -->
      <button 
        @click="emit('logout')"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
      >
        <div class="w-7 h-7 flex items-center justify-center rounded-md bg-white/50 dark:bg-slate-800/50 text-slate-500 group-hover:text-red-500 group-hover:bg-red-500/10 transition-colors shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>
        <span class="text-sm font-medium">退出登录</span>
      </button>
    </div>
    
    <!-- 帮助模态框 -->
    <HelpModal 
      :show="showHelpModal" 
      @update:show="showHelpModal = $event"
    />
  </aside>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
