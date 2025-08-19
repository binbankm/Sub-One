<script setup>
import { onMounted, ref } from 'vue';
import { useSessionStore } from './stores/session.js';
import { useToastStore } from './stores/toast.js';
import { useThemeStore } from './stores/theme.js';
import { storeToRefs } from 'pinia';

import Dashboard from './components/Dashboard.vue';
import Login from './components/Login.vue';
import Header from './components/Header.vue';
import NavigationTabs from './components/NavigationTabs.vue';
import Toast from './components/Toast.vue';
import Footer from './components/Footer.vue';

const sessionStore = useSessionStore();
const { sessionState, initialData } = storeToRefs(sessionStore);
const { checkSession, login, logout } = sessionStore;

const toastStore = useToastStore();
const { toast: toastState } = storeToRefs(toastStore);

const themeStore = useThemeStore();

// 标签页状态管理
const activeTab = ref('subscriptions');

onMounted(() => {
  // 初始化主题
  themeStore.initTheme();
  
  // 检查会话
  checkSession();
});
</script>

<template>
  <div 
    class="min-h-screen flex flex-col text-gray-800 transition-all duration-500 bg-white dark:bg-gray-900"
  >
    <!-- 壁纸背景 -->
    <div 
      v-if="themeStore.wallpaper && themeStore.showWallpaper" 
      class="fixed inset-0 z-0 pointer-events-none wallpaper-container"
    >
      <img 
        :src="themeStore.wallpaper" 
        alt="壁纸背景" 
        class="w-full h-full object-cover wallpaper-image"
        :style="{ opacity: themeStore.wallpaperOpacity }"
      />
      <!-- 半透明遮罩层 - 优化透明度，让壁纸更清晰 -->
      <div 
        class="absolute inset-0 bg-white/40 dark:bg-gray-900/40 wallpaper-overlay"
        :style="{ opacity: Math.max(0.05, 0.6 - themeStore.wallpaperOpacity) }"
      ></div>
    </div>

    <Header 
      :is-logged-in="sessionState === 'loggedIn'" 
      @logout="logout"
    />

    <!-- 主内容区域 - 整合标签页和内容为一体 -->
    <main 
      class="flex-grow relative z-10"
      :class="{ 
        'flex items-center justify-center min-h-[calc(100vh-5rem)]': sessionState !== 'loggedIn',
        'overflow-y-auto': sessionState === 'loggedIn' 
      }"
    >
      <!-- 加载状态优化 -->
      <div v-if="sessionState === 'loading'" class="flex flex-col items-center justify-center min-h-[60vh]">
        <div class="relative">
          <div class="loading-spinner-enhanced mx-auto mb-6 w-16 h-16"></div>
          <div class="absolute inset-0 rounded-full border-4 border-indigo-200 animate-ping"></div>
        </div>
        <p class="text-gray-500 font-medium text-lg animate-fade-in-up-enhanced">正在加载...</p>
        <p class="text-sm text-gray-400 mt-2 animate-fade-in-up-enhanced" style="animation-delay: 0.2s;">请稍候，正在初始化应用</p>
      </div>
      
      <!-- 主要内容区域优化 - 标签页和内容整合为一个整体 -->
      <div v-else-if="sessionState === 'loggedIn' && initialData" class="w-full max-w-screen-2xl mx-auto animate-fade-in-up-enhanced">
        <!-- 整合的标签页和内容区域 -->
        <div class="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          <!-- 导航标签页区域 - 移除sticky定位，与内容区域整合 -->
          <NavigationTabs 
            v-model="activeTab"
            :subscriptions-count="initialData?.subs?.filter(item => item.url && /^https?:\/\//.test(item.url))?.length || 0"
            :profiles-count="initialData?.profiles?.length || 0"
            :manual-nodes-count="initialData?.subs?.filter(item => !item.url || !/^https?:\/\//.test(item.url))?.length || 0"
            :generator-count="1"
          />
          
          <!-- 根据标签页显示不同内容 -->
          <div class="space-y-8 lg:space-y-12">
            <!-- 订阅管理标签页 -->
            <div v-if="activeTab === 'subscriptions'" class="space-y-8">
              <Dashboard :data="initialData" :active-tab="activeTab" />
            </div>
            
            <!-- 订阅组标签页 -->
            <div v-else-if="activeTab === 'profiles'" class="space-y-8">
              <Dashboard :data="initialData" :active-tab="activeTab" />
            </div>
            
            <!-- 链接生成标签页 -->
            <div v-else-if="activeTab === 'generator'" class="space-y-8">
              <Dashboard :data="initialData" :active-tab="activeTab" />
            </div>
            
            <!-- 手动节点标签页 -->
            <div v-else-if="activeTab === 'nodes'" class="space-y-8">
              <Dashboard :data="initialData" :active-tab="activeTab" />
            </div>
          </div>
        </div>
      </div>
      
      <!-- 登录页面优化 -->
      <div v-else class="w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-fade-in-up-enhanced">
        <Login :login="login" />
      </div>
    </main>
    
    <!-- 优化的Toast组件 -->
    <Toast :show="toastState.id" :message="toastState.message" :type="toastState.type" />
    
    <!-- 优化的Footer -->
    <Footer />
  </div>
</template>

<style>
/* 移除背景动画相关样式 */

/* 新增的动画效果 */
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

/* 移除背景渐变动画 */

/* 移动端壁纸显示优化 */
.wallpaper-container {
  /* 防止移动端滚动时的变形 */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  perspective: 1000px;
  -webkit-perspective: 1000px;
}

.wallpaper-image {
  /* 移动端图片显示优化 */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  /* 防止移动端滚动时的缩放 */
  will-change: auto;
  /* 优化移动端图片渲染 */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}

.wallpaper-overlay {
  /* 遮罩层优化 */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* 移动端特定优化 */
@media (max-width: 768px) {
  .wallpaper-container {
    /* 移动端固定定位优化 */
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    /* 防止移动端滚动时的位置偏移 */
    transform: none !important;
    -webkit-transform: none !important;
  }
  
  .wallpaper-image {
    /* 移动端图片尺寸优化 */
    width: 100vw !important;
    height: 100vh !important;
    object-fit: cover !important;
    object-position: center !important;
    /* 防止移动端滚动时的变形 */
    transform: none !important;
    -webkit-transform: none !important;
    /* 优化移动端性能 */
    will-change: auto !important;
  }
  
  .wallpaper-overlay {
    /* 移动端遮罩层优化 */
    width: 100vw !important;
    height: 100vh !important;
    transform: none !important;
    -webkit-transform: none !important;
  }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
  .wallpaper-container {
    /* 确保在超小屏幕上完全覆盖 */
    min-width: 100vw;
    min-height: 100vh;
  }
  
  .wallpaper-image {
    /* 超小屏幕图片优化 */
    min-width: 100vw;
    min-height: 100vh;
  }
}

/* 防止iOS Safari的滚动问题 */
@supports (-webkit-touch-callout: none) {
  .wallpaper-container {
    /* iOS Safari特定优化 */
    position: fixed !important;
    -webkit-overflow-scrolling: touch;
  }
  
  .wallpaper-image {
    /* iOS Safari图片优化 */
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }
}

/* 防止Android Chrome的滚动问题 */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  .wallpaper-container {
    /* Android Chrome特定优化 */
    transform: translate3d(0, 0, 0);
    -webkit-transform: translate3d(0, 0, 0);
  }
}
</style>