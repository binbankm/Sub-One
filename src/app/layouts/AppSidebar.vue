<!--
  ==================== 侧边导航栏组件 ====================
  
  功能说明：
  - 应用的主导航栏
  - 显示 Logo 和导航菜单
  - 支持桌面端和移动端
  - 主题切换功能
  - 侧边栏折叠/展开
  
  Props：
  - modelValue: 当前选中的标签页
  - subscriptionsCount: 订阅数量
  - profilesCount: 订阅组数量
  - manualNodesCount: 手动节点数量
  - generatorCount: 生成器数量
  - isLoggedIn: 登录状态
  
  Events：
  - update:modelValue: 标签页切换
  - logout: 登出
  - help: 帮助
  - settings: 设置
  
  ==================================================
-->

<script setup lang="ts">
// ==================== 导入依赖 ====================
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { useLayoutStore } from '@/stores/useLayoutStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { useI18n } from 'vue-i18n';

// ==================== Props 定义 ====================

const props = withDefaults(
    defineProps<{
        /** 当前选中的标签页 ID */
        modelValue: string;
        /** 订阅数量 */
        subscriptionsCount?: number;
        /** 订阅组数量 */
        profilesCount?: number;
        /** 手动节点数量 */
        manualNodesCount?: number;
    }>(),
    {
        subscriptionsCount: 0,
        profilesCount: 0,
        manualNodesCount: 0
    }
);

// ==================== Emit 事件定义 ====================

const emit = defineEmits<{
    /** 更新选中的标签页 */
    (e: 'update:modelValue', value: string): void;
    /** 登出事件 */
    (e: 'logout'): void;
    /** 帮助事件 */
    (e: 'help'): void;
    /** 设置事件 */
    (e: 'settings'): void;
}>();

// ==================== Store ====================

const themeStore = useThemeStore();
const layoutStore = useLayoutStore();
const { t, locale } = useI18n();

const toggleLanguage = () => {
    const newLocale = locale.value === 'zh' ? 'en' : 'zh';
    locale.value = newLocale;
    localStorage.setItem('locale', newLocale);
};

/** 构建信息 */
const buildId = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : '';
const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';

// ==================== 本地状态 ====================

/** 侧边栏是否折叠（桌面端） */
const isCollapsed = ref(false);

/** 移动端菜单是否打开 */
const isMobileMenuOpen = ref(false);

// ==================== 导航项配置 ====================

/**
 * 导航项接口定义
 */
interface NavigationItem {
    id: string;
    label: string;
    icon: string;
    description: string;
    count?: number;
}

/**
 * 主要导航项
 * 动态显示数量徽章
 */
const navigationItems = computed<NavigationItem[]>(() => [
    {
        id: 'dashboard',
        label: t('layout.sidebar.menu.dashboard'),
        icon: 'dashboard',
        description: t('layout.sidebar.menu.dashboardDesc')
    },
    {
        id: 'subscriptions',
        label: t('layout.sidebar.menu.subscriptions'),
        icon: 'subscription',
        count: props.subscriptionsCount,
        description: t('layout.sidebar.menu.subscriptionsDesc')
    },
    {
        id: 'profiles',
        label: t('layout.sidebar.menu.profiles'),
        icon: 'profile',
        count: props.profilesCount,
        description: t('layout.sidebar.menu.profilesDesc')
    },
    {
        id: 'nodes',
        label: t('layout.sidebar.menu.nodes'),
        icon: 'node',
        count: props.manualNodesCount,
        description: t('layout.sidebar.menu.nodesDesc')
    }
]);

/**
 * 底部功能项（帮助和设置）
 */
const utilityItems = computed(() => [
    {
        id: 'help',
        label: t('layout.sidebar.help'),
        icon: 'help',
        description: t('layout.sidebar.helpDesc')
    },
    {
        id: 'settings',
        label: t('layout.sidebar.settings'),
        icon: 'settings',
        description: t('layout.sidebar.settingsDesc')
    }
]);

// ==================== 事件处理 ====================

/**
 * 选择标签页
 *
 * @param {string} tabId - 标签页 ID
 */
const selectTab = (tabId: string) => {
    // 处理特殊项目（帮助和设置）
    if (tabId === 'help') {
        emit('help');
        if (window.innerWidth <= 1024) {
            isMobileMenuOpen.value = false;
        }
        return;
    }
    if (tabId === 'settings') {
        emit('settings');
        if (window.innerWidth <= 1024) {
            isMobileMenuOpen.value = false;
        }
        return;
    }

    // 普通标签页切换
    emit('update:modelValue', tabId);
    if (window.innerWidth <= 1024) {
        isMobileMenuOpen.value = false;
    }
};

/**
 * 处理登出
 */
const handleLogout = () => {
    emit('logout');
};

/**
 * 切换侧边栏折叠状态（桌面端）
 */
const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value;
    layoutStore.toggleSidebar();
};

/**
 * 切换移动端菜单
 */
