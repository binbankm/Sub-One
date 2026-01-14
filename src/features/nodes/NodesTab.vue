<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent, watch } from 'vue';
import draggable from 'vuedraggable';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../../stores/data';
import { useBatchSelection } from '../../composables/useBatchSelection';
import ManualNodeCard from './components/ManualNodeCard.vue';
import Pagination from '../../components/ui/Pagination.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import ConfirmModal from '../../components/ui/ConfirmModal.vue';
import { useToastStore } from '../../stores/toast';
import { parseImportText, createNode } from '../../utils/importer';
import type { Node } from '../../types/index';

// Async Components
const NodeEditModal = defineAsyncComponent(() => import('./components/NodeEditModal.vue'));
const BulkImportModal = defineAsyncComponent(() => import('../../components/ui/BulkImportModal.vue'));
const SubscriptionImportModal = defineAsyncComponent(() => import('./components/SubscriptionImportModal.vue'));

const props = defineProps<{
  tabAction?: { action: string } | null;
}>();

const emit = defineEmits<{
  (e: 'save-sort'): void;
  (e: 'toggle-sort'): void;
  (e: 'drag-end', evt: unknown): void;
  (e: 'action-handled'): void;
  (e: 'node-deleted', id: string): void; // Keep for profiles cleanup signal? Store handles cleanup now. Remove? 
  // Let's keep specific signals if parent listens. But Store handles logic.
  // Actually, parent (DashboardPage) listening to 'node-deleted' handles `removeIdFromProfiles`.
  // DataStore `deleteNode` ALREADY calls `removeIdFromProfiles`.
  // So we don't need to emit 'node-deleted'.
  // We can remove these emits if we confirm DashboardPage doesn't need them for anything else.
  // DashboardPage uses them to clean up profiles. Store does this now. 
  // We can safely remove them.
  // We'll keep drag-end/sort emits for now if sorting state is lifted (it is in store config sortStrategy? No, manual sort).
  // Manual sort is local or store?
  // Store has `manualNodes` which we modify. Sorting is just reordering the array.
}>();

// Utils
const { showToast } = useToastStore();
const dataStore = useDataStore();
const { manualNodes } = storeToRefs(dataStore);

// Local State
const searchTerm = ref('');
const isSortingNodes = ref(false); // Local sort state
const hasUnsavedSortChanges = ref(false); 

// Pagination Logic
const itemsPerPage = 12;
const currentPage = ref(1);

const filteredNodes = computed(() => {
  if (!searchTerm.value) return manualNodes.value;
  const term = searchTerm.value.toLowerCase();
  return manualNodes.value.filter(node => 
    (node.name && node.name.toLowerCase().includes(term)) ||
    (node.server && node.server.toLowerCase().includes(term)) ||
    (node.type && node.type.toLowerCase().includes(term))
  );
});

const totalPages = computed(() => Math.ceil(filteredNodes.value.length / itemsPerPage) || 1);

const paginatedNodes = computed(() => {
  if (isSortingNodes.value) return filteredNodes.value; // Show all when sorting
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredNodes.value.slice(start, start + itemsPerPage);
});

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};


// State
const showNodesMoreMenu = ref(false);
const nodesMoreMenuRef = ref<HTMLElement | null>(null);

// Modal States
const isNewNode = ref(false);
const editingNode = ref<Node | null>(null);
const showNodeModal = ref(false);
const showBulkImportModal = ref(false);
const showSubscriptionImportModal = ref(false);
const showDeleteNodesModal = ref(false);
const showDeleteSingleNodeModal = ref(false);
const deletingItemId = ref<string | null>(null);

// Batch Select
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
} = useBatchSelection(
  paginatedNodes
);

// Computed for v-models
const localManualNodes = computed({
  get: () => filteredNodes.value, // For draggable: needs full list or current view? Draggable usually works on full list or visible list in Sort mode.
  // In sort mode, paginatedNodes returns filteredNodes (all).
  // So we can use paginatedNodes.
  set: (value) => {
     // If sorting, we are reordering. We need to apply this reorder to the store.
     // But `filteredNodes` is derived.
     // If we reorder, we update the store.
     // Simpler: Use `manualNodes` directly if no filter? 
     // If filtered, sorting is tricky. Usually we disable sort if filtered.
     if (!searchTerm.value) {
        dataStore.manualNodes = value;
        hasUnsavedSortChanges.value = true;
     }
  }
});

// Watch for Cross-Tab Actions
watch(() => props.tabAction, (val) => {
  if (val && val.action === 'add') {
    handleAddNode();
    emit('action-handled');
  }
}, { immediate: true });

// Handlers

const handleAddNode = () => {
  isNewNode.value = true;
  editingNode.value = createNode('');
  showNodeModal.value = true;
};

const handleEditNode = (nodeId: string) => {
  const node = manualNodes.value.find(n => n.id === nodeId);
  if (node) {
    isNewNode.value = false;
    editingNode.value = { ...node };
    showNodeModal.value = true;
  }
};

