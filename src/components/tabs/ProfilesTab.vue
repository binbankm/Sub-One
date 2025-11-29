<template>
  <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-4 sm:p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
    <!-- 工具栏 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <div class="flex-1"></div>
      <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
        <button @click="$emit('add')" class="btn-modern-enhanced btn-add text-sm font-semibold px-5 py-2.5 transform hover:scale-105 transition-all duration-300">
          新增订阅组
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
    
    <!-- 订阅组卡片网格 -->
    <div v-if="profiles.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      <ProfileCard
        v-for="profile in profiles"
        :key="profile.id"
        :profile="profile"
        :all-subscriptions="allSubscriptions"
        :all-manual-nodes="allManualNodes"
        @toggle="$emit('toggle', $event)"
        @edit="$emit('edit', profile.id)"
        @delete="$emit('delete', profile.id)"
        @copy-link="$emit('copy-link', profile.id)"
        @show-details="$emit('show-details', profile)"
      />
    </div>
    
    <!-- 空状态 -->
    <div v-else class="text-center py-16">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">暂无订阅组</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-6">创建订阅组来组合您的订阅和节点</p>
      <button @click="$emit('add')" class="btn-modern-enhanced btn-add">
        创建订阅组
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
          :class="page === currentPage ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
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
import { ref } from 'vue';
import ProfileCard from '../cards/ProfileCard.vue';

const props = defineProps({
  profiles: {
    type: Array,
    default: () => []
  },
  allSubscriptions: {
    type: Array,
    default: () => []
  },
  allManualNodes: {
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
  }
});

defineEmits([
  'add',
  'edit',
  'delete',
  'delete-all',
  'toggle',
  'copy-link',
  'show-details',
  'page-change'
]);

const showMoreMenu = ref(false);
</script>
