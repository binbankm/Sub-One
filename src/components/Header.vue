<script setup>
import { useUIStore } from '../stores/ui.js';
import { useThemeStore } from '../stores/theme.js';
import { ref, defineAsyncComponent } from 'vue';

const HelpModal = defineAsyncComponent(() => import('./HelpModal.vue'));


const uiStore = useUIStore();
const themeStore = useThemeStore();

// 接收一个 isLoggedIn 属性
const props = defineProps({
  isLoggedIn: Boolean
});

const emit = defineEmits(['logout']);

// 帮助文档状态管理
const showHelpModal = ref(false);

</script>

<template>
  <header class="nav-modern-enhanced sticky top-0 z-30 bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/40 shadow-2xl">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 顶部导航栏 -->
      <div class="flex justify-between items-center h-16 lg:h-20">
        <!-- Logo区域优化 - 美化升级版 -->
        <div class="flex items-center animate-fade-in-up-enhanced">
          <div class="relative group">
            <div class="w-14 h-14 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-2xl group-hover:shadow-glow group-hover:shadow-purple-500/30 transition-all duration-500 transform group-hover:scale-110 hover-lift">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-white drop-shadow-lg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white animate-pulse shadow-lg"></div>
            <div class="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 animate-ping"></div>
          </div>
          <div class="ml-5 flex flex-col sm:flex-row sm:items-center">
            <span class="text-2xl lg:text-3xl font-black bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent drop-shadow-lg">Sub-One</span>
            <span class="text-sm lg:text-base text-gray-200 font-semibold ml-0 sm:ml-3 drop-shadow-lg opacity-90">Manager</span>
          </div>
        </div>
        
        <!-- 操作按钮区域优化 -->
        <div v-if="isLoggedIn" class="flex items-center space-x-2 lg:space-x-3 animate-slide-in-right-enhanced">
          <!-- 主题切换按钮 - 美化升级版 -->
          <button 
            @click="themeStore.toggleTheme()" 
            class="btn-header-modern group relative overflow-hidden" 
            :title="themeStore.getNextThemeName()"
          >
            <!-- 背景光效 -->
            <div class="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <!-- 太阳图标 - 明亮模式 -->
            <svg v-if="themeStore.getThemeIcon() === 'sun'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-400 group-hover:text-yellow-300 transition-colors duration-300 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M6.34 6.34L4.93 4.93m12.72 12.72l1.41-1.41"/>
            </svg>
            
            <!-- 月亮图标 - 暗黑模式 -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-400 group-hover:text-indigo-300 transition-colors duration-300 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
          </button>
          

          
          <!-- 设置按钮 - 美化升级版 -->
          <button 
            @click="uiStore.show()" 
            class="btn-header-modern group relative overflow-hidden" 
            title="设置"
          >
            <!-- 背景光效 -->
            <div class="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors duration-300 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.1.756-2.924-1.756-3.35 0a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          <!-- 帮助文档按钮 - 美化升级版 -->
          <button 
            @click="showHelpModal = true"
            class="btn-header-modern group relative overflow-hidden" 
            title="帮助文档"
          >
            <!-- 背景光效 -->
            <div class="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <!-- 登出按钮 - 美化升级版 -->
          <button 
            @click="emit('logout')" 
            class="btn-header-modern btn-logout group relative overflow-hidden" 
            title="登出"
          >
            <!-- 背景光效 -->
            <div class="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-400 group-hover:text-red-300 transition-colors duration-300 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
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
  

</template>

<style scoped>
/* 现代化头部按钮样式 - 美化升级版 */
.btn-header-modern {
  @apply p-3 lg:p-4 rounded-2xl transition-all duration-500 transform hover:scale-110;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #1e40af;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.btn-header-modern:hover {
  background: rgba(255, 255, 255, 0.98);
  color: #1e3a8a;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px) scale(1.05);
  border-color: rgba(255, 255, 255, 0.4);
}

.btn-header-modern:active {
  transform: translateY(0) scale(0.98);
}

/* 登出按钮特殊样式 */
.btn-logout {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
}

.btn-logout:hover {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* 暗黑模式适配 */
.dark .btn-header-modern {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}

.dark .btn-header-modern:hover {
  background: rgba(30, 41, 59, 0.95);
  color: #f1f5f9;
}

/* 标签页悬停效果 */
.group:hover .group-hover\:bg-gray-200 {
  background-color: rgb(229 231 235);
}

.dark .group:hover .group-hover\:bg-gray-700 {
  background-color: rgb(55 65 81);
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
  
  .btn-header-modern {
    padding: 0.5rem 1rem;
  }
}
</style>