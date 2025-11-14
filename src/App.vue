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

// 使用storeToRefs批量解构，减少样板代码
const sessionStore = useSessionStore();
const themeStore = useThemeStore();
const toastStore = useToastStore();

const { sessionState, initialData } = storeToRefs(sessionStore);
const { checkSession, logout } = sessionStore;
const { toast: toastState } = storeToRefs(toastStore);

// 标签页状态管理
const activeTab = ref('subscriptions');

// 初始化函数，整合主题和会话检查
const initializeApp = async () => {
  try {
    // 并行初始化以提高启动速度
    await Promise.all([
      themeStore.initTheme(),
      checkSession()
    ]);
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
};

onMounted(() => {
  initializeApp();
});
</script>

<template>
  <div 
    class="min-h-screen flex flex-col text-gray-800 transition-all duration-500"
  >
    <!-- 背景装饰元素 -->
    <div class="fixed inset-0 -z-10 overflow-hidden opacity-80">
      <!-- 背景装饰使用CSS Grid优化，减少DOM元素 -->
      <div class="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-4 opacity-30 pointer-events-none">
        <div class="rounded-full bg-indigo-200 dark:bg-indigo-900/30 w-96 h-96 -top-20 -left-20 animate-float"></div>
        <div class="rounded-full bg-purple-200 dark:bg-purple-900/30 w-64 h-64 justify-self-end -right-20 -top-20 animate-float" style="animation-delay: 0.5s;"></div>
        <div class="rounded-full bg-blue-200 dark:bg-blue-900/30 w-80 h-80 -bottom-20 -left-20 animate-float" style="animation-delay: 1s;"></div>
        <div class="rounded-full bg-pink-200 dark:bg-pink-900/30 w-72 h-72 justify-self-end -right-20 -bottom-20 animate-float" style="animation-delay: 1.5s;"></div>
      </div>
      
      <!-- 光效装饰 -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-400/20 dark:bg-blue-500/10 blur-[100px]"></div>
        <div class="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-400/20 dark:bg-purple-500/10 blur-[100px]"></div>
        <div class="absolute top-1/2 right-1/3 w-72 h-72 rounded-full bg-pink-400/20 dark:bg-pink-500/10 blur-[100px]"></div>
      </div>
    </div>

    <Header 
      :is-logged-in="sessionState === 'loggedIn'" 
      @logout="logout"
    />

    <!-- 主内容区域 -->
    <main 
      class="flex-grow relative z-10"
      :class="{ 
        'flex items-center justify-center min-h-[calc(100vh-5rem)]': sessionState !== 'loggedIn',
        'overflow-y-auto': sessionState === 'loggedIn' 
      }"
    >
      <!-- 加载状态 -->
      <div v-if="sessionState === 'loading'" class="flex flex-col items-center justify-center min-h-[60vh]">
        <div class="relative">
          <div class="mx-auto mb-6 w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
          <div class="absolute inset-0 rounded-full border-4 border-indigo-200 animate-ping"></div>
        </div>
        <p class="text-white font-medium text-lg animate-fade-in-up drop-shadow-lg">正在加载...</p>
        <p class="text-sm text-white/80 mt-2 animate-fade-in-up drop-shadow-lg" style="animation-delay: 0.2s;">请稍候，正在初始化应用</p>
      </div>
      
      <!-- 已登录状态 -->
      <div v-else-if="sessionState === 'loggedIn' && initialData" class="w-full max-w-screen-2xl mx-auto animate-fade-in-up">
        <div class="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          <!-- 导航标签页 -->
          <NavigationTabs 
            v-model="activeTab"
            :subscriptions-count="initialData?.subs?.filter(item => item.url && /^https?:\/\//.test(item.url))?.length || 0"
            :profiles-count="initialData?.profiles?.length || 0"
            :manual-nodes-count="initialData?.subs?.filter(item => !item.url || !/^https?:\/\//.test(item.url))?.length || 0"
            :generator-count="1"
          />
          
          <!-- 内容区域 - 简化逻辑，直接传递activeTab -->
          <Dashboard :data="initialData" :active-tab="activeTab" />
        </div>
      </div>
      
      <!-- 登录页面 -->
      <div v-else class="w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-fade-in-up">
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
/* 优化动画效果，使用Tailwind内置动画类代替自定义类 */
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

/* 增强淡入动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out;
}
</style>