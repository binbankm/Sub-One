<!--
  ==================== Sub-One Manager - 根应用组件 ====================
  
  功能说明：
  - 应用的根组件，控制整体布局和路由
  - 管理登录和仪表盘两种主要状态
  - 协调侧边栏、主题、会话等全局状态
  - 处理标签页切换和模态框显示
  - 提供响应式布局支持
  
  状态管理：
  - sessionState: 会话状态（loading | loggedIn | loggedOut）
  - activeTab: 当前激活的标签页
  - showSettingsModal: 设置模态框显示状态
  - showHelpModal: 帮助模态框显示状态
  
  主要组件：
  - Login: 登录页面
  - Dashboard: 仪表盘主视图
  - Sidebar: 侧边导航栏
  - Toast: 全局提示组件
  - SettingsModal: 设置模态框（异步加载）
  - HelpModal: 帮助模态框（异步加载）
  
  =====================================================================
-->

<script setup lang="ts">
// ==================== 导入依赖 ====================

// Vue 核心功能
import { onMounted, ref, computed, defineAsyncComponent } from 'vue';

// Pinia 状态管理
import { useSessionStore } from './stores/session';
import { useThemeStore } from './stores/theme';
import { useLayoutStore } from './stores/layout';
import { useUIStore } from './stores/ui';
import { storeToRefs } from 'pinia';

// 类型定义
import type { InitialData } from './types';

// 同步加载的核心组件（立即显示）
import Dashboard from './components/views/DashboardView.vue';
import Login from './components/views/LoginView.vue';
import Sidebar from './components/layout/AppSidebar.vue';
import Toast from './components/common/Toast.vue';
import Footer from './components/layout/AppFooter.vue';

// 异步加载的模态框组件（按需加载，优化首屏性能）
const SettingsModal = defineAsyncComponent(() => import('./components/modals/SettingsModal.vue'));
const HelpModal = defineAsyncComponent(() => import('./components/modals/HelpModal.vue'));

// ==================== 会话状态管理 ====================

/**
 * 会话 Store
 * 管理用户登录状态和初始数据
 */
const sessionStore = useSessionStore();

/**
 * 从 Store 中提取响应式状态
 * - sessionState: 会话状态（loading | loggedIn | loggedOut）
 * - initialData: 初始数据（订阅、订阅组、配置）
 */
const { sessionState, initialData } = storeToRefs(sessionStore);

/**
 * 从 Store 中提取方法
 * - checkSession: 检查会话有效性
 * - login: 用户登录
 * - logout: 用户登出
 * - initializeSystem: 初始化系统
 */
const { checkSession, login, logout, initializeSystem } = sessionStore;

/**
 * 更新初始数据的方法
 * 
 * 说明：
 * - 供 Dashboard 组件调用
 * - 当数据发生变化时更新全局状态
 * - 支持部分更新（只更新传入的字段）
 * 
 * @param {Partial<InitialData>} newData - 新的数据（部分更新）
 */
const updateInitialData = (newData: Partial<InitialData>) => {
  // 确保 initialData 已初始化
  if (!initialData.value) {
    initialData.value = {};
  }

  // 更新订阅列表
  if (newData.subs) {
    initialData.value.subs = newData.subs;
  }
  
  // 更新订阅组列表
  if (newData.profiles) {
    initialData.value.profiles = newData.profiles;
  }
  
  // 更新配置（合并而不是替换）
  if (newData.config) {
    initialData.value.config = { ...initialData.value.config, ...newData.config };
  }
};

// ==================== 主题和布局管理 ====================

/** 主题 Store - 管理明亮/暗黑主题 */
const themeStore = useThemeStore();

/** 布局 Store - 管理侧边栏展开/折叠 */
const layoutStore = useLayoutStore();

// ==================== 标签页状态管理 ====================

/**
 * 当前激活的标签页
 * 可选值：dashboard | subscriptions | profiles | generator | nodes
 */
const activeTab = ref('dashboard');

// ==================== UI 状态管理 ====================

/** UI Store - 管理全局 UI 组件状态 */
const uiStore = useUIStore();

// ==================== 模态框状态管理 ====================

/** 帮助模态框显示状态 */
const showHelpModal = ref(false);

/**
 * 打开设置模态框
 * 使用 uiStore 统一管理状态
 */
const openSettings = () => {
  uiStore.show();
};

