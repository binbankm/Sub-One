/**
 * UI状态管理Store
 * 管理全局UI状态，如模态框显示、主题等
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUIStore = defineStore('ui', () => {
  // === 模态框状态 ===
  const isSettingsModalVisible = ref(false);
  const isHelpModalVisible = ref(false);

  // === 主题状态 ===
  const isDarkMode = ref(false);
  const systemTheme = ref('auto'); // auto, light, dark

  // === 布局状态 ===
  const sidebarCollapsed = ref(false);
  const currentViewMode = ref('card'); // card, list

  // === 计算属性 ===
  const themeClass = computed(() => {
    if (systemTheme.value === 'auto') {
      return isDarkMode.value ? 'dark' : 'light';
    }
    return systemTheme.value;
  });

  // === 模态框方法 ===
  const showSettingsModal = () => {
    isSettingsModalVisible.value = true;
  };

  const hideSettingsModal = () => {
    isSettingsModalVisible.value = false;
  };

  const showHelpModal = () => {
    isHelpModalVisible.value = true;
  };

  const hideHelpModal = () => {
    isHelpModalVisible.value = false;
  };

  // === 主题方法 ===
  const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value;
    updateThemeClass();
  };

  const setTheme = (theme) => {
    systemTheme.value = theme;
    updateThemeClass();
  };

  const updateThemeClass = () => {
    const html = document.documentElement;
    if (themeClass.value === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  };

  // === 布局方法 ===
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  };

  const setViewMode = (mode) => {
    currentViewMode.value = mode;
    localStorage.setItem('viewMode', mode);
  };

  // === 初始化方法 ===
  const initializeUI = () => {
    // 从localStorage恢复状态
    const savedViewMode = localStorage.getItem('viewMode');
    if (savedViewMode) {
      currentViewMode.value = savedViewMode;
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      systemTheme.value = savedTheme;
    }

    // 检测系统主题偏好
    if (systemTheme.value === 'auto') {
      isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDarkMode.value = systemTheme.value === 'dark';
    }

    updateThemeClass();
  };

  return {
    // 状态
    isSettingsModalVisible,
    isHelpModalVisible,
    isDarkMode,
    systemTheme,
    sidebarCollapsed,
    currentViewMode,
    
    // 计算属性
    themeClass,
    
    // 方法
    showSettingsModal,
    hideSettingsModal,
    showHelpModal,
    hideHelpModal,
    toggleTheme,
    setTheme,
    updateThemeClass,
    toggleSidebar,
    setViewMode,
    initializeUI
  };
});