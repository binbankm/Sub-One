<script setup>
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { saveSubs, batchUpdateNodes } from '../lib/api.js';
import { extractNodeName } from '../lib/utils.js';
import { useToastStore } from '../stores/toast.js';
import { useUIStore } from '../stores/ui.js';
import { useSubscriptions } from '../composables/useSubscriptions.js';
import { useManualNodes } from '../composables/useManualNodes.js';
import { useModals } from '../composables/useModals.js';
import { useProfiles } from '../composables/useProfiles.js';
import { useDebounce } from '../composables/useDebounce.js';
import { 
  PAGINATION, 
  VALIDATION, 
  STORAGE_KEYS, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES,
  DELAYS 
} from '../constants/index.js';

// 异步组件
const SettingsModal = defineAsyncComponent(() => import('./SettingsModal.vue'));
const BulkImportModal = defineAsyncComponent(() => import('./BulkImportModal.vue'));
const ProfileModal = defineAsyncComponent(() => import('./ProfileModal.vue'));

// 标签页组件
import SubscriptionsTab from './tabs/SubscriptionsTab.vue';
import ProfilesTab from './tabs/ProfilesTab.vue';
import LinkGeneratorTab from './tabs/LinkGeneratorTab.vue';
import ManualNodesTab from './tabs/ManualNodesTab.vue';

// 公共组件
import SaveStatus from './common/SaveStatus.vue';
import Modal from './Modal.vue';
import SubscriptionImportModal from './SubscriptionImportModal.vue';
import NodeDetailsModal from './NodeDetailsModal.vue';
import ProfileNodeDetailsModal from './ProfileNodeDetailsModal.vue';

// 模态框组件
import SubscriptionEditModal from './modals/SubscriptionEditModal.vue';
import NodeEditModal from './modals/NodeEditModal.vue';
import DeleteConfirmModal from './modals/DeleteConfirmModal.vue';

// Props
const props = defineProps({ 
  data: Object,
  activeTab: {
    type: String,
    default: 'subscriptions'
  }
});

// Stores
const { showToast } = useToastStore();
const uiStore = useUIStore();

// 状态管理
const isLoading = ref(true);
const dirty = ref(false);
const saveState = ref('idle');

// 使用 composables
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

const {
  showSubModal, editingSubscription, isNewSubscription,
  showNodeModal, editingNode, isNewNode,
  showProfileModal, editingProfile, isNewProfile,
  showBulkImportModal, showDeleteSubsModal, showDeleteNodesModal, showDeleteProfilesModal,
  showSubscriptionImportModal, showNodeDetailsModal, showProfileNodeDetailsModal,
  selectedSubscription, selectedProfile,
  openAddSubscriptionModal, openEditSubscriptionModal, closeSubscriptionModal,
  openAddNodeModal, openEditNodeModal, closeNodeModal,
  openAddProfileModal, openEditProfileModal, closeProfileModal,
  openNodeDetailsModal, openProfileNodeDetailsModal, resetAllModals
} = useModals();

// 订阅组相关状态
const config = ref({});

// 使用 useProfiles composable
const {
  profiles, profilesCurrentPage, profilesTotalPages, paginatedProfiles,
  addProfile, updateProfile, deleteProfile, deleteAllProfiles, toggleProfile,
  changePage: changeProfilesPage, resetPagination: resetProfilesPagination,
  validateCustomId, cleanupSubscriptionReferences, cleanupNodeReferences,
  getProfileById, getProfileByCustomId, initialize: initializeProfiles
} = useProfiles([], markDirty);

// 排序状态
const isSortingSubs = ref(false);
const isSortingNodes = ref(false);
const manualNodeViewMode = ref('card');
const isUpdatingAllSubs = ref(false);

// 初始化数据
const initialSubs = ref([]);
const initialNodes = ref([]);

// 标记数据已更改
const markDirty = () => { 
  dirty.value = true; 
  saveState.value = 'idle'; 
};

// 初始化状态
const initializeState = () => {
  isLoading.value = true;
  if (props.data) {
    const subsData = props.data.subs || [];
    const httpRegex = VALIDATION.URL_REGEX;
    
    initialSubs.value = subsData.filter(item => item.url && httpRegex.test(item.url));
    initialNodes.value = subsData.filter(item => !item.url || !httpRegex.test(item.url));
    
    // 使用 useProfiles 的初始化方法
    initializeProfiles(props.data.profiles || []);
    config.value = props.data.config || {};
  }
  isLoading.value = false;
  dirty.value = false;
};

