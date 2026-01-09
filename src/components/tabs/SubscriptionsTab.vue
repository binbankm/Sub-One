<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import draggable from 'vuedraggable';
import { useBatchSelection } from '../../composables/useBatchSelection';
import Card from '../cards/SubscriptionCard.vue';
import type { Subscription } from '../../types';

const props = defineProps<{
  subscriptions: Subscription[];
  paginatedSubscriptions: Subscription[];
  subsCurrentPage: number;
  subsTotalPages: number;
  isSortingSubs: boolean;
  hasUnsavedSortChanges: boolean;
  isUpdatingAllSubs: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:subscriptions', value: Subscription[]): void;
  (e: 'add-subscription'): void;
  (e: 'update-all-subscriptions'): void;
  (e: 'save-sort'): void;
  (e: 'toggle-sort'): void;
  (e: 'delete-all-subs'): void;
  (e: 'drag-end', evt: unknown): void;
  (e: 'delete-sub', id: string): void;
  (e: 'toggle-sub', sub: Subscription): void;
  (e: 'update-sub', id: string): void;
  (e: 'edit-sub', id: string): void;
  (e: 'show-nodes', sub: Subscription): void;
  (e: 'change-page', page: number): void;
  (e: 'batch-delete-subs', ids: string[]): void;
}>();

const showSubsMoreMenu = ref(false);
const subsMoreMenuRef = ref<HTMLElement | null>(null);

const {
  isBatchDeleteMode,
  // selectedIds can be used directly or aliased if needed
  selectedCount,
  toggleBatchDeleteMode,
  isSelected,
  toggleSelection,
  selectAll,
  deselectAll,
  invertSelection,
  getSelectedIds
} = useBatchSelection(
  computed(() => props.isSortingSubs ? props.subscriptions : props.paginatedSubscriptions)
);

const localSubscriptions = computed({
  get: () => props.subscriptions,
  set: (value) => emit('update:subscriptions', value)
});

// Override toggle to also close menu
const handleToggleBatchDeleteMode = () => {
  toggleBatchDeleteMode();
  showSubsMoreMenu.value = false;
};

// Override deleteSelected to emit event
const deleteSelected = () => {
  if (selectedCount.value === 0) return;
  const idsToDelete = getSelectedIds();
  emit('batch-delete-subs', idsToDelete);
  toggleBatchDeleteMode(true); // reset and exit mode
};

const handleClickOutside = (event: Event) => {
  // 使用 globalThis.Node 避免与自定义 Node 类型冲突，确保类型安全
  if (showSubsMoreMenu.value && subsMoreMenuRef.value && !subsMoreMenuRef.value.contains(event.target as globalThis.Node)) {
    showSubsMoreMenu.value = false;
  }
};

