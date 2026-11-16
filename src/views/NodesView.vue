<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { storeToRefs } from 'pinia';

import { useNodeManagement } from '@/entities/node/model/useNodeManagement';
import { useBatchSelection } from '@/common/hooks/useBatchSelection';
import { usePagination } from '@/common/hooks/usePagination';
import { useTabActionTrigger } from '@/common/hooks/useTabActionTrigger';
import type { Node } from '@/common/types/index';
import { getProtocol, getProtocolInfo } from '@/common/utils/protocols';
import { copyToClipboard } from '@/common/utils/utils';
import BatchActionToolbar from '@/common/ui/BatchActionToolbar.vue';
import ConfirmModal from '@/common/ui/ConfirmModal.vue';
import EmptyState from '@/common/ui/EmptyState.vue';
import MoreMenu from '@/common/ui/MoreMenu.vue';
import Pagination from '@/common/ui/Pagination.vue';
import draggable from 'vuedraggable';

import { useDataStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useNotificationStore';

import ManualNodeCard from '@/widgets/node/ManualNodeCard.vue';

const props = defineProps<{
    tabAction?: { action: string } | null;
}>();

const emit = defineEmits<{
    (e: 'action-handled'): void;
}>();

// Async Components
const NodeModal = defineAsyncComponent(() => import('@/widgets/node/NodeModal.vue'));
const BulkImportModal = defineAsyncComponent(() => import('@/common/ui/BulkImportModal.vue'));
const SubscriptionImportModal = defineAsyncComponent(
    () => import('@/widgets/node/SubscriptionImportModal.vue')
);

const dataStore = useDataStore();
const toastStore = useToastStore();
const { manualNodes } = storeToRefs(dataStore);
const { t } = useI18n();

// Protocol & View Mode State
const selectedProtocol = ref<string>('all');
const viewMode = ref<'cards' | 'table'>(
    (localStorage.getItem('subone_nodes_view_mode') as 'cards' | 'table') || 'table'
);

watch(viewMode, (newMode) => {
    localStorage.setItem('subone_nodes_view_mode', newMode);
});

// Hooks
const {
    searchTerm,
    isSortingNodes,
    hasUnsavedSortChanges,
    filteredNodes,
    isNewNode,
    editingNode,
    showNodeModal,
    showBulkImportModal,
    showSubscriptionImportModal,
    showDeleteNodesModal,
    showDeleteSingleNodeModal,
    handleAddNode,
    handleEditNode,
    handleSaveNode,
    handleDeleteNode,
    handleConfirmDeleteSingleNode,
    handleDeleteAllNodes,
    handleBatchDelete,
    handleBulkImport,
    handleDeduplicate,
    handleAutoSort,
    handleToggleSort,
    handleSaveSort,
    handleDragEnd
} = useNodeManagement();

// Protocol counts calculation
const protocolFilters = computed(() => {
    const counts: Record<string, number> = {
        all: manualNodes.value?.length || 0,
        ss: 0,
        vmess: 0,
        vless: 0,
        trojan: 0,
        hysteria2: 0,
        hysteria: 0,
        tuic: 0,
        wireguard: 0,
        anytls: 0,
        snell: 0,
        naive: 0,
        other: 0
    };

    for (const node of manualNodes.value || []) {
        const p = (node.type || getProtocol(node.url)).toLowerCase();
        if (p === 'ss' || p === 'shadowsocks') counts.ss++;
        else if (p === 'vmess' || p === 'v2ray') counts.vmess++;
        else if (p === 'vless') counts.vless++;
        else if (p === 'trojan') counts.trojan++;
        else if (p === 'hysteria2' || p === 'hy2') counts.hysteria2++;
        else if (p === 'hysteria' || p === 'hy') counts.hysteria++;
        else if (p === 'tuic') counts.tuic++;
        else if (p === 'wireguard' || p === 'wg') counts.wireguard++;
        else if (p === 'anytls') counts.anytls++;
        else if (p === 'snell') counts.snell++;
        else if (p === 'naive') counts.naive++;
        else counts.other++;
    }

    return [
        { id: 'all', label: t('views.nodes.filterAll'), count: counts.all },
        { id: 'ss', label: 'SS', count: counts.ss },
        { id: 'vmess', label: 'VMess', count: counts.vmess },
        { id: 'vless', label: 'VLESS', count: counts.vless },
        { id: 'trojan', label: 'Trojan', count: counts.trojan },
        { id: 'hysteria2', label: 'HY2', count: counts.hysteria2 },
        { id: 'hysteria', label: 'HY', count: counts.hysteria },
        { id: 'tuic', label: 'TUIC', count: counts.tuic },
        { id: 'wireguard', label: 'WG', count: counts.wireguard },
        { id: 'anytls', label: 'AnyTLS', count: counts.anytls },
        { id: 'snell', label: 'Snell', count: counts.snell },
        { id: 'naive', label: 'Naive', count: counts.naive },
        { id: 'other', label: t('views.nodes.filterOther'), count: counts.other }
    ].filter((item) => item.id === 'all' || item.count > 0);
});

// Filter by protocol and search term
const displayNodes = computed(() => {
    let list = filteredNodes.value;
    if (selectedProtocol.value !== 'all') {
        list = list.filter((node: Node) => {
            const p = (node.type || getProtocol(node.url)).toLowerCase();
            if (selectedProtocol.value === 'ss') return p === 'ss' || p === 'shadowsocks';
            if (selectedProtocol.value === 'vmess') return p === 'vmess' || p === 'v2ray';
            if (selectedProtocol.value === 'vless') return p === 'vless';
            if (selectedProtocol.value === 'trojan') return p === 'trojan';
            if (selectedProtocol.value === 'hysteria2') return p === 'hysteria2' || p === 'hy2';
            if (selectedProtocol.value === 'hysteria') return p === 'hysteria' || p === 'hy';
            if (selectedProtocol.value === 'tuic') return p === 'tuic';
            if (selectedProtocol.value === 'wireguard') return p === 'wireguard' || p === 'wg';
            if (selectedProtocol.value === 'anytls') return p === 'anytls';
            if (selectedProtocol.value === 'snell') return p === 'snell';
            if (selectedProtocol.value === 'naive') return p === 'naive';
            if (selectedProtocol.value === 'other') {
                return ![
                    'ss',
                    'shadowsocks',
                    'vmess',
                    'v2ray',
                    'vless',
                    'trojan',
                    'hysteria2',
                    'hy2',
                    'hysteria',
                    'hy',
                    'tuic',
                    'wireguard',
                    'wg',
                    'anytls',
                    'snell',
                    'naive'
                ].includes(p);
            }
            return p === selectedProtocol.value;
        });
    }
    return list;
});

const {
    currentPage,
    totalPages,
    paginatedItems: paginatedNodes,
    changePage,
    resetPage
} = usePagination<Node>(displayNodes, 18, isSortingNodes);

watch(selectedProtocol, () => {
    resetPage();
});

const nodesMoreMenuItems = computed(() => [
    { key: 'bulk-import', label: t('common.ui.bulk.title') },
    { key: 'auto-sort', label: t('views.nodes.menus.autoSort') },
    { key: 'deduplicate', label: t('views.nodes.menus.deduplicate') },
    { key: 'batch-delete', label: t('views.nodes.menus.batchDelete') },
    { key: 'clear-all', label: t('views.nodes.menus.clearAll'), danger: true, dividerBefore: true }
]);

const {
    isBatchDeleteMode,
    selectedCount,
    toggleBatchDeleteMode,
    isSelected,
    toggleSelection,
    selectAll,
    deselectAll,
    invertSelection,
    getSelectedIds
} = useBatchSelection(paginatedNodes);

// Computed for v-models during drag sorting
const localManualNodes = computed({
    get: () => displayNodes.value,
    set: (value) => {
        if (!searchTerm.value && selectedProtocol.value === 'all') {
            dataStore.manualNodes = value;
            hasUnsavedSortChanges.value = true;
        }
    }
});

// UI Event Callbacks
const handleSaveNodeWrapper = async (updatedNode?: Node) => {
    handleSaveNode(updatedNode, () => resetPage());
};

const handleBulkImportWrapper = async (importText: string) => {
    handleBulkImport(importText, () => resetPage());
};

const handleToggleBatchDeleteMode = () => {
    toggleBatchDeleteMode();
};

const deleteSelected = async () => {
    if (selectedCount.value === 0) return;
    const idsToDelete = getSelectedIds();
    await handleBatchDelete(idsToDelete, () => {
        toggleBatchDeleteMode();
        deselectAll();
    });
};

const handleNodesMoreMenuSelect = async (key: string) => {
    if (key === 'bulk-import') {
        showBulkImportModal.value = true;
    }
    if (key === 'auto-sort') {
        await handleAutoSort();
    }
    if (key === 'deduplicate') {
        await handleDeduplicate();
    }
    if (key === 'batch-delete') {
        handleToggleBatchDeleteMode();
    }
    if (key === 'clear-all') {
        showDeleteNodesModal.value = true;
    }
};

const handleSubscriptionImportSuccess = async () => {
    resetPage();
};

const handleToggleNodeEnable = async (node: Node) => {
    await dataStore.updateNode({
        ...node,
        enabled: node.enabled === false ? true : false
    });
};

const handleCopyNodeUrl = async (url?: string) => {
    if (!url) return;
    const success = await copyToClipboard(url);
    if (success) {
        toastStore.showToast(t('widgets.node.manualCard.copySuccess'), 'success');
    } else {
        toastStore.showToast(t('widgets.node.manualCard.copyFail'), 'error');
    }
};

const getNodeProtocol = (node: Node) => {
    return (node.type || getProtocol(node.url)).toLowerCase();
};

useTabActionTrigger(
    computed(() => props.tabAction),
    'add',
    () => {
        handleAddNode();
        emit('action-handled');
    }
);
</script>

<template>
    <div class="w-full space-y-6">
        <!-- 顶部工具栏：搜索、协议筛选、视图切换与操作按钮 -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-1 flex-wrap items-center gap-3">
                <!-- 搜索框 -->
                <div class="relative w-full sm:w-64">
                    <input
                        id="nodesSearchTerm"
                        v-model="searchTerm"
                        name="nodesSearchTerm"
                        type="text"
                        :placeholder="t('views.nodes.searchPlaceholder')"
                        class="search-input-unified w-full text-sm"
                        :aria-label="t('views.nodes.searchPlaceholder')"
                    />
                    <svg
                        class="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400"
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
                    <button
                        v-if="searchTerm"
                        type="button"
                        class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        @click="searchTerm = ''"
                    >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- 视图切换 (卡片 / 表格) -->
                <div
                    class="flex items-center rounded-lg border border-gray-200 bg-gray-50/70 p-0.5 dark:border-white/10 dark:bg-white/5"
                >
                    <button
                        type="button"
                        class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all"
                        :class="
                            viewMode === 'table'
                                ? 'bg-white text-primary-600 shadow-xs dark:bg-white/10 dark:text-primary-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        "
                        :title="t('views.nodes.tableViewTitle')"
                        @click="viewMode = 'table'"
                    >
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z" />
                        </svg>
                        <span class="hidden sm:inline">{{ t('views.nodes.tableView') }}</span>
                    </button>
                    <button
                        type="button"
                        class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all"
                        :class="
                            viewMode === 'cards'
                                ? 'bg-white text-primary-600 shadow-xs dark:bg-white/10 dark:text-primary-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        "
                        :title="t('views.nodes.cardsViewTitle')"
                        @click="viewMode = 'cards'"
                    >
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span class="hidden sm:inline">{{ t('views.nodes.cardsView') }}</span>
                    </button>
                </div>
            </div>

            <!-- 右侧主要操作按钮 -->
            <div class="flex flex-wrap items-center gap-2">
                <button
                    class="btn-modern-enhanced btn-add px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm"
                    @click="handleAddNode"
                >
                    {{ t('views.nodes.addBtn') }}
                </button>

                <button
                    class="btn-modern-enhanced btn-import px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm"
                    @click="showSubscriptionImportModal = true"
                >
                    {{ t('views.nodes.importBtn') }}
                </button>

                <button
                    v-if="isSortingNodes && hasUnsavedSortChanges"
                    class="btn-modern-enhanced btn-primary flex items-center gap-1 px-3 py-1.5 text-xs font-semibold sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
                    @click="handleSaveSort"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                    </svg>
                    <span>{{ t('views.nodes.saveSortBtn') }}</span>
                </button>

                <button
                    :class="
                        isSortingNodes
                            ? 'btn-modern-enhanced btn-sort sorting flex items-center gap-1 px-3 py-1.5 text-xs font-semibold sm:gap-2 sm:px-4 sm:py-2 sm:text-sm'
                            : 'btn-modern-enhanced btn-sort flex items-center gap-1 px-3 py-1.5 text-xs font-semibold sm:gap-2 sm:px-4 sm:py-2 sm:text-sm'
                    "
                    @click="handleToggleSort"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 8h16M4 16h16"
                        />
                    </svg>
                    <span class="hidden sm:inline">{{
                        isSortingNodes ? t('views.nodes.sorting') : t('views.nodes.manualSortBtn')
                    }}</span>
                    <span class="sm:hidden">{{ t('views.nodes.sortShortBtn') }}</span>
                </button>

                <MoreMenu
                    :items="nodesMoreMenuItems"
                    width-class="w-40"
                    @select="handleNodesMoreMenuSelect"
                />
            </div>
        </div>

        <!-- 协议筛选胶囊药丸 (Protocol Filter Pills) -->
        <div v-if="manualNodes.length > 0" class="flex flex-wrap items-center gap-1.5">
            <button
                v-for="filter in protocolFilters"
                :key="filter.id"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all"
                :class="
                    selectedProtocol === filter.id
                        ? 'bg-primary-500 text-white shadow-xs dark:bg-primary-600'
                        : 'border border-gray-200 bg-gray-50/80 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
                "
                @click="selectedProtocol = filter.id"
            >
                <span>{{ filter.label }}</span>
                <span
                    class="rounded-full px-1.5 py-0.2 text-[10px]"
                    :class="
                        selectedProtocol === filter.id
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                    "
                >
                    {{ filter.count }}
                </span>
            </button>
        </div>

        <!-- 批量操作工具栏 -->
        <BatchActionToolbar
            :visible="isBatchDeleteMode"
            :selected-count="selectedCount"
            accent="emerald"
            @select-all="selectAll"
            @invert-selection="invertSelection"
            @deselect-all="deselectAll"
            @delete-selected="deleteSelected"
            @cancel="handleToggleBatchDeleteMode"
        />

        <!-- 节点列表内容区域 -->
        <div v-if="manualNodes.length > 0">
            <!-- 筛选无结果空状态 -->
            <div
                v-if="displayNodes.length === 0"
                class="card-glass flex flex-col items-center justify-center rounded-xl border border-gray-200 p-12 text-center dark:border-white/10"
            >
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">
                    <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 class="mt-4 text-base font-semibold text-gray-900 dark:text-white">{{ t('views.nodes.noMatchingNodes') }}</h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {{ t('views.nodes.noMatchingHint') }}
                </p>
                <button
                    type="button"
                    class="btn-modern-enhanced btn-secondary mt-4 px-4 py-1.5 text-xs font-medium"
                    @click="
                        searchTerm = '';
                        selectedProtocol = 'all';
                    "
                >
                    {{ t('views.nodes.clearFilters') }}
                </button>
            </div>

            <!-- 排序模式 (可拖拽卡片) -->
            <draggable
                v-else-if="isSortingNodes"
                v-model="localManualNodes"
                tag="div"
                class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                :item-key="(item: Node) => item.id"
                animation="300"
                :delay="200"
                :delay-on-touch-only="true"
                @end="handleDragEnd"
            >
                <template #item="{ element: node }">
                    <div class="cursor-move">
                        <ManualNodeCard
                            :node="node"
                            :is-batch-mode="isBatchDeleteMode"
                            :is-selected="isSelected(node.id)"
                            @edit="handleEditNode(node.id)"
                            @delete="handleDeleteNode(node.id)"
                            @toggle-select="toggleSelection(node.id)"
                            @toggle-enable="handleToggleNodeEnable(node)"
                        />
                    </div>
                </template>
            </draggable>

            <!-- 表格视图 (高密度企业级视图) -->
            <div
                v-else-if="viewMode === 'table'"
                class="card-glass overflow-hidden rounded-xl border border-gray-200 shadow-card dark:border-white/10"
            >
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                        <thead
                            class="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-white/10 dark:bg-white/3 dark:text-gray-400"
                        >
                            <tr>
                                <th scope="col" class="w-12 px-4 py-3.5 text-center">
                                    <label
                                        v-if="isBatchDeleteMode"
                                        class="relative inline-flex cursor-pointer items-center"
                                    >
                                        <input
                                            type="checkbox"
                                            :checked="
                                                paginatedNodes.length > 0 &&
                                                paginatedNodes.every((n) => isSelected(n.id))
                                            "
                                            class="h-4 w-4 rounded border-gray-300 text-primary-600 dark:border-white/10 dark:bg-white/10"
                                            :aria-label="t('views.nodes.selectAllPage')"
                                            @change="
                                                paginatedNodes.every((n) => isSelected(n.id))
                                                    ? deselectAll()
                                                    : selectAll()
                                            "
                                        />
                                    </label>
                                    <span v-else class="text-xs text-gray-400">#</span>
                                </th>
                                <th scope="col" class="w-24 px-4 py-3.5">{{ t('views.nodes.thProtocol') }}</th>
                                <th scope="col" class="min-w-50 px-4 py-3.5">{{ t('views.nodes.thName') }}</th>
                                <th scope="col" class="min-w-55 px-4 py-3.5">{{ t('views.nodes.thServerPort') }}</th>
                                <th scope="col" class="w-24 px-4 py-3.5 text-center">{{ t('views.nodes.thStatus') }}</th>
                                <th scope="col" class="w-32 px-4 py-3.5 text-right">{{ t('views.nodes.thActions') }}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-white/6">
                            <tr
                                v-for="(node, index) in paginatedNodes"
                                :key="node.id"
                                class="transition-colors hover:bg-primary-50/40 dark:hover:bg-white/4"
                                :class="{
                                    'opacity-60': node.enabled === false,
                                    'bg-primary-50/30 dark:bg-primary-950/20': isSelected(node.id)
                                }"
                            >
                                <!-- Checkbox / Index -->
                                <td class="px-4 py-3 text-center">
                                    <label
                                        v-if="isBatchDeleteMode"
                                        class="relative inline-flex cursor-pointer items-center"
                                    >
                                        <input
                                            type="checkbox"
                                            :checked="isSelected(node.id)"
                                            class="h-4 w-4 rounded border-gray-300 text-primary-600 dark:border-white/10 dark:bg-white/10"
                                            :aria-label="t('views.nodes.selectNode', { name: node.name })"
                                            @change="toggleSelection(node.id)"
                                        />
                                    </label>
                                    <span v-else class="text-xs text-gray-400 font-mono">
                                        {{ (currentPage - 1) * 18 + index + 1 }}
                                    </span>
                                </td>

                                <!-- 协议类型 -->
                                <td class="px-4 py-3">
                                    <span
                                        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider font-mono shadow-xs"
                                        :class="[
                                            getProtocolInfo(getNodeProtocol(node)).bg,
                                            getProtocolInfo(getNodeProtocol(node)).color
                                        ]"
                                    >
                                        <span>{{ getProtocolInfo(getNodeProtocol(node)).text }}</span>
                                    </span>
                                </td>

                                <!-- 节点名称 -->
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="truncate font-medium text-gray-900 dark:text-white"
                                            :title="node.name || t('views.nodes.unnamedNode')"
                                        >
                                            {{ node.name || t('views.nodes.unnamedNode') }}
                                        </span>
                                    </div>
                                </td>

                                <!-- 服务器与端口 -->
                                <td class="px-4 py-3">
                                    <div
                                        class="flex items-center gap-1 font-mono text-xs text-gray-500 dark:text-gray-400"
                                    >
                                        <span class="truncate max-w-50" :title="node.server">
                                            {{ node.server || '-' }}
                                        </span>
                                        <span class="text-gray-300 dark:text-gray-600">:</span>
                                        <span class="text-primary-600 dark:text-primary-400 font-semibold">
                                            {{ node.port || '-' }}
                                        </span>
                                    </div>
                                </td>

                                <!-- 状态切换 (启用 / 停用) -->
                                <td class="px-4 py-3 text-center">
                                    <button
                                        type="button"
                                        class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors"
                                        :class="
                                            node.enabled !== false
                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400'
                                        "
                                        :title="node.enabled !== false ? t('views.nodes.toggleDisable') : t('views.nodes.toggleEnable')"
                                        @click="handleToggleNodeEnable(node)"
                                    >
                                        <span
                                            class="h-1.5 w-1.5 rounded-full"
                                            :class="
                                                node.enabled !== false
                                                    ? 'bg-emerald-500'
                                                    : 'bg-gray-400'
                                            "
                                        ></span>
                                        <span>{{ node.enabled !== false ? t('views.nodes.statusEnabled') : t('views.nodes.statusDisabled') }}</span>
                                    </button>
                                </td>

                                <!-- 操作按钮 -->
                                <td class="px-4 py-3 text-right">
                                    <div class="flex items-center justify-end gap-1">
                                        <!-- 复制链接 -->
                                        <button
                                            v-if="node.url"
                                            type="button"
                                            class="rounded-md p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/40 dark:hover:text-primary-400"
                                            :title="t('views.nodes.copyLink')"
                                            @click="handleCopyNodeUrl(node.url)"
                                        >
                                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 01-2-2V3" />
                                            </svg>
                                        </button>

                                        <!-- 编辑 -->
                                        <button
                                            type="button"
                                            class="rounded-md p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/40 dark:hover:text-primary-400"
                                            :title="t('widgets.node.manualCard.edit')"
                                            @click="handleEditNode(node.id)"
                                        >
                                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
                                            </svg>
                                        </button>

                                        <!-- 删除 -->
                                        <button
                                            type="button"
                                            class="rounded-md p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/40 dark:hover:text-rose-400"
                                            :title="t('widgets.node.manualCard.delete')"
                                            @click="handleDeleteNode(node.id)"
                                        >
                                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 卡片视图 (传统网格视图) -->
            <div
                v-else
                class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
                <div v-for="node in paginatedNodes" :key="node.id">
                    <ManualNodeCard
                        :node="node"
                        :is-batch-mode="isBatchDeleteMode"
                        :is-selected="isSelected(node.id)"
                        @edit="handleEditNode(node.id)"
                        @delete="handleDeleteNode(node.id)"
                        @toggle-select="toggleSelection(node.id)"
                        @toggle-enable="handleToggleNodeEnable(node)"
                    />
                </div>
            </div>

            <!-- 分页组件 -->
            <Pagination
                v-if="!isSortingNodes && totalPages > 1"
                :current-page="currentPage"
                :total-pages="totalPages"
                @change-page="changePage"
            />
        </div>

        <!-- 初始空状态 -->
        <EmptyState
            v-else
            :title="t('views.nodes.emptyTitle')"
            :description="t('views.nodes.emptyDesc')"
            bg-gradient-class="bg-linear-to-br from-success-500/20 to-success-500/20"
            icon-color-class="text-success-500"
        >
            <template #icon>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-12 w-12 text-success-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4"
                    />
                </svg>
            </template>
        </EmptyState>

        <!-- Modals -->
        <BulkImportModal v-model:show="showBulkImportModal" @import="handleBulkImportWrapper" />

        <ConfirmModal
            v-model:show="showDeleteNodesModal"
            :title="t('views.nodes.clearAllModal.title')"
            :message="t('views.nodes.clearAllModal.desc')"
            type="danger"
            @confirm="handleDeleteAllNodes"
        />

        <ConfirmModal
            v-model:show="showDeleteSingleNodeModal"
            :title="t('views.nodes.deleteModal.title')"
            :message="t('views.nodes.deleteModal.desc')"
            type="danger"
            @confirm="handleConfirmDeleteSingleNode"
        />

        <NodeModal
            v-if="showNodeModal"
            v-model:show="showNodeModal"
            :node="editingNode"
            :is-new="isNewNode"
            @save="handleSaveNodeWrapper"
        />

        <SubscriptionImportModal
            v-model:show="showSubscriptionImportModal"
            :add-nodes-from-bulk="dataStore.addNodesFromBulk"
            :on-import-success="handleSubscriptionImportSuccess"
            initial-mode="text"
        />
    </div>
</template>
