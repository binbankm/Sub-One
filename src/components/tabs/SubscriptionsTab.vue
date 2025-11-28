<script setup>
import { ref } from 'vue';
import draggable from 'vuedraggable';
import Card from '../cards/Card.vue';

const props = defineProps({
  subscriptions: {
    type: Array,
    required: true
  },
  paginatedSubscriptions: {
    type: Array,
    required: true
  },
  subsCurrentPage: {
    type: Number,
    required: true
  },
  subsTotalPages: {
    type: Number,
    required: true
  },
  isSortingSubs: {
    type: Boolean,
    default: false
  },
  hasUnsavedSortChanges: {
    type: Boolean,
    default: false
  },
  isUpdatingAllSubs: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'add-subscription',
  'edit-subscription',
  'delete-subscription',
  'toggle-subscription',
 
'update-subscription',
  'show-nodes',
  'update-all',
  'save-sort',
  'toggle-sorting',
  'delete-all',
  'change-page',
  'drag-end'
]);

const showSubsMoreMenu = ref(false);

const handleToggleSorting = () => {
  if (props.isSortingSubs && props.hasUnsavedSortChanges && !confirm('有未保存的排序更改，确定要退出吗？')) {
    return;
  }
  emit('toggle-sorting');
};
</script>

<template>
  <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-4 sm:p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <!-- 标题区域已移除，由外层布局统一管理 -->
      <div class="flex-1"></div>
      <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
        <div class="flex items-center gap-3 flex-shrink-0">
          <button @click="emit('add-subscription')" class="btn-modern-enhanced btn-add text-sm font-semibold px-5 py-2.5 transform hover:scale-105 transition-all duration-300">新增</button>
          <button 
            @click="emit('update-all')" 
            :disabled="isUpdatingAllSubs"
            class="btn-modern-enhanced btn-update text-sm font-semibold px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105 transition-all duration-300"
          >
            <svg v-if="isUpdatingAllSubs" class="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="hidden sm:inline">{{ isUpdatingAllSubs ? '更新中...' : '一键更新' }}</span>
            <span class="sm:hidden">{{ isUpdatingAllSubs ? '更新' : '更新' }}</span>
          </button>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
          <button 
            v-if="isSortingSubs && hasUnsavedSortChanges"
            @click="emit('save-sort')"
            class="btn-modern-enhanced btn-primary text-sm font-semibold px-5 py-2.5 flex items-center gap-2 transform hover:scale-105 transition-all duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            保存排序
          </button>
          <button 
            @click="handleToggleSorting"
            :class="isSortingSubs ? 'btn-modern-enhanced btn-sort sorting text-sm font-semibold px-5 py-2.5 flex items-center gap-2 transform hover:scale-105 transition-all duration-300' : 'btn-modern-enhanced btn-sort text-sm font-semibold px-5 py-2.5 flex items-center gap-2 transform hover:scale-105 transition-all duration-300'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
            </svg>
            <span class="hidden sm:inline">{{ isSortingSubs ? '排序中' : '手动排序' }}</span>
            <span class="sm:hidden">{{ isSortingSubs ? '排序' : '排序' }}</span>
          </button>
          <div class="relative">
            <button @click="showSubsMoreMenu = !showSubsMoreMenu" class="p-4 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hover-lift">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM18 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </button>
            <Transition name="slide-fade-sm">
              <div v-if="showSubsMoreMenu" class="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 ring-2 ring-gray-200 dark:ring-gray-700 border border-gray-200 dark:border-gray-700">
                <button @click="emit('delete-all'); showSubsMoreMenu=false" class="w-full text-left px-5 py-3 text-base text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">清空所有</button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 订阅卡片网格 -->
    <div v-if="subscriptions.length > 0">
      <draggable 
        v-if="isSortingSubs" 
        tag="div" 
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8" 
        :model-value="subscriptions" 
        @update:model-value="$emit('update:subscriptions', $event)"
        :item-key="item => item.id"
        animation="300" 
        :delay="200"
        :delay-on-touch-only="true"
        @end="emit('drag-end', $event)"
      >
        <template #item="{ element: subscription }">
          <div class="cursor-move">
            <Card 
              :sub="subscription" 
              @delete="emit('delete-subscription', $event)" 
              @change="emit('toggle-subscription', $event)" 
              @update="emit('update-subscription', $event)" 
              @edit="emit('edit-subscription', $event)"
              @showNodes="emit('show-nodes', $event)" 
            />
          </div>
        </template>
      </draggable>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div v-for="subscription in paginatedSubscriptions" :key="subscription.id">
          <Card 
            :sub="subscription" 
            @delete="emit('delete-subscription', $event)" 
            @change="emit('toggle-subscription', $event)" 
            @update="emit('update-subscription', $event)" 
            @edit="emit('edit-subscription', $event)"
            @showNodes="emit('show-nodes', $event)" 
          />
        </div>
      </div>
      
      <!-- 分页 -->
      <div v-if="subsTotalPages > 1 && !isSortingSubs" class="flex justify-center items-center gap-2 sm:gap-4 mt-10 text-base font-medium">
        <button @click="emit('change-page', subsCurrentPage - 1)" :disabled="subsCurrentPage === 1" class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center">&laquo; <span class="hidden xs:inline ml-1">上一页</span></button>
        <span class="min-w-[80px] sm:min-w-[100px] text-center text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">第{{ subsCurrentPage }}/{{ subsTotalPages }}页</span>
        <button @click="emit('change-page', subsCurrentPage + 1)" :disabled="subsCurrentPage === subsTotalPages" class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center"><span class="hidden xs:inline mr-1">下一页</span> &raquo;</button>
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
