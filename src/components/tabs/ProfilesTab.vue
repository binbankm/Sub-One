<template>
  <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
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
        <span class="px-4 py-2 text-base font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700/50 rounded-2xl shadow-sm">{{ profiles.length }}</span>
      </div>
      
      <div class="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
        <button @click="handleAddProfile" class="btn-modern-enhanced btn-add text-base font-semibold px-8 py-3 transform hover:scale-105 transition-all duration-300">新增</button>
        
        <div class="relative" ref="profilesMoreMenuRef">
          <button @click="showProfilesMoreMenu = !showProfilesMoreMenu" class="p-4 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hover-lift">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
          </button>
          <Transition name="slide-fade-sm">
            <div v-if="showProfilesMoreMenu" class="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-2xl shadow-xl z-10 ring-1 ring-black ring-opacity-5">
              <button @click="showDeleteProfilesModal = true; showProfilesMoreMenu=false" class="w-full text-left px-5 py-3 text-base text-red-500 hover:bg-red-500/10">清空所有</button>
            </div>
          </Transition>
        </div>
      </div>
    </div>
    
    <div v-if="profiles.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      <ProfileCard
        v-for="profile in paginatedProfiles"
        :key="profile.id"
        :profile="profile"
        :all-subscriptions="allSubscriptions"
        @edit="handleEditProfile(profile.id)"
        @delete="handleDeleteProfile(profile.id)"
        @change="handleProfileToggle($event)"
        @copy-link="handleCopyProfileLink(profile.id)"
        @showNodes="handleShowProfileNodeDetails(profile)"
      />
    </div>
    
    <div v-if="profilesTotalPages > 1" class="flex justify-center items-center space-x-6 mt-10 text-base font-medium">
      <button @click="changeProfilesPage(profilesCurrentPage - 1)" :disabled="profilesCurrentPage === 1" class="px-6 py-3 rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift">&laquo; 上一页</button>
      <span class="text-gray-500 dark:text-gray-400">第 {{ profilesCurrentPage }} / {{ profilesTotalPages }} 页</span>
      <button @click="changeProfilesPage(profilesCurrentPage + 1)" :disabled="profilesCurrentPage === profilesTotalPages" class="px-6 py-3 rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift">下一页 &raquo;</button>
    </div>
    
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

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import ProfileCard from '../ProfileCard.vue';

// Props
const props = defineProps({
  profiles: {
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
  paginatedProfiles: {
    type: Array,
    required: true
  },
  allSubscriptions: {
    type: Array,
    required: true
  }
});

// Emits
const emit = defineEmits([
  'add-profile',
  'edit-profile',
  'delete-profile',
  'toggle-profile',
  'copy-profile-link',
  'show-profile-node-details',
  'change-page',
  'delete-all-profiles'
]);

// Local state
const showProfilesMoreMenu = ref(false);
const showDeleteProfilesModal = ref(false);
const profilesMoreMenuRef = ref(null);

// Methods
const handleAddProfile = () => {
  emit('add-profile');
};

const handleEditProfile = (profileId) => {
  emit('edit-profile', profileId);
};

const handleDeleteProfile = (profileId) => {
  emit('delete-profile', profileId);
};

const handleProfileToggle = (updatedProfile) => {
  emit('toggle-profile', updatedProfile);
};

const handleCopyProfileLink = (profileId) => {
  emit('copy-profile-link', profileId);
};

const handleShowProfileNodeDetails = (profile) => {
  emit('show-profile-node-details', profile);
};

const changeProfilesPage = (page) => {
  emit('change-page', page);
};

const handleDeleteAllProfiles = () => {
  emit('delete-all-profiles');
  showDeleteProfilesModal.value = false;
};

// Click outside handler
const handleClickOutside = (event) => {
  if (showProfilesMoreMenu.value && profilesMoreMenuRef.value && !profilesMoreMenuRef.value.contains(event.target)) {
    showProfilesMoreMenu.value = false;
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