/**
 * 打开帮助模态框
 */
const openHelp = () => {
  showHelpModal.value = true;
};

// ==================== 性能优化 ====================

/**
 * HTTP/HTTPS 协议正则表达式
 * 预编译正则表达式以提升性能
 * 用于区分订阅链接和手动节点
 */
const HTTP_REGEX = /^https?:\/\//;

// ==================== 计算属性（统计数据）====================

/**
 * 订阅数量
 * 
 * 说明：
 * - 统计所有 HTTP/HTTPS 开头的项目
 * - 这些是有效的订阅链接
 * - 使用计算属性缓存结果，避免重复计算
 */
const subscriptionsCount = computed(() => {
  return initialData.value?.subs?.filter(item => item.url && HTTP_REGEX.test(item.url))?.length || 0;
});

/**
 * 订阅组数量
 * 统计订阅组列表的长度
 */
const profilesCount = computed(() => {
  return initialData.value?.profiles?.length || 0;
});

/**
 * 手动节点数量
 * 
 * 说明：
 * - 统计所有非 HTTP/HTTPS 开头的项目
 * - 这些是手动添加的节点链接
 */
const manualNodesCount = computed(() => {
  return initialData.value?.subs?.filter(item => !item.url || !HTTP_REGEX.test(item.url))?.length || 0;
});

/**
 * 生成器数量
 * 与订阅组数量相同（每个订阅组可以生成一个链接）
 */
const generatorCount = computed(() => {
  return initialData.value?.profiles?.length || 0;
});

// ==================== 标签页信息配置 ====================

/**
 * 标签页信息
 * 
 * 说明：
 * - 根据当前激活的标签页返回对应的信息
 * - 包括标题、描述和图标
 * - 用于页面头部显示
 */
const tabInfo = computed(() => {
  /** 标签页配置对象 */
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
  
  // 返回当前标签页的信息，如果未找到则返回 dashboard
  return tabs[activeTab.value as keyof typeof tabs] || tabs.dashboard;
});

// ==================== 生命周期钩子 ====================

/**
 * 组件挂载时执行
 * 
 * 执行顺序：
 * 1. 初始化主题（从 localStorage 读取用户偏好）
 * 2. 初始化布局（从 localStorage 读取侧边栏状态）
 * 3. 检查会话（验证用户登录状态）
 */
onMounted(() => {
  // 初始化主题（应用保存的明亮/暗黑模式）
  themeStore.initTheme();

  // 初始化布局（应用保存的侧边栏折叠状态）
  layoutStore.init();

  // 检查会话（如果已登录则自动获取数据）
  checkSession();
});
</script>

