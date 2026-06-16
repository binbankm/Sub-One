<!--
  ==================== 节点详情模态框 ====================
  
  功能说明：
  - 查看订阅或订阅组的所有节点信息
  - 支持搜索和筛选节点（含国家/地区别名智能匹配）
  - 支持批量选择和复制节点
  - 显示节点协议、名称、URL等详细信息
  - 区分订阅组中的订阅节点和手动节点
  
  使用场景：
  - 查看单个订阅的节点列表
  - 查看订阅组聚合后的所有节点
  - 复制选中的节点链接
  
  ==================================================
-->

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useNodeFetching } from '@/entities/node/model/useNodeFetching';
import { useNodeSelection } from '@/entities/node/model/useNodeSelection';
import type { Profile, Subscription } from '@/common/types/index';
import { getProtocolInfo } from '@/common/utils/protocols';
import { filterNodes } from '@/common/utils/search';

const props = defineProps<{
    show: boolean;
    subscription?:
        | Subscription
        | { name: string; url: string; exclude?: string; nodeCount?: number }
        | null;
    profile?: Profile | null;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
}>();

const searchTerm = ref('');
const { t } = useI18n();

// 抽取的核心逻辑 Hooks
const { nodes, isLoading, errorMessage, loadData, refreshNodes, extractHost } =
    useNodeFetching(props);

// 过滤计算属性
const filteredNodes = computed(() => {
    return filterNodes(nodes.value, searchTerm.value);
});

const {
    selectedNodes,
    toggleNodeSelection,
    toggleSelectAll,
    copySelectedNodes,
    handleCopySingle,
    clearSelection
} = useNodeSelection(filteredNodes);

// 监听展示状态，载入数据或重置状态
watch(
    () => props.show,
    async (newVal) => {
        if (newVal) {
            await loadData();
        } else {
            searchTerm.value = '';
            clearSelection();
        }
    }
);

