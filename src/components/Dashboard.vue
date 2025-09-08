<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { saveSubs, batchUpdateNodes } from '../lib/api.js';
import { extractNodeName } from '../lib/utils.js';
import { useToastStore } from '../stores/toast.js';
import { useUIStore } from '../stores/ui.js';
import { useSubscriptions } from '../composables/useSubscriptions.js';
import { useManualNodes } from '../composables/useManualNodes.js';

// 导入新的模块化组件
import SubscriptionSection from './sections/SubscriptionSection.vue';
import ProfileSection from './sections/ProfileSection.vue';
import ManualNodeSection from './sections/ManualNodeSection.vue';
import GeneratorSection from './sections/GeneratorSection.vue';
import ModalManager from './ModalManager.vue';

// --- 基礎 Props 和狀態 ---
const props = defineProps({ 
  data: Object,
  activeTab: {
    type: String,
    default: 'subscriptions'
  }
});
const { showToast } = useToastStore();
const uiStore = useUIStore();
const isLoading = ref(true);
const dirty = ref(false);
const saveState = ref('idle');



// --- 將狀態和邏輯委託給 Composables ---
const markDirty = () => { dirty.value = true; saveState.value = 'idle'; };
const initialSubs = ref([]);
const initialNodes = ref([]);

const {
  subscriptions, subsCurrentPage, subsTotalPages, paginatedSubscriptions,
  changeSubsPage, addSubscription, updateSubscription, deleteSubscription, deleteAllSubscriptions,
  addSubscriptionsFromBulk, handleUpdateNodeCount,
} = useSubscriptions(initialSubs, markDirty);





const {
  manualNodes, manualNodesCurrentPage, manualNodesTotalPages, paginatedManualNodes, searchTerm,
  changeManualNodesPage, addNode, updateNode, deleteNode, deleteAllNodes,
  addNodesFromBulk, autoSortNodes, deduplicateNodes,
} = useManualNodes(initialNodes, markDirty);

const manualNodesPerPage = 24;

// --- 訂閱組 (Profile) 相關狀態 ---
const profiles = ref([]);
const config = ref({});
const isNewProfile = ref(false);
const editingProfile = ref(null);
const showProfileModal = ref(false);
const showDeleteProfilesModal = ref(false);

// --- 订阅组分页状态 ---
const profilesCurrentPage = ref(1);
const profilesPerPage = 6; // 改为6个，实现2行3列布局
const profilesTotalPages = computed(() => Math.ceil(profiles.value.length / profilesPerPage));
const paginatedProfiles = computed(() => {
  const start = (profilesCurrentPage.value - 1) * profilesPerPage;
  const end = start + profilesPerPage;
  return profiles.value.slice(start, end);
});

const changeProfilesPage = (page) => {
  if (page < 1 || page > profilesTotalPages.value) return;
  profilesCurrentPage.value = page;
};

// --- 排序狀態 ---
const isSortingSubs = ref(false);
const isSortingNodes = ref(false);

const manualNodeViewMode = ref('card');

// --- 編輯專用模態框狀態 ---
const editingSubscription = ref(null);
const isNewSubscription = ref(false);
const showSubModal = ref(false);

const editingNode = ref(null);
const isNewNode = ref(false);
const showNodeModal = ref(false);

// --- 其他模態框和菜單狀態 ---
const showBulkImportModal = ref(false);
const showDeleteSubsModal = ref(false);
const showDeleteNodesModal = ref(false);
const showSubsMoreMenu = ref(false);
const showNodesMoreMenu = ref(false);
const showProfilesMoreMenu = ref(false);
const showSubscriptionImportModal = ref(false);
const showNodeDetailsModal = ref(false);
const selectedSubscription = ref(null);
const showProfileNodeDetailsModal = ref(false);
const selectedProfile = ref(null);
const isUpdatingAllSubs = ref(false);

