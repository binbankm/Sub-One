<!--
  ==================== 帮助文档模态框 ====================
  
  功能说明：
  - 展示应用的完整帮助文档
  - 提供快速开始指南
  - 介绍各项功能特性
  - 常见问题解答（FAQ）
  
  重构设计：
  - 采用 Tab 分页导航 (快速上手 / 功能详解 / 常见问题)
  - FAQ 采用手风琴折叠交互
  - 优化的视觉排版
  ==================================================
-->

<script setup lang="ts">
import { ref } from 'vue';

import Modal from '../../../shared/components/ui/BaseModal.vue';

// ==================== Props 和 Emit ====================

defineProps<{
    show: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
}>();

// ==================== 状态管理 ====================

type TabType = 'guide' | 'features' | 'faq';
const activeTab = ref<TabType>('guide');

// FAQ 折叠状态管理
const activeFaqIndex = ref<number | null>(0); // 默认展开第一个
const toggleFaq = (index: number) => {
    activeFaqIndex.value = activeFaqIndex.value === index ? null : index;
};

// ==================== 数据源 ====================

const faqs = [
    {
        q: '如何添加订阅？',
        a: '在首页点击"添加订阅"按钮，输入订阅链接（支持 HTTP/HTTPS），系统会自动解析其中的节点信息。支持 Clash、Surge、V2Ray 等多种格式链接。',
        icon: 'M12 4v16m8-8H4'
    },
    {
        q: '如何生成订阅链接？',
        a: '在仪表盘或订阅组卡片中，点击"导出"或"链接"按钮。选择您需要的客户端格式（如 Clash, Shadowrocket），然后点击复制即可。',
        icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
    },
    {
        q: '支持哪些客户端格式？',
        a: 'Sub-One 支持几乎所有主流客户端，包括 Clash (Meta), Surge, Loon, Shadowrocket, Quantumult X, Sing-Box, V2Ray, Surfboard 等。',
        icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
    },
    {
        q: '什么是订阅 Token？',
        a: '订阅 Token 是用于生成固定订阅链接的密钥。在"系统设置"中配置后，您的订阅链接将包含此 Token，即使服务器重启或迁移，只要 Token 不变，链接依然有效。',
        icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
    },
    {
        q: '如何进行批量操作？',
        a: '在订阅列表页，点击右上角的"多选/批量"图标进入批量模式。选择多个订阅后，可以进行批量删除、批量更新或批量启用/禁用操作。',
        icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
    }
];

const features = [
    {
        title: '订阅管理',
        desc: '支持多种格式订阅自动解析，流量与过期时间监控，定时自动更新。',
        icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
        color: 'from-blue-500 to-indigo-600'
    },
    {
        title: '订阅组',
        desc: '将多个订阅源组合成一个大的订阅，支持自定义筛选规则和排除规则。',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        color: 'from-purple-500 to-pink-600'
    },
    {
        title: '手动节点',
        desc: '支持手动添加单个节点，或批量导入节点链接，支持智能去重排序。',
        icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
        color: 'from-green-500 to-emerald-600'
    },
    {
        title: '格式转换',
        desc: '内置强大的格式转换引擎，支持生成适配各种主流客户端的配置文件。',
        icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
        color: 'from-orange-500 to-red-600'
    }
];
</script>