const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

/**
 * 关闭移动端菜单
 */
const closeMobileMenu = () => {
    isMobileMenuOpen.value = false;
};

// ==================== 响应式处理 ====================

/**
 * 监听窗口大小变化
 * 在桌面端自动关闭移动菜单
 */
const handleResize = () => {
    if (window.innerWidth > 1024) {
        isMobileMenuOpen.value = false;
    }
};

// ==================== 生命周期 ====================

onMounted(() => {
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
});
</script>

<template>
    <!-- ==================== 移动端遮罩层 ==================== -->
    <Transition name="fade">
        <div
            v-if="isMobileMenuOpen"
            class="fixed inset-0 z-39 bg-black/50 backdrop-blur-sm lg:hidden"
            @click="closeMobileMenu"
        ></div>
    </Transition>

    <!-- ==================== 移动端汉堡菜单按钮 ==================== -->
    <button
        class="fixed top-4 left-4 z-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-element border border-gray-300 bg-white/95 text-gray-800 shadow-elevated backdrop-blur-md transition-colors duration-200 hover:bg-white hover:shadow-card lg:hidden dark:border-white/10 dark:bg-black/80 dark:text-gray-200 dark:hover:bg-black/90"
        :aria-label="isMobileMenuOpen ? t('layout.sidebar.closeMenu') : t('layout.sidebar.openMenu')"
        @click="toggleMobileMenu"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                v-if="!isMobileMenuOpen"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
            />
            <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
            />
        </svg>
    </button>

    <!-- ==================== 侧边栏主容器 ==================== -->
    <aside
        class="fixed top-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden bg-transparent shadow-none backdrop-blur-xl transition-all duration-300 lg:translate-x-0"
        :class="[
            isCollapsed ? 'w-20' : 'w-70',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        ]"
    >
        <!-- ==================== 侧边栏头部 ==================== -->
        <div class="border-b border-black/5 p-4 dark:border-white/5">
            <!-- Logo 区域 -->
            <div class="mb-3 flex items-center gap-3">
                <!-- Logo 图标 -->
                <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-element bg-primary-600 text-white shadow-xs"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2.5"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                </div>

                <!-- Logo 文字（折叠时隐藏） -->
                <transition name="fade">
                    <div v-if="!isCollapsed" class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5">
                            <h1
                                class="text-base font-bold tracking-tight text-gray-900 dark:text-white"
                            >
                                Sub-One
                            </h1>
                            <span
                                v-if="buildId"
                                class="rounded border border-gray-200 bg-gray-50 px-1 py-0.2 font-mono text-[9px] font-medium text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
                                :title="`Build: ${buildTime}`"
                            >
                                #{{ buildId }}
                            </span>
                        </div>
                        <p class="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                            Subscription Hub
                        </p>
                    </div>
                </transition>
            </div>

            <!-- 头部操作区域 - 切换按钮 -->
            <div class="flex justify-center gap-1">
                <!-- 语言切换按钮 -->
                <button
                    class="icon-btn"
                    :title="locale === 'zh' ? t('layout.sidebar.switchToEn') : t('layout.sidebar.switchToZh')"
                    @click="toggleLanguage"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802M10.5 21l5.25-11.25L21 21m-9-3h7.5"
                        />
                    </svg>
                </button>

                <button
                    class="icon-btn"
                    :title="themeStore.theme === 'dark' ? t('layout.sidebar.switchToLight') : t('layout.sidebar.switchToDark')"
                    @click="themeStore.toggleTheme"
                >
                    <!-- 暗黑模式图标（太阳） -->
                    <svg
                        v-if="themeStore.theme === 'dark'"
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                    </svg>

                    <!-- 明亮模式图标（月亮） -->
                    <svg
                        v-else
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                    </svg>
                </button>
            </div>
        </div>

        <!-- ==================== 导航菜单 ==================== -->
        <nav class="flex-1 overflow-x-hidden overflow-y-auto p-4">
            <!-- 主要功能导航 -->
            <div class="mb-8">
                <p
                    v-if="!isCollapsed"
                    class="mb-3 px-3 text-[0.6875rem] font-bold tracking-wider text-gray-600 uppercase dark:text-gray-400"
                >
                    {{ t('layout.sidebar.mainFeatures') }}
                </p>

                <div class="flex flex-col gap-1.5">
                    <!-- 循环渲染导航项 -->
                    <button
                        v-for="item in navigationItems"
                        :key="item.id"
                        class="sidebar-nav-item group"
                        :class="[
                            isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5',
                            modelValue === item.id
                                ? 'bg-primary-500/10 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400 font-medium'
                                : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
                        ]"
                        :title="isCollapsed ? item.label : ''"
                        @click="selectTab(item.id)"
                    >
                        <!-- 图标 -->
                        <div
                            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-element transition-all duration-200"
                            :class="[
                                modelValue === item.id
                                    ? 'bg-primary-600 text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700 dark:bg-white/5 dark:text-gray-400 dark:group-hover:bg-white/10 dark:group-hover:text-gray-200'
                            ]"
                        >
                            <!-- Dashboard 图标 -->
                            <svg
                                v-if="item.icon === 'dashboard'"
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4.5 w-4.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                            </svg>

                            <!-- Subscription 图标 -->
                            <svg
                                v-else-if="item.icon === 'subscription'"
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4.5 w-4.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                            </svg>

                            <!-- Profile 图标 -->
                            <svg
                                v-else-if="item.icon === 'profile'"
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4.5 w-4.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                />
                            </svg>

                            <!-- Node 图标 -->
                            <svg
                                v-else-if="item.icon === 'node'"
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4.5 w-4.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                            </svg>
                        </div>

                        <!-- 标签和数量徽章（折叠时隐藏） -->
                        <transition name="fade">
                            <div
                                v-if="!isCollapsed"
                                class="flex min-w-0 flex-1 items-center justify-between gap-2"
                            >
                                <span
                                    class="truncate text-sm font-medium transition-colors duration-200"
                                    :class="
                                        modelValue === item.id
                                            ? 'text-primary-700 dark:text-primary-300 font-semibold'
                                            : 'text-gray-700 dark:text-gray-300'
                                    "
                                >
                                    {{ item.label }}
                                </span>

                                <!-- 数量徽章（有数量时显示） -->
                                <span
                                    v-if="item.count && item.count > 0"
                                    class="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-semibold transition-all duration-200"
                                    :class="
                                        modelValue === item.id
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                                    "
                                >
                                    {{ item.count }}
                                </span>
                            </div>
                        </transition>
                    </button>
                </div>
            </div>

            <!-- 其他功能区（帮助和设置） -->
            <div class="mb-8">
                <p
                    v-if="!isCollapsed"
                    class="mb-3 px-3 text-[0.6875rem] font-bold tracking-wider text-gray-600 uppercase dark:text-gray-400"
                >
                    {{ t('layout.sidebar.others') }}
                </p>

                <div class="flex flex-col gap-1.5">
                    <!-- 循环渲染功能项 -->
                    <button
                        v-for="item in utilityItems"
                        :key="item.id"
                        class="sidebar-nav-item group"
                        :class="[
                            isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5',
                            modelValue === item.id
                                ? 'bg-primary-500/10 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400 font-medium'
                                : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
                        ]"
                        :title="isCollapsed ? item.label : ''"
                        @click="selectTab(item.id)"
                    >
                        <!-- 图标 -->
                        <div
                            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-element transition-all duration-200"
                            :class="[
                                modelValue === item.id
                                    ? 'bg-primary-600 text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700 dark:bg-white/5 dark:text-gray-400 dark:group-hover:bg-white/10 dark:group-hover:text-gray-200'
                            ]"
                        >
                            <!-- Help 图标 -->
                            <svg
                                v-if="item.icon === 'help'"
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>

                            <!-- Settings 图标 -->
                            <svg
                                v-else-if="item.icon === 'settings'"
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                        </div>

                        <!-- 标签（折叠时隐藏） -->
                        <transition name="fade">
                            <div
                                v-if="!isCollapsed"
                                class="flex min-w-0 flex-1 items-center justify-between gap-2"
                            >
                                <span
                                    class="truncate text-sm font-medium transition-colors duration-200"
                                    :class="
                                        modelValue === item.id
                                            ? 'text-primary-700 dark:text-primary-300 font-semibold'
                                            : 'text-gray-700 dark:text-gray-300'
                                    "
                                >
                                    {{ item.label }}
                                </span>
                            </div>
                        </transition>
                    </button>
                </div>
            </div>
        </nav>

        <!-- ==================== 侧边栏页脚 ==================== -->
        <div
            class="flex gap-2 border-t border-black/5 p-4 dark:border-white/5"
            :class="isCollapsed ? 'flex-col' : ''"
        >
            <!-- 折叠按钮 -->
            <button
                class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-element border-none bg-gray-100 px-2.5 py-2 text-xs font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-200/80 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                :title="isCollapsed ? t('layout.sidebar.expand') : t('layout.sidebar.collapse')"
                @click="toggleCollapse"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 transition-transform duration-300"
                    :class="{ 'rotate-180': isCollapsed }"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                </svg>
                <span v-if="!isCollapsed">{{ t('layout.sidebar.collapse') }}</span>
            </button>

            <!-- 登出按钮 -->
            <button
                class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-element border-none bg-gray-100 px-2.5 py-2 text-xs font-medium text-gray-700 transition-colors duration-200 hover:bg-danger-50 hover:text-danger-600 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-danger-950/30 dark:hover:text-danger-400"
                :title="isCollapsed ? t('layout.sidebar.logout') : ''"
                @click="handleLogout"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                </svg>
                <span v-if="!isCollapsed">{{ t('layout.sidebar.logout') }}</span>
            </button>
        </div>
    </aside>
</template>