const nodesMoreMenuRef = ref(null);
const subsMoreMenuRef = ref(null);
const profilesMoreMenuRef = ref(null);
const handleClickOutside = (event) => {
  if (showNodesMoreMenu.value && nodesMoreMenuRef.value && !nodesMoreMenuRef.value.contains(event.target)) {
    showNodesMoreMenu.value = false;
  }
  if (showSubsMoreMenu.value && subsMoreMenuRef.value && !subsMoreMenuRef.value.contains(event.target)) {
    showSubsMoreMenu.value = false;
  }
  if (showProfilesMoreMenu.value && profilesMoreMenuRef.value && !profilesMoreMenuRef.value.contains(event.target)) {
    showProfilesMoreMenu.value = false;
  }
};
// 新增一个处理函数来调用去重逻辑
const handleDeduplicateNodes = async () => {
    deduplicateNodes();
    await handleDirectSave('节点去重');
    showNodesMoreMenu.value = false; // 操作后关闭菜单
};
// --- 初始化與生命週期 ---
const initializeState = () => {
  isLoading.value = true;
  if (props.data) {
    const subsData = props.data.subs || [];
    // 优化：预编译正则表达式，提升性能
    const httpRegex = /^https?:\/\//;
    
    initialSubs.value = subsData.filter(item => item.url && httpRegex.test(item.url));
    initialNodes.value = subsData.filter(item => !item.url || !httpRegex.test(item.url));
    
    profiles.value = (props.data.profiles || []).map(p => ({
        ...p,
        id: p.id || crypto.randomUUID(),
        enabled: p.enabled ?? true,
        subscriptions: p.subscriptions || [],
        manualNodes: p.manualNodes || [],
        customId: p.customId || ''
    }));
    config.value = props.data.config || {};
  }
  isLoading.value = false;
  dirty.value = false;
};

const handleBeforeUnload = (event) => {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = '您有未保存的更改，確定要离开嗎？';
  }
};

