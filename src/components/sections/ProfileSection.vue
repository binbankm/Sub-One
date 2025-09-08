<!--
  ProfileSection.vue
  订阅组管理区域组件
  负责订阅组的显示、操作和分页
-->
<script setup>
import { computed } from 'vue';
import ProfileCard from '../cards/ProfileCard.vue';

// Props
const props = defineProps({
  profiles: {
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
  allSubscriptions: {
    type: Array,
    default: () => []
  }
});

// Emits
const emit = defineEmits([
  'add-profile',
  'edit-profile',
  'delete-profile',
  'toggle-profile',
  'copy-link',
  'change-page',
  'show-nodes'
]);

// 计算属性
const paginatedProfiles = computed(() => {
  const start = (props.currentPage - 1) * 6;
  const end = start + 6;
  return props.profiles.slice(start, end);
});

// 方法
const handleAddProfile = () => {
  emit('add-profile');
};

const handleEditProfile = (profileId) => {
  emit('edit-profile', profileId);
};

const handleDeleteProfile = (profileId) => {
  emit('delete-profile', profileId);
};

const handleToggleProfile = (profile) => {
  emit('toggle-profile', profile);
};

const handleCopyLink = (profileId) => {
  emit('copy-link', profileId);
};

const handleChangePage = (page) => {
  emit('change-page', page);
};

const handleShowNodes = (profile) => {
  emit('show-nodes', profile);
};
</script>

<template>
  <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
    <!-- 标题区域 -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <h2 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced">订阅组</h2>
          <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">组合管理节点</p>
        </div>
        <span class="px-4 py-2 text-base font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700/50 rounded-2xl shadow-sm">
          {{ profiles.length }}
        </span>
      </div>
      
      <!-- 操作按钮区域 -->
      <div class="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
        <button 
          @click="handleAddProfile" 
          class="btn-modern-enhanced btn-add text-base font-semibold px-8 py-3 transform hover:scale-105 transition-all duration-300"
        >
          新增
        </button>
      </div>
    </div>
    
    <!-- 订阅组卡片网格 -->
    <div v-if="profiles.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      <ProfileCard
        v-for="profile in paginatedProfiles"
        :key="profile.id"
        :profile="profile"
        :all-subscriptions="allSubscriptions"
        @edit="handleEditProfile(profile.id)"
        @delete="handleDeleteProfile(profile.id)"
        @change="handleToggleProfile($event)"
        @copy-link="handleCopyLink(profile.id)"
        @show-nodes="handleShowNodes(profile)"
      />
    </div>
    
    <!-- 分页控制 -->
    <div v-if="totalPages > 1" class="flex justify-center items-center space-x-6 mt-10 text-base font-medium">
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
    
    <!-- 空状态 -->
    <div v-if="profiles.length === 0" class="text-center py-20 lg:py-24 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl">
      <div class="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced mb-3">没有订阅组</h3>
      <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">创建一个订阅组来组合你的节点吧！</p>
    </div>
  </div>
</template>
