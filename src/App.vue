<script setup lang="ts">
import { onMounted, ref, computed, defineAsyncComponent } from 'vue';
import { useSessionStore } from './stores/session';

import { useThemeStore } from './stores/theme';
import { useLayoutStore } from './stores/layout';
import { storeToRefs } from 'pinia';

import type { InitialData } from './types';
import Dashboard from './components/views/DashboardView.vue';
import Login from './components/views/LoginView.vue';
import Sidebar from './components/layout/AppSidebar.vue';
import Toast from './components/common/Toast.vue';
import Footer from './components/layout/AppFooter.vue';

const SettingsModal = defineAsyncComponent(() => import('./components/modals/SettingsModal.vue'));
const HelpModal = defineAsyncComponent(() => import('./components/modals/HelpModal.vue'));

const sessionStore = useSessionStore();
const { sessionState, initialData } = storeToRefs(sessionStore);
const { checkSession, login, logout } = sessionStore;

// 更新initialData的方法，供Dashboard组件调用
const updateInitialData = (newData: Partial<InitialData>) => {
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


const themeStore = useThemeStore();
const layoutStore = useLayoutStore();

// 标签页状态管理
const activeTab = ref('dashboard');

// 模态框状态
const showSettingsModal = ref(false);
const showHelpModal = ref(false);

const openSettings = () => {
  showSettingsModal.value = true;
};

const openHelp = () => {
  showHelpModal.value = true;
};

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

const tabInfo = computed(() => {
  const tabs = {
    dashboard: {
      title: '仪表盘',
      description: '概览您的订阅和节点状态',
      icon: 'dashboard'
    },
    subscriptions: {
      title: '订阅管理',
      description: '管理您的所有机场订阅链接',
      icon: 'subscription'
    },
    profiles: {
      title: '订阅组',
      description: '创建和管理订阅组合',
      icon: 'profile'
    },
    generator: {
      title: '链接生成',
      description: '生成适用于不同客户端的订阅链接',
      icon: 'link'
    },
    nodes: {
      title: '手动节点',
      description: '添加和管理单个节点链接',
      icon: 'node'
    }
  };
  return tabs[activeTab.value as keyof typeof tabs] || tabs.dashboard;
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
  <div class="app-container">
    <!-- Login Page -->
    <div v-if="sessionState !== 'loggedIn'" class="login-page">
      <!-- Loading State -->
      <div v-if="sessionState === 'loading'" class="loading-container">
        <div class="loading-spinner-wrapper">
          <div class="loading-spinner-outer"></div>
          <div class="loading-spinner-inner"></div>
        </div>
        <p class="loading-text">正在加载...</p>
      </div>

      <!-- Login Form -->
      <div v-else class="login-form-container">
        <Login :login="login" />
      </div>
    </div>

    <!-- Dashboard -->
    <div v-else class="dashboard-container">
      <!-- Sidebar -->
      <Sidebar v-model="activeTab" :subscriptions-count="subscriptionsCount" :profiles-count="profilesCount"
        :manual-nodes-count="manualNodesCount" :generator-count="generatorCount"
        :is-logged-in="sessionState === 'loggedIn'" @logout="logout" @settings="openSettings" @help="openHelp" />

      <!-- Main Content -->
      <main class="main-content" :class="{ 'main-content-full': layoutStore.sidebarCollapsed }">
        <!-- Content Wrapper -->
        <div class="content-wrapper">
          <!-- Page Header -->
          <header class="page-header">
            <div class="header-content">
              <div class="header-text">
                <h1 class="page-title">
                  {{ tabInfo.title }}
                </h1>
                <p class="page-description">
                  {{ tabInfo.description }}
                </p>
              </div>

              <!-- Quick Actions Section -->
              <!-- Removed unused refresh button -->
            </div>


          </header>

          <!-- Dashboard Content -->
          <div class="dashboard-content">
            <Dashboard :data="initialData" :active-tab="activeTab" @update-data="updateInitialData" />
          </div>

          <!-- Footer -->
          <Footer class="dashboard-footer" />
        </div>
      </main>
    </div>

    <!-- Global Toast -->
    <Toast />

    <!-- Settings Modal -->
    <SettingsModal v-if="showSettingsModal" v-model:show="showSettingsModal" />

    <!-- Help Modal -->
    <HelpModal v-if="showHelpModal" v-model:show="showHelpModal" />
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  position: relative;
}

/* ==================== Login Page ==================== */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  animation: fadeIn 0.3s ease;
}

.loading-spinner-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
}

.loading-spinner-outer,
.loading-spinner-inner {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
  animation: spin 1s linear infinite;
}

.loading-spinner-outer {
  border-top-color: hsl(243, 75%, 59%);
  border-right-color: hsl(280, 72%, 54%);
}

.loading-spinner-inner {
  border-bottom-color: hsl(189, 94%, 43%);
  border-left-color: hsl(142, 71%, 45%);
  animation-duration: 0.75s;
  animation-direction: reverse;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 1rem;
  font-weight: 600;
  color: hsl(243, 47%, 40%);
  animation: pulse 2s ease-in-out infinite;
}

html.dark .loading-text {
  color: hsl(243, 87%, 70%);
}

.login-form-container {
  width: 100%;
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ==================== Dashboard ==================== */
.dashboard-container {
  min-height: 100vh;
  display: flex;
}

.main-content {
  flex: 1;
  margin-left: 280px;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content-full {
  margin-left: 80px;
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
}

/* ==================== Page Header ==================== */
.page-header {
  margin-bottom: 2rem;
  animation: fadeInDown 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, hsl(243, 75%, 59%) 0%, hsl(280, 72%, 54%) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
}

.page-description {
  font-size: 0.875rem;
  color: hsl(243, 20%, 50%);
  font-weight: 500;
}

html.dark .page-description {
  color: hsl(243, 30%, 70%);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  color: hsl(243, 47%, 40%);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.quick-action-btn:hover {
  background: white;
  border-color: rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

html.dark .quick-action-btn {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(255, 255, 255, 0.08);
  color: hsl(243, 87%, 70%);
}

html.dark .quick-action-btn:hover {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(255, 255, 255, 0.12);
}

.header-progress {
  width: 100%;
}

/* ==================== Dashboard Content ==================== */
.dashboard-content {
  flex: 1;
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s backwards;
}

.dashboard-footer {
  margin-top: auto;
  padding-top: 2rem;
}

/* ==================== Responsive Design ==================== */
/* 平板和小型桌面 (≤1024px) */
@media (max-width: 1024px) {
  .main-content {
    margin-left: 0;
  }

  .main-content-full {
    margin-left: 0;
  }

  .content-wrapper {
    padding: 1rem;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .page-description {
    font-size: 0.8125rem;
  }
}

/* 针对小屏手机进一步优化 (≤640px) */
@media (max-width: 640px) {
  .content-wrapper {
    padding: 0.75rem;
  }

  .page-header {
    margin-bottom: 1rem;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .page-description {
    font-size: 0.75rem;
  }

  .dashboard-footer {
    padding-top: 1.5rem;
  }
}
</style>