const handleSaveNode = async (updatedNode?: Node) => {
  const nodeToSave = updatedNode || editingNode.value;
  if (!nodeToSave?.url) return showToast('节点链接不能为空', 'error');
  
  if (isNewNode.value) {
    dataStore.addNode(nodeToSave);
  } else {
    dataStore.updateNode(nodeToSave);
  }
  
  await dataStore.saveData('节点');
  showNodeModal.value = false;
};

const handleDeleteNode = (nodeId: string) => {
  deletingItemId.value = nodeId;
  showDeleteSingleNodeModal.value = true;
};

const handleConfirmDeleteSingleNode = async () => {
  if (!deletingItemId.value) return;
  dataStore.deleteNode(deletingItemId.value);
  
  await dataStore.saveData('节点删除');
  showDeleteSingleNodeModal.value = false;
};

const handleDeleteAllNodes = async () => {
  dataStore.deleteAllNodes();
  
  await dataStore.saveData('节点清空');
  showDeleteNodesModal.value = false;
};

const handleBatchDelete = async (ids: string[]) => {
  if (!ids || ids.length === 0) return;
  dataStore.batchDeleteNodes(ids);
  
  await dataStore.saveData(`批量删除 ${ids.length} 个节点`);
  toggleBatchDeleteMode();
  deselectAll(); // Clear selection
};

const handleBulkImport = async (importText: string) => {
  const { subs, nodes } = parseImportText(importText);
  if (subs.length > 0) await dataStore.addSubscriptionsFromBulk(subs);
  if (nodes.length > 0) dataStore.addNodesFromBulk(nodes);
  
  await dataStore.saveData('批量导入');
  showToast(`成功导入 ${subs.length} 条订阅和 ${nodes.length} 个手动节点`, 'success');
  showBulkImportModal.value = false;
};

const handleDeduplicate = async () => {
  dataStore.deduplicateNodes();
  await dataStore.saveData('节点去重');
};

const handleAutoSort = async () => {
  dataStore.autoSortNodes();
  await dataStore.saveData('节点排序');
};

const handleToggleSort = () => {
    isSortingNodes.value = !isSortingNodes.value;
    if (!isSortingNodes.value) hasUnsavedSortChanges.value = false;
};

const handleSaveSort = async () => {
    await dataStore.saveData('节点排序');
    hasUnsavedSortChanges.value = false;
    isSortingNodes.value = false;
};

// UI Handlers
const handleToggleBatchDeleteMode = () => {
  toggleBatchDeleteMode();
  showNodesMoreMenu.value = false;
};

const deleteSelected = () => {
  if (selectedCount.value === 0) return;
  const idsToDelete = getSelectedIds();
  handleBatchDelete(idsToDelete);
};

const handleClickOutside = (event: Event) => {
  if (showNodesMoreMenu.value && nodesMoreMenuRef.value && !nodesMoreMenuRef.value.contains(event.target as globalThis.Node)) {
    showNodesMoreMenu.value = false;
  }
};

