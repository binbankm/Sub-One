import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const theme = ref('light');
  const currentTheme = ref('light');
  
  // 初始化主题
  async function initTheme() {
    const savedTheme = localStorage.getItem('sub-one-theme');
    if (savedTheme) {
      theme.value = savedTheme;
    }
    applyTheme();
  }
  
  // 切换主题
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
    localStorage.setItem('sub-one-theme', theme.value);
    applyTheme();
  }
  
  // 设置特定主题
  function setTheme(newTheme) {
    theme.value = newTheme;
    localStorage.setItem('sub-one-theme', newTheme);
    applyTheme();
  }
  
  // 应用主题到DOM
  function applyTheme() {
    const html = document.documentElement;
    currentTheme.value = theme.value;
    
    if (theme.value === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
  
  // 获取主题图标
  function getThemeIcon() {
    return theme.value === 'light' ? 'moon' : 'sun';
  }
  
  // 获取主题名称
  function getThemeName() {
    return theme.value === 'light' ? '明亮模式' : '暗黑模式';
  }
  
  // 获取下一个主题名称（用于提示）
  function getNextThemeName() {
    return theme.value === 'light' ? '点击切换到暗黑模式' : '点击切换到明亮模式';
  }
  
  return {
    theme,
    currentTheme,
    initTheme,
    toggleTheme,
    setTheme,
    getThemeIcon,
    getThemeName,
    getNextThemeName
  };
}); 