<template>
    <Modal
        :show="show"
        size="4xl"
        @update:show="emit('update:show', $event)"
        @confirm="emit('update:show', false)"
    >
        <template #title>
            <div class="flex items-center gap-3">
                <div
                    class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                    </svg>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">帮助中心</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Documentation & Guides</p>
                </div>
            </div>
        </template>

        <template #body>
            <div class="min-h-75">
                <!-- Tab Navigation -->
                <div class="mb-8 flex justify-center border-b border-gray-300 dark:border-gray-700">
                    <nav class="-mb-px flex space-x-8">
                        <button
                            v-for="tab in [
                                { id: 'guide', label: '🚀 快速上手' },
                                { id: 'features', label: '✨ 功能详解' },
                                { id: 'faq', label: '❓ 常见问题' }
                            ]"
                            :key="tab.id"
                            :class="[
                                activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
                                'whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-all duration-200'
                            ]"
                            @click="activeTab = tab.id as TabType"
                        >
                            {{ tab.label }}
                        </button>
                    </nav>
                </div>

                <!-- Tab: 快速上手 -->
                <Transition name="fade" mode="out-in">
                    <div v-if="activeTab === 'guide'" class="px-2">
                        <div class="relative space-y-8">
                            <!-- 连线 -->
                            <div
                                class="absolute left-6.75 top-8 h-[calc(100%-60px)] w-0.5 bg-gray-200 dark:bg-gray-700"
                            ></div>

                            <!-- 步骤 1 -->
                            <div class="relative flex gap-6 group">
                                <div
                                    class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600 ring-4 ring-white transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg dark:bg-blue-900/30 dark:text-blue-400 dark:ring-gray-900 dark:group-hover:bg-blue-500 dark:group-hover:text-white"
                                >
                                    1
                                </div>
                                <div
                                    class="flex-1 rounded-2xl border border-gray-300 bg-white p-5 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                                >
                                    <h4 class="mb-2 text-lg font-bold text-gray-900 dark:text-white">
                                        添加订阅源
                                    </h4>
                                    <p class="text-gray-600 dark:text-gray-300">
                                        在首页点击<span class="font-bold text-indigo-600">
                                            + 添加订阅</span
                                        >按钮，粘贴您的机场订阅链接。系统会自动下载并解析所有节点信息。
                                    </p>
                                </div>
                            </div>

                            <!-- 步骤 2 -->
                            <div class="relative flex gap-6 group">
                                <div
                                    class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-xl font-bold text-purple-600 ring-4 ring-white transition-all duration-300 group-hover:bg-purple-600 group-hover:text-white group-hover:shadow-lg dark:bg-purple-900/30 dark:text-purple-400 dark:ring-gray-900 dark:group-hover:bg-purple-500 dark:group-hover:text-white"
                                >
                                    2
                                </div>
                                <div
                                    class="flex-1 rounded-2xl border border-gray-300 bg-white p-5 shadow-sm transition-all duration-300 hover:border-purple-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                                >
                                    <h4 class="mb-2 text-lg font-bold text-gray-900 dark:text-white">
                                        创建订阅组 (可选)
                                    </h4>
                                    <p class="text-gray-600 dark:text-gray-300">
                                        如果您有多个订阅，可以创建一个
                                        <span class="font-bold text-purple-600">订阅组</span>。
                                        将它们聚合在一起，还可以设置过滤规则来排除不需要的节点。
                                    </p>
                                </div>
                            </div>

                            <!-- 步骤 3 -->
                            <div class="relative flex gap-6 group">
                                <div
                                    class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl font-bold text-emerald-600 ring-4 ring-white transition-all duration-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-lg dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-gray-900 dark:group-hover:bg-emerald-500 dark:group-hover:text-white"
                                >
                                    3
                                </div>
                                <div
                                    class="flex-1 rounded-2xl border border-gray-300 bg-white p-5 shadow-sm transition-all duration-300 hover:border-emerald-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                                >
                                    <h4 class="mb-2 text-lg font-bold text-gray-900 dark:text-white">
                                        导出使用
                                    </h4>
                                    <p class="text-gray-600 dark:text-gray-300">
                                        点击订阅或订阅组上的
                                        <span class="font-bold text-emerald-600">导出/链接</span>
                                        按钮。 选择适配您的客户端（如 Clash, Shadowrocket）的格式，
                                        复制链接即可使用。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab: 功能详解 -->
                    <div v-else-if="activeTab === 'features'" class="px-2">
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div
                                v-for="(feat, idx) in features"
                                :key="idx"
                                class="shadow-modern hover-lift group relative overflow-hidden rounded-2xl border border-gray-300 bg-white p-6 transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
                            >

                                <div class="flex items-start gap-4">
                                    <div
                                        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-110"
                                        :class="feat.color"
                                    >
                                        <svg
                                            class="h-6 w-6"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                :d="feat.icon"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4
                                            class="mb-2 text-lg font-bold text-gray-900 dark:text-white"
                                        >
                                            {{ feat.title }}
                                        </h4>
                                        <p
                                            class="text-sm leading-relaxed text-gray-600 dark:text-gray-300"
                                        >
                                            {{ feat.desc }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab: 常见问题 -->
                    <div v-else-if="activeTab === 'faq'" class="px-2">
                        <div class="space-y-4">
                            <div
                                v-for="(item, index) in faqs"
                                :key="index"
                                class="overflow-hidden rounded-2xl border border-gray-300 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
                                :class="{
                                    'shadow-md ring-1 ring-indigo-500/50 dark:ring-indigo-400/50':
                                        activeFaqIndex === index
                                }"
                            >
                                <button
                                    class="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    @click="toggleFaq(index)"
                                >
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-300 text-gray-500 transition-colors dark:bg-gray-700 dark:text-gray-400"
                                            :class="{
                                                'bg-indigo-100! text-indigo-600! dark:bg-indigo-900/30! dark:text-indigo-400!':
                                                    activeFaqIndex === index
                                            }"
                                        >
                                            <svg
                                                class="h-5 w-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    :d="item.icon"
                                                />
                                            </svg>
                                        </div>
                                        <span class="font-bold text-gray-800 dark:text-gray-200">{{
                                            item.q
                                        }}</span>
                                    </div>
                                    <svg
                                        class="h-5 w-5 text-gray-400 transition-transform duration-300"
                                        :class="{ 'rotate-180': activeFaqIndex === index }"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </button>
                                <div
                                    v-show="activeFaqIndex === index"
                                    class="border-t border-gray-100 bg-gray-50/50 p-5 dark:border-gray-700 dark:bg-gray-900/30"
                                >
                                    <p class="text-sm leading-7 text-gray-600 dark:text-gray-300">
                                        {{ item.a }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Transition>
            </div>
        </template>
    </Modal>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition:
        opacity 0.2s ease,
        transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(5px);
}
</style>

