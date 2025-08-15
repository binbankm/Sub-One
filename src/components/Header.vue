<script setup>
import { useUIStore } from '../stores/ui.js';
import { useThemeStore } from '../stores/theme.js';
import { ref, defineAsyncComponent } from 'vue';

const HelpModal = defineAsyncComponent(() => import('./HelpModal.vue'));
const WallpaperModal = defineAsyncComponent(() => import('./WallpaperModal.vue'));

const uiStore = useUIStore();
const themeStore = useThemeStore();

// 接收一个 isLoggedIn 属性
const props = defineProps({
  isLoggedIn: Boolean
});

const emit = defineEmits(['logout']);

// 帮助文档状态管理
const showHelpModal = ref(false);
// 壁纸管理状态管理
const showWallpaperModal = ref(false);
</script>

<template>
  <header class="nav-modern-enhanced sticky top-0 z-30 bg-gray-900/70 border-b border-gray-700/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 顶部导航栏 -->
      <div class="flex justify-between items-center h-16 lg:h-20">
        <!-- Logo区域优化 -->
        <div class="flex items-center animate-fade-in-up-enhanced">
          <div class="relative group">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105 hover-lift">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse shadow-lg"></div>
          </div>
          <div class="ml-4 flex flex-col sm:flex-row sm:items-center">
            <span class="text-xl lg:text-2xl font-bold gradient-text-enhanced drop-shadow-sm">Sub-One</span>
            <span class="text-xs lg:text-sm text-gray-300 font-medium ml-0 sm:ml-2 drop-shadow-sm">Manager</span>
          </div>
        </div>
        
        <!-- 操作按钮区域优化 -->
        <div v-if="isLoggedIn" class="flex items-center space-x-2 lg:space-x-3 animate-slide-in-right-enhanced">
          <!-- 主题切换按钮 -->
          <button 
            @click="themeStore.toggleTheme()" 
            class="p-3 lg:p-4 rounded-2xl bg-white/60 dark:bg-gray-800/75 border border-gray-300/30 dark:border-gray-600/30 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-gray-700/75 transition-all duration-300 transform hover:scale-105 hover-lift focus-enhanced group" 
            :title="themeStore.getNextThemeName()"
          >
            <!-- 太阳图标 - 明亮模式 -->
            <svg v-if="themeStore.getThemeIcon() === 'sun'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500 group-hover:text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M6.34 6.34L4.93 4.93m12.72 12.72l1.41-1.41"/>
            </svg>
            
            <!-- 月亮图标 - 暗黑模式 -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-500 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
          </button>
          
          <!-- 壁纸管理按钮 -->
          <button 
            @click="showWallpaperModal = true"
            class="p-3 lg:p-4 rounded-2xl bg-white/60 dark:bg-gray-800/75 border border-gray-300/30 dark:border-gray-600/30 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-gray-700/75 transition-all duration-300 transform hover:scale-105 hover-lift focus-enhanced group" 
            title="壁纸背景管理"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-500 group-hover:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          
          <!-- 设置按钮 -->
          <button 
            @click="uiStore.show()" 
            class="p-3 lg:p-4 rounded-2xl bg-white/60 dark:bg-gray-800/75 border border-gray-300/30 dark:border-gray-600/30 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-gray-700/75 transition-all duration-300 transform hover:scale-105 hover-lift focus-enhanced" 
            title="设置"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.1.756-2.924-1.756-3.35 0a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          <!-- 帮助文档按钮 -->
          <button 
            @click="showHelpModal = true"
            class="p-3 lg:p-4 rounded-2xl bg-white/60 dark:bg-gray-800/75 border border-gray-300/30 dark:border-gray-600/30 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-gray-700/75 transition-all duration-300 transform hover:scale-105 hover-lift focus-enhanced" 
            title="帮助文档"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <!-- 登出按钮 -->
          <button 
            @click="emit('logout')" 
            class="p-3 lg:p-4 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 hover-lift shadow-lg hover:shadow-xl focus-enhanced" 
            title="登出"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </header>
  
  <!-- 帮助文档模态框 -->
  <HelpModal 
    :show="showHelpModal" 
    @update:show="showHelpModal = $event"
  />
  
  <!-- 壁纸管理模态框 -->
  <WallpaperModal 
    :show="showWallpaperModal" 
    @update:show="showWallpaperModal = $event"
  />
</template>

<style scoped>
/* 标签页悬停效果 */
.group:hover .group-hover\:bg-gray-200 {
  background-color: rgb(229 231 235);
}

.dark .group:hover .group-hover\:bg-gray-700 {
  background-color: rgb(55 65 81);
}

/* 标签页切换动画 */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

/* 活动指示器动画 */
.h-0\.5 {
  height: 0.125rem;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .space-x-8 > :not([hidden]) ~ :not([hidden]) {
    margin-left: 1rem;
  }
  
  .min-w-0 {
    min-width: 0px;
  }
  
  .flex-1 {
    flex: 1 1 0%;
  }
}

/* 强制移除所有可能的边框和视觉边界 */
.nav-modern-enhanced,
.nav-modern,
header,
.nav-modern-enhanced *,
.nav-modern *,
header * {
  border: none !important;
  border-top: none !important;
  border-bottom: none !important;
  border-left: none !important;
  border-right: none !important;
  outline: none !important;
  box-shadow: none !important;
}

/* 确保没有任何分割线 */
.divider-modern,
.divider-modern-enhanced {
  display: none !important;
}

/* 覆盖任何可能的伪元素边框 */
.nav-modern-enhanced::before,
.nav-modern-enhanced::after,
.nav-modern::before,
.nav-modern::after,
header::before,
header::after {
  display: none !important;
  border: none !important;
}
</style>