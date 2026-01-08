<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import ProfileCard from '../cards/ProfileCard.vue';
import type { Profile, Subscription } from '../../types';

const props = defineProps<{
  profiles: Profile[];
  paginatedProfiles: Profile[];
  profilesCurrentPage: number;
  profilesTotalPages: number;
  subscriptions: Subscription[];
}>();

const emit = defineEmits<{
  (e: 'add-profile'): void;
  (e: 'delete-all-profiles'): void;
  (e: 'edit-profile', id: string): void;
  (e: 'delete-profile', id: string): void;
  (e: 'toggle-profile', profile: Profile): void;
  (e: 'copy-link', id: string): void;
  (e: 'show-nodes', profile: Profile): void;
  (e: 'change-page', page: number): void;
  (e: 'batch-delete-profiles', ids: string[]): void;
}>();

const showProfilesMoreMenu = ref(false);
const profilesMoreMenuRef = ref<HTMLElement | null>(null);
const isBatchDeleteMode = ref(false);
const selectedProfileIds = ref(new Set<string>());

// 批量删除模式相关方法
const toggleBatchDeleteMode = () => {
  isBatchDeleteMode.value = !isBatchDeleteMode.value;
  if (!isBatchDeleteMode.value) {
    selectedProfileIds.value.clear();
  }
  showProfilesMoreMenu.value = false;
};

const isSelected = (id: string) => {
  return selectedProfileIds.value.has(id);
};

const toggleSelection = (id: string) => {
  if (selectedProfileIds.value.has(id)) {
    selectedProfileIds.value.delete(id);
  } else {
    selectedProfileIds.value.add(id);
  }
};

const selectAll = () => {
  props.paginatedProfiles.forEach(profile => selectedProfileIds.value.add(profile.id));
};

const deselectAll = () => {
  selectedProfileIds.value.clear();
};

const invertSelection = () => {
  props.paginatedProfiles.forEach(profile => {
    if (selectedProfileIds.value.has(profile.id)) {
      selectedProfileIds.value.delete(profile.id);
    } else {
      selectedProfileIds.value.add(profile.id);
    }
  });
};

const deleteSelected = () => {
  if (selectedProfileIds.value.size === 0) return;

  const idsToDelete = Array.from(selectedProfileIds.value);
  emit('batch-delete-profiles', idsToDelete);
  selectedProfileIds.value.clear();
  isBatchDeleteMode.value = false;
};

const selectedCount = computed(() => selectedProfileIds.value.size);

const handleClickOutside = (event: Event) => {
  // 使用 globalThis.Node 避免与自定义 Node 类型冲突，确保类型安全
  if (showProfilesMoreMenu.value && profilesMoreMenuRef.value && !profilesMoreMenuRef.value.contains(event.target as globalThis.Node)) {
    showProfilesMoreMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="w-full">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
      <div class="flex-1"></div>
      <div class="flex flex-wrap items-center gap-2 ml-auto">
        <div class="flex flex-wrap items-center gap-2">
          <button @click="$emit('add-profile')"
            class="btn-modern-enhanced btn-add text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2.5 transform hover:scale-105 transition-all duration-300">新增</button>
          <div class="relative" ref="profilesMoreMenuRef">
            <button @click="showProfilesMoreMenu = !showProfilesMoreMenu"
              class="p-2 sm:p-4 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hover-lift">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20"
                fill="currentColor">
                <path
                  d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>
            <Transition name="slide-fade-sm">
              <div v-if="showProfilesMoreMenu"
                class="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 ring-2 ring-gray-200 dark:ring-gray-700 border border-gray-200 dark:border-gray-700">
                <button @click="toggleBatchDeleteMode"
                  class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors">批量删除</button>
                <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button @click="$emit('delete-all-profiles'); showProfilesMoreMenu = false"
                  class="w-full text-left px-5 py-3 text-base text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">清空所有</button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量操作工具栏 -->
    <Transition name="slide-fade">
      <div v-if="isBatchDeleteMode"
        class="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border-2 border-purple-200 dark:border-purple-800 shadow-lg">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fill-rule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clip-rule="evenodd" />
            </svg>
            批量删除模式
            <span v-if="selectedCount > 0"
              class="ml-2 px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold shadow-md">
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
            <button @click="toggleBatchDeleteMode"
              class="btn-modern-enhanced btn-cancel text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 sm:py-2 transform hover:scale-105 transition-all duration-300">
              取消
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <div v-if="profiles.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
      <ProfileCard v-for="profile in paginatedProfiles" :key="profile.id" :profile="profile"
        :all-subscriptions="subscriptions" :isBatchMode="isBatchDeleteMode" :isSelected="isSelected(profile.id)"
        @edit="$emit('edit-profile', profile.id)" @delete="$emit('delete-profile', profile.id)"
        @change="$emit('toggle-profile', $event)" @copy-link="$emit('copy-link', profile.id)"
        @showNodes="$emit('show-nodes', profile)" @toggleSelect="toggleSelection(profile.id)" />
    </div>
    <div v-if="profilesTotalPages > 1"
      class="flex justify-center items-center gap-2 sm:gap-4 mt-10 text-base font-medium">
      <button @click="$emit('change-page', profilesCurrentPage - 1)" :disabled="profilesCurrentPage === 1"
        class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center">&laquo;
        <span class="hidden xs:inline ml-1">上一页</span></button>
      <span
        class="min-w-[80px] sm:min-w-[100px] text-center text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">第{{
        profilesCurrentPage }}/{{ profilesTotalPages }}页</span>
      <button @click="$emit('change-page', profilesCurrentPage + 1)"
        :disabled="profilesCurrentPage === profilesTotalPages"
        class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center"><span
          class="hidden xs:inline mr-1">下一页</span> &raquo;</button>
    </div>
    <div v-if="profiles.length === 0"
      class="text-center py-20 lg:py-24 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl">
      <div
        class="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-purple-500" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced mb-3">没有订阅组</h3>
      <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">创建一个订阅组来组合你的节点吧！</p>
    </div>
  </div>
</template>

<style scoped>
/* 过渡动画已移至 design-system.css 全局定义 */
</style>

