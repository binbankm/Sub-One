<script setup>
import { onMounted, ref, computed } from 'vue';
import { useSessionStore } from './stores/session.js';
import { useToastStore } from './stores/toast.js';
import { useThemeStore } from './stores/theme.js';
import { useLayoutStore } from './stores/layout.js';
import { storeToRefs } from 'pinia';

import Dashboard from './components/Dashboard.vue';
import Login from './components/Login.vue';
import Sidebar from './components/layout/Sidebar.vue';
import Toast from './components/Toast.vue';
import Footer from './components/layout/Footer.vue';
import Breadcrumb from './components/layout/Breadcrumb.vue';

const sessionStore = useSessionStore();
const { sessionState, initialData } = storeToRefs(sessionStore);
const { checkSession, login, logout } = sessionStore;

// 更新initialData的方法，供Dashboard组件调用
const updateInitialData = (newData) => {
  if (!initialData.value) {
    initialData.value = {};
  }
  
  if (newData.subs) {
    initialData.value.subs = newData.subs;
  }
  if (newData.profiles) {
    initialData.value.profiles = newData.profiles;
  }
  if (newData.config) {
    initialData.value.config = { ...initialData.value.config, ...newData.config };
  }
};

const toastStore = useToastStore();
const themeStore = useThemeStore();
const layoutStore = useLayoutStore();

// 标签页状态管理
const activeTab = ref('subscriptions');

// 优化：预编译正则表达式，提升性能
const HTTP_REGEX = /^https?:\/\//;

// 优化：使用计算属性缓存计数结果，避免重复计算
const subscriptionsCount = computed(() => {
  return initialData.value?.subs?.filter(item => item.url && HTTP_REGEX.test(item.url))?.length || 0;
});

const profilesCount = computed(() => {
  return initialData.value?.profiles?.length || 0;
});

const manualNodesCount = computed(() => {
  return initialData.value?.subs?.filter(item => !item.url || !HTTP_REGEX.test(item.url))?.length || 0;
});

const generatorCount = computed(() => {
  return initialData.value?.profiles?.length || 0;
});

onMounted(() => {
  // 初始化主题
  themeStore.initTheme();
  
  // 初始化布局
  layoutStore.init();
  
  // 检查会话
  checkSession();
});
</script>

<template>
  <div class="min-h-screen transition-colors duration-300">
    <!-- 背景装饰元素 -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 blur-[120px] dark:bg-purple-900/20"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[120px] dark:bg-blue-900/20"></div>
    </div>

    <!-- 侧边栏 (仅在登录后显示) -->
    <Sidebar 
      v-if="sessionState === 'loggedIn'"
      v-model="activeTab"
      :subscriptions-count="subscriptionsCount"
      :profiles-count="profilesCount"
      :manual-nodes-count="manualNodesCount"
      :generator-count="generatorCount"
      :is-logged-in="sessionState === 'loggedIn'"
      @logout="logout"
    />

    <!-- 主内容区域 -->
    <main 
      class="relative z-10 min-h-screen transition-all duration-300 flex flex-col"
      :class="{ [layoutStore.mainPaddingLeft]: sessionState === 'loggedIn' }"
    >
      <!-- 登录前的内容居中显示 -->
      <div v-if="sessionState !== 'loggedIn'" class="flex-grow flex items-center justify-center p-4">
        
        <!-- 加载状态 -->
        <div v-if="sessionState === 'loading'" class="flex flex-col items-center">
          <div class="relative w-16 h-16 mb-6">
            <div class="absolute inset-0 border-4 border-indigo-200/30 rounded-full"></div>
            <div class="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p class="text-gray-500 dark:text-gray-400 font-medium animate-pulse">正在加载...</p>
        </div>

        <!-- 登录表单 -->
        <div v-else class="w-full max-w-md animate-fade-in-up">
          <div class="text-center mb-10">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Sub-One Manager</h1>
            <p class="text-gray-500 dark:text-gray-400">请登录以管理您的订阅</p>
          </div>
          <Login :login="login" />
        </div>
      </div>

      <!-- 登录后的内容区域 -->
      <div v-else class="flex-grow p-6 lg:p-10">
        <div class="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
          <!-- 顶部标题栏 (可选，用于显示当前页面标题) -->
          <header class="flex items-center justify-between mb-8">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ 
                  activeTab === 'subscriptions' ? '订阅管理' :
                  activeTab === 'profiles' ? '订阅组' :
                  activeTab === 'generator' ? '链接生成' : '手动节点'
                }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ 
                  activeTab === 'subscriptions' ? '管理您的所有机场订阅链接' :
                  activeTab === 'profiles' ? '创建和管理订阅组合' :
                  activeTab === 'generator' ? '生成适用于不同客户端的订阅链接' : '添加和管理单个节点链接'
                }}
              </p>
            </div>
          </header>

          <!-- 面包屑导航 -->
          <Breadcrumb :current-page="activeTab" />

          <!-- 内容组件 -->
          <Dashboard :data="initialData" :active-tab="activeTab" @update-data="updateInitialData" />
        </div>
      </div>

      <!-- Footer -->
      <Footer v-if="sessionState === 'loggedIn'" class="mt-auto" />
    </main>

    <!-- 全局 Toast -->
    <Toast />
  </div>
</template>

<style>
/* 动画效果 */
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
</style>