// 键盘事件：Esc 关闭模态框
const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.show) {
        emit('update:show', false);
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
    <Teleport to="body">
        <Transition name="fade">
            <div
                v-if="show"
                class="fixed inset-0 z-99 flex items-center justify-center bg-black/60 p-4"
                @click="emit('update:show', false)"
            >
                <Transition name="scale-fade-bounce">
                    <div
                        v-if="show"
                        class="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-card border border-gray-300 bg-white text-left shadow-modal dark:border-white/10 dark:bg-black/80"
                        @click.stop
                    >
                        <!-- 标题 -->
                        <div class="shrink-0 p-6 pb-4">
                            <h3 class="gradient-text text-xl font-bold">{{ t('widgets.node.detailsModal.title') }}</h3>
                        </div>

                        <!-- 内容 -->
                        <div class="grow overflow-y-auto px-6 pb-6">
                            <div class="space-y-4">
                                <!-- 订阅/订阅组信息头部 -->
                                <div
                                    v-if="subscription || profile"
                                    class="rounded-element border border-gray-300 bg-gray-50/60 p-4 dark:border-white/10 dark:bg-white/5"
                                >
                                    <div
                                        class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"
                                    >
                                        <div class="min-w-0 flex-1">
                                            <h3
                                                class="truncate font-semibold text-gray-900 dark:text-gray-100"
                                            >
                                                {{
                                                    subscription
                                                        ? subscription.name || t('widgets.node.detailsModal.unnamedSub')
                                                        : profile?.name || t('widgets.node.detailsModal.unnamedProfile')
                                                }}
                                            </h3>
                                            <p
                                                class="mt-1 text-sm break-all text-gray-500 dark:text-gray-400"
                                            >
                                                <span v-if="subscription">{{
                                                    subscription.url
                                                }}</span>
                                                <span v-else-if="profile"
                                                    >{{ t('widgets.node.detailsModal.contains', { subCount: profile.subscriptions?.length ?? 0, manualCount: profile.manualNodes?.length ?? 0 }) }}</span
                                                >
                                            </p>
                                        </div>
                                        <div class="shrink-0 text-right">
                                            <p class="text-sm text-gray-600 dark:text-gray-300">
                                                {{ t('widgets.node.detailsModal.totalNodes', { count: nodes.length }) }}
                                            </p>
                                            <p
                                                v-if="subscription && subscription.nodeCount"
                                                class="text-xs text-gray-500 dark:text-gray-400"
                                            >
                                                {{ t('widgets.node.detailsModal.lastUpdate', { count: subscription.nodeCount }) }}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <!-- 搜索和操作栏 -->
                                <div class="flex items-center justify-between gap-4">
                                    <div class="relative flex-1">
                                        <input
                                            v-model="searchTerm"
                                            type="text"
                                            :placeholder="t('widgets.node.detailsModal.searchPlaceholder')"
                                            class="search-input-unified w-full"
                                        />
                                        <svg
                                            class="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                            />
                                        </svg>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <button
                                            :disabled="isLoading"
                                            class="btn-modern px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                            @click="refreshNodes"
                                        >
                                            <svg
                                                v-if="isLoading"
                                                class="h-4 w-4 animate-spin"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    class="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    stroke-width="4"
                                                    fill="none"
                                                ></circle>
                                                <path
                                                    class="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            <span v-else>{{ t('widgets.node.detailsModal.refresh') }}</span>
                                        </button>

                                        <button
                                            :disabled="selectedNodes.size === 0"
                                            class="transform rounded-element bg-linear-to-r from-success-500 to-success-600 px-4 py-2 text-sm text-white shadow-elevated transition-all duration-300 hover:scale-105 hover:from-success-600 hover:to-success-700 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50"
                                            @click="copySelectedNodes"
                                        >
                                            {{ t('widgets.node.detailsModal.copySelected') }}
                                        </button>
                                    </div>
                                </div>

                                <!-- 错误信息 -->
                                <div
                                    v-if="errorMessage"
                                    class="rounded-element border border-danger-200 bg-danger-50 p-3 dark:border-danger-800 dark:bg-danger-900/20"
                                >
                                    <p class="text-sm text-danger-600 dark:text-danger-400">
                                        {{ errorMessage }}
                                    </p>
                                </div>

                                <!-- 加载状态 -->
                                <div v-if="isLoading" class="flex items-center justify-center py-8">
                                    <div
                                        class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"
                                    ></div>
                                    <span class="ml-2 text-gray-600 dark:text-gray-400"
                                        >{{ t('widgets.node.detailsModal.loading') }}</span
                                    >
                                </div>

                                <!-- 节点列表 -->
                                <div v-else-if="filteredNodes.length > 0" class="space-y-2">
                                    <!-- 全选按钮 -->
                                    <div
                                        class="flex items-center justify-between rounded-element bg-gray-50/60 p-3 dark:bg-white/5"
                                    >
                                        <label class="flex cursor-pointer items-center">
                                            <input
                                                type="checkbox"
                                                :checked="
                                                    selectedNodes.size === filteredNodes.length &&
                                                    filteredNodes.length > 0
                                                "
                                                :indeterminate="
                                                    selectedNodes.size > 0 &&
                                                    selectedNodes.size < filteredNodes.length
                                                "
                                                class="h-4 w-4 rounded border-gray-300 text-primary-600"
                                                @change="toggleSelectAll"
                                            />
                                            <span
                                                class="ml-2 text-sm text-gray-700 dark:text-gray-300"
                                            >
                                                {{ t('widgets.node.detailsModal.selectAll', { selected: selectedNodes.size, total: filteredNodes.length }) }}
                                            </span>
                                        </label>
                                    </div>

                                    <!-- 节点卡片列表 - 重新设计 (同步 ManualNodeCard 视觉) -->
                                    <div
                                        class="custom-scrollbar max-h-96 space-y-3 overflow-y-auto pr-1"
                                    >
                                        <div
                                            v-for="node in filteredNodes"
                                            :key="node.id"
                                            class="group relative cursor-pointer overflow-hidden rounded-button border border-gray-300 bg-white/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated hover:shadow-primary-500/10 dark:border-white/10 dark:bg-white/5"
                                            :class="{
                                                'border-primary-500/50 ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-black/80':
                                                    selectedNodes.has(node.id),
                                                'border-gray-300 dark:border-white/10':
                                                    !selectedNodes.has(node.id)
                                            }"
                                            @click="toggleNodeSelection(node.id)"
                                        >
                                            <!-- 顶部彩色条 -->
                                            <div
                                                class="h-1 bg-linear-to-r opacity-80"
                                                :class="getProtocolInfo(node.protocol).gradient"
                                            ></div>

                                            <div class="p-4">
                                                <!-- 头部信息 -->
                                                <div
                                                    class="mb-3 flex items-start justify-between gap-3"
                                                >
                                                    <div
                                                        class="flex items-center gap-3 overflow-hidden"
                                                    >
                                                        <!-- 选择框 -->
                                                        <div class="shrink-0" @click.stop>
                                                            <div
                                                                class="relative flex h-5 w-5 items-center justify-center"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    :checked="
                                                                        selectedNodes.has(node.id)
                                                                    "
                                                                    class="peer h-5 w-5 cursor-pointer appearance-none rounded-element border-2 border-gray-300 transition-colors checked:border-primary-500 checked:bg-primary-500 dark:border-white/10"
                                                                    @change="
                                                                        toggleNodeSelection(node.id)
                                                                    "
                                                                />
                                                                <svg
                                                                    class="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                                                                    viewBox="0 0 14 14"
                                                                    fill="none"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                >
                                                                    <path
                                                                        d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                                                                        stroke="currentColor"
                                                                        stroke-width="2"
                                                                        stroke-linecap="round"
                                                                        stroke-linejoin="round"
                                                                    />
                                                                </svg>
                                                            </div>
                                                        </div>

                                                        <div
                                                            class="flex flex-wrap items-center gap-2"
                                                        >
                                                            <!-- 协议标签 -->
                                                            <span
                                                                class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide uppercase shadow-elevated-sm"
                                                                :class="[
                                                                    getProtocolInfo(node.protocol)
                                                                        .bg,
                                                                    getProtocolInfo(node.protocol)
                                                                        .color,
                                                                    'bg-opacity-10 dark:bg-opacity-20 border-transparent'
                                                                ]"
                                                            >
                                                                <span
                                                                    class="text-sm font-normal drop-shadow-elevated-sm filter"
                                                                    >{{
                                                                        getProtocolInfo(
                                                                            node.protocol
                                                                        ).icon
                                                                    }}</span
                                                                >
                                                                <span>{{
                                                                    getProtocolInfo(node.protocol)
                                                                        .text
                                                                }}</span>
                                                            </span>

                                                            <!-- 来源标签 -->
                                                            <template v-if="profile">
                                                                <span
                                                                    v-if="
                                                                        node.type === 'subscription'
                                                                    "
                                                                    class="inline-flex items-center gap-1 rounded-element border border-info-100 bg-info-50 px-2 py-1 text-[10px] font-medium text-info-600 dark:border-info-800/30 dark:bg-info-900/20 dark:text-info-400"
                                                                >
                                                                    {{ node.subscriptionName }}
                                                                </span>
                                                                <span
                                                                    v-else-if="
                                                                        node.type === 'manual'
                                                                    "
                                                                    class="inline-flex items-center gap-1 rounded-element border border-success-100 bg-success-50 px-2 py-1 text-[10px] font-medium text-success-600 dark:border-success-800/30 dark:bg-success-900/20 dark:text-success-400"
                                                                >
                                                                    {{ t('widgets.node.detailsModal.manual') }}
                                                                </span>
                                                            </template>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- 节点名称 -->
                                                <div class="mb-3 pl-8">
                                                    <h4
                                                        class="text-base leading-snug font-bold wrap-break-word text-gray-800 dark:text-gray-100"
                                                    >
                                                        {{ node.name }}
                                                    </h4>
                                                </div>

                                                <!-- 底部信息：地址 & 复制 -->
                                                <div
                                                    class="flex items-center justify-between gap-2 border-t border-gray-50 pt-2 pl-8 text-xs dark:border-white/10/50"
                                                >
                                                    <div
                                                        class="flex items-center gap-1.5 overflow-hidden text-gray-500 dark:text-gray-400"
                                                        :title="t('widgets.node.detailsModal.serverAddr')"
                                                    >
                                                        <svg
                                                            class="h-3.5 w-3.5 shrink-0"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                stroke-width="2"
                                                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                                            />
                                                        </svg>
                                                        <span class="truncate font-mono">
                                                            {{
                                                                node.server && node.port
                                                                    ? `${node.server}:${node.port}`
                                                                    : extractHost(node.url)
                                                            }}
                                                        </span>
                                                    </div>

                                                    <button
                                                        class="flex items-center gap-1 rounded-element bg-gray-50 px-2 py-1 font-medium text-gray-400 transition-all hover:bg-primary-50 hover:text-primary-600 dark:bg-white/5 dark:hover:bg-primary-900/30 dark:hover:text-primary-400"
                                                        :title="t('widgets.node.detailsModal.copyLink')"
                                                        @click.stop="handleCopySingle(node.url)"
                                                    >
                                                        <span class="hidden sm:inline">{{ t('widgets.node.detailsModal.copyBtn') }}</span>
                                                        <svg
                                                            class="h-3.5 w-3.5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            stroke-width="2"
                                                        >
                                                            <path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 01-2-2V3"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 空状态 -->
                                <div v-else class="py-8 text-center">
                                    <div class="mb-2 text-gray-400 dark:text-gray-500">
                                        <svg
                                            class="mx-auto h-12 w-12"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                            />
                                        </svg>
                                    </div>
                                    <p class="text-gray-500 dark:text-gray-400">
                                        {{ searchTerm ? t('widgets.node.detailsModal.noMatch') : t('widgets.node.detailsModal.empty') }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- 底部按钮 -->
                        <div
                            class="flex shrink-0 justify-end space-x-3 border-t border-gray-300 p-6 pt-4 dark:border-white/10"
                        >
                            <button
                                class="rounded-element bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-300 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/10"
                                @click="emit('update:show', false)"
                            >
                                {{ t('widgets.node.detailsModal.close') }}
                            </button>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>
