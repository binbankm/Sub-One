<script setup>
import { ref } from 'vue';
import ProfileCard from '../cards/ProfileCard.vue';

const props = defineProps({
  profiles: {
    type: Array,
    required: true
  },
  paginatedProfiles: {
    type: Array,
    required: true
  },
  profilesCurrentPage: {
    type: Number,
    required: true
  },
  profilesTotalPages: {
    type: Number,
    required: true
  },
  subscriptions: {
    type: Array,
    required: true
  }
});

const emit = defineEmits([
  'add-profile',
  'edit-profile',
  'delete-profile',
  'change-profile',
  'copy-link',
  'show-nodes',
  'delete-all',
  'change-page'
]);

const profilesMoreMenuRef = ref(null);
const showProfilesMoreMenu = ref(false);
</script>

<template>
  <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-4 sm:p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <!-- 标题区域已移除 -->
      <div class="flex-1"></div>
      <div class="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
        <button @click="emit('add-profile')" class="btn-modern-enhanced btn-add text-sm font-semibold px-5 py-2.5 transform hover:scale-105 transition-all duration-300">新增</button>
        <div class="relative" ref="profilesMoreMenuRef">
          <button @click="showProfilesMoreMenu = !showProfilesMoreMenu" class="p-4 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hover-lift">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
          </button>
          <Transition name="slide-fade-sm">
            <div v-if="showProfilesMoreMenu" class="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 ring-2 ring-gray-200 dark:ring-gray-700 border border-gray-200 dark:border-gray-700">
              <button @click="emit('delete-all'); showProfilesMoreMenu=false" class="w-full text-left px-5 py-3 text-base text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">清空所有</button>
            </div>
          </Transition>
        </div>
      </div>
    </div>
    
    <div v-if="profiles.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
      <ProfileCard
        v-for="profile in paginatedProfiles"
        :key="profile.id"
        :profile="profile"
        :all-subscriptions="subscriptions"
        @edit="emit('edit-profile', $event)"
        @delete="emit('delete-profile', $event)"
        @change="emit('change-profile', $event)"
        @copy-link="emit('copy-link', $event)"
        @showNodes="emit('show-nodes', $event)"
      />
    </div>
    
    <!-- 分页 -->
    <div v-if="profilesTotalPages > 1" class="flex justify-center items-center gap-2 sm:gap-4 mt-10 text-base font-medium">
      <button @click="emit('change-page', profilesCurrentPage - 1)" :disabled="profilesCurrentPage === 1" class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center">&laquo; <span class="hidden xs:inline ml-1">上一页</span></button>
      <span class="min-w-[80px] sm:min-w-[100px] text-center text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">第{{ profilesCurrentPage }}/{{ profilesTotalPages }}页</span>
      <button @click="emit('change-page', profilesCurrentPage + 1)" :disabled="profilesCurrentPage === profilesTotalPages" class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center"><span class="hidden xs:inline mr-1">下一页</span> &raquo;</button>
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

<style scoped>
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
