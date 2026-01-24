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
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';

import { storeToRefs } from 'pinia';

import Footer from './components/layout/AppFooter.vue';
import Sidebar from './components/layout/AppSidebar.vue';
import Toast from './components/ui/Toast.vue';
// 类型定义
// import type { InitialData } from './types/index';

// 同步加载的核心组件（立即显示）
import Dashboard from './pages/DashboardPage.vue';
import Login from './pages/LoginPage.vue';
import { useDataStore } from './stores/data';
import { useLayoutStore } from './stores/layout';
// Pinia 状态管理
import { useSessionStore } from './stores/session';
import { useThemeStore } from './stores/theme';
import { useUIStore } from './stores/ui';

// 异步加载的模态框组件（按需加载，优化首屏性能）
const SettingsModal = defineAsyncComponent(() => import('./features/settings/SettingsModal.vue'));
const HelpModal = defineAsyncComponent(() => import('./features/settings/HelpModal.vue'));

// ==================== 会话状态管理 ====================

/**
 * 会话 Store
 * 管理用户登录状态和初始数据
 */
const sessionStore = useSessionStore();
const dataStore = useDataStore();
const { isInitialized, subscriptions, manualNodes, profiles } = storeToRefs(dataStore);

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
    if (isInitialized.value) return subscriptions.value.length;
    return (
        initialData.value?.subs?.filter((item) => item.url && HTTP_REGEX.test(item.url))?.length ||
        0
    );
});

/**
 * 订阅组数量
 * 统计订阅组列表的长度
 */
const profilesCount = computed(() => {
    if (isInitialized.value) return profiles.value.length;
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
    if (isInitialized.value) return manualNodes.value.length;
    return (
        initialData.value?.subs?.filter((item) => !item.url || !HTTP_REGEX.test(item.url))
            ?.length || 0
    );
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
                :is-logged-in="sessionState === 'loggedIn'"
                @logout="logout"
                @settings="openSettings"
                @help="openHelp"
            />

            <!-- 主内容区域 -->
            <!-- 根据侧边栏折叠状态应用不同的类名 -->
            <main
                class="main-content"
                :class="{ 'main-content-full': layoutStore.sidebarCollapsed }"
            >
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
                        <Dashboard v-model:active-tab="activeTab" :data="initialData" />
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