// 生命周期钩子
onMounted(async () => {
  try {
    initializeState();
    window.addEventListener('beforeunload', handleBeforeUnload);
    const savedViewMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    if (savedViewMode) {
      manualNodeViewMode.value = savedViewMode;
    }
  } catch (error) {
    console.error('初始化数据失败:', error);
    showToast('初始化数据失败', 'error');
  } finally {
    isLoading.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

// 页面离开前检查
const handleBeforeUnload = (event) => {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = '您有未保存的更改，確定要离开嗎？';
  }
};

// 设置视图模式
const setViewMode = (mode) => {
  manualNodeViewMode.value = mode;
  localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
};

// 使用防抖优化保存操作
const { debouncedFn: debouncedSave } = useDebounce(handleSave, DELAYS.DEBOUNCE_SAVE);

// 保存相关方法
const handleDiscard = () => {
  initializeState();
  showToast('已放弃所有未保存的更改');
};

const handleSave = async () => {
  saveState.value = 'saving';
  
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
    if (!Array.isArray(combinedSubs) || !Array.isArray(profiles.value)) {
      throw new Error('数据格式错误，请刷新页面后重试');
    }

    const result = await saveSubs(combinedSubs, profiles.value);

    if (result.success) {
      saveState.value = 'success';
      showToast(SUCCESS_MESSAGES.SAVE_SUCCESS, 'success');
      isSortingSubs.value = false;
      isSortingNodes.value = false;
      setTimeout(() => { 
        dirty.value = false; 
        saveState.value = 'idle'; 
      }, DELAYS.SAVE_SUCCESS_DISPLAY);
    } else {
      const errorMessage = result.message || result.error || '保存失败，请稍后重试';
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('保存数据时发生错误:', error);
    let userMessage = error.message;
    
    // 使用常量中的错误消息映射
    if (error.message.includes('网络')) {
      userMessage = ERROR_MESSAGES.NETWORK_ERROR;
    } else if (error.message.includes('格式')) {
      userMessage = ERROR_MESSAGES.FORMAT_ERROR;
    } else if (error.message.includes('存储')) {
      userMessage = ERROR_MESSAGES.STORAGE_ERROR;
    }

    showToast(userMessage, 'error');
    saveState.value = 'idle';
  }
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

// 订阅相关方法
const handleAddSubscription = () => {
  openAddSubscriptionModal();
};

const handleEditSubscription = (subId) => {
  const sub = subscriptions.value.find(s => s.id === subId);
  if (sub) {
    openEditSubscriptionModal(sub);
  }
};

const handleSaveSubscription = async () => {
  if (!editingSubscription.value?.url) { 
    showToast('订阅链接不能为空', 'error'); 
    return; 
  }
  
  const httpRegex = VALIDATION.URL_REGEX;
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
  closeSubscriptionModal();
};

const handleDeleteSubscriptionWithCleanup = async (subId) => {
  deleteSubscription(subId);
  cleanupSubscriptionReferences(subId);
  await handleDirectSave('订阅删除');
};

const handleDeleteAllSubscriptionsWithCleanup = async () => {
  deleteAllSubscriptions();
  // 清空所有订阅组的订阅引用
  profiles.value.forEach(p => {
    p.subscriptions.length = 0;
  });
  await handleDirectSave('订阅清空');
  showDeleteSubsModal.value = false;
};

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

const handleSubscriptionDragEnd = async () => {
  try {
    await handleSave();
    showToast('订阅排序已保存', 'success');
  } catch (error) {
    console.error('保存订阅排序失败:', error);
    showToast('保存排序失败', 'error');
  }
};

// 节点相关方法
const handleAddNode = () => {
  openAddNodeModal();
};

const handleEditNode = (nodeId) => {
  const node = manualNodes.value.find(n => n.id === nodeId);
  if (node) {
    openEditNodeModal(node);
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
  closeNodeModal();
};

const handleDeleteNodeWithCleanup = async (nodeId) => {
  deleteNode(nodeId);
  cleanupNodeReferences(nodeId);
  await handleDirectSave('节点删除');
};

const handleDeleteAllNodesWithCleanup = async () => {
  deleteAllNodes();
  // 清空所有订阅组的手动节点引用
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

const handleDeduplicateNodes = async () => {
  deduplicateNodes();
  await handleDirectSave('节点去重');
};

const handleNodeDragEnd = async () => {
  try {
    await handleSave();
    showToast('节点排序已保存', 'success');
  } catch (error) {
    console.error('保存节点排序失败:', error);
    showToast('保存排序失败', 'error');
  }
};

// 订阅组相关方法
const handleAddProfile = () => {
  openAddProfileModal();
};

const handleEditProfile = (profileId) => {
  const profile = profiles.value.find(p => p.id === profileId);
  if (profile) {
    openEditProfileModal(profile);
  }
};

const handleSaveProfile = async (profileData) => {
  if (!profileData?.name) { 
    showToast('订阅组名称不能为空', 'error'); 
    return; 
  }
  
  // 使用 useProfiles 的验证方法
  if (profileData.customId) {
    const validation = validateCustomId(profileData.customId, profileData.id);
    if (!validation.valid) {
      showToast(validation.message, 'error');
      return;
    }
    profileData.customId = validation.cleanValue;
  }
  
  if (isNewProfile.value) {
    addProfile(profileData);
  } else {
    updateProfile(profileData);
  }
  
  await handleDirectSave('订阅组');
  closeProfileModal();
};

const handleDeleteProfile = async (profileId) => {
  deleteProfile(profileId);
  await handleDirectSave('订阅组删除');
};

const handleDeleteAllProfiles = async () => {
  deleteAllProfiles();
  await handleDirectSave('订阅组清空');
  showDeleteProfilesModal.value = false;
};

const handleProfileToggle = async (updatedProfile) => {
  if (toggleProfile(updatedProfile.id, updatedProfile.enabled)) {
    await handleDirectSave(`${updatedProfile.name || '订阅组'} 状态`);
  }
};

const copyProfileLink = (profileId) => {
  const token = config.value?.profileToken;
  if (!token || token === 'auto' || !token.trim()) {
    showToast('请在设置中配置一个"订阅组分享Token"', 'error');
    return;
  }
  const profile = getProfileById(profileId);
  if (!profile) return;
  const identifier = profile.customId || profile.id;
  const link = `${window.location.origin}/${token}/${identifier}`;
  navigator.clipboard.writeText(link);
  showToast('订阅组分享链接已复制！', 'success');
};

// 其他方法
const handleShowNodeDetails = (subscription) => {
  openNodeDetailsModal(subscription);
};

const handleShowProfileNodeDetails = (profile) => {
  selectedProfile.value = profile;
  openProfileNodeDetailsModal();
};

const handleBulkImport = async (importText) => {
  if (!importText) return;
  
  const lines = importText.split('\n').map(line => line.trim()).filter(Boolean);
  const newSubs = [];
  const newNodes = [];
  
  const httpRegex = VALIDATION.URL_REGEX;
  const nodeRegex = VALIDATION.NODE_REGEX;
  
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

// 分页方法 - 使用 useProfiles 的方法
// 注意：这里不需要重新声明，因为 useProfiles 已经提供了 changePage 方法
// 我们直接使用 changePage 作为 changeProfilesPage

// 搜索方法
const updateSearchTerm = (term) => {
  searchTerm.value = term;
};
</script>

<template>
  <div v-if="isLoading" class="text-center py-16 text-gray-500">
    正在加载...
  </div>
  <div v-else class="w-full container-optimized">
    
    <!-- 保存状态提示 -->
    <SaveStatus 
      :dirty="dirty" 
      :save-state="saveState"
      @save="handleSave"
      @discard="handleDiscard"
    />

    <!-- 主要内容区域 -->
    <div class="space-y-6 lg:space-y-8">
      
      <!-- 订阅管理标签页 -->
      <SubscriptionsTab
        v-if="activeTab === 'subscriptions'"
        :subscriptions="subscriptions"
        :subs-current-page="subsCurrentPage"
        :subs-total-pages="subsTotalPages"
        :paginated-subscriptions="paginatedSubscriptions"
        :is-updating-all-subs="isUpdatingAllSubs"
        @add-subscription="handleAddSubscription"
        @edit-subscription="handleEditSubscription"
        @delete-subscription="handleDeleteSubscriptionWithCleanup"
        @toggle-subscription="handleSubscriptionToggle"
        @update-subscription="handleSubscriptionUpdate"
        @show-node-details="handleShowNodeDetails"
        @update-all-subscriptions="handleUpdateAllSubscriptions"
        @sort-drag-end="handleSubscriptionDragEnd"
        @change-page="changeSubsPage"
        @delete-all-subscriptions="handleDeleteAllSubscriptionsWithCleanup"
      />

      <!-- 订阅组标签页 -->
      <ProfilesTab
        v-if="activeTab === 'profiles'"
        :profiles="profiles"
        :profiles-current-page="profilesCurrentPage"
        :profiles-total-pages="profilesTotalPages"
        :paginated-profiles="paginatedProfiles"
        :all-subscriptions="subscriptions"
        @add-profile="handleAddProfile"
        @edit-profile="handleEditProfile"
        @delete-profile="handleDeleteProfile"
        @toggle-profile="handleProfileToggle"
        @copy-profile-link="copyProfileLink"
        @show-profile-node-details="handleShowProfileNodeDetails"
        @change-page="changeProfilesPage"
        @delete-all-profiles="handleDeleteAllProfiles"
      />

      <!-- 链接生成标签页 -->
      <LinkGeneratorTab
        v-if="activeTab === 'generator'"
        :config="config"
        :profiles="profiles"
      />

      <!-- 手动节点标签页 -->
      <ManualNodesTab
        v-if="activeTab === 'nodes'"
        :manual-nodes="manualNodes"
        :manual-nodes-current-page="manualNodesCurrentPage"
        :manual-nodes-total-pages="manualNodesTotalPages"
        :paginated-manual-nodes="paginatedManualNodes"
        :search-term="searchTerm"
        :manual-node-view-mode="manualNodeViewMode"
        @add-node="handleAddNode"
        @edit-node="handleEditNode"
        @delete-node="handleDeleteNodeWithCleanup"
        @bulk-import="showBulkImportModal = true"
        @subscription-import="showSubscriptionImportModal = true"
        @auto-sort-nodes="handleAutoSortNodes"
        @deduplicate-nodes="handleDeduplicateNodes"
        @delete-all-nodes="handleDeleteAllNodesWithCleanup"
        @sort-drag-end="handleNodeDragEnd"
        @change-page="changeManualNodesPage"
        @set-view-mode="setViewMode"
        @update-search-term="updateSearchTerm"
      />
    </div>
  </div>

  <!-- 模态框组件 -->
  <BulkImportModal v-model:show="showBulkImportModal" @import="handleBulkImport" />
  
  <DeleteConfirmModal 
    v-model:show="showDeleteSubsModal" 
    title="确认清空订阅"
    message="您确定要删除所有**订阅**吗？此操作将标记为待保存，不会影响手动节点。"
    @confirm="handleDeleteAllSubscriptionsWithCleanup"
  />
  
  <DeleteConfirmModal 
    v-model:show="showDeleteNodesModal" 
    title="确认清空节点"
    message="您确定要删除所有**手动节点**吗？此操作将标记为待保存，不会影响订阅。"
    @confirm="handleDeleteAllNodesWithCleanup"
  />
  
  <DeleteConfirmModal 
    v-model:show="showDeleteProfilesModal" 
    title="确认清空订阅组"
    message="您确定要删除所有**订阅组**吗？此操作不可逆。"
    @confirm="handleDeleteAllProfiles"
  />
  
  <ProfileModal 
    v-if="showProfileModal" 
    v-model:show="showProfileModal" 
    :profile="editingProfile" 
    :is-new="isNewProfile" 
    :all-subscriptions="subscriptions" 
    :all-manual-nodes="manualNodes" 
    @save="handleSaveProfile" 
    size="2xl" 
  />
  
  <NodeEditModal 
    v-if="editingNode" 
    v-model:show="showNodeModal" 
    :node="editingNode" 
    :is-new="isNewNode"
    @save="handleSaveNode" 
  />

  <SubscriptionEditModal 
    v-if="editingSubscription" 
    v-model:show="showSubModal" 
    :subscription="editingSubscription" 
    :is-new="isNewSubscription"
    @save="handleSaveSubscription" 
  />
  
  <SettingsModal v-model:show="uiStore.isSettingsModalVisible" />
  
  <SubscriptionImportModal 
    :show="showSubscriptionImportModal" 
    @update:show="showSubscriptionImportModal = $event" 
    :add-nodes-from-bulk="addNodesFromBulk"
    :on-import-success="() => handleDirectSave('导入订阅')"
  />
  
  <NodeDetailsModal 
    :show="showNodeDetailsModal" 
    :subscription="selectedSubscription" 
    @update:show="showNodeDetailsModal = $event" 
  />
  
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