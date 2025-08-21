<!-- FILE: src/components/tabs/SubscriptionsTab.vue -->
<template>
  <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
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
        <span class="px-4 py-2 text-base font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700/50 rounded-2xl shadow-sm">{{ subscriptions.length }}</span>
      </div>
      
      <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
        <div class="flex items-center gap-3 flex-shrink-0">
          <button @click="handleAddSubscription" class="btn-modern-enhanced btn-add text-base font-semibold px-8 py-3 transform hover:scale-105 transition-all duration-300">新增</button>
          <button 
            @click="handleUpdateAllSubscriptions" 
            :disabled="isUpdatingAllSubs"
            class="btn-modern-enhanced btn-update text-base font-semibold px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform hover:scale-105 transition-all duration-300"
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
            @click="isSortingSubs = !isSortingSubs" 
            :class="isSortingSubs ? 'btn-modern-enhanced btn-sort sorting text-base font-semibold px-8 py-3 flex items-center gap-2 transform hover:scale-105 transition-all duration-300' : 'btn-modern-enhanced btn-sort text-base font-semibold px-8 py-3 flex items-center gap-2 transform hover:scale-105 transition-all duration-300'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
            </svg>
            <span class="hidden sm:inline">{{ isSortingSubs ? '排序中' : '手动排序' }}</span>
            <span class="sm:hidden">{{ isSortingSubs ? '排序' : '排序' }}</span>
          </button>
          
          <div class="relative" ref="subsMoreMenuRef">
            <button @click="showSubsMoreMenu = !showSubsMoreMenu" class="p-4 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hover-lift">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a0 0 0 100-4 2 2 0 000 4z" /></svg>
            </button>
            <Transition name="slide-fade-sm">
              <div v-if="showSubsMoreMenu" class="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-2xl shadow-xl z-10 ring-1 ring-black ring-opacity-5">
                <button @click="showDeleteSubsModal = true; showSubsMoreMenu=false" class="w-full text-left px-5 py-3 text-base text-red-500 hover:bg-red-500/10">清空所有</button>
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
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8" 
        v-model="subscriptions" 
        :item-key="item => item.id"
        animation="300" 
        :delay="200"
        :delay-on-touch-only="true"
        @end="handleSubscriptionDragEnd">
        <template #item="{ element: subscription }">
          <div class="cursor-move">
            <Card 
              :sub="subscription" 
              @delete="handleDeleteSubscriptionWithCleanup(subscription.id)" 
              @change="handleSubscriptionToggle(subscription)" 
              @update="handleSubscriptionUpdate(subscription.id)" 
              @edit="handleEditSubscription(subscription.id)"
              @showNodes="handleShowNodeDetails(subscription)" />
          </div>
        </template>
      </draggable>
      
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        <div v-for="subscription in paginatedSubscriptions" :key="subscription.id">
          <Card 
            :sub="subscription" 
            @delete="handleDeleteSubscriptionWithCleanup(subscription.id)" 
            @change="handleSubscriptionToggle(subscription)" 
            @update="handleSubscriptionUpdate(subscription.id)" 
            @edit="handleEditSubscription(subscription.id)"
            @showNodes="handleShowNodeDetails(subscription)" />
        </div>
      </div>
      
      <div v-if="subsTotalPages > 1 && !isSortingSubs" class="flex justify-center items-center space-x-6 mt-10 text-base font-medium">
        <button @click="changeSubsPage(subsCurrentPage - 1)" :disabled="subsCurrentPage === 1" class="px-6 py-3 rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift">&laquo; 上一页</button>
        <span class="text-gray-500 dark:text-gray-400">第 {{ subsCurrentPage }} / {{ subsTotalPages }} 页</span>
        <button @click="changeSubsPage(subsCurrentPage + 1)" :disabled="subsCurrentPage === subsTotalPages" class="px-6 py-3 rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift">下一页 &raquo;</button>
      </div>
    </div>
    
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

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import draggable from 'vuedraggable';
import Card from '../Card.vue';

// Props
const props = defineProps({
  subscriptions: {
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
  paginatedSubscriptions: {
    type: Array,
    required: true
  },
  isUpdatingAllSubs: {
    type: Boolean,
    required: true
  }
});

// Emits
const emit = defineEmits([
  'add-subscription',
  'edit-subscription',
  'delete-subscription',
  'toggle-subscription',
  'update-subscription',
  'show-node-details',
  'update-all-subscriptions',
  'sort-drag-end',
  'change-page',
  'delete-all-subscriptions'
]);

// Local state
const isSortingSubs = ref(false);
const showSubsMoreMenu = ref(false);
const showDeleteSubsModal = ref(false);
const subsMoreMenuRef = ref(null);

// Computed
const subscriptions = computed(() => props.subscriptions);

// Methods
const handleAddSubscription = () => {
  emit('add-subscription');
};

const handleEditSubscription = (subId) => {
  emit('edit-subscription', subId);
};

const handleDeleteSubscriptionWithCleanup = (subId) => {
  emit('delete-subscription', subId);
};

const handleSubscriptionToggle = (subscription) => {
  emit('toggle-subscription', subscription);
};

const handleSubscriptionUpdate = (subscriptionId) => {
  emit('update-subscription', subscriptionId);
};

const handleShowNodeDetails = (subscription) => {
  emit('show-node-details', subscription);
};

const handleUpdateAllSubscriptions = () => {
  emit('update-all-subscriptions');
};

const handleSubscriptionDragEnd = () => {
  emit('sort-drag-end');
};

const changeSubsPage = (page) => {
  emit('change-page', page);
};

const handleDeleteAllSubscriptions = () => {
  emit('delete-all-subscriptions');
  showDeleteSubsModal.value = false;
};

// Click outside handler
const handleClickOutside = (event) => {
  if (showSubsMoreMenu.value && subsMoreMenuRef.value && !subsMoreMenuRef.value.contains(event.target)) {
    showSubsMoreMenu.value = false;
  }
};

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

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