// Add event listener for click outside
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
  <div class="w-full">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <div class="flex-1"></div>
        <div class="flex flex-wrap items-center gap-2 ml-auto">
          <!-- 主要操作按钮 -->
          <div class="flex flex-wrap items-center gap-2">
            <button @click="$emit('add-subscription')"
              class="btn-modern-enhanced btn-add text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 transform hover:scale-105 transition-all duration-300">新增</button>
            
            <button @click="$emit('update-all-subscriptions')" :disabled="isUpdatingAllSubs"
              class="btn-modern-enhanced btn-update text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 transform hover:scale-105 transition-all duration-300">
              <svg v-if="isUpdatingAllSubs" class="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none">
                </circle>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
              </svg>
              <span class="hidden sm:inline">{{ isUpdatingAllSubs ? '更新中...' : '一键更新' }}</span>
              <span class="sm:hidden">{{ isUpdatingAllSubs ? '更新' : '更新' }}</span>
            </button>

            <button v-if="isSortingSubs && hasUnsavedSortChanges" @click="$emit('save-sort')"
              class="btn-modern-enhanced btn-primary text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 flex items-center gap-1 sm:gap-2 transform hover:scale-105 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span class="hidden sm:inline">保存排序</span>
            </button>
            <button @click="$emit('toggle-sort')"
              :class="isSortingSubs ? 'btn-modern-enhanced btn-sort sorting text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 flex items-center gap-1 sm:gap-2 transform hover:scale-105 transition-all duration-300' : 'btn-modern-enhanced btn-sort text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 flex items-center gap-1 sm:gap-2 transform hover:scale-105 transition-all duration-300'">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
              </svg>
              <span class="hidden sm:inline">{{ isSortingSubs ? '排序中' : '手动排序' }}</span>
              <span class="sm:hidden">{{ isSortingSubs ? '排序' : '排序' }}</span>
            </button>
          </div>

          <div class="relative" ref="subsMoreMenuRef">
            <button @click="showSubsMoreMenu = !showSubsMoreMenu"
              class="p-2 sm:p-4 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hover-lift">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-300"
                viewBox="0 0 20 20" fill="currentColor">
                <path
                  d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM18 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
            <Transition name="slide-fade-sm">
              <div v-if="showSubsMoreMenu"
                class="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 ring-2 ring-gray-200 dark:ring-gray-700 border border-gray-200 dark:border-gray-700">
                <button @click="() => toggleBatchDeleteMode()"
                  class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">批量删除</button>
                <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button @click="$emit('delete-all-subs'); showSubsMoreMenu = false"
                  class="w-full text-left px-5 py-3 text-base text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">清空所有</button>
              </div>
            </Transition>
          </div>
        </div>
    </div>

    <!-- 批量操作工具栏 -->
    <Transition name="slide-fade">
      <div v-if="isBatchDeleteMode"
        class="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 shadow-lg">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fill-rule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clip-rule="evenodd" />
            </svg>
            批量删除模式
            <span v-if="selectedCount > 0"
              class="ml-2 px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-bold shadow-md">
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

    <!-- 订阅卡片网格 -->
    <div v-if="subscriptions.length > 0">
      <draggable v-if="isSortingSubs" tag="div"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8" v-model="localSubscriptions"
        :item-key="(item: Subscription) => item.id" animation="300" :delay="200" :delay-on-touch-only="true"
        @end="handleDragEnd">
        <template #item="{ element: subscription }">
          <div class="cursor-move">
            <Card :sub="subscription" :isBatchMode="isBatchDeleteMode" :isSelected="isSelected(subscription.id)"
              @delete="$emit('delete-sub', subscription.id)" @change="$emit('toggle-sub', subscription)"
              @update="$emit('update-sub', subscription.id)" @edit="$emit('edit-sub', subscription.id)"
              @showNodes="$emit('show-nodes', subscription)" @toggleSelect="toggleSelection(subscription.id)" />
          </div>
        </template>
      </draggable>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div v-for="subscription in paginatedSubscriptions" :key="subscription.id">
          <Card :sub="subscription" :isBatchMode="isBatchDeleteMode" :isSelected="isSelected(subscription.id)"
            @delete="$emit('delete-sub', subscription.id)" @change="$emit('toggle-sub', subscription)"
            @update="$emit('update-sub', subscription.id)" @edit="$emit('edit-sub', subscription.id)"
            @showNodes="$emit('show-nodes', subscription)" @toggleSelect="toggleSelection(subscription.id)" />
        </div>
      </div>
      <div v-if="subsTotalPages > 1 && !isSortingSubs"
        class="flex justify-center items-center gap-2 sm:gap-4 mt-10 text-base font-medium">
        <button @click="$emit('change-page', subsCurrentPage - 1)" :disabled="subsCurrentPage === 1"
          class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center">&laquo;
          <span class="hidden xs:inline ml-1">上一页</span></button>
        <span
          class="min-w-[80px] sm:min-w-[100px] text-center text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">第{{
            subsCurrentPage }}/{{ subsTotalPages }}页</span>
        <button @click="$emit('change-page', subsCurrentPage + 1)" :disabled="subsCurrentPage === subsTotalPages"
          class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center"><span
            class="hidden xs:inline mr-1">下一页</span> &raquo;</button>
      </div>
    </div>
    <div v-else
      class="text-center py-20 lg:py-24 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl">
      <div
        class="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      </div>
      <h3 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced mb-3">没有订阅</h3>
      <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">从添加你的第一个订阅开始。</p>
    </div>
  </div>
</template>



