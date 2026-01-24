<!--
  ==================== 应用页脚组件 ====================
  
  功能说明：
  - 显示版权信息和当前年份
  - 提供项目链接（GitHub）
  - 展示应用特色标签（安全、高效、隐私）
  - 装饰性的视觉元素
  
  特色功能：
  - 自动更新年份
  - 渐变色文字效果
  - 脉冲动画指示灯
  - 响应式布局
  
  ==================================================
-->

<script setup lang="ts">
// ==================== 导入依赖 ====================
import { computed } from 'vue';

// ==================== 计算属性 ====================

/**
 * 当前年份
 * 自动获取并显示当前年份，无需手动更新
 */
const currentYear = computed(() => new Date().getFullYear());
</script>

<template>
    <!-- 页脚容器 - 全宽、居中文本 -->
    <footer class="relative mt-8 w-full py-6 text-center">
        <!-- ==================== 装饰性背景 ==================== -->
        <!-- 注：装饰性背景已移除，以保持整体背景一致性 -->
        <!-- <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent dark:from-transparent dark:via-gray-800/5 dark:to-transparent"></div> -->

        <!-- ==================== 主要内容区域 ==================== -->
        <div class="relative z-10">
            <!-- 装饰性分割线 - 带中心点 -->
            <div class="mb-4 flex items-center justify-center space-x-4">
                <!-- 左侧渐变线 -->
                <div
                    class="h-px w-8 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600"
                ></div>
                <!-- 中心装饰点 - 渐变色圆点 -->
                <div
                    class="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
                ></div>
                <!-- 右侧渐变线 -->
                <div
                    class="h-px w-8 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600"
                ></div>
            </div>

            <!-- ==================== 版权信息 ==================== -->
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                <!-- 版权年份 - 自动更新 -->
                Copyright © {{ currentYear }}

                <!-- 项目名称链接 - 指向 GitHub -->
                <a
                    href="https://github.com/binbankm/Sub-One"
                    target="_blank"
                    class="gradient-text font-bold transition-opacity duration-300 hover:opacity-80"
                >
                    Sub-One Manager
                </a>

                <!-- 分隔符 -->
                <span class="mx-2">·</span>

                <!-- 版权声明 -->
                <span class="text-xs">All Rights Reserved</span>
            </p>

            <!-- ==================== 特色标签 ==================== -->
            <!-- 显示应用的核心特色 -->
            <div
                class="mt-3 flex items-center justify-center space-x-6 text-xs text-gray-400 dark:text-gray-500"
            >
                <!-- 安全可靠标签 - 绿色脉冲指示灯 -->
                <span class="flex items-center space-x-1">
                    <div class="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
                    <span>安全可靠</span>
                </span>

                <!-- 高效管理标签 - 蓝色脉冲指示灯（延迟0.5s） -->
                <span class="flex items-center space-x-1">
                    <div
                        class="h-2 w-2 animate-pulse rounded-full bg-blue-400"
                        style="animation-delay: 0.5s"
                    ></div>
                    <span>高效管理</span>
                </span>

                <!-- 隐私保护标签 - 紫色脉冲指示灯（延迟1s） -->
                <span class="flex items-center space-x-1">
                    <div
                        class="h-2 w-2 animate-pulse rounded-full bg-purple-400"
                        style="animation-delay: 1s"
                    ></div>
                    <span>隐私保护</span>
                </span>
            </div>
        </div>
    </footer>
</template>

<!-- 
  注：此组件使用 Tailwind CSS 工具类，无需 scoped 样式
  渐变色文字效果（gradient-text）在全局 CSS 中定义
  脉冲动画（animate-pulse）由 Tailwind CSS 提供
-->
