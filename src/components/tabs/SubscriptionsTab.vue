<template>
  <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-4 sm:p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
    <!-- 工具栏 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <div class="flex-1"></div>
      <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
        <div class="flex items-center gap-3 flex-shrink-0">
          <button @click="$emit('add')" class="btn-modern-enhanced btn-add text-sm font-semibold px-5 py-2.5 transform hover:scale-105 transition-all duration-300">
            新增
          </button>
          <button 
            @click="$emit('update-all')" 
            :disabled="isUpdating"
            class="btn-modern-enhanced btn-update text-sm font-semibold px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105 transition-all duration-300"
          >
            <svg v-if="isUpdating" class="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isUpdating ? '更新中...' : '一键更新' }}</span>
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
              <div v-if="showMoreMenu" class="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 ring-2 ring-gray-200 dark:ring-gray-700 border border-gray-200 dark:border-gray-700">
                <button @click="$emit('delete-all'); showMoreMenu = false" class="w-full text-left px-5 py-3 text-base text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  清空所有
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 订阅卡片网格 -->
    <div v-if="subscriptions.length > 0" class="transition-all duration-300">
      <component 
        :is="isSorting ? 'draggable' : 'div'"
        v-model="localSubscriptions"
        :disabled="!isSorting"
        item-key="id"
        @end="$emit('drag-end', $event)"
        :class="isSorting ? 'grid-cols-1' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'"
        class="grid"
      >
        <template #item="{ element: subscription }">
          <SubscriptionCard
            :key="subscription.id"
            :subscription="subscription"
            :is-sorting="isSorting"
            @toggle="$emit('toggle', subscription)"
            @edit="$emit('edit', subscription.id)"
            @delete="$emit('delete', subscription.id)"
            @update="$emit('update', subscription.id)"
            @show-details="$emit('show-details', subscription)"
          />
        </template>
      </component>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="text-center py-16">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">暂无订阅</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-6">开始添加您的第一个订阅链接</p>
      <button @click="$emit('add')" class="btn-modern-enhanced btn-add">
        添加订阅
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
          :class="page === currentPage ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
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
import SubscriptionCard from '../cards/SubscriptionCard.vue';

const props = defineProps({
  subscriptions: {
    type: Array,
    default: () => []
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
  isUpdating: {
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
  'update',
  'update-all',
  'show-details',
  'toggle-sorting',
  'drag-end',
  'page-change'
]);

const showMoreMenu = ref(false);
const localSubscriptions = computed({
  get: () => props.subscriptions,
  set: (value) => emit('update:subscriptions', value)
});
</script>
