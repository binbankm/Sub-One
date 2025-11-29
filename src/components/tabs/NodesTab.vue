<template>
  <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-4 sm:p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
    <!-- 搜索和工具栏 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <!-- 搜索框 -->
      <div class="relative flex-1 max-w-md">
        <input
          :value="searchTerm"
          @input="$emit('update:searchTerm', $event.target.value)"
          type="text"
          placeholder="搜索节点名称或链接..."
          class="search-input-unified w-full"
        />
        <svg class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      
      <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
        <div class="flex items-center gap-3 flex-shrink-0">
          <button @click="$emit('add')" class="btn-modern-enhanced btn-add text-sm font-semibold px-5 py-2.5 transform hover:scale-105 transition-all duration-300">
            新增
          </button>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
          <button 
            @click="$emit('toggle-sorting')"
            :class="isSorting ? 'btn-modern-enhanced btn-sort sorting' : 'btn-modern-enhanced btn-sort'"
            class="text-sm font-semibold px-5 py-2.5 flex items-center gap-2 transform hover:scale-105 transition-all duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
            </svg>
            <span>{{ isSorting ? '排序中' : '手动排序' }}</span>
          </button>
          <div class="relative">
            <button @click="showMoreMenu = !showMoreMenu" class="p-4 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM18 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
            <Transition name="slide-fade-sm">
              <div v-if="showMoreMenu" class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 ring-2 ring-gray-200 dark:ring-gray-700 border border-gray-200 dark:border-gray-700">
                <button @click="$emit('auto-sort'); showMoreMenu = false" class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  按协议排序
                </button>
                <button @click="$emit('deduplicate'); showMoreMenu = false" class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  去除重复节点
                </button>
                <button @click="$emit('delete-all'); showMoreMenu = false" class="w-full text-left px-5 py-3 text-base text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  清空所有
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 节点卡片网格 -->
    <div v-if="nodes.length > 0" class="transition-all duration-300">
      <component 
        :is="isSorting ? 'draggable' : 'div'"
        v-model="localNodes"
        :disabled="!isSorting"
        item-key="id"
        @end="$emit('drag-end', $event)"
        :class="isSorting ? 'grid-cols-1' : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4'"
        class="grid"
      >
        <template #item="{ element: node }">
          <ManualNodeCard
            :key="node.id"
            :node="node"
            :is-sorting="isSorting"
            @toggle="$emit('toggle', node)"
            @edit="$emit('edit', node.id)"
            @delete="$emit('delete', node.id)"
          />
        </template>
      </component>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="text-center py-16">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {{ searchTerm ? '未找到匹配的节点' : '暂无手动节点' }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-6">
        {{ searchTerm ? '尝试使用不同的关键词' : '添加您的第一个手动节点' }}
      </p>
      <button v-if="!searchTerm" @click="$emit('add')" class="btn-modern-enhanced btn-add">
        添加节点
      </button>
    </div>
    
    <!-- 分页 -->
    <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 mt-8">
      <button 
        @click="$emit('page-change', currentPage - 1)" 
        :disabled="currentPage === 1"
        class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        上一页
      </button>
      <div class="flex gap-2">
        <button
          v-for="page in totalPages"
          :key="page"
          @click="$emit('page-change', page)"
          :class="page === currentPage ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
          class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ page }}
        </button>
      </div>
      <button 
        @click="$emit('page-change', currentPage + 1)" 
        :disabled="currentPage === totalPages"
        class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import draggable from 'vuedraggable';
import ManualNodeCard from '../cards/ManualNodeCard.vue';

const props = defineProps({
  nodes: {
    type: Array,
    default: () => []
  },
  searchTerm: {
    type: String,
    default: ''
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
  }
});

const emit = defineEmits([
  'add',
  'edit',
  'delete',
  'delete-all',
  'toggle',
  'toggle-sorting',
  'auto-sort',
  'deduplicate',
  'drag-end',
  'page-change',
  'update:searchTerm'
]);

const showMoreMenu = ref(false);
const localNodes = computed({
  get: () => props.nodes,
  set: (value) => emit('update:nodes', value)
});
</script>
