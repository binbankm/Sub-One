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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useThemeStore } from '../../stores/theme';
import { useLayoutStore } from '../../stores/layout';

// ==================== Props 定义 ====================

const props = withDefaults(defineProps<{
  /** 当前选中的标签页 ID */
  modelValue: string;
  /** 订阅数量 */
  subscriptionsCount?: number;
  /** 订阅组数量 */
  profilesCount?: number;
  /** 手动节点数量 */
  manualNodesCount?: number;
  /** 生成器数量 */
  generatorCount?: number;
  /** 是否已登录 */
  isLoggedIn?: boolean;
}>(), {
  subscriptionsCount: 0,
  profilesCount: 0,
  manualNodesCount: 0,
  generatorCount: 0,
  isLoggedIn: false
});

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
  gradient: string;
  shadow: string;
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
    label: '仪表盘',
    icon: 'dashboard',
    gradient: 'from-orange-500 to-amber-600',
    shadow: 'shadow-orange-500/30',
    description: '概览状态'
  },
  {
    id: 'subscriptions',
    label: '订阅管理',
    icon: 'subscription',
    count: props.subscriptionsCount,
    gradient: 'from-indigo-500 to-purple-600',
    shadow: 'shadow-indigo-500/30',
    description: '管理订阅源'
  },
  {
    id: 'profiles',
    label: '订阅组',
    icon: 'profile',
    count: props.profilesCount,
    gradient: 'from-purple-500 to-pink-600',
    shadow: 'shadow-purple-500/30',
    description: '组织订阅'
  },
  {
    id: 'generator',
    label: '链接生成',
    icon: 'link',
    count: props.generatorCount,
    gradient: 'from-cyan-500 to-blue-600',
    shadow: 'shadow-cyan-500/30',
    description: '生成订阅链接'
  },
  {
    id: 'nodes',
    label: '手动节点',
    icon: 'node',
    count: props.manualNodesCount,
    gradient: 'from-green-500 to-emerald-600',
    shadow: 'shadow-green-500/30',
    description: '管理节点'
  }
]);

/**
 * 底部功能项（帮助和设置）
 */
