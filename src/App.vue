<script setup>
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useSessionStore, useToastStore, useThemeStore } from './stores';

import Dashboard from './components/Dashboard.vue';
import Login from './components/Login.vue';
import Header from './components/Header.vue';
import NavigationTabs from './components/NavigationTabs.vue';
import Toast from './components/Toast.vue';
import Footer from './components/Footer.vue';

// Store 初始化
const sessionStore = useSessionStore();
const { sessionState, initialData } = storeToRefs(sessionStore);
const { checkSession, login, logout } = sessionStore;

const toastStore = useToastStore();
const { toast: toastState } = storeToRefs(toastStore);

const themeStore = useThemeStore();

// 状态管理
const activeTab = ref('subscriptions');

// 生命周期
onMounted(() => {
  themeStore.initTheme();
  checkSession();
});
</script>

<template>
  <div class="min-h-screen flex flex-col text-gray-800 transition-all duration-500">


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
        <div class="loading-spinner-enhanced mx-auto mb-6 w-16 h-16"></div>
        <p class="text-white font-medium text-lg">正在加载...</p>
      </div>
      
      <!-- 主要内容区域 -->
      <div v-else-if="sessionState === 'loggedIn' && initialData" class="w-full max-w-screen-2xl mx-auto">
        <div class="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          <!-- 导航标签页 -->
          <NavigationTabs 
            v-model="activeTab"
            :subscriptions-count="initialData?.subs?.filter(item => item.url && /^https?:\/\//.test(item.url))?.length || 0"
            :profiles-count="initialData?.profiles?.length || 0"
            :manual-nodes-count="initialData?.subs?.filter(item => !item.url || !/^https?:\/\//.test(item.url))?.length || 0"
            :generator-count="1"
          />
          
          <!-- 内容区域 -->
          <Dashboard :data="initialData" :active-tab="activeTab" />
        </div>
      </div>
      
      <!-- 登录页面 -->
      <div v-else class="w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <Login :login="login" />
      </div>
    </main>
    
    <!-- Toast组件 -->
    <Toast :show="toastState.id" :message="toastState.message" :type="toastState.type" />
    
    <!-- Footer -->
    <Footer />
  </div>
</template>