<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useI18n } from 'vue-i18n';

import { storeToRefs } from 'pinia';

import { useNodeManagement } from '@/entities/node/model/useNodeManagement';
import { useBatchSelection } from '@/common/hooks/useBatchSelection';
import { usePagination } from '@/common/hooks/usePagination';
import { useTabActionTrigger } from '@/common/hooks/useTabActionTrigger';
import type { Node } from '@/common/types/index';
import BatchActionToolbar from '@/common/ui/BatchActionToolbar.vue';
import ConfirmModal from '@/common/ui/ConfirmModal.vue';
import EmptyState from '@/common/ui/EmptyState.vue';
import MoreMenu from '@/common/ui/MoreMenu.vue';
import Pagination from '@/common/ui/Pagination.vue';
import draggable from 'vuedraggable';

import { useDataStore } from '@/stores/useAppStore';

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
const { manualNodes } = storeToRefs(dataStore);
const { t } = useI18n();

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

const {
    currentPage,
    totalPages,
    paginatedItems: paginatedNodes,
    changePage,
    resetPage
} = usePagination<Node>(filteredNodes, 15, isSortingNodes);

const nodesMoreMenuItems = computed(() => [
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

// Computed for v-models
const localManualNodes = computed({
    get: () => filteredNodes.value,
    set: (value) => {
        if (!searchTerm.value) {
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
    <div class="w-full">
        <div class="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-4"></div>

            <div class="flex w-full flex-wrap items-center gap-2">
                <!-- 搜索框 -->
                <div class="relative mb-2 w-full shrink-0 sm:mb-0 sm:w-56">
                    <input
                        v-model="searchTerm"
                        type="text"
                        :placeholder="t('views.nodes.searchPlaceholder')"
                        class="search-input-unified w-full text-base"
                    />
                    <svg
                        class="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400"
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

                <div class="ml-auto flex flex-wrap items-center gap-2">
                    <!-- 主要操作按钮 -->
                    <div class="flex flex-wrap items-center gap-2">
                        <button
                            class="btn-modern-enhanced btn-add transform px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:px-5 sm:py-2.5 sm:text-sm"
                            @click="handleAddNode"
                        >
                            {{ t('views.nodes.addBtn') }}
                        </button>

                        <button
                            class="btn-modern-enhanced btn-import transform px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:px-5 sm:py-2.5 sm:text-sm"
                            @click="showSubscriptionImportModal = true"
                        >
                            {{ t('views.nodes.importBtn') }}
                        </button>

                        <button
                            v-if="isSortingNodes && hasUnsavedSortChanges"
                            class="btn-modern-enhanced btn-primary flex transform items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
                            @click="handleSaveSort"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4 sm:h-5 sm:w-5"
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
                            <span class="hidden sm:inline">{{ t('views.nodes.saveSortBtn') }}</span>
                        </button>
                        <button
                            :class="
                                isSortingNodes
                                    ? 'btn-modern-enhanced btn-sort sorting flex transform items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm'
                                    : 'btn-modern-enhanced btn-sort flex transform items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm'
                            "
                            @click="handleToggleSort"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4 sm:h-5 sm:w-5"
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
                    </div>

                    <MoreMenu
                        :items="nodesMoreMenuItems"
                        width-class="w-40"
                        @select="handleNodesMoreMenuSelect"
                    />
                </div>
            </div>
        </div>

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

        <!-- 节点内容区域 -->
        <div v-if="manualNodes.length > 0">
            <draggable
                v-if="isSortingNodes"
                v-model="localManualNodes"
                tag="div"
                class="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8"
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
                        />
                    </div>
                </template>
            </draggable>
            <div
                v-else
                class="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8"
            >
                <div v-for="node in paginatedNodes" :key="node.id">
                    <ManualNodeCard
                        :node="node"
                        :is-batch-mode="isBatchDeleteMode"
                        :is-selected="isSelected(node.id)"
                        @edit="handleEditNode(node.id)"
                        @delete="handleDeleteNode(node.id)"
                        @toggle-select="toggleSelection(node.id)"
                    />
                </div>
            </div>

            <Pagination
                v-if="!isSortingNodes"
                :current-page="currentPage"
                :total-pages="totalPages"
                @change-page="changePage"
            />
        </div>
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
        />
    </div>
</template>
