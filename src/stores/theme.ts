/**
 * ==================== 主题管理 Store ====================
 * 
 * 功能说明：
 * - 管理应用的明亮/暗黑主题切换
 * - 持久化保存用户的主题偏好
 * - 提供主题相关的辅助功能
 * - 支持动态应用主题到 DOM
 * 
 * ========================================================
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * 主题类型定义
 */
type Theme = 'light' | 'dark';

/**
 * 主题 Store
 * 使用 Setup 语法定义 Pinia Store
 */
export const useThemeStore = defineStore('theme', () => {
  // ==================== 响应式状态 ====================

  /**
   * 用户选择的主题
   * 'light' - 明亮模式
   * 'dark' - 暗黑模式
   */
  const theme = ref<Theme>('light');

  /**
   * 当前实际应用的主题
   * 用于跟踪主题状态变化
   */
  const currentTheme = ref<Theme>('light');

  // ==================== 初始化 ====================

  /**
   * 初始化主题
   * 
   * 说明：
   * - 从 localStorage 读取保存的主题偏好
   * - 如果没有保存，使用默认主题（light）
   * - 应用主题到 DOM
   */
  async function initTheme() {
    // 从 localStorage 获取保存的主题
    const savedTheme = localStorage.getItem('sub-one-theme');

    // 验证主题值的合法性
    if (savedTheme === 'light' || savedTheme === 'dark') {
      theme.value = savedTheme;
    }

    // 应用主题到页面
    applyTheme();
  }

  // ==================== 主题切换 ====================

  /**
   * 切换主题
   * 
   * 说明：
   * - 在明亮和暗黑模式之间切换
   * - 自动保存到 localStorage
   * - 立即应用到 DOM
   */
  function toggleTheme() {
    // 在 light 和 dark 之间切换
    theme.value = theme.value === 'light' ? 'dark' : 'light';

    // 保存到 localStorage（持久化）
    localStorage.setItem('sub-one-theme', theme.value);

    // 应用主题到页面
    applyTheme();
  }

  /**
   * 设置特定主题
   * 
   * @param {Theme} newTheme - 要设置的主题（'light' | 'dark'）
   */
  function setTheme(newTheme: Theme) {
    // 更新主题值
    theme.value = newTheme;

    // 保存到 localStorage
    localStorage.setItem('sub-one-theme', newTheme);

    // 应用主题到页面
    applyTheme();
  }

  // ==================== DOM 操作 ====================

  /**
   * 应用主题到 DOM
   * 
   * 说明：
   * - 通过添加/移除 'dark' 类名来切换主题
   * - Tailwind CSS 会根据 .dark 类应用暗黑模式样式
   */
  function applyTheme() {
    // 获取 HTML 根元素
    const html = document.documentElement;

    // 更新当前主题状态
    currentTheme.value = theme.value;

    // 根据主题值添加或移除 'dark' 类
    if (theme.value === 'dark') {
      html.classList.add('dark');  // 添加暗黑模式类
    } else {
      html.classList.remove('dark');  // 移除暗黑模式类
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取主题图标名称
   * 
   * 说明：
   * - 明亮模式显示月亮图标（表示可以切换到暗黑模式）
   * - 暗黑模式显示太阳图标（表示可以切换到明亮模式）
   * 
   * @returns {'moon' | 'sun'} 图标名称
   */
  function getThemeIcon() {
    if (theme.value === 'light') {
      return 'moon'; // 当前是明亮模式，显示月亮图标
    } else {
      return 'sun'; // 当前是暗黑模式，显示太阳图标
    }
  }

  /**
   * 获取当前主题名称
   * 
   * @returns {string} 主题的中文名称
   */
  function getThemeName() {
    if (theme.value === 'light') {
      return '明亮模式';
    } else {
      return '暗黑模式';
    }
  }

  /**
   * 获取下一个主题名称（用于提示）
   * 
   * 说明：
   * - 返回点击后将切换到的主题名称
   * - 用于显示 tooltip 提示
   * 
   * @returns {string} 下一个主题的提示文本
   */
  function getNextThemeName() {
    if (theme.value === 'light') {
      return '点击切换到暗黑模式';
    } else {
      return '点击切换到明亮模式';
    }
  }

  // ==================== 导出接口 ====================

  return {
    /** 用户选择的主题 */
    theme,
    /** 当前实际应用的主题 */
    currentTheme,
    /** 初始化主题 */
    initTheme,
    /** 切换主题 */
    toggleTheme,
    /** 设置特定主题 */
    setTheme,
    /** 获取主题图标 */
    getThemeIcon,
    /** 获取主题名称 */
    getThemeName,
    /** 获取下一个主题名称 */
    getNextThemeName
  };
});
