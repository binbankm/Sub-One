<!--
  SubscriptionSection.vue
  订阅管理区域组件
  负责订阅的显示、操作和分页
-->
<script setup>
import { ref, computed } from 'vue';
import draggable from 'vuedraggable';
import Card from '../cards/Card.vue';
import { useToastStore } from '../../stores/toast.js';

// Props
const props = defineProps({
  subscriptions: {
    type: Array,
    required: true
  },
  isSorting: {
    type: Boolean,
    default: false
  },
  currentPage: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 1
  },
  isUpdatingAll: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits([
  'add-subscription',
  'edit-subscription', 
  'delete-subscription',
  'toggle-subscription',
  'update-subscription',
  'update-all-subscriptions',
  'toggle-sorting',
  'change-page',
  'drag-end',
  'show-nodes'
]);

const { showToast } = useToastStore();

// 计算属性
const paginatedSubscriptions = computed(() => {
  const start = (props.currentPage - 1) * 6;
  const end = start + 6;
  return props.subscriptions.slice(start, end);
});

// 方法
const handleAddSubscription = () => {
  emit('add-subscription');
};

const handleEditSubscription = (subscriptionId) => {
  emit('edit-subscription', subscriptionId);
};

const handleDeleteSubscription = (subscriptionId) => {
  emit('delete-subscription', subscriptionId);
};

const handleToggleSubscription = (subscription) => {
  emit('toggle-subscription', subscription);
};

const handleUpdateSubscription = (subscriptionId) => {
  emit('update-subscription', subscriptionId);
};

const handleUpdateAllSubscriptions = () => {
  emit('update-all-subscriptions');
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

const handleShowNodes = (subscription) => {
  emit('show-nodes', subscription);
};
</script>

<template>
  <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
    <!-- 标题区域 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <div>
          <h2 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced">订阅管理</h2>
          <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">管理您的机场订阅</p>
        </div>
        <span class="px-4 py-2 text-base font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700/50 rounded-2xl shadow-sm">
          {{ subscriptions.length }}
        </span>
      </div>
      
      <!-- 操作按钮区域 -->
      <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
        <div class="flex items-center gap-3 flex-shrink-0">
          <button 
            @click="handleAddSubscription" 
            class="btn-modern-enhanced btn-add text-base font-semibold px-8 py-3 transform hover:scale-105 transition-all duration-300"
          >
            新增
          </button>
          <button 
            @click="handleUpdateAllSubscriptions" 
            :disabled="isUpdatingAll"
            class="btn-modern-enhanced btn-update text-base font-semibold px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105 transition-all duration-300"
          >
            <svg v-if="isUpdatingAll" class="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="hidden sm:inline">{{ isUpdatingAll ? '更新中...' : '一键更新' }}</span>
            <span class="sm:hidden">{{ isUpdatingAll ? '更新' : '更新' }}</span>
          </button>
        </div>
        
        <div class="flex items-center gap-3 flex-shrink-0">
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
    
    <!-- 订阅卡片网格 -->
    <div v-if="subscriptions.length > 0">
      <!-- 拖拽排序模式 -->
      <draggable 
        v-if="isSorting" 
        tag="div" 
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8" 
        :model-value="subscriptions" 
        :item-key="item => item.id"
        animation="300" 
        :delay="200"
        :delay-on-touch-only="true"
        @end="handleDragEnd"
      >
        <template #item="{ element: subscription }">
          <div class="cursor-move">
            <Card 
              :sub="subscription" 
              @delete="handleDeleteSubscription(subscription.id)" 
              @change="handleToggleSubscription(subscription)" 
              @update="handleUpdateSubscription(subscription.id)" 
              @edit="handleEditSubscription(subscription.id)"
              @show-nodes="handleShowNodes(subscription)" 
            />
          </div>
        </template>
      </draggable>
      
      <!-- 普通显示模式 -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        <div v-for="subscription in paginatedSubscriptions" :key="subscription.id">
          <Card 
            :sub="subscription" 
            @delete="handleDeleteSubscription(subscription.id)" 
            @change="handleToggleSubscription(subscription)" 
            @update="handleUpdateSubscription(subscription.id)" 
            @edit="handleEditSubscription(subscription.id)"
            @show-nodes="handleShowNodes(subscription)" 
          />
        </div>
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
      <div class="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      </div>
      <h3 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced mb-3">没有订阅</h3>
      <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">从添加你的第一个订阅开始。</p>
    </div>
  </div>
</template>

<style scoped>
.cursor-move {
  cursor: move;
}
</style>