<template>
  <!-- 应用主容器 -->
  <div class="app-container">
    
    <!-- ==================== 登录页面 ==================== -->
    <!-- 当用户未登录时显示 -->
    <div v-if="sessionState !== 'loggedIn'" class="login-page">
      
      <!-- 加载状态 - 正在检查会话 -->
      <div v-if="sessionState === 'loading'" class="loading-container">
        <!-- 双层旋转加载动画 -->
        <div class="loading-spinner-wrapper">
          <!-- 外层加载圈（顺时针旋转） -->
          <div class="loading-spinner-outer"></div>
          <!-- 内层加载圈（逆时针旋转） -->
          <div class="loading-spinner-inner"></div>
        </div>
        <!-- 加载提示文本 -->
        <p class="loading-text">正在加载...</p>
      </div>

      <!-- 系统初始化 - 首次使用时显示 -->
      <div v-else-if="sessionState === 'needsSetup'" class="login-form-container">
        <!-- Login 组件也用于初始化 - 传入 initializeSystem 方法和 isSetup 标志 -->
        <Login :login="initializeSystem" :is-setup="true" />
      </div>

      <!-- 登录表单 - 会话检查完成后显示 -->
      <div v-else class="login-form-container">
        <!-- Login 组件 - 传入 login 方法 -->
        <Login :login="login" />
      </div>
    </div>

    <!-- ==================== 仪表盘主界面 ==================== -->
    <!-- 用户已登录时显示 -->
    <div v-else class="dashboard-container">
      
      <!-- 侧边导航栏 -->
      <Sidebar 
        v-model="activeTab" 
        :subscriptions-count="subscriptionsCount" 
        :profiles-count="profilesCount"
        :manual-nodes-count="manualNodesCount" 
        :generator-count="generatorCount"
        :is-logged-in="sessionState === 'loggedIn'" 
        @logout="logout" 
        @settings="openSettings" 
        @help="openHelp" 
      />

      <!-- 主内容区域 -->
      <!-- 根据侧边栏折叠状态应用不同的类名 -->
      <main class="main-content" :class="{ 'main-content-full': layoutStore.sidebarCollapsed }">
        
        <!-- 内容包装器 - 限制最大宽度并居中 -->
        <div class="content-wrapper">
          
          <!-- 页面头部 - 显示当前页面标题和描述 -->
          <header class="page-header">
            <div class="header-content">
              <!-- 头部文字区域 -->
              <div class="header-text">
                <!-- 页面标题 - 渐变色文字效果 -->
                <h1 class="page-title">
                  {{ tabInfo.title }}
                </h1>
                <!-- 页面描述 -->
                <p class="page-description">
                  {{ tabInfo.description }}
                </p>
              </div>

              <!-- 快速操作区域 -->
              <!-- 已移除未使用的刷新按钮 -->
            </div>
          </header>

          <!-- 仪表盘内容区域 -->
          <div class="dashboard-content">
            <!-- Dashboard 组件 - 根据 activeTab 显示不同内容 -->
            <Dashboard 
              :data="initialData" 
              :active-tab="activeTab" 
              @update-data="updateInitialData" 
            />
          </div>

          <!-- 页脚 -->
          <Footer class="dashboard-footer" />
        </div>
      </main>
    </div>

    <!-- ==================== 全局组件 ==================== -->
    
    <!-- 全局 Toast 提示组件 -->
    <Toast />

    <!-- 设置模态框 - 按需显示（异步加载，使用 uiStore 管理状态） -->
    <SettingsModal v-model:show="uiStore.isSettingsModalVisible" />

    <!-- 帮助模态框 - 按需显示（异步加载） -->
    <HelpModal v-if="showHelpModal" v-model:show="showHelpModal" />
  </div>
</template>

<style scoped>
/* ==================== 应用容器 ==================== */
.app-container {
  min-height: 100vh; /* 最小高度占满视口 */
  position: relative;
}

/* ==================== 登录页面样式 ==================== */

/* 登录页面容器 - 居中显示 */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center; /* 垂直居中 */
  justify-content: center; /* 水平居中 */
  padding: 1.5rem;
}

/* 加载状态容器 - 垂直排列加载动画和文字 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  animation: fadeIn 0.3s ease; /* 淡入动画 */
}

/* 加载动画包装器 - 固定尺寸容器 */
.loading-spinner-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
}

/* 加载圈公共样式 - 双层旋转动画 */
.loading-spinner-outer,
.loading-spinner-inner {
  position: absolute;
  inset: 0; /* 填充整个父容器 */
  border-radius: 50%; /* 圆形 */
  border: 3px solid transparent; /* 透明边框 */
  animation: spin 1s linear infinite; /* 无限旋转 */
}

/* 外层加载圈 - 顶部和右侧有颜色 */
.loading-spinner-outer {
  border-top-color: hsl(243, 75%, 59%); /* 蓝紫色 */
  border-right-color: hsl(280, 72%, 54%); /* 紫色 */
}

/* 内层加载圈 - 底部和左侧有颜色，反向旋转 */
.loading-spinner-inner {
  border-bottom-color: hsl(189, 94%, 43%); /* 青色 */
  border-left-color: hsl(142, 71%, 45%); /* 绿色 */
  animation-duration: 0.75s; /* 旋转更快 */
  animation-direction: reverse; /* 反向旋转 */
}



/* 加载文字 - 带脉冲动画 */
.loading-text {
  font-size: 1rem;
  font-weight: 600;
  color: hsl(243, 47%, 40%);
  animation: pulse 2s ease-in-out infinite; /* 脉冲动画 */
}

/* 暗黑模式下的加载文字颜色 */
html.dark .loading-text {
  color: hsl(243, 87%, 70%);
}

