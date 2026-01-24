<!--
  ==================== Toast 提示组件 ====================
  
  功能说明：
  - 全局提示消息显示
  - 支持多种类型（成功、错误、信息）
  - 自动消失和手动关闭
  - 优雅的进入/退出动画
  
  使用方式：
  - 通过 useToastStore().showToast() 显示
  - 自动从 store 获取提示列表
  
  ==================================================
-->

<script setup lang="ts">
// ==================== 导入依赖 ====================
import { useToastStore } from '../../stores/toast';

// ==================== Store ====================
const toastStore = useToastStore();

// ==================== 样式配置 ====================

/**
 * 获取 Toast 样式配置
 *
 * @param {string} type - Toast 类型（success | error | info）
 * @returns Toast 样式对象（背景、边框、文字颜色、图标）
 */
const getToastStyle = (type: string) => {
    switch (type) {
        case 'success':
            return {
                bg: 'bg-white dark:bg-gray-800',
                border: 'border-l-4 border-green-500',
                text: 'text-gray-800 dark:text-gray-100',
                iconColor: 'text-green-500',
                icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' // 勾选图标
            };
        case 'error':
            return {
                bg: 'bg-white dark:bg-gray-800',
                border: 'border-l-4 border-red-500',
                text: 'text-gray-800 dark:text-gray-100',
                iconColor: 'text-red-500',
                icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' // 错误图标
            };
        case 'info':
            return {
                bg: 'bg-white dark:bg-gray-800',
                border: 'border-l-4 border-blue-500',
                text: 'text-gray-800 dark:text-gray-100',
                iconColor: 'text-blue-500',
                icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' // 信息图标
            };
        default:
            return {
                bg: 'bg-white dark:bg-gray-800',
                border: 'border-l-4 border-gray-500',
                text: 'text-gray-800 dark:text-gray-100',
                iconColor: 'text-gray-500',
                icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' // 默认图标
            };
    }
};
</script>

<template>
    <!-- Toast 容器 - 固定在页面顶部居中 -->
    <div
        class="pointer-events-none fixed left-1/2 top-5 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-3 px-4"
    >
        <!-- Toast 列表 - 带过渡动画 -->
        <TransitionGroup name="toast-list">
            <!-- 循环渲染每个 Toast -->
            <div
                v-for="toast in toastStore.toasts"
                :key="toast.id"
                class="pointer-events-auto flex w-full transform items-start gap-3 rounded-lg border border-gray-300 p-4 shadow-lg transition-all duration-300 hover:scale-[1.02] dark:border-gray-700"
                :class="[getToastStyle(toast.type).bg, getToastStyle(toast.type).border]"
            >
                <!-- 图标 -->
                <div class="mt-0.5 flex-shrink-0" :class="getToastStyle(toast.type).iconColor">
                    <svg
                        class="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            :d="getToastStyle(toast.type).icon"
                        />
                    </svg>
                </div>

                <!-- 消息内容 -->
                <div class="min-w-0 flex-1">
                    <p
                        class="text-sm font-medium leading-5"
                        :class="getToastStyle(toast.type).text"
                    >
                        {{ toast.message }}
                    </p>
                </div>

                <!-- 关闭按钮 -->
                <button
                    @click="toastStore.removeToast(toast.id)"
                    class="-mr-1 -mt-1 flex-shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700"
                >
                    <svg
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
/* ==================== Toast 过渡动画 ==================== */

/* 进入和离开的过渡效果 */
.toast-list-enter-active,
.toast-list-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 进入时的初始状态 - 从上方淡入并缩小 */
.toast-list-enter-from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
}

/* 离开时的最终状态 - 向上淡出并缩小 */
.toast-list-leave-to {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
}

/* Toast 移动过渡效果 - 平滑移动 */
.toast-list-move {
    transition: transform 0.4s ease;
}
</style>
