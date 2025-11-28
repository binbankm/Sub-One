<script setup>
import { ref } from 'vue';
import draggable from 'vuedraggable';
import ManualNodeCard from '../cards/ManualNodeCard.vue';

const props = defineProps({
  manualNodes: {
    type: Array,
    required: true
  },
  paginatedManualNodes: {
    type: Array,
    required: true
  },
  manualNodesCurrentPage: {
    type: Number,
    required: true
  },
  manualNodesTotalPages: {
    type: Number,
    required: true
  },
  searchTerm: {
    type: String,
    default: ''
  },
  isSortingNodes: {
    type: Boolean,
    default: false
  },
  hasUnsavedSortChanges: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'add-node',
  'edit-node',
  'delete-node',
  'update:search-term',
  'bulk-import',
  'save-sort',
  'toggle-sorting',
  'import-subscription',
  'auto-sort',
  'deduplicate',
  'delete-all',
  'change-page',
  'drag-end'
]);

const showNodesMoreMenu = ref(false);

const handleToggleSorting = () => {
  if (props.isSortingNodes && props.hasUnsavedSortChanges && !confirm('有未保存的排序更改，确定要退出吗？')) {
    return;
  }
  emit('toggle-sorting');
};
</script>

<template>
  <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-4 sm:p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <div class="flex items-center gap-4">
      </div>
      
      <div class="flex flex-wrap items-center gap-2 w-full">
        <!-- 搜索框 -->
        <div class="relative w-full sm:w-56 mb-2 sm:mb-0 flex-shrink-0">
          <input 
            type="text" 
            :value="searchTerm"
            @input="emit('update:search-term', $event.target.value)"
            placeholder="搜索节点..."
            class="search-input-unified w-full text-base"
          />
          <svg class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <div class="flex flex-wrap items-center gap-2 ml-auto">
          <!-- 主要操作按钮 -->
          <div class="flex flex-wrap items-center gap-2">
            <button @click="emit('add-node')" class="btn-modern-enhanced btn-add text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 transform hover:scale-105 transition-all duration-300">新增</button>
            
            <button @click="emit('bulk-import')" class="btn-modern-enhanced btn-import text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 transform hover:scale-105 transition-all duration-300">批量导入</button>
            
            <button 
              v-if="isSortingNodes && hasUnsavedSortChanges"
              @click="emit('save-sort')"
              class="btn-modern-enhanced btn-primary text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 flex items-center gap-1 sm:gap-2 transform hover:scale-105 transition-all duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span class="hidden sm:inline">保存排序</span>
            </button>
            
            <button 
              @click="handleToggleSorting"
              :class="isSortingNodes ? 'btn-modern-enhanced btn-sort sorting text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 flex items-center gap-1 sm:gap-2 transform hover:scale-105 transition-all duration-300' : 'btn-modern-enhanced btn-sort text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 flex items-center gap-1 sm:gap-2 transform hover:scale-105 transition-all duration-300'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
              </svg>
              <span class="hidden sm:inline">{{ isSortingNodes ? '排序中' : '手动排序' }}</span>
              <span class="sm:hidden">{{ isSortingNodes ? '排序' : '排序' }}</span>
            </button>
          </div>
          
          <!-- 更多菜单 -->
          <div class="relative">
            <button @click="showNodesMoreMenu = !showNodesMoreMenu" class="p-2 sm:p-4 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hover-lift">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
            </button>
            <Transition name="slide-fade-sm">
              <div v-if="showNodesMoreMenu" class="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 ring-2 ring-gray-200 dark:ring-gray-700 border border-gray-200 dark:border-gray-700">
                <button @click="emit('import-subscription'); showNodesMoreMenu=false" class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">导入订阅</button>
                <button @click="emit('auto-sort'); showNodesMoreMenu=false" class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">一键排序</button>
                <button @click="emit('deduplicate'); showNodesMoreMenu=false" class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">一键去重</button>
                <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button @click="emit('delete-all'); showNodesMoreMenu=false" class="w-full text-left px-5 py-3 text-base text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">清空所有</button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 节点内容区域 -->
    <div v-if="manualNodes.length > 0">
      <draggable 
        v-if="isSortingNodes"
        tag="div" 
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8" 
        :model-value="manualNodes" 
        @update:model-value="$emit('update:manual-nodes', $event)"
        :item-key="item => item.id" 
        animation="300" 
        :delay="200"
        :delay-on-touch-only="true"
        @end="emit('drag-end', $event)"
      >
        <template #item="{ element: node }">
          <div class="cursor-move">
            <ManualNodeCard 
              :node="node" 
              @edit="emit('edit-node', $event)" 
              @delete="emit('delete-node', $event)" 
            />
          </div>
        </template>
      </draggable>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div v-for="node in paginatedManualNodes" :key="node.id">
          <ManualNodeCard 
            :node="node" 
            @edit="emit('edit-node', $event)" 
            @delete="emit('delete-node', $event)" 
          />
        </div>
      </div>
      
      <!-- 分页 -->
      <div v-if="manualNodesTotalPages > 1 && !isSortingNodes" class="flex justify-center items-center gap-2 sm:gap-4 mt-10 text-base font-medium">
        <button @click="emit('change-page', manualNodesCurrentPage - 1)" :disabled="manualNodesCurrentPage === 1" class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center">&laquo; <span class="hidden xs:inline ml-1">上一页</span></button>
        <span class="min-w-[80px] sm:min-w-[100px] text-center text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">第{{ manualNodesCurrentPage }}/{{ manualNodesTotalPages }}页</span>
        <button @click="emit('change-page', manualNodesCurrentPage + 1)" :disabled="manualNodesCurrentPage === manualNodesTotalPages" class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center"><span class="hidden xs:inline mr-1">下一页</span> &raquo;</button>
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

.slide-fade-sm-enter-active,
.slide-fade-sm-leave-active {
  transition: all 0.2s ease-out;
}
.slide-fade-sm-enter-from,
.slide-fade-sm-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
