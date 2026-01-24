/**
 * ==================== 布局管理 Store ====================
 *
 * 功能说明：
 * - 管理侧边栏的展开/折叠状态
 * - 处理桌面端和移动端的侧边栏显示逻辑
 * - 持久化保存侧边栏状态到 localStorage
 * - 提供响应式的布局相关计算属性
 *
 * ========================================================
 */
import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * 布局 Store
 * 使用 Setup 语法定义 Pinia Store
 */
export const useLayoutStore = defineStore('layout', () => {
    // ==================== 响应式状态 ====================

    /**
     * 侧边栏折叠状态（桌面端）
     * true - 折叠（显示简化版）
     * false - 展开（显示完整版）
     *
     * 从 localStorage 读取初始值
     */
    const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true');

    /**
     * 移动端侧边栏打开状态
     * true - 打开（覆盖在内容上方）
     * false - 关闭（隐藏）
     */
    const sidebarMobileOpen = ref(false);

    // ==================== 计算属性 ====================

    /**
     * 侧边栏宽度
     * 根据折叠状态返回不同的宽度值
     * - 折叠时：5rem (80px)
     * - 展开时：18rem (288px)
     */
    const sidebarWidth = computed(() => (sidebarCollapsed.value ? '5rem' : '18rem'));

    /**
     * 主内容区域的左边距
     * 根据侧边栏状态调整主内容区域的位置
     * - 折叠时：lg:pl-20 (左边距 80px)
     * - 展开时：lg:pl-72 (左边距 288px)
     */
    const mainPaddingLeft = computed(() => (sidebarCollapsed.value ? 'lg:pl-20' : 'lg:pl-72'));

    // ==================== 方法定义 ====================

    /**
     * 切换侧边栏折叠状态（桌面端）
     *
     * 说明：
     * - 在折叠和展开之间切换
     * - 自动保存状态到 localStorage
     */
    function toggleSidebar() {
        // 切换状态
        sidebarCollapsed.value = !sidebarCollapsed.value;

        // 持久化保存到 localStorage
        localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed.value));
    }

    /**
     * 切换移动端侧边栏显示状态
     *
     * 说明：
     * - 在打开和关闭之间切换
     * - 用于移动端的汉堡菜单按钮
     */
    function toggleMobileSidebar() {
        sidebarMobileOpen.value = !sidebarMobileOpen.value;
    }

    /**
     * 关闭移动端侧边栏
     *
     * 说明：
     * - 显式关闭移动端侧边栏
     * - 用于点击遮罩层或导航后自动关闭
     */
    function closeMobileSidebar() {
        sidebarMobileOpen.value = false;
    }

    /**
     * 初始化布局设置
     *
     * 说明：
     * - 从 localStorage 读取保存的侧边栏状态
     * - 应用启动时调用
     */
    function init() {
        // 读取保存的折叠状态
        const saved = localStorage.getItem('sidebarCollapsed');

        if (saved !== null) {
            // 如果有保存的值，则使用保存的值
            sidebarCollapsed.value = saved === 'true';
        }
        // 如果没有保存的值，保持默认值（false - 展开）
    }

    // ==================== 导出接口 ====================

    return {
        /** 侧边栏折叠状态（桌面端） */
        sidebarCollapsed,
        /** 移动端侧边栏打开状态 */
        sidebarMobileOpen,
        /** 侧边栏宽度（计算属性） */
        sidebarWidth,
        /** 主内容区域左边距（计算属性） */
        mainPaddingLeft,
        /** 切换侧边栏折叠状态 */
        toggleSidebar,
        /** 切换移动端侧边栏 */
        toggleMobileSidebar,
        /** 关闭移动端侧边栏 */
        closeMobileSidebar,
        /** 初始化布局设置 */
        init
    };
});
