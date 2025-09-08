<!--
  ManualNodeSection.vue
  手动节点管理区域组件
  负责手动节点的显示、操作、搜索和分页
-->
<script setup>
import { ref, computed } from 'vue';
import draggable from 'vuedraggable';
import ManualNodeCard from '../cards/ManualNodeCard.vue';
import ManualNodeList from '../ManualNodeList.vue';

// Props
const props = defineProps({
  manualNodes: {
    type: Array,
    required: true
  },
  filteredNodes: {
    type: Array,
    required: true
  },
  currentPage: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 1
  },
  isSorting: {
    type: Boolean,
    default: false
  },
  viewMode: {
    type: String,
    default: 'card',
    validator: (value) => ['card', 'list'].includes(value)
  },
  searchTerm: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits([
  'add-node',
  'edit-node',
  'delete-node',
  'toggle-sorting',
  'change-page',
  'drag-end',
  'set-view-mode',
  'update-search',
  'bulk-import',
  'auto-sort',
  'deduplicate',
  'import-subscription'
]);

// 计算属性
const paginatedManualNodes = computed(() => {
  const start = (props.currentPage - 1) * 24;
  const end = start + 24;
  return props.filteredNodes.slice(start, end);
});

// 方法
const handleAddNode = () => {
  emit('add-node');
};

const handleEditNode = (nodeId) => {
  emit('edit-node', nodeId);
};

const handleDeleteNode = (nodeId) => {
  emit('delete-node', nodeId);
};

const handleToggleSorting = () => {
  emit('toggle-sorting');
};

const handleChangePage = (page) => {
  emit('change-page', page);
};

const handleDragEnd = (evt) => {
  emit('drag-end', evt);
};

const handleSetViewMode = (mode) => {
  emit('set-view-mode', mode);
};

const handleUpdateSearch = (event) => {
  emit('update-search', event.target.value);
};

const handleBulkImport = () => {
  emit('bulk-import');
};

const handleAutoSort = () => {
  emit('auto-sort');
};

const handleDeduplicate = () => {
  emit('deduplicate');
};

const handleImportSubscription = () => {
  emit('import-subscription');
};
</script>

<template>
  <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
    <!-- 标题区域 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <div>
          <h2 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced">手动节点</h2>
          <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">管理单个节点链接</p>
        </div>
        <span class="px-4 py-2 text-base font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700/50 rounded-2xl shadow-sm">
          {{ manualNodes.length }}
        </span>
      </div>
      
      <!-- 操作区域 -->
      <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
        <!-- 搜索框 -->
        <div class="relative w-full sm:w-56 flex-shrink-0">
          <input 
            type="text" 
            :value="searchTerm"
            @input="handleUpdateSearch"
            placeholder="搜索节点..."
            class="search-input-unified w-full text-base"
          />
          <svg class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <!-- 视图切换 -->
        <div class="p-1 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center flex-shrink-0">
          <button 
            @click="handleSetViewMode('card')" 
            class="p-3 rounded-xl transition-colors hover-lift" 
            :class="viewMode === 'card' ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button 
            @click="handleSetViewMode('list')" 
            class="p-3 rounded-xl transition-colors hover-lift" 
            :class="viewMode === 'list' ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- 主要操作按钮 -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <button 
            @click="handleAddNode" 
            class="btn-modern-enhanced btn-add text-base font-semibold px-8 py-3 transform hover:scale-105 transition-all duration-300"
          >
            新增
          </button>
          
          <button 
            @click="handleBulkImport" 
            class="btn-modern-enhanced btn-import text-base font-semibold px-8 py-3 transform hover:scale-105 transition-all duration-300"
          >
            批量导入
          </button>
          
          <button 
            @click="handleToggleSorting" 
            :class="isSorting ? 'btn-modern-enhanced btn-sort sorting text-base font-semibold px-8 py-3 flex items-center gap-2 transform hover:scale-105 transition-all duration-300' : 'btn-modern-enhanced btn-sort text-base font-semibold px-8 py-3 flex items-center gap-2 transform hover:scale-105 transition-all duration-300'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
            </svg>
            <span class="hidden sm:inline">{{ isSorting ? '排序中' : '手动排序' }}</span>
            <span class="sm:hidden">{{ isSorting ? '排序' : '排序' }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 节点内容区域 -->
    <div v-if="manualNodes.length > 0">
      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'">
        <!-- 拖拽排序模式 -->
        <draggable 
          v-if="isSorting"
          tag="div" 
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8" 
          :model-value="manualNodes" 
          :item-key="item => item.id" 
          animation="300" 
          :delay="200"
          :delay-on-touch-only="true"
          @end="handleDragEnd"
        >
          <template #item="{ element: node }">
            <div class="cursor-move">
              <ManualNodeCard 
                :node="node" 
                @edit="handleEditNode(node.id)" 
                @delete="handleDeleteNode(node.id)" 
              />
            </div>
          </template>
        </draggable>
        
        <!-- 普通显示模式 -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <div v-for="node in paginatedManualNodes" :key="node.id">
            <ManualNodeCard 
              :node="node" 
              @edit="handleEditNode(node.id)" 
              @delete="handleDeleteNode(node.id)" 
            />
          </div>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-if="viewMode === 'list'" class="space-y-3">
        <ManualNodeList
          v-for="(node, index) in paginatedManualNodes"
          :key="node.id"
          :node="node"
          :index="(currentPage - 1) * 24 + index + 1"
          @edit="handleEditNode(node.id)"
          @delete="handleDeleteNode(node.id)"
        />
      </div>
      
      <!-- 分页控制 -->
      <div v-if="totalPages > 1 && !isSorting" class="flex justify-center items-center space-x-6 mt-10 text-base font-medium">
        <button 
          @click="handleChangePage(currentPage - 1)" 
          :disabled="currentPage === 1" 
          class="px-6 py-3 rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift"
        >
          &laquo; 上一页
        </button>
        <span class="text-gray-500 dark:text-gray-400">第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button 
          @click="handleChangePage(currentPage + 1)" 
          :disabled="currentPage === totalPages" 
          class="px-6 py-3 rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift"
        >
          下一页 &raquo;
        </button>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="text-center py-20 lg:py-24 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl">
      <div class="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" />
        </svg>
      </div>
      <h3 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced mb-3">没有手动节点</h3>
      <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">添加分享链接或单个节点。</p>
    </div>
  </div>
</template>

<style scoped>
.cursor-move {
  cursor: move;
}
</style>
