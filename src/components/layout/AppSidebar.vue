<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useThemeStore } from '../../stores/theme';
import { useLayoutStore } from '../../stores/layout';

const props = withDefaults(defineProps<{
  modelValue: string;
  subscriptionsCount?: number;
  profilesCount?: number;
  manualNodesCount?: number;
  generatorCount?: number;
  isLoggedIn?: boolean;
}>(), {
  subscriptionsCount: 0,
  profilesCount: 0,
  manualNodesCount: 0,
  generatorCount: 0,
  isLoggedIn: false
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'logout'): void;
  (e: 'help'): void;
  (e: 'settings'): void;
}>();

const themeStore = useThemeStore();
const layoutStore = useLayoutStore();

const isCollapsed = ref(false);
const isMobileMenuOpen = ref(false);

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  gradient: string;
  shadow: string;
  description: string;
  count?: number;
}

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

// 底部功能项（帮助和设置）
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

const selectTab = (tabId: string) => {
  if (tabId === 'help') {
    emit('help');
    // 在移动端选择后关闭菜单
    if (window.innerWidth <= 1024) {
      isMobileMenuOpen.value = false;
    }
    return;
  }
  if (tabId === 'settings') {
    emit('settings');
    // 在移动端选择后关闭菜单
    if (window.innerWidth <= 1024) {
      isMobileMenuOpen.value = false;
    }
    return;
  }
  emit('update:modelValue', tabId);
  // 在移动端选择后关闭菜单
  if (window.innerWidth <= 1024) {
    isMobileMenuOpen.value = false;
  }
};

const handleLogout = () => {
  emit('logout');
};

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  layoutStore.toggleSidebar();
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

// 监听窗口大小变化，在桌面端自动关闭移动菜单
const handleResize = () => {
  if (window.innerWidth > 1024) {
    isMobileMenuOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <!-- 移动端遮罩层 -->
  <Transition name="fade-overlay">
    <div v-if="isMobileMenuOpen" class="mobile-overlay" @click="closeMobileMenu"></div>
  </Transition>

  <!-- 移动端汉堡菜单按钮 -->
  <button class="mobile-menu-button" @click="toggleMobileMenu" :aria-label="isMobileMenuOpen ? '关闭菜单' : '打开菜单'">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path v-if="!isMobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M4 6h16M4 12h16M4 18h16" />
      <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>

  <aside class="sidebar" :class="{ 'sidebar-collapsed': isCollapsed, 'sidebar-mobile-open': isMobileMenuOpen }">
    <!-- Sidebar Header -->
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="logo-icon-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" class="logo-icon" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <transition name="fade">
          <div v-if="!isCollapsed" class="logo-text">
            <h1 class="logo-title gradient-text-animated">Sub-One</h1>
            <p class="logo-subtitle">Manager</p>
          </div>
        </transition>
      </div>

      <!-- Theme Toggle -->
      <div class="header-actions">
        <button class="icon-btn" :title="themeStore.theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
          @click="themeStore.toggleTheme">
          <svg v-if="themeStore.theme === 'dark'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>

          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <!-- Main Navigation -->
      <div class="nav-section">
        <p v-if="!isCollapsed" class="nav-section-title">主要功能</p>

        <div class="nav-items">
          <button v-for="item in navigationItems" :key="item.id" class="nav-item" :class="[
            { 'nav-item-active': modelValue === item.id },
            modelValue === item.id ? `bg-gradient-to-br ${item.gradient} ${item.shadow} text-white` : ''
          ]" :title="isCollapsed ? item.label : ''" @click="selectTab(item.id)">
            <!-- Icon -->
            <div class="nav-item-icon" :class="`bg-gradient-to-br ${item.gradient}`">
              <!-- Dashboard Icon -->
              <svg v-if="item.icon === 'dashboard'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>

              <!-- Subscription Icon -->
              <svg v-else-if="item.icon === 'subscription'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>

              <!-- Link Icon -->
              <svg v-else-if="item.icon === 'link'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>

              <!-- Profile Icon -->
              <svg v-else-if="item.icon === 'profile'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>

              <!-- Node Icon -->
              <svg v-else-if="item.icon === 'node'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <!-- Label & Count -->
            <transition name="fade">
              <div v-if="!isCollapsed" class="nav-item-content">
                <div class="nav-item-text">
                  <span class="nav-item-label">{{ item.label }}</span>
                </div>

                <div v-if="item.count && item.count > 0" class="nav-item-badge">
                  {{ item.count }}
                </div>
              </div>
            </transition>
          </button>
        </div>
      </div>

      <!-- Utility Section (Help & Settings) -->
      <div class="nav-section">
        <p v-if="!isCollapsed" class="nav-section-title">其他</p>

        <div class="nav-items">
          <button v-for="item in utilityItems" :key="item.id" class="nav-item" :class="[
            { 'nav-item-active': modelValue === item.id },
            modelValue === item.id ? `bg-gradient-to-br ${item.gradient} ${item.shadow} text-white` : ''
          ]" :title="isCollapsed ? item.label : ''" @click="selectTab(item.id)">
            <!-- Icon -->
            <div class="nav-item-icon" :class="`bg-gradient-to-br ${item.gradient}`">
              <!-- Help Icon -->
              <svg v-if="item.icon === 'help'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>

              <!-- Settings Icon -->
              <svg v-else-if="item.icon === 'settings'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            <!-- Label -->
            <transition name="fade">
              <div v-if="!isCollapsed" class="nav-item-content">
                <div class="nav-item-text">
                  <span class="nav-item-label">{{ item.label }}</span>
                </div>
              </div>
            </transition>
          </button>
        </div>
      </div>
    </nav>

    <!-- Sidebar Footer -->
    <div class="sidebar-footer">
      <!-- Collapse Button -->
      <button class="collapse-btn" :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'" @click="toggleCollapse">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 transition-transform duration-300"
          :class="{ 'rotate-180': isCollapsed }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
        <span v-if="!isCollapsed">收起</span>
      </button>

      <!-- Logout Button -->
      <button class="logout-btn" :title="isCollapsed ? '退出登录' : ''" @click="handleLogout">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span v-if="!isCollapsed">退出登录</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  display: flex;
  flex-direction: column;
  background: transparent;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 40;
  overflow: hidden;
}