/* 登录表单容器 - 淡入上移动画 */
.login-form-container {
  width: 100%;
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ==================== 仪表盘样式 ==================== */

/* 仪表盘容器 - 侧边栏和主内容并排 */
.dashboard-container {
  min-height: 100vh;
  display: flex;
}

/* 主内容区域 - 为侧边栏留出空间 */
.main-content {
  flex: 1; /* 占据剩余空间 */
  margin-left: 280px; /* 侧边栏宽度 */
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* 平滑过渡 */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 侧边栏折叠时的主内容区域 */
.main-content-full {
  margin-left: 80px; /* 折叠后的侧边栏宽度 */
}

/* 内容包装器 - 限制最大宽度并居中 */
.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  max-width: 1600px; /* 最大宽度限制 */
  width: 100%;
  margin: 0 auto; /* 居中 */
}

/* ==================== 页面头部样式 ==================== */

/* 页面头部 - 淡入下移动画 */
.page-header {
  margin-bottom: 2rem;
  animation: fadeInDown 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 头部内容 - 标题和操作按钮并排 */
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

/* 头部文字区域 - 占据剩余空间 */
.header-text {
  flex: 1;
  min-width: 0; /* 允许文字截断 */
}

/* 页面标题 - 渐变色文字效果 */
.page-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em; /* 字距收紧 */
  /* 渐变色背景 */
  background: linear-gradient(135deg, hsl(243, 75%, 59%) 0%, hsl(280, 72%, 54%) 100%);
  -webkit-background-clip: text; /* WebKit 浏览器背景裁剪 */
  background-clip: text;
  -webkit-text-fill-color: transparent; /* 文字透明显示背景 */
  margin-bottom: 0.5rem;
}

/* 页面描述 */
.page-description {
  font-size: 0.875rem;
  color: hsl(243, 20%, 50%);
  font-weight: 500;
}

/* 暗黑模式下的页面描述颜色 */
html.dark .page-description {
  color: hsl(243, 30%, 70%);
}

/* 头部操作按钮区域 */
.header-actions {
  display: flex;
  gap: 0.75rem;
}

/* 快速操作按钮 - 毛玻璃效果 */
.quick-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.8); /* 半透明白色 */
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  color: hsl(243, 47%, 40%);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(16px); /* 毛玻璃效果 */
  -webkit-backdrop-filter: blur(16px);
}

/* 快速操作按钮悬停效果 */
.quick-action-btn:hover {
  background: white; /* 不透明白色 */
  border-color: rgba(0, 0, 0, 0.12);
  transform: translateY(-2px); /* 上移 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* 阴影 */
}

/* 暗黑模式下的快速操作按钮 */
html.dark .quick-action-btn {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(255, 255, 255, 0.08);
  color: hsl(243, 87%, 70%);
}

/* 暗黑模式下的按钮悬停效果 */
html.dark .quick-action-btn:hover {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(255, 255, 255, 0.12);
}

/* 头部进度条区域 */
.header-progress {
  width: 100%;
}

/* ==================== 仪表盘内容样式 ==================== */

/* 仪表盘内容 - 淡入上移动画（延迟执行） */
.dashboard-content {
  flex: 1;
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s backwards;
}

/* 仪表盘页脚 */
.dashboard-footer {
  margin-top: auto; /* 推到底部 */
  padding-top: 2rem;
}

/* ==================== 响应式设计 ==================== */

/* 平板和小型桌面 (≤1024px) */
@media (max-width: 1024px) {
  /* 移除主内容左边距（侧边栏变为覆盖层） */
  .main-content {
    margin-left: 0;
  }

  .main-content-full {
    margin-left: 0;
  }

  /* 减小内边距 */
  .content-wrapper {
    padding: 1rem;
  }

  /* 减小头部边距 */
  .page-header {
    margin-bottom: 1.5rem;
  }

  /* 缩小标题字号 */
  .page-title {
    font-size: 1.5rem;
  }

  /* 缩小描述字号 */
  .page-description {
    font-size: 0.8125rem;
  }
}

/* 针对小屏手机进一步优化 (≤640px) */
@media (max-width: 640px) {
  /* 进一步减小内边距 */
  .content-wrapper {
    padding: 0.75rem;
  }

  /* 进一步减小头部边距 */
  .page-header {
    margin-bottom: 1rem;
  }

  /* 进一步缩小标题 */
  .page-title {
    font-size: 1.25rem;
  }

  /* 进一步缩小描述 */
  .page-description {
    font-size: 0.75rem;
  }

  /* 减小页脚上边距 */
  .dashboard-footer {
    padding-top: 1.5rem;
  }
}
</style>
