<script setup>
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import draggable from 'vuedraggable';
import { saveSubs, batchUpdateNodes } from '../../lib/api.js';
import { extractNodeName } from '../../lib/utils.js';
import { useToastStore } from '../../stores/toast.js';
import { useUIStore } from '../../stores/ui.js';
import { useSubscriptions } from '../../composables/useSubscriptions.js';
import { useManualNodes } from '../../composables/useManualNodes.js';
import { PAGINATION, REGEX_PATTERNS, MESSAGES, DEFAULT_VALUES } from '../../constants/index.js';
import { cleanCustomId, generateUniqueId, deepClone } from '../../utils/common.js';

// --- 元件導入 ---
import Card from '../cards/Card.vue';
import ManualNodeCard from '../cards/ManualNodeCard.vue';
import SubscriptionLinkGenerator from '../forms/SubscriptionLinkGenerator.vue';
import ProfileCard from '../cards/ProfileCard.vue';
import ManualNodeList from './ManualNodeList.vue'; 
import SubscriptionImportModal from '../modals/SubscriptionImportModal.vue';
import NodeDetailsModal from '../modals/NodeDetailsModal.vue';
import ProfileNodeDetailsModal from '../modals/ProfileNodeDetailsModal.vue';
 



const SettingsModal = defineAsyncComponent(() => import('../modals/SettingsModal.vue'));
const BulkImportModal = defineAsyncComponent(() => import('../modals/BulkImportModal.vue'));
import Modal from '../modals/Modal.vue';
const ProfileModal = defineAsyncComponent(() => import('../modals/ProfileModal.vue'));

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

const manualNodesPerPage = PAGINATION.NODES_PER_PAGE;

// --- 訂閱組 (Profile) 相關狀態 ---
const profiles = ref([]);
const config = ref({});
const isNewProfile = ref(false);
const editingProfile = ref(null);
const showProfileModal = ref(false);
const showDeleteProfilesModal = ref(false);

