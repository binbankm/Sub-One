<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { storeToRefs } from 'pinia';

import type { Profile } from '@/common/types/index';
import NodeDistributionChart from '@/widgets/dashboard/NodeDistributionChart.vue';

import { useDataStore } from '@/stores/useAppStore';
import { useNotificationStore as useToastStore } from '@/stores/useNotificationStore';

defineEmits<{
    (e: 'add-subscription'): void;
    (e: 'update-all-subscriptions'): void;
    (e: 'add-node'): void;
    (e: 'add-profile'): void;
}>();
const { showToast } = useToastStore();
const dataStore = useDataStore();
const { activeSubscriptions, manualNodes, profiles, totalNodeCount, activeNodeCount } =
    storeToRefs(dataStore);

// Computed for Display
const { t, tm } = useI18n();
const activeProfilesCount = computed(() => profiles.value.filter((p: Profile) => p.enabled).length);
const isUpdatingAllSubs = ref(false);

const handleUpdateAll = async () => {
    isUpdatingAllSubs.value = true;
    const result = await dataStore.updateAllEnabledSubscriptions();
    isUpdatingAllSubs.value = false;

    if (result.success) {
        if (result.count && result.count > 0) {
            showToast(t('views.dashboard.messages.updateSuccess', { count: result.count }), 'success');
        } else {
            showToast(t('views.dashboard.messages.allUpToDate'), 'success');
        }
    } else {
        showToast(result.message || t('views.dashboard.messages.updateFailed'), 'error');
    }
};

const quotes = computed(() => tm('views.dashboard.quotes') as any[]);

const currentQuoteIndex = ref(0);
const currentQuote = computed(() => quotes.value[currentQuoteIndex.value] || quotes.value[0]);
const isRefreshing = ref(false);

/** 获取随机语录（避免重复） */
const getRandomQuoteIndex = () => {
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * quotes.value.length);
    } while (newIndex === currentQuoteIndex.value && quotes.value.length > 1);
    return newIndex;
};

/** 刷新语录 */
const refreshQuote = () => {
    isRefreshing.value = true;
    setTimeout(() => {
        currentQuoteIndex.value = getRandomQuoteIndex();
        isRefreshing.value = false;
    }, 300);
};

const quoteCategoryClass = computed(() => {
    const cat = currentQuote.value.category;
    if (['Inspirational', '励志'].includes(cat)) {
        return 'border-yellow-400/30 bg-yellow-400/20 text-yellow-700 dark:text-yellow-300';
    }
    if (['Technical', '技术'].includes(cat)) {
        return 'border-info-400/30 bg-info-400/20 text-info-700 dark:text-info-300';
    }
    if (['Humor', '幽默'].includes(cat)) {
        return 'border-success-400/30 bg-success-400/20 text-success-700 dark:text-success-300';
    }
    return 'border-primary-400/30 bg-primary-400/20 text-primary-700 dark:text-primary-300';
});

onMounted(() => {
    currentQuoteIndex.value = getRandomQuoteIndex();
});
</script>