// 生命周期钩子
onMounted(async () => {
  try {
    initializeState();
    window.addEventListener('beforeunload', handleBeforeUnload);
    const savedViewMode = localStorage.getItem('manualNodeViewMode');
    if (savedViewMode) {
      manualNodeViewMode.value = savedViewMode;
    }
    document.addEventListener('click', handleClickOutside);
    

  } catch (error) {
    console.error('初始化数据失败:', error);
    showToast('初始化数据失败', 'error');
  } finally {
    isLoading.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  document.removeEventListener('click', handleClickOutside);
});

const setViewMode = (mode) => {
    manualNodeViewMode.value = mode;
    localStorage.setItem('manualNodeViewMode', mode);
};

// --- 其他 JS 逻辑 (省略) ---
const handleDiscard = () => {
  initializeState();
  showToast('已放弃所有未保存的更改');
};
const handleSave = async () => {
  saveState.value = 'saving';
  
  // 优化：使用更高效的对象创建方式
  const combinedSubs = [
      ...subscriptions.value.map(sub => {
        const { isUpdating, ...rest } = sub;
        return rest;
      }),
      ...manualNodes.value.map(node => {
        const { isUpdating, ...rest } = node;
        return rest;
      })
  ];

  try {
    // 数据验证
    if (!Array.isArray(combinedSubs) || !Array.isArray(profiles.value)) {
      throw new Error('数据格式错误，请刷新页面后重试');
    }

    const result = await saveSubs(combinedSubs, profiles.value);

    if (result.success) {
      saveState.value = 'success';
      showToast('保存成功！', 'success');
      // 保存成功后自动退出排序模式
      isSortingSubs.value = false;
      isSortingNodes.value = false;
      setTimeout(() => { 
        dirty.value = false; 
        saveState.value = 'idle'; 
      }, 1500);
    } else {
      // 显示服务器返回的具体错误信息
      const errorMessage = result.message || result.error || '保存失败，请稍后重试';
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('保存数据时发生错误:', error);

    // 优化：使用Map提升查找性能
    const errorMessageMap = new Map([
      ['网络', '网络连接异常，请检查网络后重试'],
      ['格式', '数据格式异常，请刷新页面后重试'],
      ['存储', '存储服务暂时不可用，请稍后重试']
    ]);
    
    let userMessage = error.message;
    for (const [key, message] of errorMessageMap) {
      if (error.message.includes(key)) {
        userMessage = message;
        break;
      }
    }

    showToast(userMessage, 'error');
    saveState.value = 'idle';
  }
};
const handleDeleteSubscriptionWithCleanup = async (subId) => {
  deleteSubscription(subId);
  // 优化：使用更高效的数组操作
  profiles.value.forEach(p => {
    const index = p.subscriptions.indexOf(subId);
    if (index !== -1) {
      p.subscriptions.splice(index, 1);
    }
  });
  await handleDirectSave('订阅删除');
};
const handleDeleteNodeWithCleanup = async (nodeId) => {
  deleteNode(nodeId);
  // 优化：使用更高效的数组操作
  profiles.value.forEach(p => {
    const index = p.manualNodes.indexOf(nodeId);
    if (index !== -1) {
      p.manualNodes.splice(index, 1);
    }
  });
  await handleDirectSave('节点删除');
};
const handleDeleteAllSubscriptionsWithCleanup = async () => {
  deleteAllSubscriptions();
  // 优化：直接清空数组，避免forEach
  profiles.value.forEach(p => {
    p.subscriptions.length = 0;
  });
  await handleDirectSave('订阅清空');
  showDeleteSubsModal.value = false;
};
const handleDeleteAllNodesWithCleanup = async () => {
  deleteAllNodes();
  // 优化：直接清空数组，避免forEach
  profiles.value.forEach(p => {
    p.manualNodes.length = 0;
  });
  await handleDirectSave('节点清空');
  showDeleteNodesModal.value = false;
};
const handleAutoSortNodes = async () => {
    autoSortNodes();
    await handleDirectSave('节点排序');
};
const handleBulkImport = async (importText) => {
  if (!importText) return;
  
  // 优化：使用更高效的字符串处理
  const lines = importText.split('\n').map(line => line.trim()).filter(Boolean);
  const newSubs = [];
  const newNodes = [];
  
  // 预编译正则表达式，提升性能
  const httpRegex = /^https?:\/\//;
  const nodeRegex = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//;
  
  for (const line of lines) {
      const newItem = { 
          id: crypto.randomUUID(), 
          name: extractNodeName(line) || '未命名', 
          url: line, 
          enabled: true, 
          status: 'unchecked' 
      };
      
      if (httpRegex.test(line)) {
          newSubs.push(newItem);
      } else if (nodeRegex.test(line)) {
          newNodes.push(newItem);
      }
  }
  
  if (newSubs.length > 0) addSubscriptionsFromBulk(newSubs);
  if (newNodes.length > 0) addNodesFromBulk(newNodes);
  
  await handleDirectSave('批量导入');
  showToast(`成功导入 ${newSubs.length} 条订阅和 ${newNodes.length} 个手动节点`, 'success');
};
const handleAddSubscription = () => {
  isNewSubscription.value = true;
  editingSubscription.value = { name: '', url: '', enabled: true, exclude: '' }; // 新增 exclude
  showSubModal.value = true;
};
const handleEditSubscription = (subId) => {
  const sub = subscriptions.value.find(s => s.id === subId);
  if (sub) {
    isNewSubscription.value = false;
    editingSubscription.value = { ...sub };
    showSubModal.value = true;
  }
};
const handleSaveSubscription = async () => {
  if (!editingSubscription.value?.url) { 
    showToast('订阅链接不能为空', 'error'); 
    return; 
  }
  
  // 预编译正则表达式，提升性能
  const httpRegex = /^https?:\/\//;
  if (!httpRegex.test(editingSubscription.value.url)) { 
    showToast('请输入有效的 http:// 或 https:// 订阅链接', 'error'); 
    return; 
  }
  
  if (isNewSubscription.value) {
    addSubscription({ ...editingSubscription.value, id: crypto.randomUUID() });
  } else {
    updateSubscription(editingSubscription.value);
  }
  
  await handleDirectSave('订阅');
  showSubModal.value = false;
};
const handleAddNode = () => {
  isNewNode.value = true;
  editingNode.value = { id: crypto.randomUUID(), name: '', url: '', enabled: true };
  showNodeModal.value = true;
};
const handleEditNode = (nodeId) => {
  const node = manualNodes.value.find(n => n.id === nodeId);
  if (node) {
    isNewNode.value = false;
    editingNode.value = { ...node };
    showNodeModal.value = true;
  }
};
const handleNodeUrlInput = (event) => {
  if (!editingNode.value) return;
  const newUrl = event.target.value;
  if (newUrl && !editingNode.value.name) {
    editingNode.value.name = extractNodeName(newUrl);
  }
};
const handleSaveNode = async () => {
    if (!editingNode.value?.url) { 
        showToast('节点链接不能为空', 'error'); 
        return; 
    }
    
    if (isNewNode.value) {
        addNode(editingNode.value);
    } else {
        updateNode(editingNode.value);
    }
    
    await handleDirectSave('节点');
    showNodeModal.value = false;
};
const handleProfileToggle = async (updatedProfile) => {
    const index = profiles.value.findIndex(p => p.id === updatedProfile.id);
    if (index !== -1) {
        profiles.value[index].enabled = updatedProfile.enabled;
        await handleDirectSave(`${updatedProfile.name || '订阅组'} 状态`);
    }
};
const handleAddProfile = () => {
    isNewProfile.value = true;
    editingProfile.value = { name: '', enabled: true, subscriptions: [], manualNodes: [], customId: '', subConverter: '', subConfig: '', expiresAt: ''};
    showProfileModal.value = true;
};
const handleEditProfile = (profileId) => {
    const profile = profiles.value.find(p => p.id === profileId);
    if (profile) {
        isNewProfile.value = false;
        editingProfile.value = JSON.parse(JSON.stringify(profile));
        editingProfile.value.expiresAt = profile.expiresAt || ''; // Ensure expiresAt is copied
        showProfileModal.value = true;
    }
};
const handleSaveProfile = async (profileData) => {
    if (!profileData?.name) { 
        showToast('订阅组名称不能为空', 'error'); 
        return; 
    }
    
    if (profileData.customId) {
        // 预编译正则表达式，提升性能
        const customIdRegex = /[^a-zA-Z0-9-_]/g;
        profileData.customId = profileData.customId.replace(customIdRegex, '');
        
        if (profileData.customId && profiles.value.some(p => p.id !== profileData.id && p.customId === profileData.customId)) {
            showToast(`自定义 ID "${profileData.customId}" 已存在`, 'error');
            return;
        }
    }
    if (isNewProfile.value) {
        profiles.value.unshift({ ...profileData, id: crypto.randomUUID() });
        // 修复分页逻辑：只有在当前页面已满时才跳转到第一页
        const currentPageItems = paginatedProfiles.value.length;
        if (currentPageItems >= profilesPerPage) {
            profilesCurrentPage.value = 1;
        }
    } else {
        const index = profiles.value.findIndex(p => p.id === profileData.id);
        if (index !== -1) profiles.value[index] = profileData;
    }
    await handleDirectSave('订阅组');
    showProfileModal.value = false;
};
const handleDeleteProfile = async (profileId) => {
    profiles.value = profiles.value.filter(p => p.id !== profileId);
    // 如果当前页面没有内容且不是第一页，则跳转到上一页
    if (paginatedProfiles.value.length === 0 && profilesCurrentPage.value > 1) {
        profilesCurrentPage.value--;
    }
    await handleDirectSave('订阅组删除');
};
const handleDeleteAllProfiles = async () => {
    profiles.value = [];
    profilesCurrentPage.value = 1;
    await handleDirectSave('订阅组清空');
    showDeleteProfilesModal.value = false;
};
const copyProfileLink = (profileId) => {
    const token = config.value?.profileToken;
    if (!token || token === 'auto' || !token.trim()) {
        showToast('请在设置中配置一个固定的“订阅组分享Token”', 'error');
        return;
    }
    const profile = profiles.value.find(p => p.id === profileId);
    if (!profile) return;
    const identifier = profile.customId || profile.id;
    const link = `${window.location.origin}/${token}/${identifier}`;
    navigator.clipboard.writeText(link);
    showToast('订阅组分享链接已复制！', 'success');
};


const handleShowNodeDetails = (subscription) => {
    selectedSubscription.value = subscription;
    showNodeDetailsModal.value = true;
};

const handleShowProfileNodeDetails = (profile) => {
    selectedProfile.value = profile;
    showProfileNodeDetailsModal.value = true;
};





// 通用直接保存函数
const handleDirectSave = async (operationName = '操作') => {
    try {
        await handleSave();
        showToast(`${operationName}已保存`, 'success');
    } catch (error) {
        console.error('保存失败:', error);
        showToast('保存失败', 'error');
    }
};

// 处理订阅开关的直接保存
const handleSubscriptionToggle = async (subscription) => {
    await handleDirectSave(`${subscription.name || '订阅'} 状态`);
};

const handleSubscriptionUpdate = async (subscriptionId) => {
    await handleUpdateNodeCount(subscriptionId);
    await handleDirectSave('订阅更新');
};

const handleUpdateAllSubscriptions = async () => {
    if (isUpdatingAllSubs.value) return;
    
    const enabledSubs = subscriptions.value.filter(sub => sub.enabled && sub.url.startsWith('http'));
    if (enabledSubs.length === 0) {
        showToast('没有可更新的订阅', 'warning');
        return;
    }
    
    isUpdatingAllSubs.value = true;
    
    try {
        const subscriptionIds = enabledSubs.map(sub => sub.id);
        const result = await batchUpdateNodes(subscriptionIds);
        
        if (result.success) {
            // 优化：使用Map提升查找性能
            if (result.results && Array.isArray(result.results)) {
                const subsMap = new Map(subscriptions.value.map(s => [s.id, s]));
                
                result.results.forEach(updateResult => {
                    if (updateResult.success) {
                        const sub = subsMap.get(updateResult.id);
                        if (sub) {
                            if (typeof updateResult.nodeCount === 'number') {
                                sub.nodeCount = updateResult.nodeCount;
                            }
                            if (updateResult.userInfo) {
                                sub.userInfo = updateResult.userInfo;
                            }
                        }
                    }
                });
            }
            
            const successCount = result.results ? result.results.filter(r => r.success).length : enabledSubs.length;
            showToast(`成功更新了 ${successCount} 个订阅`, 'success');
            await handleDirectSave('订阅更新');
        } else {
            showToast(`更新失败: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('批量更新订阅失败:', error);
        showToast('批量更新失败', 'error');
    } finally {
        isUpdatingAllSubs.value = false;
    }
};

const handleSubscriptionDragEnd = async (evt) => {
    // vuedraggable 已经自动更新了 subscriptions 数组
    try {
        await handleSave();
        showToast('订阅排序已保存', 'success');
    } catch (error) {
        console.error('保存订阅排序失败:', error);
        showToast('保存排序失败', 'error');
    }
    
    // 拖拽排序完成
};

const handleNodeDragEnd = async (evt) => {
    // vuedraggable 已经自动更新了 manualNodes 数组
    try {
        await handleSave();
        showToast('节点排序已保存', 'success');
    } catch (error) {
        console.error('保存节点排序失败:', error);
        showToast('保存排序失败', 'error');
    }
    
    // 拖拽排序完成
};

</script>

<template>
  <div v-if="isLoading" class="text-center py-16 text-gray-500">
    正在加载...
  </div>
  <div v-else class="w-full container-optimized">
    
    <!-- 未保存更改提示 -->
    <Transition name="slide-fade">
      <div v-if="dirty" class="p-4 mb-6 lg:mb-8 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 ring-1 ring-inset ring-indigo-500/30 flex items-center justify-between shadow-modern-enhanced">
        <p class="text-sm font-medium text-indigo-800 dark:text-indigo-200">您有未保存的更改</p>
        <div class="flex items-center gap-3">
          <button @click="handleDiscard" class="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors hover-lift">放弃更改</button>
          <button @click="handleSave" :disabled="saveState !== 'idle'" class="px-6 py-2.5 text-sm text-white font-semibold rounded-xl shadow-sm flex items-center justify-center transition-all duration-300 w-32 hover-lift" :class="{'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700': saveState === 'idle', 'bg-gray-500 cursor-not-allowed': saveState === 'saving', 'bg-gradient-to-r from-green-500 to-emerald-600 cursor-not-allowed': saveState === 'success' }">
            <div v-if="saveState === 'saving'" class="flex items-center"><svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>保存中...</span></div>
            <div v-else-if="saveState === 'success'" class="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg><span>已保存</span></div>
            <span v-else>保存更改</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- 主要内容区域 - 根据标签页显示不同内容 -->
    <div class="space-y-6 lg:space-y-8">
      <!-- 订阅管理标签页 -->
      <SubscriptionSection
        v-if="activeTab === 'subscriptions'"
        :subscriptions="subscriptions"
        :is-sorting="isSortingSubs"
        :current-page="subsCurrentPage"
        :total-pages="subsTotalPages"
        :is-updating-all="isUpdatingAllSubs"
        @add-subscription="handleAddSubscription"
        @edit-subscription="handleEditSubscription"
        @delete-subscription="handleDeleteSubscriptionWithCleanup"
        @toggle-subscription="handleSubscriptionToggle"
        @update-subscription="handleSubscriptionUpdate"
        @update-all-subscriptions="handleUpdateAllSubscriptions"
        @toggle-sorting="isSortingSubs = !isSortingSubs"
        @change-page="changeSubsPage"
        @drag-end="handleSubscriptionDragEnd"
        @show-nodes="handleShowNodeDetails"
      />

      <!-- 订阅组标签页 -->
      <ProfileSection
        v-if="activeTab === 'profiles'"
        :profiles="profiles"
        :current-page="profilesCurrentPage"
        :total-pages="profilesTotalPages"
        :all-subscriptions="subscriptions"
        @add-profile="handleAddProfile"
        @edit-profile="handleEditProfile"
        @delete-profile="handleDeleteProfile"
        @toggle-profile="handleProfileToggle"
        @copy-link="copyProfileLink"
        @change-page="changeProfilesPage"
        @show-nodes="handleShowProfileNodeDetails"
      />

      <!-- 链接生成标签页 -->
      <GeneratorSection
        v-if="activeTab === 'generator'"
        :config="config"
        :profiles="profiles"
      />

      <!-- 手动节点标签页 -->
      <ManualNodeSection
        v-if="activeTab === 'nodes'"
        :manual-nodes="manualNodes"
        :filtered-nodes="filteredManualNodes"
        :current-page="manualNodesCurrentPage"
        :total-pages="manualNodesTotalPages"
        :is-sorting="isSortingNodes"
        :view-mode="manualNodeViewMode"
        :search-term="searchTerm"
        @add-node="handleAddNode"
        @edit-node="handleEditNode"
        @delete-node="handleDeleteNodeWithCleanup"
        @toggle-sorting="isSortingNodes = !isSortingNodes"
        @change-page="changeManualNodesPage"
        @drag-end="handleNodeDragEnd"
        @set-view-mode="setViewMode"
        @update-search="searchTerm = $event"
        @bulk-import="showBulkImportModal = true"
        @auto-sort="handleAutoSortNodes"
        @deduplicate="handleDeduplicateNodes"
        @import-subscription="showSubscriptionImportModal = true"
      />
    </div>
  </div>

  <!-- 模态框管理组件 -->
  <ModalManager
    v-model:show-bulk-import-modal="showBulkImportModal"
    v-model:show-delete-subs-modal="showDeleteSubsModal"
    v-model:show-delete-nodes-modal="showDeleteNodesModal"
    v-model:show-delete-profiles-modal="showDeleteProfilesModal"
    v-model:show-profile-modal="showProfileModal"
    v-model:show-node-modal="showNodeModal"
    v-model:show-sub-modal="showSubModal"
    v-model:show-subscription-import-modal="showSubscriptionImportModal"
    v-model:show-node-details-modal="showNodeDetailsModal"
    v-model:show-profile-node-details-modal="showProfileNodeDetailsModal"
    v-model:show-settings-modal="uiStore.isSettingsModalVisible"
    :editing-node="editingNode"
    :editing-subscription="editingSubscription"
    :editing-profile="editingProfile"
    :selected-subscription="selectedSubscription"
    :selected-profile="selectedProfile"
    :is-new-node="isNewNode"
    :is-new-subscription="isNewSubscription"
    :is-new-profile="isNewProfile"
    :subscriptions="subscriptions"
    :manual-nodes="manualNodes"
    @bulk-import="handleBulkImport"
    @confirm-delete-subs="handleDeleteAllSubscriptionsWithCleanup"
    @confirm-delete-nodes="handleDeleteAllNodesWithCleanup"
    @confirm-delete-profiles="handleDeleteAllProfiles"
    @save-profile="handleSaveProfile"
    @save-node="handleSaveNode"
    @save-subscription="handleSaveSubscription"
    @import-subscription="handleImportSubscription"
    @add-nodes-from-bulk="addNodesFromBulk"
    @on-import-success="() => handleDirectSave('导入订阅')"
  />
  

  
</template>

<style scoped>
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.3s ease-out; }
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
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