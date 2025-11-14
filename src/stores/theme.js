import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  // 主题状态：'light' | 'dark'
  const theme = ref('light');
  
  // 使用computed代替重复的函数调用
  const currentTheme = computed(() => theme.value);
  
  // 本地存储键名常量
  const THEME_STORAGE_KEY = 'sub-one-theme';
  
  // 初始化主题 - 移除不必要的async关键字
  function initTheme() {
    try {
      // 从localStorage获取保存的主题
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        theme.value = savedTheme;
      }
      // 应用主题
      applyTheme();
    } catch (error) {
      console.error('初始化主题失败:', error);
      // 失败时使用默认主题
      applyTheme();
    }
  }
  
  // 切换主题
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
    saveThemeToStorage();
    applyTheme();
  }
  
  // 设置特定主题
  function setTheme(newTheme) {
    if (newTheme === 'light' || newTheme === 'dark') {
      theme.value = newTheme;
      saveThemeToStorage();
      applyTheme();
    }
  }
  
  // 应用主题到DOM
  function applyTheme() {
    const html = document.documentElement;
    
    // 使用classList.toggle优化添加/移除类
    html.classList.toggle('dark', theme.value === 'dark');
  }
  
  // 保存主题到本地存储 - 提取为单独函数提高可维护性
  function saveThemeToStorage() {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.value);
    } catch (error) {
      console.error('保存主题到本地存储失败:', error);
    }
  }
  
  // 使用computed代替方法，提高性能
  const themeInfo = computed(() => {
    const isLight = theme.value === 'light';
    return {
      icon: isLight ? 'moon' : 'sun',
      name: isLight ? '明亮模式' : '暗黑模式',
      nextThemeName: isLight ? '点击切换到暗黑模式' : '点击切换到明亮模式'
    };
  });
  
  return {
    theme,
    currentTheme,
    initTheme,
    toggleTheme,
    setTheme,
    // 保持向后兼容性
    getThemeIcon: () => themeInfo.value.icon,
    getThemeName: () => themeInfo.value.name,
    getNextThemeName: () => themeInfo.value.nextThemeName
  };
});
