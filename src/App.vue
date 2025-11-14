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

// 更新initialData的方法，供Dashboard组件调用
const updateInitialData = (newData) => {
  // 这里我们通过更新session store中的数据来更新initialData
  // 具体实现可能需要根据session store的实际结构调整
  Object.assign(initialData.value, newData);
};

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
    class="min-h-screen flex flex-col text-gray-800 transition-all duration-500"
  >
    <!-- 背景装饰元素 - 美化升级版 -->
    <div class="background-decoration">
      <div class="floating-shape floating-shape-1"></div>
      <div class="floating-shape floating-shape-2"></div>
      <div class="floating-shape floating-shape-3"></div>
      <div class="floating-shape floating-shape-4"></div>
      <div class="floating-shape floating-shape-5"></div>
      <div class="floating-shape floating-shape-6"></div>
    </div>
    

    
    <!-- 光效装饰 -->
    <div class="light-effects">
      <div class="light-orb light-orb-1"></div>
      <div class="light-orb light-orb-2"></div>
      <div class="light-orb light-orb-3"></div>
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
        <p class="text-white font-medium text-lg animate-fade-in-up-enhanced drop-shadow-lg">正在加载...</p>
        <p class="text-sm text-white/80 mt-2 animate-fade-in-up-enhanced drop-shadow-lg" style="animation-delay: 0.2s;">请稍候，正在初始化应用</p>
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
            :generator-count="initialData?.profiles?.length || 0"
          />
          
          <!-- 根据标签页显示不同内容 -->
          <div class="space-y-8 lg:space-y-12">
            <!-- 订阅管理标签页 -->
            <div v-if="activeTab === 'subscriptions'" class="space-y-8">
              <Dashboard :data="initialData" :active-tab="activeTab" @update-data="updateInitialData" />
            </div>
            
            <!-- 订阅组标签页 -->
            <div v-else-if="activeTab === 'profiles'" class="space-y-8">
              <Dashboard :data="initialData" :active-tab="activeTab" @update-data="updateInitialData" />
            </div>
            
            <!-- 链接生成标签页 -->
            <div v-else-if="activeTab === 'generator'" class="space-y-8">
              <Dashboard :data="initialData" :active-tab="activeTab" @update-data="updateInitialData" />
            </div>
            
            <!-- 手动节点标签页 -->
            <div v-else-if="activeTab === 'nodes'" class="space-y-8">
              <Dashboard :data="initialData" :active-tab="activeTab" @update-data="updateInitialData" />
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