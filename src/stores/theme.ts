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
import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * 主题类型定义
 */
type Theme = 'light' | 'dark' | 'auto';

/**
 * 主题 Store
 * 使用 Setup 语法定义 Pinia Store
 */
export const useThemeStore = defineStore('theme', () => {
    // ==================== 响应式状态 ====================

    /**
     * 用户偏好设置
     * 'light' - 强制明亮
     * 'dark' - 强制暗黑
     * 'auto' - 跟随系统
     */
    const theme = ref<Theme>('auto');

    /**
     * 当前实际应用的主题（用于 UI 显示）
     * 即使在 auto 模式下，这里也只会有 light 或 dark
     */
    const currentTheme = ref<'light' | 'dark'>('light');

    // 系统暗黑模式查询匹配器
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)');

    // ==================== 初始化 ====================

    /**
     * 初始化主题
     */
    async function initTheme() {
        const savedTheme = localStorage.getItem('sub-one-theme') as Theme | null;

        if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
            theme.value = savedTheme;
        } else {
            theme.value = 'auto'; // 默认使用自动模式
        }

        // 监听系统主题变化
        systemDarkMode.addEventListener('change', handleSystemThemeChange);

        // 初次应用
        applyTheme();
    }

    // ==================== 内部逻辑 ====================

    /**
     * 处理系统主题变更（仅在 auto 模式下生效）
     */
    function handleSystemThemeChange(e: MediaQueryListEvent) {
        if (theme.value === 'auto') {
            applyClass(e.matches);
        }
    }

    /**
     * 应用 class 到 HTML 根元素
     * @param isDark 是否应用暗黑模式
     */
    function applyClass(isDark: boolean) {
        const html = document.documentElement;
        if (isDark) {
            html.classList.add('dark');
            currentTheme.value = 'dark';
        } else {
            html.classList.remove('dark');
            currentTheme.value = 'light';
        }
    }

    /**
     * 核心应用逻辑
     * 根据当前 theme 的值决定最终效果
     */
    function applyTheme() {
        let shouldBeDark = false;

        if (theme.value === 'auto') {
            shouldBeDark = systemDarkMode.matches;
        } else {
            shouldBeDark = theme.value === 'dark';
        }

        applyClass(shouldBeDark);

        // 持久化
        localStorage.setItem('sub-one-theme', theme.value);
    }

    // ==================== 公开方法 ====================

    /**
     * 循环切换主题模式
     * 顺序: Light -> Dark -> Auto -> Light ...
     */
    function toggleTheme() {
        if (theme.value === 'light') {
            theme.value = 'dark';
        } else if (theme.value === 'dark') {
            theme.value = 'auto';
        } else {
            theme.value = 'light';
        }
        applyTheme();
    }

    /**
     * 设置特定主题
     */
    function setTheme(newTheme: Theme) {
        theme.value = newTheme;
        applyTheme();
    }

    /**
     * 获取下一个模式的名称（用于提示）
     */
    function getNextThemeName() {
        if (theme.value === 'light') return '切换到暗黑模式';
        if (theme.value === 'dark') return '切换到跟随系统';
        return '切换到明亮模式';
    }

    /**
     * 获取当前模式名称
     */
    function getThemeName() {
        const names: Record<Theme, string> = {
            light: '明亮模式',
            dark: '暗黑模式',
            auto: '跟随系统'
        };
        return names[theme.value];
    }

    /**
     * 是否为暗黑模式（计算属性）
     */
    const isDarkMode = computed(() => currentTheme.value === 'dark');

    return {
        theme,
        currentTheme,
        isDarkMode,
        initTheme,
        toggleTheme,
        setTheme,
        getThemeName,
        getNextThemeName
    };
});
