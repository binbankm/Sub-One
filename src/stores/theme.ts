import { defineStore } from 'pinia';
import { ref } from 'vue';


export const useThemeStore = defineStore('theme', () => {
  // 主题状态：'light' | 'dark'
  const theme = ref<'light' | 'dark'>('light');

  // 当前实际应用的主题
  const currentTheme = ref<'light' | 'dark'>('light');

  // 初始化主题
  async function initTheme() {
    // 从localStorage获取保存的主题
    const savedTheme = localStorage.getItem('sub-one-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      theme.value = savedTheme;
    }

    // 应用主题
    applyTheme();
  }

  // 切换主题
  function toggleTheme() {
    // 简单地在明亮和暗黑之间切换
    theme.value = theme.value === 'light' ? 'dark' : 'light';

    // 保存到localStorage
    localStorage.setItem('sub-one-theme', theme.value);

    // 应用主题
    applyTheme();
  }

  // 设置特定主题
  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme;
    localStorage.setItem('sub-one-theme', newTheme);
    applyTheme();
  }

  // 应用主题到DOM
  function applyTheme() {
    const html = document.documentElement;

    // 直接应用用户选择的主题
    currentTheme.value = theme.value;

    if (theme.value === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  // 获取主题图标
  function getThemeIcon() {
    if (theme.value === 'light') {
      return 'moon'; // 当前是明亮模式，显示月亮图标（表示可以切换到暗黑模式）
    } else {
      return 'sun'; // 当前是暗黑模式，显示太阳图标（表示可以切换到明亮模式）
    }
  }

  // 获取主题名称
  function getThemeName() {
    if (theme.value === 'light') {
      return '明亮模式';
    } else {
      return '暗黑模式';
    }
  }

  // 获取下一个主题名称（用于提示）
  function getNextThemeName() {
    if (theme.value === 'light') {
      return '点击切换到暗黑模式';
    } else {
      return '点击切换到明亮模式';
    }
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