const utilityItems = computed(() => [
  {
    id: 'help',
    label: '帮助文档',
    icon: 'help',
    gradient: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/30',
    description: '查看文档'
  },
  {
    id: 'settings',
    label: '设置',
    icon: 'settings',
    gradient: 'from-slate-500 to-gray-600',
    shadow: 'shadow-slate-500/30',
    description: '系统设置'
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
    <div v-if="isMobileMenuOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[39] lg:hidden" @click="closeMobileMenu"></div>
  </Transition>

  <!-- ==================== 移动端汉堡菜单按钮 ==================== -->
  <button 
    class="fixed top-4 left-4 z-50 w-12 h-12 flex items-center justify-center bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 cursor-pointer transition-all duration-300 backdrop-blur-md shadow-lg hover:bg-white dark:hover:bg-gray-900 hover:scale-105 hover:shadow-xl lg:hidden" 
    @click="toggleMobileMenu" 
    :aria-label="isMobileMenuOpen ? '关闭菜单' : '打开菜单'"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    class="fixed left-0 top-0 bottom-0 flex flex-col bg-transparent backdrop-blur-xl shadow-none transition-all duration-300 z-40 overflow-hidden
      lg:translate-x-0"
    :class="[
      isCollapsed ? 'w-20' : 'w-[280px]',
      isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    ]"
  >
    <!-- ==================== 侧边栏头部 ==================== -->
    <div class="p-6 border-b border-black/5 dark:border-white/5">
      <!-- Logo 区域 -->
      <div class="flex items-center gap-4 mb-4">
        <!-- Logo 图标 -->
        <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl shadow-lg shadow-primary-500/40 animate-pulse">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            class="w-6 h-6 text-white" 
            fill="none" 
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <!-- Logo 文字（折叠时隐藏） -->
        <transition name="fade">
          <div v-if="!isCollapsed" class="flex-1 min-w-0">
            <h1 class="text-xl font-extrabold leading-tight tracking-tight gradient-text-animated">Sub-One</h1>
            <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-0.5">Manager</p>
          </div>
        </transition>
      </div>

      <!-- 头部操作区域 - 主题切换按钮 -->
      <div class="flex justify-center">
        <button 
          class="icon-btn" 
          :title="themeStore.theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
          @click="themeStore.toggleTheme"
        >
          <!-- 暗黑模式图标（太阳） -->
          <svg 
            v-if="themeStore.theme === 'dark'" 
            xmlns="http://www.w3.org/2000/svg" 
            class="w-5 h-5" 
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
            class="w-5 h-5" 
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
    <nav class="flex-1 p-4 overflow-y-auto overflow-x-hidden">
      
      <!-- 主要功能导航 -->
      <div class="mb-8">
        <p v-if="!isCollapsed" class="text-[0.6875rem] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-3 px-3">主要功能</p>

        <div class="flex flex-col gap-2">
          <!-- 循环渲染导航项 -->
          <button 
            v-for="item in navigationItems" 
            :key="item.id" 
            class="sidebar-nav-item group"
            :class="[
              isCollapsed ? 'justify-center p-4' : 'p-3',
              modelValue === item.id ? `bg-gradient-to-br ${item.gradient} ${item.shadow} text-white` : 'hover:translate-x-1 lg:group-hover:translate-x-1 lg:group-hover:scale-105'
            ]" 
            :title="isCollapsed ? item.label : ''" 
            @click="selectTab(item.id)"
          >
            <!-- 图标 -->
            <div 
              class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md transition-all duration-300"
              :class="[
                `bg-gradient-to-br ${item.gradient}`,
                modelValue === item.id ? 'bg-white/20 shadow-inner' : ''
              ]"
            >
              <!-- Dashboard 图标 -->
              <svg 
                v-if="item.icon === 'dashboard'" 
                xmlns="http://www.w3.org/2000/svg" 
                class="w-5 h-5" 
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
                class="w-5 h-5"
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

              <!-- Link 图标 -->
              <svg 
                v-else-if="item.icon === 'link'" 
                xmlns="http://www.w3.org/2000/svg" 
                class="w-5 h-5" 
                fill="none"
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" 
                />
              </svg>

              <!-- Profile 图标 -->
              <svg 
                v-else-if="item.icon === 'profile'" 
                xmlns="http://www.w3.org/2000/svg" 
                class="w-5 h-5" 
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
                class="w-5 h-5" 
                fill="none"
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <!-- 标签和数量徽章（折叠时隐藏） -->
            <transition name="fade">
              <div v-if="!isCollapsed" class="flex-1 flex items-center justify-between gap-3 min-w-0">
                <div class="flex-1 min-w-0">
                  <span 
                    class="block text-sm font-semibold transition-colors duration-300"
                    :class="modelValue === item.id ? 'text-white' : 'text-gray-900 dark:text-gray-100'"
                  >{{ item.label }}</span>
                </div>

                <!-- 数量徽章（有数量时显示） -->
                <div 
                  v-if="item.count && item.count > 0" 
                  class="flex-shrink-0 flex items-center justify-center min-w-[24px] h-6 px-2 text-[0.6875rem] font-bold rounded-full transition-all duration-300"
                  :class="modelValue === item.id 
                    ? 'bg-white/25 text-white' 
                    : 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'"
                >
                  {{ item.count }}
                </div>
              </div>
            </transition>
          </button>
        </div>
      </div>

      <!-- 其他功能区（帮助和设置） -->
      <div class="mb-8">
        <p v-if="!isCollapsed" class="text-[0.6875rem] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-3 px-3">其他</p>

        <div class="flex flex-col gap-2">
          <!-- 循环渲染功能项 -->
          <button 
            v-for="item in utilityItems" 
            :key="item.id" 
            class="sidebar-nav-item group"
            :class="[
              isCollapsed ? 'justify-center p-4' : 'p-3',
              modelValue === item.id ? `bg-gradient-to-br ${item.gradient} ${item.shadow} text-white` : 'hover:translate-x-1 lg:group-hover:scale-105'
            ]" 
            :title="isCollapsed ? item.label : ''" 
            @click="selectTab(item.id)"
          >
            <!-- 图标 -->
            <div 
              class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md transition-all duration-300"
              :class="`bg-gradient-to-br ${item.gradient}`"
            >
              <!-- Help 图标 -->
              <svg 
                v-if="item.icon === 'help'" 
                xmlns="http://www.w3.org/2000/svg" 
                class="w-5 h-5" 
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
                class="w-5 h-5" 
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
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            <!-- 标签（折叠时隐藏） -->
            <transition name="fade">
              <div v-if="!isCollapsed" class="flex-1 flex items-center justify-between gap-3 min-w-0">
                <div class="flex-1 min-w-0">
                  <span 
                    class="block text-sm font-semibold transition-colors duration-300"
                    :class="modelValue === item.id ? 'text-white' : 'text-gray-900 dark:text-gray-100'"
                  >{{ item.label }}</span>
                </div>
              </div>
            </transition>
          </button>
        </div>
      </div>
    </nav>

    <!-- ==================== 侧边栏页脚 ==================== -->
    <div 
      class="p-4 border-t border-black/5 dark:border-white/5 flex gap-2"
      :class="isCollapsed ? 'flex-col' : ''"
    >
      <!-- 折叠按钮 -->
      <button 
        class="flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-semibold border-none rounded-xl cursor-pointer transition-all duration-300 bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 hover:bg-indigo-500/20 hover:-translate-y-0.5" 
        :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'" 
        @click="toggleCollapse"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          class="w-5 h-5 transition-transform duration-300"
          :class="{ 'rotate-180': isCollapsed }" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
        <span v-if="!isCollapsed">收起</span>
      </button>

      <!-- 登出按钮 -->
      <button 
        class="flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-semibold border-none rounded-xl cursor-pointer transition-all duration-300 bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400 hover:bg-red-500/20 hover:-translate-y-0.5" 
        :title="isCollapsed ? '退出登录' : ''" 
        @click="handleLogout"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
          />
        </svg>
        <span v-if="!isCollapsed">退出登录</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* ==================== Vue 过渡动画 ==================== */




</style>