<template>
    <div class="space-y-6">
        <!-- 励志语录卡片 -->
        <div
            class="card-glass group relative overflow-hidden rounded-card p-6 shadow-elevated transition-all duration-500 hover:shadow-card"
        >
            <div class="relative z-10">
                <!-- 标题栏 -->
                <div class="mb-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div
                            class="flex h-9 w-9 items-center justify-center rounded-element border border-gray-300 bg-gray-100 backdrop-blur-md dark:border-white/10 dark:bg-white/10"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-5 w-5 text-secondary-600 dark:text-secondary-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-gray-800 dark:text-white">
                                {{ t('views.dashboard.dailyQuote') }}
                            </h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                {{ t('views.dashboard.dailyInspiration') }}
                            </p>
                        </div>
                    </div>

                    <!-- 分类标签和刷新按钮 -->
                    <div class="flex items-center gap-2">
                        <span
                            class="rounded-element border px-2.5 py-1 text-xs font-medium backdrop-blur-md transition-all duration-300"
                            :class="quoteCategoryClass"
                        >
                            {{ currentQuote.category }}
                        </span>

                        <button
                            :disabled="isRefreshing"
                            class="flex h-8 w-8 items-center justify-center rounded-element border border-gray-300 bg-white/30 text-gray-700 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/50 active:scale-95 disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
                            :title="t('views.dashboard.nextQuote')"
                            @click="refreshQuote"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4 transition-transform duration-500"
                                :class="{ 'rotate-180': isRefreshing }"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- 语录内容 -->
                <div :key="currentQuote.text" class="quote-content animate-fadeIn">
                    <blockquote class="my-3">
                        <p
                            class="mb-2 text-center text-lg leading-relaxed font-semibold text-gray-800 md:text-xl dark:text-white"
                        >
                            "{{ currentQuote.text }}"
                        </p>
                        <footer class="flex items-center gap-2">
                            <div class="h-px flex-1 bg-gray-300/30 dark:bg-white/10"></div>
                            <cite
                                class="text-xs font-medium text-gray-600 not-italic dark:text-gray-400"
                            >
                                {{ currentQuote.author }}
                            </cite>
                            <div class="h-px flex-1 bg-gray-300/30 dark:bg-white/10"></div>
                        </footer>
                    </blockquote>
                </div>
            </div>
        </div>

        <!-- Bento Grid 布局 -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
            <!-- 核心统计图表 (占2列) -->
            <div
                class="card-glass group relative flex min-h-75 flex-col overflow-hidden rounded-card p-6 shadow-card md:col-span-2"
            >
                <div class="relative z-10 mb-6 flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ t('views.dashboard.nodeOverview') }}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ t('views.dashboard.nodeDistribution') }}
                        </p>
                    </div>
                    <div class="flex gap-4">
                        <div class="text-right">
                            <div
                                class="text-[10px] font-bold tracking-wider text-gray-400 uppercase"
                            >
                                {{ t('views.dashboard.activeRate') }}
                            </div>
                            <div class="text-lg font-black text-primary-600 dark:text-primary-400">
                                {{
                                    totalNodeCount > 0
                                        ? Math.round((activeNodeCount / totalNodeCount) * 100)
                                        : 0
                                }}%
                            </div>
                        </div>
                    </div>
                </div>

                <div class="relative z-10 flex flex-1 flex-col items-center gap-6 sm:flex-row">
                    <!-- 图表区域 -->
                    <div class="h-55 w-full sm:w-1/2">
                        <NodeDistributionChart
                            :subscribed-nodes="totalNodeCount - manualNodes.length"
                            :manual-nodes="manualNodes.length"
                            :active-nodes="activeNodeCount"
                            :total-nodes="totalNodeCount"
                        />
                    </div>

                    <!-- 详细指标 -->
                    <div class="grid w-full grid-cols-2 gap-4 sm:w-1/2">
                        <div
                            class="rounded-button border border-gray-300 bg-white/50 p-4 shadow-elevated-sm dark:border-white/10 dark:bg-white/5"
                        >
                            <div class="mb-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ t('views.dashboard.activeSubscriptions') }}
                            </div>
                            <div class="text-xl font-bold text-gray-900 dark:text-white">
                                {{ activeSubscriptions.length }}
                            </div>
                        </div>
                        <div
                            class="rounded-button border border-gray-300 bg-white/50 p-4 shadow-elevated-sm dark:border-white/10 dark:bg-white/5"
                        >
                            <div class="mb-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ t('views.dashboard.activeNodes') }}
                            </div>
                            <div class="text-xl font-bold text-success-500">
                                {{ activeNodeCount }}
                            </div>
                        </div>
                        <div
                            class="rounded-button border border-gray-300 bg-white/50 p-4 shadow-elevated-sm dark:border-white/10 dark:bg-white/5"
                        >
                            <div class="mb-1 text-xs text-gray-500 dark:text-gray-400">{{ t('views.dashboard.profiles') }}</div>
                            <div class="text-xl font-bold text-secondary-500">
                                {{ profiles.length }}
                            </div>
                        </div>
                        <div
                            class="rounded-button border border-gray-300 bg-white/50 p-4 shadow-elevated-sm dark:border-white/10 dark:bg-white/5"
                        >
                            <div class="mb-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ t('views.dashboard.manualNodes') }}
                            </div>
                            <div class="text-xl font-bold text-warning-500">
                                {{ manualNodes.length }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 智能更新卡片 -->
            <div class="flex flex-col gap-4 lg:gap-6">
                <button
                    :disabled="isUpdatingAllSubs"
                    class="card-glass group relative flex flex-1 flex-col justify-between overflow-hidden rounded-card p-6 text-left shadow-elevated transition-all duration-300 hover:shadow-card"
                    @click="handleUpdateAll"
                >
                    <div
                        class="absolute inset-0 bg-linear-to-br from-info-50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:from-info-900/10 dark:to-transparent"
                    ></div>
                    <div class="relative z-10">
                        <div
                            class="mb-4 flex h-12 w-12 items-center justify-center rounded-button bg-info-500/10 text-info-600 transition-transform duration-300 group-hover:scale-110 dark:bg-info-500/20 dark:text-info-400"
                        >
                            <svg
                                v-if="!isUpdatingAllSubs"
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            <svg
                                v-else
                                class="h-6 w-6 animate-spin"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    class="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="4"
                                ></circle>
                                <path
                                    class="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                        </div>
                        <h3 class="mb-1 text-xl font-bold text-gray-900 dark:text-white">
                            {{ isUpdatingAllSubs ? t('views.dashboard.updating') : t('views.dashboard.updateNow') }}
                        </h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            {{
                                isUpdatingAllSubs
                                    ? t('views.dashboard.syncLatest')
                                    : t('views.dashboard.syncAll')
                            }}
                        </p>
                    </div>
                </button>

                <!-- 订阅组指示 -->
                <div class="card-glass relative flex-1 rounded-card p-6 shadow-elevated-sm">
                    <div class="mb-2 flex items-start justify-between">
                        <div
                            class="flex h-10 w-10 items-center justify-center rounded-element bg-secondary-500/20 text-secondary-600 dark:text-secondary-400"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                        </div>
                        <span
                            class="rounded-full bg-secondary-500 px-2 py-0.5 text-[10px] font-bold text-white"
                            >{{ t('views.dashboard.activeCount', { count: activeProfilesCount }) }}</span
                        >
                    </div>
                    <div class="text-2xl font-black text-gray-900 dark:text-white">
                        {{ profiles.length }}
                        <span class="text-sm font-normal text-gray-500">{{ t('views.dashboard.profiles') }}</span>
                    </div>
                    <!-- 迷你进度条 -->
                    <div
                        class="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
                    >
                        <div
                            class="h-full rounded-full bg-secondary-500 transition-all duration-1000"
                            :style="{
                                width:
                                    profiles.length > 0
                                        ? `${(activeProfilesCount / profiles.length) * 100}%`
                                        : '0%'
                            }"
                        ></div>
                    </div>
                </div>
            </div>

            <!-- 快捷操作按钮 (3个) -->
            <button
                class="card-glass group flex min-h-30 items-center gap-4 rounded-card p-6 shadow-elevated-sm transition-all duration-300 hover:border-primary-200 hover:shadow-elevated-sm dark:hover:border-primary-800"
                @click="$emit('add-subscription')"
            >
                <div
                    class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-colors duration-300 group-hover:bg-primary-500 group-hover:text-white dark:bg-white/10 dark:group-hover:bg-primary-500"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                </div>
                <div class="text-left">
                    <p
                        class="font-bold text-gray-900 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400"
                    >
                        {{ t('views.dashboard.addSubscription') }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('views.dashboard.supportsHttp') }}</p>
                </div>
            </button>

            <button
                class="card-glass group flex min-h-30 items-center gap-4 rounded-card p-6 shadow-elevated-sm transition-all duration-300 hover:border-primary-200 hover:shadow-elevated-sm dark:hover:border-primary-800"
                @click="$emit('add-node')"
            >
                <div
                    class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-colors duration-300 group-hover:bg-primary-500 group-hover:text-white dark:bg-white/10 dark:group-hover:bg-primary-500"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                </div>
                <div class="text-left">
                    <p
                        class="font-bold text-gray-900 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400"
                    >
                        {{ t('views.dashboard.addNode') }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('views.dashboard.supportsProtocols') }}</p>
                </div>
            </button>

            <button
                class="card-glass group flex min-h-30 items-center gap-4 rounded-card p-6 shadow-elevated-sm transition-all duration-300 hover:border-primary-200 hover:shadow-elevated-sm dark:hover:border-primary-800"
                @click="$emit('add-profile')"
            >
                <div
                    class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-colors duration-300 group-hover:bg-primary-500 group-hover:text-white dark:bg-white/10 dark:group-hover:bg-primary-500"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                    </svg>
                </div>
                <div class="text-left">
                    <p
                        class="font-bold text-gray-900 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400"
                    >
                        {{ t('views.dashboard.createProfile') }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('views.dashboard.combineSubs') }}</p>
                </div>
            </button>
        </div>
    </div>
</template>

<style scoped>
/* 语录淡入动画 */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
}

.quote-content:hover {
    transform: scale(1.01);
    transition: transform 0.3s ease;
}
</style>