const handleDragEnd = () => {
  hasUnsavedSortChanges.value = true;
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="w-full">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <div class="flex items-center gap-4">
      </div>

      <div class="flex flex-wrap items-center gap-2 w-full">
        <!-- 搜索框 -->
        <div class="relative w-full sm:w-56 mb-2 sm:mb-0 flex-shrink-0">
          <input type="text" v-model="searchTerm" placeholder="搜索节点..."
            class="search-input-unified w-full text-base" />
          <svg class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div class="flex flex-wrap items-center gap-2 ml-auto">
          <!-- 主要操作按钮 -->
          <div class="flex flex-wrap items-center gap-2">
            <button @click="handleAddNode"
              class="btn-modern-enhanced btn-add text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 transform hover:scale-105 transition-all duration-300">新增</button>

            <button @click="showBulkImportModal = true"
              class="btn-modern-enhanced btn-import text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 transform hover:scale-105 transition-all duration-300">批量导入</button>

            <button v-if="isSortingNodes && hasUnsavedSortChanges" @click="handleSaveSort"
              class="btn-modern-enhanced btn-primary text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 flex items-center gap-1 sm:gap-2 transform hover:scale-105 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span class="hidden sm:inline">保存排序</span>
            </button>
            <button @click="handleToggleSort"
              :class="isSortingNodes ? 'btn-modern-enhanced btn-sort sorting text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 flex items-center gap-1 sm:gap-2 transform hover:scale-105 transition-all duration-300' : 'btn-modern-enhanced btn-sort text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 flex items-center gap-1 sm:gap-2 transform hover:scale-105 transition-all duration-300'">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
              </svg>
              <span class="hidden sm:inline">{{ isSortingNodes ? '排序中' : '手动排序' }}</span>
              <span class="sm:hidden">{{ isSortingNodes ? '排序' : '排序' }}</span>
            </button>
          </div>

          <!-- 更多菜单 -->
          <div class="relative" ref="nodesMoreMenuRef">
            <button @click="showNodesMoreMenu = !showNodesMoreMenu"
              class="p-2 sm:p-4 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hover-lift">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-300"
                viewBox="0 0 20 20" fill="currentColor">
                <path
                  d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
            <Transition name="slide-fade-sm">
              <div v-if="showNodesMoreMenu"
                class="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 ring-2 ring-gray-200 dark:ring-gray-700 border border-gray-200 dark:border-gray-700">
                <button @click="showSubscriptionImportModal = true; showNodesMoreMenu = false"
                  class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">导入订阅</button>
                <button @click="handleAutoSort(); showNodesMoreMenu = false"
                  class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">一键排序</button>
                <button @click="handleDeduplicate(); showNodesMoreMenu = false"
                  class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">一键去重</button>
                <button @click="() => toggleBatchDeleteMode()"
                  class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">批量删除</button>
                <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button @click="showDeleteNodesModal = true; showNodesMoreMenu = false"
                  class="w-full text-left px-5 py-3 text-base text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">清空所有</button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量操作工具栏 -->
    <Transition name="slide-fade">
      <div v-if="isBatchDeleteMode"
        class="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 shadow-lg">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fill-rule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clip-rule="evenodd" />
            </svg>
            批量删除模式
            <span v-if="selectedCount > 0"
              class="ml-2 px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold shadow-md">
              已选 {{ selectedCount }}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button @click="selectAll"
              class="btn-modern-enhanced btn-secondary text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 transform hover:scale-105 transition-all duration-300">
              全选
            </button>
            <button @click="invertSelection"
              class="btn-modern-enhanced btn-secondary text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 transform hover:scale-105 transition-all duration-300">
              反选
            </button>
            <button @click="deselectAll"
              class="btn-modern-enhanced btn-secondary text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 transform hover:scale-105 transition-all duration-300">
              清空选择
            </button>
            <button @click="deleteSelected" :disabled="selectedCount === 0"
              class="btn-modern-enhanced btn-danger text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd" />
              </svg>
              删除选中 ({{ selectedCount }})
            </button>
            <button @click="handleToggleBatchDeleteMode"
              class="btn-modern-enhanced btn-cancel text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 transform hover:scale-105 transition-all duration-300">
              取消
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 节点内容区域 -->
    <div v-if="manualNodes.length > 0">
      <draggable v-if="isSortingNodes" tag="div"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8" v-model="localManualNodes"
        :item-key="(item: Node) => item.id" animation="300" :delay="200" :delay-on-touch-only="true"
        @end="handleDragEnd">
        <template #item="{ element: node }">
          <div class="cursor-move">
            <ManualNodeCard :node="node" :isBatchMode="isBatchDeleteMode" :isSelected="isSelected(node.id)"
              @edit="handleEditNode(node.id)" @delete="handleDeleteNode(node.id)"
              @toggleSelect="toggleSelection(node.id)" />
          </div>
        </template>
      </draggable>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div v-for="node in paginatedNodes" :key="node.id">
          <ManualNodeCard :node="node" :isBatchMode="isBatchDeleteMode" :isSelected="isSelected(node.id)"
            @edit="handleEditNode(node.id)" @delete="handleDeleteNode(node.id)"
            @toggleSelect="toggleSelection(node.id)" />
        </div>
      </div>

      <Pagination
        :current-page="currentPage"
        :total-pages="totalPages"
        @change-page="changePage"
        v-if="!isSortingNodes"
      />
    </div>
    <EmptyState v-else
      title="没有手动节点"
      description="添加分享链接或单个节点。"
      bg-gradient-class="bg-gradient-to-br from-green-500/20 to-emerald-500/20"
      icon-color-class="text-green-500"
    >
      <template #icon>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" />
        </svg>
      </template>
    </EmptyState>

    <!-- Modals -->
    <BulkImportModal v-model:show="showBulkImportModal" @import="handleBulkImport" />

    <ConfirmModal
      v-model:show="showDeleteNodesModal"
      @confirm="handleDeleteAllNodes"
      title="确认清空节点"
      message="您确定要删除所有<strong>手动节点</strong>吗？此操作将标记为待保存，不会影响订阅。"
      type="danger"
    />

    <ConfirmModal
      v-model:show="showDeleteSingleNodeModal"
      @confirm="handleConfirmDeleteSingleNode"
      title="确认删除节点"
      message="您确定要删除此手动节点吗？此操作将标记为待保存，不会影响订阅。"
      type="danger"
    />

    <NodeEditModal
      v-if="showNodeModal"
      v-model:show="showNodeModal"
      :node="editingNode"
      :is-new="isNewNode"
      @save="handleSaveNode"
    />

    <SubscriptionImportModal
      v-model:show="showSubscriptionImportModal"
      :add-nodes-from-bulk="dataStore.addNodesFromBulk"
      :on-import-success="async () => { await dataStore.saveData('导入节点'); }"
    />
  </div>
</template>