html.dark .sidebar {
  background: transparent;
  box-shadow: none;
}

.sidebar-collapsed {
  width: 80px;
}

/* Header */
.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

html.dark .sidebar-header {
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.logo-icon-wrapper {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, hsl(243, 75%, 59%) 0%, hsl(280, 72%, 54%) 100%);
  border-radius: 1rem;
  box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
  animation: pulse 3s ease-in-out infinite;
}

.logo-icon {
  width: 24px;
  height: 24px;
  color: white;
}

.logo-text {
  flex: 1;
  min-width: 0;
}

.logo-title {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 0.75rem;
  font-weight: 600;
  color: hsl(243, 20%, 50%);
  margin-top: 0.125rem;
}

html.dark .logo-subtitle {
  color: hsl(243, 30%, 70%);
}

.header-actions {
  display: flex;
  justify-content: center;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-section {
  margin-bottom: 2rem;
}

.nav-section-title {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(243, 20%, 50%);
  margin-bottom: 0.75rem;
  padding: 0 0.75rem;
}

html.dark .nav-section-title {
  color: hsl(243, 30%, 60%);
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: transparent;
  border: none;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  width: 100%;
  text-align: left;
}

.sidebar-collapsed .nav-item {
  justify-content: center;
  padding: 1rem;
}

.nav-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.nav-item:hover::before {
  opacity: 1;
}

.nav-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.sidebar-collapsed .nav-item:hover {
  transform: translateX(0) scale(1.05);
}

.nav-item-active::before {
  display: none;
}

.nav-item-active:hover {
  transform: translateX(4px) scale(1.02);
  /* shadow is handled by inline class */
}

.nav-item-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.nav-item-active .nav-item-icon {
  background: rgba(255, 255, 255, 0.2) !important;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-item-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.nav-item-text {
  flex: 1;
  min-width: 0;
}

.nav-item-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(243, 47%, 24%);
  transition: color 0.3s ease;
}

html.dark .nav-item-label {
  color: hsl(243, 100%, 97%);
}

.nav-item-active .nav-item-label {
  color: white;
}

.nav-item-description {
  display: block;
  font-size: 0.6875rem;
  color: hsl(243, 20%, 50%);
  margin-top: 0.125rem;
}

html.dark .nav-item-description {
  color: hsl(243, 30%, 60%);
}

.nav-item-active .nav-item-description {
  color: rgba(255, 255, 255, 0.8);
}

.nav-item-badge {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  background: hsl(243, 75%, 95%);
  color: hsl(243, 75%, 50%);
  border-radius: 9999px;
  transition: all 0.3s ease;
}

html.dark .nav-item-badge {
  background: hsl(243, 75%, 20%);
  color: hsl(243, 75%, 70%);
}

.nav-item-active .nav-item-badge {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

/* Footer */
.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  gap: 0.5rem;
}

html.dark .sidebar-footer {
  border-top-color: rgba(255, 255, 255, 0.06);
}

.sidebar-collapsed .sidebar-footer {
  flex-direction: column;
}

.collapse-btn,
.logout-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.collapse-btn {
  background: rgba(99, 102, 241, 0.1);
  color: hsl(243, 75%, 50%);
}

.collapse-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  transform: translateY(-2px);
}

html.dark .collapse-btn {
  background: rgba(99, 102, 241, 0.15);
  color: hsl(243, 87%, 70%);
}

.logout-btn {
  background: rgba(239, 68, 68, 0.1);
  color: hsl(0, 84%, 50%);
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  transform: translateY(-2px);
}

html.dark .logout-btn {
  background: rgba(239, 68, 68, 0.15);
  color: hsl(0, 84%, 70%);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* 移动端汉堡菜单按钮 */
.mobile-menu-button {
  display: none;
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 50;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.75rem;
  color: hsl(243, 47%, 40%);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.mobile-menu-button:hover {
  background: white;
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

html.dark .mobile-menu-button {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
  color: hsl(243, 87%, 70%);
}

html.dark .mobile-menu-button:hover {
  background: rgba(15, 23, 42, 1);
}

/* 移动端遮罩层 */
.mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 39;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* 遮罩层过渡效果 */
.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}

/* Mobile 响应式设计 */
@media (max-width: 1024px) {
  .mobile-menu-button {
    display: flex;
  }

  .mobile-overlay {
    display: block;
  }

  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar-mobile-open {
    transform: translateX(0);
  }

  /* 移动端强制全宽侧边栏 */
  .sidebar-collapsed {
    width: 280px;
  }
}
</style>
