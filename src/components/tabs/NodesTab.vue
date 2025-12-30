<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import draggable from 'vuedraggable';
import ManualNodeCard from '../cards/ManualNodeCard.vue';
import type { Node } from '../../types';

const props = defineProps<{
  manualNodes: Node[];
  paginatedManualNodes: Node[];
  manualNodesCurrentPage: number;
  manualNodesTotalPages: number;
  searchTerm: string;
  isSortingNodes: boolean;
  hasUnsavedSortChanges: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:searchTerm', value: string): void;
  (e: 'update:manualNodes', value: Node[]): void;
  (e: 'add-node'): void;
  (e: 'bulk-import'): void;
  (e: 'save-sort'): void;
  (e: 'toggle-sort'): void;
  (e: 'import-subs'): void;
  (e: 'auto-sort'): void;
  (e: 'deduplicate'): void;
  (e: 'delete-all-nodes'): void;
  (e: 'drag-end', evt: unknown): void;
  (e: 'edit-node', id: string): void;
  (e: 'delete-node', id: string): void;
  (e: 'change-page', page: number): void;
  (e: 'batch-delete-nodes', ids: string[]): void;
}>();

const showNodesMoreMenu = ref(false);
const nodesMoreMenuRef = ref<HTMLElement | null>(null);
const isBatchDeleteMode = ref(false);
const selectedNodeIds = ref(new Set<string>());

const localManualNodes = computed({
  get: () => props.manualNodes,
  set: (value) => emit('update:manualNodes', value)
});

const localSearchTerm = computed({
  get: () => props.searchTerm,
  set: (value) => emit('update:searchTerm', value)
});

// 批量删除模式相关方法
const toggleBatchDeleteMode = () => {
  isBatchDeleteMode.value = !isBatchDeleteMode.value;
  if (!isBatchDeleteMode.value) {
    selectedNodeIds.value.clear();
  }
  showNodesMoreMenu.value = false;
};

const isSelected = (id: string) => {
  return selectedNodeIds.value.has(id);
};

const toggleSelection = (id: string) => {
  if (selectedNodeIds.value.has(id)) {
    selectedNodeIds.value.delete(id);
  } else {
    selectedNodeIds.value.add(id);
  }
};

const selectAll = () => {
  const currentPageIds = props.isSortingNodes
    ? props.manualNodes.map(n => n.id)
    : props.paginatedManualNodes.map(n => n.id);
  currentPageIds.forEach(id => selectedNodeIds.value.add(id));
};

const deselectAll = () => {
  selectedNodeIds.value.clear();
};

const invertSelection = () => {
  const currentPageIds = props.isSortingNodes
    ? props.manualNodes.map(n => n.id)
    : props.paginatedManualNodes.map(n => n.id);

  currentPageIds.forEach(id => {
    if (selectedNodeIds.value.has(id)) {
      selectedNodeIds.value.delete(id);
    } else {
      selectedNodeIds.value.add(id);
    }
  });
};

const deleteSelected = () => {
  if (selectedNodeIds.value.size === 0) return;

  const idsToDelete = Array.from(selectedNodeIds.value);
  emit('batch-delete-nodes', idsToDelete);
  selectedNodeIds.value.clear();
  isBatchDeleteMode.value = false;
};

const selectedCount = computed(() => selectedNodeIds.value.size);

const handleClickOutside = (event: Event) => {
  if (showNodesMoreMenu.value && nodesMoreMenuRef.value && !nodesMoreMenuRef.value.contains(event.target as globalThis.Node)) {
    showNodesMoreMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const handleDragEnd = (evt: unknown) => {
  emit('drag-end', evt);
};
</script>

<template>
  <div
    class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-4 sm:p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <div class="flex items-center gap-4">
      </div>

      <div class="flex flex-wrap items-center gap-2 w-full">
        <!-- 搜索框 -->
        <div class="relative w-full sm:w-56 mb-2 sm:mb-0 flex-shrink-0">
          <input type="text" v-model="localSearchTerm" placeholder="搜索节点..."
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
            <button @click="$emit('add-node')"
              class="btn-modern-enhanced btn-add text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 transform hover:scale-105 transition-all duration-300">新增</button>

            <button @click="$emit('bulk-import')"
              class="btn-modern-enhanced btn-import text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 transform hover:scale-105 transition-all duration-300">批量导入</button>

            <button v-if="isSortingNodes && hasUnsavedSortChanges" @click="$emit('save-sort')"
              class="btn-modern-enhanced btn-primary text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 flex items-center gap-1 sm:gap-2 transform hover:scale-105 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span class="hidden sm:inline">保存排序</span>
            </button>
            <button @click="$emit('toggle-sort')"
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
                <button @click="$emit('import-subs'); showNodesMoreMenu = false"
                  class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">导入订阅</button>
                <button @click="$emit('auto-sort'); showNodesMoreMenu = false"
                  class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">一键排序</button>
                <button @click="$emit('deduplicate'); showNodesMoreMenu = false"
                  class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">一键去重</button>
                <button @click="toggleBatchDeleteMode"
                  class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">批量删除</button>
                <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button @click="$emit('delete-all-nodes'); showNodesMoreMenu = false"
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
            <button @click="toggleBatchDeleteMode"
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
              @edit="$emit('edit-node', node.id)" @delete="$emit('delete-node', node.id)"
              @toggleSelect="toggleSelection(node.id)" />
          </div>
        </template>
      </draggable>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div v-for="node in paginatedManualNodes" :key="node.id">
          <ManualNodeCard :node="node" :isBatchMode="isBatchDeleteMode" :isSelected="isSelected(node.id)"
            @edit="$emit('edit-node', node.id)" @delete="$emit('delete-node', node.id)"
            @toggleSelect="toggleSelection(node.id)" />
        </div>
      </div>

      <div v-if="manualNodesTotalPages > 1 && !isSortingNodes"
        class="flex justify-center items-center gap-2 sm:gap-4 mt-10 text-base font-medium">
        <button @click="$emit('change-page', manualNodesCurrentPage - 1)" :disabled="manualNodesCurrentPage === 1"
          class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center">&laquo;
          <span class="hidden xs:inline ml-1">上一页</span></button>
        <span
          class="min-w-[80px] sm:min-w-[100px] text-center text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">第{{
            manualNodesCurrentPage }}/{{ manualNodesTotalPages }}页</span>
        <button @click="$emit('change-page', manualNodesCurrentPage + 1)"
          :disabled="manualNodesCurrentPage === manualNodesTotalPages"
          class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center"><span
            class="hidden xs:inline mr-1">下一页</span> &raquo;</button>
      </div>
    </div>
    <div v-else
      class="text-center py-20 lg:py-24 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl">
      <div
        class="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" />
        </svg>
      </div>
      <h3 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced mb-3">没有手动节点</h3>
      <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">添加分享链接或单个节点。</p>
    </div>
  </div>
</template>

<style scoped>
/* 过渡动画已移至 design-system.css 全局定义 */

.cursor-move {
  cursor: move;
}
</style>