// --- 订阅组分页状态 ---
const profilesCurrentPage = ref(1);
const profilesPerPage = PAGINATION.PROFILES_PER_PAGE; // 实现2行3列布局
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
    // 使用常量中的正则表达式
    const httpRegex = REGEX_PATTERNS.HTTP_URL;
    
    initialSubs.value = subsData.filter(item => item.url && httpRegex.test(item.url));
    initialNodes.value = subsData.filter(item => !item.url || !httpRegex.test(item.url));
    
    profiles.value = (props.data.profiles || []).map(p => ({
        ...p,
        id: p.id || generateUniqueId(),
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
    event.returnValue = MESSAGES.INFO.UNSAVED_CHANGES;
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
  showToast(MESSAGES.SUCCESS.CHANGES_DISCARDED);
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
    editingProfile.value = { ...DEFAULT_VALUES.PROFILE };
    showProfileModal.value = true;
};
const handleEditProfile = (profileId) => {
    const profile = profiles.value.find(p => p.id === profileId);
    if (profile) {
        isNewProfile.value = false;
        editingProfile.value = deepClone(profile);
        editingProfile.value.expiresAt = profile.expiresAt || ''; // Ensure expiresAt is copied
        showProfileModal.value = true;
    }
};
const handleSaveProfile = async (profileData) => {
    if (!profileData?.name) { 
        showToast(MESSAGES.ERROR.PROFILE_NAME_REQUIRED, 'error'); 
        return; 
    }
    
    if (profileData.customId) {
        // 使用常量中的正则表达式
        profileData.customId = cleanCustomId(profileData.customId);
        
        if (profileData.customId && profiles.value.some(p => p.id !== profileData.id && p.customId === profileData.customId)) {
            showToast(MESSAGES.ERROR.CUSTOM_ID_EXISTS(profileData.customId), 'error');
            return;
        }
    }
    if (isNewProfile.value) {
        profiles.value.unshift({ ...profileData, id: generateUniqueId() });
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
      <div v-if="activeTab === 'subscriptions'" class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
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

      <!-- 订阅组标签页 -->
      <div v-if="activeTab === 'profiles'" class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
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
            :all-subscriptions="subscriptions"
            @edit="handleEditProfile(profile.id)"
            @delete="handleDeleteProfile(profile.id)"
            @change="handleProfileToggle($event)"
            @copy-link="copyProfileLink(profile.id)"
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

      <!-- 链接生成标签页 -->
      <div v-if="activeTab === 'generator'" class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
        <div class="flex items-center gap-4 mb-8">
          <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <h2 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced">生成订阅链接</h2>
            <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">生成和管理订阅链接</p>
          </div>
        </div>
        <SubscriptionLinkGenerator :config="config" :profiles="profiles" />
      </div>

      <!-- 手动节点标签页 -->
      <div v-if="activeTab === 'nodes'" class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h2 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced">手动节点</h2>
              <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">管理单个节点链接</p>
            </div>
            <span class="px-4 py-2 text-base font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700/50 rounded-2xl shadow-sm">{{ manualNodes.length }}</span>
          </div>
          
          <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
            <!-- 搜索框 -->
            <div class="relative w-full sm:w-56 flex-shrink-0">
              <input 
                type="text" 
                v-model="searchTerm"
                placeholder="搜索节点..."
                class="search-input-unified w-full text-base"
              />
              <svg class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <!-- 视图切换 -->
            <div class="p-1 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center flex-shrink-0">
                <button @click="setViewMode('card')" class="p-3 rounded-xl transition-colors hover-lift" :class="manualNodeViewMode === 'card' ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button @click="setViewMode('list')" class="p-3 rounded-xl transition-colors hover-lift" :class="manualNodeViewMode === 'list' ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>
                </button>
            </div>

            <!-- 主要操作按钮 -->
            <div class="flex items-center gap-3 flex-shrink-0">
              <button @click="handleAddNode" class="btn-modern-enhanced btn-add text-base font-semibold px-8 py-3 transform hover:scale-105 transition-all duration-300">新增</button>
              
              <button @click="showBulkImportModal = true" class="btn-modern-enhanced btn-import text-base font-semibold px-8 py-3 transform hover:scale-105 transition-all duration-300">批量导入</button>
              
              <button 
                @click="isSortingNodes = !isSortingNodes" 
                :class="isSortingNodes ? 'btn-modern-enhanced btn-sort sorting text-base font-semibold px-8 py-3 flex items-center gap-2 transform hover:scale-105 transition-all duration-300' : 'btn-modern-enhanced btn-sort text-base font-semibold px-8 py-3 flex items-center gap-2 transform hover:scale-105 transition-all duration-300'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                </svg>
                <span class="hidden sm:inline">{{ isSortingNodes ? '排序中' : '手动排序' }}</span>
                <span class="sm:hidden">{{ isSortingNodes ? '排序' : '排序' }}</span>
              </button>
            </div>
            
            <!-- 更多菜单 -->
            <div class="relative" ref="nodesMoreMenuRef">
              <button @click="showNodesMoreMenu = !showNodesMoreMenu" class="p-4 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hover-lift">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
              </button>
               <Transition name="slide-fade-sm">
                <div v-if="showNodesMoreMenu" class="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-2xl shadow-xl z-10 ring-1 ring-black ring-opacity-5">
                  <button @click="showSubscriptionImportModal = true; showNodesMoreMenu=false" class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">导入订阅</button>
                  <button @click="handleAutoSortNodes(); showNodesMoreMenu=false" class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">一键排序</button>
                  <button @click="handleDeduplicateNodes" class="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">一键去重</button>
                  <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button @click="showDeleteNodesModal = true; showNodesMoreMenu=false" class="w-full text-left px-5 py-3 text-base text-red-500 hover:bg-red-500/10">清空所有</button>
                </div>
              </Transition>
            </div>
          </div>
        </div>
        
        <!-- 节点内容区域 -->
        <div v-if="manualNodes.length > 0">
          <div v-if="manualNodeViewMode === 'card'">
             <draggable 
              v-if="isSortingNodes"
              tag="div" 
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8" 
              v-model="manualNodes" 
              :item-key="item => item.id" 
              animation="300" 
              :delay="200"
              :delay-on-touch-only="true"
              @end="handleNodeDragEnd"
            >
              <template #item="{ element: node }">
                 <div class="cursor-move">
                    <ManualNodeCard 
                        :node="node" 
                        @edit="handleEditNode(node.id)" 
                        @delete="handleDeleteNodeWithCleanup(node.id)" />
                </div>
              </template>
            </draggable>
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              <div v-for="node in paginatedManualNodes" :key="node.id">
                <ManualNodeCard 
                  :node="node" 
                  @edit="handleEditNode(node.id)" 
                  @delete="handleDeleteNodeWithCleanup(node.id)" />
              </div>
            </div>
          </div>

          <div v-if="manualNodeViewMode === 'list'" class="space-y-3">
              <ManualNodeList
                  v-for="(node, index) in paginatedManualNodes"
                  :key="node.id"
                  :node="node"
                  :index="(manualNodesCurrentPage - 1) * manualNodesPerPage + index + 1"
                  @edit="handleEditNode(node.id)"
                  @delete="handleDeleteNodeWithCleanup(node.id)"
              />
          </div>
          
          <div v-if="manualNodesTotalPages > 1 && !isSortingNodes" class="flex justify-center items-center space-x-6 mt-10 text-base font-medium">
            <button @click="changeManualNodesPage(manualNodesCurrentPage - 1)" :disabled="manualNodesCurrentPage === 1" class="px-6 py-3 rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift">&laquo; 上一页</button>
            <span class="text-gray-500 dark:text-gray-400">第 {{ manualNodesCurrentPage }} / {{ manualNodesTotalPages }} 页</span>
            <button @click="changeManualNodesPage(manualNodesCurrentPage + 1)" :disabled="manualNodesCurrentPage === manualNodesTotalPages" class="px-6 py-3 rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift">下一页 &raquo;</button>
          </div>
        </div>
        <div v-else class="text-center py-20 lg:py-24 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl">
          <div class="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h3 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced mb-3">没有手动节点</h3>
          <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">添加分享链接或单个节点。</p>
        </div>
      </div>
    </div>
  </div>

  <!-- 模态框组件 -->
  <BulkImportModal v-model:show="showBulkImportModal" @import="handleBulkImport" />
  <Modal v-model:show="showDeleteSubsModal" @confirm="handleDeleteAllSubscriptionsWithCleanup">
    <template #title><h3 class="text-xl font-bold text-red-500">确认清空订阅</h3></template>
    <template #body><p class="text-base text-gray-400">您确定要删除所有**订阅**吗？此操作将标记为待保存，不会影响手动节点。</p></template>
  </Modal>
  <Modal v-model:show="showDeleteNodesModal" @confirm="handleDeleteAllNodesWithCleanup">
    <template #title><h3 class="text-xl font-bold text-red-500">确认清空节点</h3></template>
    <template #body><p class="text-base text-gray-400">您确定要删除所有**手动节点**吗？此操作将标记为待保存，不会影响订阅。</p></template>
  </Modal>
  <Modal v-model:show="showDeleteProfilesModal" @confirm="handleDeleteAllProfiles">
    <template #title><h3 class="text-xl font-bold text-red-500">确认清空订阅组</h3></template>
    <template #body><p class="text-base text-gray-400">您确定要删除所有**订阅组**吗？此操作不可逆。</p></template>
  </Modal>
  
  <ProfileModal v-if="showProfileModal" v-model:show="showProfileModal" :profile="editingProfile" :is-new="isNewProfile" :all-subscriptions="subscriptions" :all-manual-nodes="manualNodes" @save="handleSaveProfile" size="2xl" />
  
  <Modal v-if="editingNode" v-model:show="showNodeModal" @confirm="handleSaveNode">
    <template #title><h3 class="text-xl font-bold text-gray-800 dark:text-white">{{ isNewNode ? '新增手动节点' : '编辑手动节点' }}</h3></template>
    <template #body>
      <div class="space-y-4">
        <div><label for="node-name" class="block text-base font-medium text-gray-700 dark:text-gray-300">节点名称</label><input type="text" id="node-name" v-model="editingNode.name" placeholder="（可选）不填将自动获取" class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base dark:text-white"></div>
        <div><label for="node-url" class="block text-base font-medium text-gray-700 dark:text-gray-300">节点链接</label><textarea id="node-url" v-model="editingNode.url" @input="handleNodeUrlInput" rows="4" class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base font-mono dark:text-white"></textarea></div>
      </div>
    </template>
  </Modal>

  <Modal v-if="editingSubscription" v-model:show="showSubModal" @confirm="handleSaveSubscription">
    <template #title><h3 class="text-xl font-bold text-gray-800 dark:text-white">{{ isNewSubscription ? '新增订阅' : '编辑订阅' }}</h3></template>
    <template #body>
      <div class="space-y-4">
        <div><label for="sub-edit-name" class="block text-base font-medium text-gray-700 dark:text-gray-300">订阅名称</label><input type="text" id="sub-edit-name" v-model="editingSubscription.name" placeholder="（可选）不填将自动获取" class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base dark:text-white"></div>
        <div><label for="sub-edit-url" class="block text-base font-medium text-gray-700 dark:text-gray-300">订阅链接</label><input type="text" id="sub-edit-url" v-model="editingSubscription.url" placeholder="https://..." class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base font-mono dark:text-white"></input></div>
        <div>
          <label for="sub-edit-exclude" class="block text-base font-medium text-gray-700 dark:text-gray-300">包含/排除节点</label>
          <textarea 
            id="sub-edit-exclude" 
            v-model="editingSubscription.exclude"
            placeholder="[排除模式 (默认)]&#10;proto:vless,trojan&#10;(过期|官网)&#10;---&#10;[包含模式 (只保留匹配项)]&#10;keep:(香港|HK)&#10;keep:proto:ss"
            rows="5" 
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base font-mono dark:text-white">
          </textarea>
          <p class="text-sm text-gray-400 mt-1">每行一条规则。使用 `keep:` 切换为白名单模式。</p>
        </div>
      </div>
    </template>
  </Modal>
  
  <SettingsModal v-model:show="uiStore.isSettingsModalVisible" />
  <SubscriptionImportModal 
    :show="showSubscriptionImportModal" 
    @update:show="showSubscriptionImportModal = $event" 
    :add-nodes-from-bulk="addNodesFromBulk"
    :on-import-success="() => handleDirectSave('导入订阅')"
  />
  <NodeDetailsModal :show="showNodeDetailsModal" :subscription="selectedSubscription" @update:show="showNodeDetailsModal = $event" />
  <ProfileNodeDetailsModal 
    :show="showProfileNodeDetailsModal" 
    :profile="selectedProfile" 
    :all-subscriptions="subscriptions"
    :all-manual-nodes="manualNodes"
    @update:show="showProfileNodeDetailsModal = $event" 
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