// FILE: src/composables/useProfiles.js
import { ref, computed } from 'vue';
import { useToastStore } from '../stores/toast.js';

// 安全的UUID生成函数
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 备用UUID生成方法
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useProfiles(initialProfiles = [], markDirty) {
  const { showToast } = useToastStore();
  
  // 状态
  const profiles = ref(initialProfiles);
  const profilesCurrentPage = ref(1);
  const profilesPerPage = 6;
  
  // 计算属性
  const profilesTotalPages = computed(() => Math.ceil(profiles.value.length / profilesPerPage));
  
  const paginatedProfiles = computed(() => {
    const start = (profilesCurrentPage.value - 1) * profilesPerPage;
    const end = start + profilesPerPage;
    return profiles.value.slice(start, end);
  });
  
  // 方法
  const addProfile = (profileData) => {
    const newProfile = {
      ...profileData,
      id: generateUUID(),
      enabled: profileData.enabled ?? true,
      subscriptions: profileData.subscriptions || [],
      manualNodes: profileData.manualNodes || [],
      customId: profileData.customId || ''
    };
    
    profiles.value.unshift(newProfile);
    
    // 如果当前页面已满，跳转到第一页
    const currentPageItems = paginatedProfiles.value.length;
    if (currentPageItems >= profilesPerPage) {
      profilesCurrentPage.value = 1;
    }
    
    markDirty?.();
    return newProfile;
  };
  
  const updateProfile = (profileData) => {
    const index = profiles.value.findIndex(p => p.id === profileData.id);
    if (index !== -1) {
      profiles.value[index] = profileData;
      markDirty?.();
      return true;
    }
    return false;
  };
  
  const deleteProfile = (profileId) => {
    profiles.value = profiles.value.filter(p => p.id !== profileId);
    
    // 如果当前页面没有内容且不是第一页，则跳转到上一页
    if (paginatedProfiles.value.length === 0 && profilesCurrentPage.value > 1) {
      profilesCurrentPage.value--;
    }
    
    markDirty?.();
  };
  
  const deleteAllProfiles = () => {
    profiles.value = [];
    profilesCurrentPage.value = 1;
    markDirty?.();
  };
  
  const toggleProfile = (profileId, enabled) => {
    const profile = profiles.value.find(p => p.id === profileId);
    if (profile) {
      profile.enabled = enabled;
      markDirty?.();
      return true;
    }
    return false;
  };
  
  const changePage = (page) => {
    if (page < 1 || page > profilesTotalPages.value) return;
    profilesCurrentPage.value = page;
  };
  
  const resetPagination = () => {
    profilesCurrentPage.value = 1;
  };
  
  const validateCustomId = (customId, excludeId = null) => {
    if (!customId) return { valid: true };
    
    const customIdRegex = /[^a-zA-Z0-9-_]/g;
    const cleanCustomId = customId.replace(customIdRegex, '');
    
    if (cleanCustomId !== customId) {
      return { 
        valid: false, 
        message: '自定义ID只能包含字母、数字、连字符和下划线',
        cleanValue: cleanCustomId
      };
    }
    
    const exists = profiles.value.some(p => 
      p.id !== excludeId && p.customId === cleanCustomId
    );
    
    if (exists) {
      return { 
        valid: false, 
        message: `自定义ID "${cleanCustomId}" 已存在` 
      };
    }
    
    return { valid: true, cleanValue: cleanCustomId };
  };
  
  const cleanupSubscriptionReferences = (subscriptionId) => {
    profiles.value.forEach(profile => {
      const index = profile.subscriptions.indexOf(subscriptionId);
      if (index !== -1) {
        profile.subscriptions.splice(index, 1);
      }
    });
  };
  
  const cleanupNodeReferences = (nodeId) => {
    profiles.value.forEach(profile => {
      const index = profile.manualNodes.indexOf(nodeId);
      if (index !== -1) {
        profile.manualNodes.splice(index, 1);
      }
    });
  };
  
  const getProfileById = (profileId) => {
    return profiles.value.find(p => p.id === profileId);
  };
  
  const getProfileByCustomId = (customId) => {
    return profiles.value.find(p => p.customId === customId);
  };
  
  // 初始化
  const initialize = (initialData) => {
    if (initialData) {
      profiles.value = initialData.map(p => ({
        ...p,
        id: p.id || generateUUID(),
        enabled: p.enabled ?? true,
        subscriptions: p.subscriptions || [],
        manualNodes: p.manualNodes || [],
        customId: p.customId || ''
      }));
    }
    profilesCurrentPage.value = 1;
  };
  
  return {
    // 状态
    profiles,
    profilesCurrentPage,
    profilesTotalPages,
    paginatedProfiles,
    
    // 方法
    addProfile,
    updateProfile,
    deleteProfile,
    deleteAllProfiles,
    toggleProfile,
    changePage,
    resetPagination,
    validateCustomId,
    cleanupSubscriptionReferences,
    cleanupNodeReferences,
    getProfileById,
    getProfileByCustomId,
    initialize
  };
}
