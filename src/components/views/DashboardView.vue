<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent, type PropType } from 'vue';
import { saveSubs, batchUpdateNodes } from '../../lib/api';
import { extractNodeName } from '../../lib/utils';
import { useToastStore } from '../../stores/toast';
import { useUIStore } from '../../stores/ui';
import { useSubscriptions } from '../../composables/useSubscriptions';
import { useManualNodes } from '../../composables/useManualNodes';
import type { Subscription, Profile, Node, AppConfig, InitialData } from '../../types';

// --- 组件导入 ---
import DashboardHome from '../tabs/DashboardHome.vue';
import SubscriptionsTab from '../tabs/SubscriptionsTab.vue';
import ProfilesTab from '../tabs/ProfilesTab.vue';
import NodesTab from '../tabs/NodesTab.vue';
import GeneratorTab from '../tabs/GeneratorTab.vue';
import Modal from '../modals/BaseModal.vue';
import SubscriptionImportModal from '../modals/SubscriptionImportModal.vue';
import NodeDetailsModal from '../modals/NodeDetailsModal.vue';
import NodeFilterEditor from '../editors/NodeFilterEditor.vue';

const SettingsModal = defineAsyncComponent(() => import('../modals/SettingsModal.vue'));
const BulkImportModal = defineAsyncComponent(() => import('../modals/BulkImportModal.vue'));
const ProfileModal = defineAsyncComponent(() => import('../modals/ProfileModal.vue'));

// --- 基礎 Props 和狀態 ---
const props = defineProps({
  data: {
    type: Object as PropType<InitialData | null>,
    required: false
  },
  activeTab: {
    type: String,
    default: 'subscriptions'
  }
});

// 定义组件的emit事件
const emit = defineEmits(['update-data']);
const { showToast } = useToastStore();
const uiStore = useUIStore();
const isLoading = ref(true);
const dirty = ref(false);
const saveState = ref<'idle' | 'saving' | 'success'>('idle');



// --- 將狀態和邏輯委託給 Composables ---

const initialSubs = ref<Subscription[]>([]);
const initialNodes = ref<Node[]>([]);

const {
  subscriptions, subsCurrentPage, subsTotalPages, paginatedSubscriptions,
  changeSubsPage, addSubscription, updateSubscription, deleteSubscription, deleteAllSubscriptions,
  addSubscriptionsFromBulk, handleUpdateNodeCount,
} = useSubscriptions(initialSubs);





const {
  manualNodes, manualNodesCurrentPage, manualNodesTotalPages, paginatedManualNodes, searchTerm,
  changeManualNodesPage, addNode, updateNode, deleteNode, deleteAllNodes,
  addNodesFromBulk, autoSortNodes, deduplicateNodes,
} = useManualNodes(initialNodes);



// --- 訂閱組 (Profile) 相關狀態 ---
const profiles = ref<Profile[]>([]);
const config = ref<AppConfig>({});
const isNewProfile = ref(false);
const editingProfile = ref<Profile | null>(null);
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

const changeProfilesPage = (page: number) => {
  if (page < 1 || page > profilesTotalPages.value) return;
  profilesCurrentPage.value = page;
};

// --- 仪表盘统计数据 ---
const activeSubscriptions = computed(() => subscriptions.value.filter(sub => sub.enabled).length);
const activeProfiles = computed(() => profiles.value.filter(profile => profile.enabled).length);
const activeManualNodes = computed(() => manualNodes.value.filter(node => node.enabled).length);
const totalNodeCount = computed(() => {
  let count = manualNodes.value.length;
  subscriptions.value.forEach(sub => {
    if (sub.nodeCount) {
      count += sub.nodeCount;
    }
  });
  return count;
});
const activeNodeCount = computed(() => {
  let count = manualNodes.value.filter(node => node.enabled).length;
  subscriptions.value.forEach(sub => {
    if (sub.enabled && sub.nodeCount) {
      count += sub.nodeCount;
    }
  });
  return count;
});

// --- 排序狀態 ---
const isSortingSubs = ref(false);
const isSortingNodes = ref(false);



// --- 編輯專用模態框狀態 ---
const editingSubscription = ref<Subscription | null>(null);
const isNewSubscription = ref(false);
const showSubModal = ref(false);

const editingNode = ref<Node | null>(null);
const isNewNode = ref(false);
const showNodeModal = ref(false);

// --- 其他模態框和菜單狀態 ---
const showBulkImportModal = ref(false);
const showDeleteSubsModal = ref(false);
const showDeleteNodesModal = ref(false);
const showDeleteSingleSubModal = ref(false);
const showDeleteSingleNodeModal = ref(false);
const showDeleteSingleProfileModal = ref(false);
const showSubscriptionImportModal = ref(false);
const showNodeDetailsModal = ref(false);
const selectedSubscription = ref<Subscription | null>(null);
const selectedProfile = ref<Profile | null>(null);
const isUpdatingAllSubs = ref(false);
const deletingItemId = ref<string | null>(null);


// 新增一个处理函数来调用去重逻辑
const handleDeduplicateNodes = async () => {
  deduplicateNodes();
  await handleDirectSave('节点去重');
  triggerDataUpdate();
};
// --- 常量定义：预编译正则表达式，提升性能 ---
const HTTP_REGEX = /^https?:\/\//;
const NODE_PROTOCOL_REGEX = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//;

// --- 初始化與生命週期 ---
const initializeState = () => {
  isLoading.value = true;
  if (props.data) {
    const subsData = props.data.subs || [];

    initialSubs.value = subsData.filter(item => item.url && HTTP_REGEX.test(item.url)) as Subscription[];
    initialNodes.value = subsData.filter(item => !item.url || !HTTP_REGEX.test(item.url)) as Node[];

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

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
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
      // 移除这里的toast通知，避免重复显示
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
  } catch (error: any) {
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
// --- 公共函数：从订阅组中移除ID ---
const removeIdFromProfiles = (id: string, field: 'subscriptions' | 'manualNodes') => {
  profiles.value.forEach(p => {
    const index = p[field].indexOf(id);
    if (index !== -1) {
      p[field].splice(index, 1);
    }
  });
};

// --- 公共函数：清空订阅组中的字段 ---
const clearProfilesField = (field: 'subscriptions' | 'manualNodes') => {
  profiles.value.forEach(p => {
    p[field].length = 0;
  });
};

// --- 公共函数：触发数据更新事件 ---
const triggerDataUpdate = () => {
  emit('update-data', {
    subs: [...subscriptions.value, ...manualNodes.value]
  });
};

const handleDeleteSubscriptionWithCleanup = async (subId: string) => {
  deletingItemId.value = subId;
  showDeleteSingleSubModal.value = true;
};

const handleConfirmDeleteSingleSub = async () => {
  if (!deletingItemId.value) return;
  deleteSubscription(deletingItemId.value);
  removeIdFromProfiles(deletingItemId.value, 'subscriptions');
  await handleDirectSave('订阅删除');
  triggerDataUpdate();
  showDeleteSingleSubModal.value = false;
};

const handleDeleteNodeWithCleanup = async (nodeId: string) => {
  deletingItemId.value = nodeId;
  showDeleteSingleNodeModal.value = true;
};

const handleConfirmDeleteSingleNode = async () => {
  if (!deletingItemId.value) return;
  deleteNode(deletingItemId.value);
  removeIdFromProfiles(deletingItemId.value, 'manualNodes');
  await handleDirectSave('节点删除');
  triggerDataUpdate();
  showDeleteSingleNodeModal.value = false;
};

const handleDeleteAllSubscriptionsWithCleanup = async () => {
  deleteAllSubscriptions();
  clearProfilesField('subscriptions');
  await handleDirectSave('订阅清空');
  triggerDataUpdate();
  showDeleteSubsModal.value = false;
};

const handleDeleteAllNodesWithCleanup = async () => {
  deleteAllNodes();
  clearProfilesField('manualNodes');
  await handleDirectSave('节点清空');
  triggerDataUpdate();
  showDeleteNodesModal.value = false;
};

// 批量删除订阅
const handleBatchDeleteSubs = async (subIds: string[]) => {
  if (!subIds || subIds.length === 0) return;

  subIds.forEach(id => {
    deleteSubscription(id);
    removeIdFromProfiles(id, 'subscriptions');
  });

  await handleDirectSave(`批量删除 ${subIds.length} 个订阅`);
  triggerDataUpdate();
};

// 批量删除订阅组
const handleBatchDeleteProfiles = async (profileIds: string[]) => {
  if (!profileIds || profileIds.length === 0) return;

  profiles.value = profiles.value.filter(p => !profileIds.includes(p.id));

  // 如果当前页面没有内容且不是第一页，则跳转到上一页
  if (paginatedProfiles.value.length === 0 && profilesCurrentPage.value > 1) {
    profilesCurrentPage.value--;
  }

  await handleDirectSave(`批量删除 ${profileIds.length} 个订阅组`);
  emit('update-data', {
    profiles: [...profiles.value]
  });
};

// 批量删除节点
const handleBatchDeleteNodes = async (nodeIds: string[]) => {
  if (!nodeIds || nodeIds.length === 0) return;

  nodeIds.forEach(id => {
    deleteNode(id);
    removeIdFromProfiles(id, 'manualNodes');
  });

  await handleDirectSave(`批量删除 ${nodeIds.length} 个节点`);
  triggerDataUpdate();
};

const handleAutoSortNodes = async () => {
  autoSortNodes();
  await handleDirectSave('节点排序');
  triggerDataUpdate();
};
const handleBulkImport = async (importText: string) => {
  if (!importText) return;

  // 优化：使用更高效的字符串处理
  const lines = importText.split('\n').map(line => line.trim()).filter(Boolean);
  const newSubs: Subscription[] = [];
  const newNodes: Node[] = [];

  for (const line of lines) {
    const newItem = {
      id: crypto.randomUUID(),
      name: extractNodeName(line) || '未命名',
      url: line,
      enabled: true,
      status: 'unchecked'
    };

    if (HTTP_REGEX.test(line)) {
      newSubs.push(newItem as any);
    } else if (NODE_PROTOCOL_REGEX.test(line)) {
      newNodes.push(newItem as any);
    }
  }

  if (newSubs.length > 0) addSubscriptionsFromBulk(newSubs);
  if (newNodes.length > 0) addNodesFromBulk(newNodes);

  await handleDirectSave('批量导入');
  // 更新父组件数据，使标签页计数实时刷新
  emit('update-data', {
    subs: [...subscriptions.value, ...manualNodes.value]
  });
  showToast(`成功导入 ${newSubs.length} 条订阅和 ${newNodes.length} 个手动节点`, 'success');
};
const handleAddSubscription = () => {
  isNewSubscription.value = true;
  editingSubscription.value = { id: '', name: '', url: '', enabled: true, exclude: '' }; // 新增 exclude
  showSubModal.value = true;
};
const handleEditSubscription = (subId: string) => {
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

  if (!HTTP_REGEX.test(editingSubscription.value.url)) {
    showToast('请输入有效的 http:// 或 https:// 订阅链接', 'error');
    return;
  }

  let updatePromise = null;

  if (isNewSubscription.value) {
    updatePromise = addSubscription({ ...editingSubscription.value, id: crypto.randomUUID() });
  } else {
    updateSubscription(editingSubscription.value);
  }

  await handleDirectSave('订阅');
  triggerDataUpdate();
  showSubModal.value = false;

  if (updatePromise) {
    // 等待自动更新完成
    const success = await updatePromise;
    if (success) {
      // 更新完成后再次保存，确保节点数量等信息被持久化
      await handleDirectSave('订阅更新', false);
      triggerDataUpdate();
    }
  }
};
const handleAddNode = () => {
  isNewNode.value = true;
  editingNode.value = { id: crypto.randomUUID(), name: '', url: '', enabled: true };
  showNodeModal.value = true;
};
const handleEditNode = (nodeId: string) => {
  const node = manualNodes.value.find(n => n.id === nodeId);
  if (node) {
    isNewNode.value = false;
    editingNode.value = { ...node };
    showNodeModal.value = true;
  }
};
const handleNodeUrlInput = (event: Event) => {
  if (!editingNode.value) return;
  const target = event.target as HTMLTextAreaElement;
  const newUrl = target.value;
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
  triggerDataUpdate();
  showNodeModal.value = false;
};
const handleProfileToggle = async (updatedProfile: Profile) => {
  const index = profiles.value.findIndex(p => p.id === updatedProfile.id);
  if (index !== -1) {
    profiles.value[index].enabled = updatedProfile.enabled;
    await handleDirectSave(`${updatedProfile.name || '订阅组'} 状态`);
    emit('update-data', {
      profiles: [...profiles.value]
    });
  }
};
const handleAddProfile = () => {
  // 检查 profileToken 是否已配置
  const token = config.value?.profileToken;
  if (!token || !token.trim()) {
    showToast('请先在"设置"中配置"订阅组分享Token"，否则无法创建订阅组', 'error');
    return;
  }

  isNewProfile.value = true;
  editingProfile.value = { id: '', name: '', enabled: true, subscriptions: [], manualNodes: [], customId: '', subConverter: '', subConfig: '', expiresAt: '' };
  showProfileModal.value = true;
};
const handleEditProfile = (profileId: string) => {
  const profile = profiles.value.find(p => p.id === profileId);
  if (profile) {
    isNewProfile.value = false;
    editingProfile.value = JSON.parse(JSON.stringify(profile));
    if (editingProfile.value) {
      editingProfile.value.expiresAt = profile.expiresAt || ''; // Ensure expiresAt is copied
    }
    showProfileModal.value = true;
  }
};
const handleSaveProfile = async (profileData: Profile) => {
  if (!profileData?.name) {
    showToast('订阅组名称不能为空', 'error');
    return;
  }

  if (profileData.customId) {
    // 优化：预编译正则表达式，提升性能
    const CUSTOM_ID_REGEX = /[^a-zA-Z0-9-_]/g;
    profileData.customId = profileData.customId.replace(CUSTOM_ID_REGEX, '');

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
  emit('update-data', {
    profiles: [...profiles.value]
  });
  showProfileModal.value = false;
};
const handleDeleteProfile = async (profileId: string) => {
  deletingItemId.value = profileId;
  showDeleteSingleProfileModal.value = true;
};

const handleConfirmDeleteSingleProfile = async () => {
  if (!deletingItemId.value) return;
  profiles.value = profiles.value.filter(p => p.id !== deletingItemId.value);
  // 如果当前页面没有内容且不是第一页，则跳转到上一页
  if (paginatedProfiles.value.length === 0 && profilesCurrentPage.value > 1) {
    profilesCurrentPage.value--;
  }
  await handleDirectSave('订阅组删除');
  emit('update-data', {
    profiles: [...profiles.value]
  });
  showDeleteSingleProfileModal.value = false;
};
const handleDeleteAllProfiles = async () => {
  profiles.value = [];
  profilesCurrentPage.value = 1;
  await handleDirectSave('订阅组清空');
  emit('update-data', {
    profiles: [...profiles.value]
  });
  showDeleteProfilesModal.value = false;
};
const copyProfileLink = (profileId: string) => {
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


const handleShowNodeDetails = (subscription: Subscription) => {
  selectedSubscription.value = subscription;
  selectedProfile.value = null;
  showNodeDetailsModal.value = true;
};

const handleShowProfileNodeDetails = (profile: Profile) => {
  selectedProfile.value = profile;
  selectedSubscription.value = null;
  showNodeDetailsModal.value = true;
};





// 通用直接保存函数
const handleDirectSave = async (operationName = '操作', showNotification = true) => {
  try {
    await handleSave();
    if (showNotification) {
      showToast(`${operationName}已保存`, 'success');
    }
  } catch (error) {
    console.error('保存失败:', error);
    showToast('保存失败', 'error');
  }
};

// 处理订阅开关的直接保存
const handleSubscriptionToggle = async (subscription: Subscription) => {
  subscription.enabled = !subscription.enabled;
  await handleDirectSave(`${subscription.name || '订阅'} 状态`);
};

const handleSubscriptionUpdate = async (subscriptionId: string) => {
  const subscription = subscriptions.value.find(s => s.id === subscriptionId);
  if (!subscription) return;

  // 显示更新中的提示
  // showToast(`正在更新 ${subscription.name || '订阅'}...`, 'info');

  // 更新订阅
  const success = await handleUpdateNodeCount(subscriptionId, false);

  if (success) {
    showToast(`${subscription.name || '订阅'} 已更新`, 'success');
    await handleDirectSave('订阅更新', false);
  } else {
    showToast(`${subscription.name || '订阅'} 更新失败`, 'error');
  }
};

const handleUpdateAllSubscriptions = async () => {
  if (isUpdatingAllSubs.value) return;

  const enabledSubs = subscriptions.value.filter(sub => sub.enabled && sub.url && HTTP_REGEX.test(sub.url));
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

        result.results.forEach((updateResult: any) => {
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

      const successCount = result.results ? result.results.filter((r: any) => r.success).length : enabledSubs.length;
      showToast(`成功更新了 ${successCount} 个订阅`, 'success');
      await handleDirectSave('订阅更新', false); // 不显示重复通知
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

// 添加排序变更标记
const hasUnsavedSortChanges = ref(false);

const handleToggleSortSubs = () => {
  if (isSortingSubs.value && hasUnsavedSortChanges.value && !confirm('有未保存的排序更改，确定要退出吗？')) {
    return;
  }
  isSortingSubs.value = !isSortingSubs.value;
  if (!isSortingSubs.value) hasUnsavedSortChanges.value = false;
};

const handleToggleSortNodes = () => {
  if (isSortingNodes.value && hasUnsavedSortChanges.value && !confirm('有未保存的排序更改，确定要退出吗？')) {
    return;
  }
  isSortingNodes.value = !isSortingNodes.value;
  if (!isSortingNodes.value) hasUnsavedSortChanges.value = false;
};

// 手动保存排序功能
const handleSaveSortChanges = async () => {
  try {
    await handleSave();
    hasUnsavedSortChanges.value = false;
    showToast('排序已保存', 'success');
  } catch (error) {
    console.error('保存排序失败:', error);
    showToast('保存排序失败', 'error');
  }
};

const handleSubscriptionDragEnd = async () => {
  // vuedraggable 已经自动更新了 subscriptions 数组
  hasUnsavedSortChanges.value = true;

  // 拖拽排序完成
};

const handleNodeDragEnd = async () => {
  // vuedraggable 已经自动更新了 manualNodes 数组
  hasUnsavedSortChanges.value = true;

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
      <div v-if="dirty"
        class="p-4 mb-6 lg:mb-8 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 ring-1 ring-inset ring-indigo-500/30 flex items-center justify-between shadow-modern-enhanced">
        <p class="text-sm font-medium text-indigo-800 dark:text-indigo-200">您有未保存的更改</p>
        <div class="flex items-center gap-3">
          <button @click="handleDiscard"
            class="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors hover-lift">放弃更改</button>
          <button @click="handleSave" :disabled="saveState !== 'idle'"
            class="px-6 py-2.5 text-sm text-white font-semibold rounded-xl shadow-sm flex items-center justify-center transition-all duration-300 w-32 hover-lift"
            :class="{ 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700': saveState === 'idle', 'bg-gray-500 cursor-not-allowed': saveState === 'saving', 'bg-gradient-to-r from-green-500 to-emerald-600 cursor-not-allowed': saveState === 'success' }">
            <div v-if="saveState === 'saving'" class="flex items-center"><svg class="animate-spin h-5 w-5 mr-2"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
              </svg><span>保存中...</span></div>
            <div v-else-if="saveState === 'success'" class="flex items-center"><svg xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg><span>已保存</span></div>
            <span v-else>保存更改</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- 主要内容区域 - 根据标签页显示不同内容 -->
    <div class="space-y-6 lg:space-y-8">

      <!-- 仪表盘标签页 -->
      <DashboardHome v-if="activeTab === 'dashboard'" :subscriptions="subscriptions"
        :active-subscriptions="activeSubscriptions" :total-node-count="totalNodeCount"
        :active-node-count="activeNodeCount" :profiles="profiles" :active-profiles="activeProfiles"
        :manual-nodes="manualNodes" :active-manual-nodes="activeManualNodes" :is-updating-all-subs="isUpdatingAllSubs"
        @add-subscription="handleAddSubscription" @update-all-subscriptions="handleUpdateAllSubscriptions"
        @add-node="handleAddNode" @add-profile="handleAddProfile" />

      <!-- 订阅管理标签页 -->
      <SubscriptionsTab v-if="activeTab === 'subscriptions'" v-model:subscriptions="subscriptions"
        :paginated-subscriptions="paginatedSubscriptions" :subs-current-page="subsCurrentPage"
        :subs-total-pages="subsTotalPages" :is-sorting-subs="isSortingSubs"
        :has-unsaved-sort-changes="hasUnsavedSortChanges" :is-updating-all-subs="isUpdatingAllSubs"
        @add-subscription="handleAddSubscription" @update-all-subscriptions="handleUpdateAllSubscriptions"
        @save-sort="handleSaveSortChanges" @toggle-sort="handleToggleSortSubs"
        @delete-all-subs="showDeleteSubsModal = true" @batch-delete-subs="handleBatchDeleteSubs"
        @drag-end="handleSubscriptionDragEnd" @delete-sub="handleDeleteSubscriptionWithCleanup"
        @toggle-sub="handleSubscriptionToggle" @update-sub="handleSubscriptionUpdate" @edit-sub="handleEditSubscription"
        @show-nodes="handleShowNodeDetails" @change-page="changeSubsPage" />

      <!-- 订阅组标签页 -->
      <ProfilesTab v-if="activeTab === 'profiles'" :profiles="profiles" :paginated-profiles="paginatedProfiles"
        :profiles-current-page="profilesCurrentPage" :profiles-total-pages="profilesTotalPages"
        :subscriptions="subscriptions" @add-profile="handleAddProfile"
        @delete-all-profiles="showDeleteProfilesModal = true" @batch-delete-profiles="handleBatchDeleteProfiles"
        @edit-profile="handleEditProfile" @delete-profile="handleDeleteProfile" @toggle-profile="handleProfileToggle"
        @copy-link="copyProfileLink" @show-nodes="handleShowProfileNodeDetails" @change-page="changeProfilesPage" />

      <!-- 链接生成标签页 -->
      <GeneratorTab v-if="activeTab === 'generator'" :config="config" :profiles="profiles" />

      <!-- 手动节点标签页 -->
      <NodesTab v-if="activeTab === 'nodes'" v-model:manual-nodes="manualNodes" v-model:search-term="searchTerm"
        :paginated-manual-nodes="paginatedManualNodes" :manual-nodes-current-page="manualNodesCurrentPage"
        :manual-nodes-total-pages="manualNodesTotalPages" :is-sorting-nodes="isSortingNodes"
        :has-unsaved-sort-changes="hasUnsavedSortChanges" @add-node="handleAddNode"
        @bulk-import="showBulkImportModal = true" @save-sort="handleSaveSortChanges"
        @toggle-sort="handleToggleSortNodes" @import-subs="showSubscriptionImportModal = true"
        @auto-sort="handleAutoSortNodes" @deduplicate="handleDeduplicateNodes"
        @delete-all-nodes="showDeleteNodesModal = true" @batch-delete-nodes="handleBatchDeleteNodes"
        @drag-end="handleNodeDragEnd" @edit-node="handleEditNode" @delete-node="handleDeleteNodeWithCleanup"
        @change-page="changeManualNodesPage" />
    </div>
  </div>

  <!-- 模态框组件 -->
  <BulkImportModal v-model:show="showBulkImportModal" @import="handleBulkImport" />
  <Modal v-model:show="showDeleteSubsModal" @confirm="handleDeleteAllSubscriptionsWithCleanup">
    <template #title>
      <h3 class="text-xl font-bold text-red-500">确认清空订阅</h3>
    </template>
    <template #body>
      <p class="text-base text-gray-400">您确定要删除所有**订阅**吗？此操作将标记为待保存，不会影响手动节点。</p>
    </template>
  </Modal>
  <Modal v-model:show="showDeleteNodesModal" @confirm="handleDeleteAllNodesWithCleanup">
    <template #title>
      <h3 class="text-xl font-bold text-red-500">确认清空节点</h3>
    </template>
    <template #body>
      <p class="text-base text-gray-400">您确定要删除所有**手动节点**吗？此操作将标记为待保存，不会影响订阅。</p>
    </template>
  </Modal>
  <Modal v-model:show="showDeleteProfilesModal" @confirm="handleDeleteAllProfiles">
    <template #title>
      <h3 class="text-xl font-bold text-red-500">确认清空订阅组</h3>
    </template>
    <template #body>
      <p class="text-base text-gray-400">您确定要删除所有**订阅组**吗？此操作不可逆。</p>
    </template>
  </Modal>

  <!-- 单个订阅删除确认模态框 -->
  <Modal v-model:show="showDeleteSingleSubModal" @confirm="handleConfirmDeleteSingleSub">
    <template #title>
      <h3 class="text-xl font-bold text-red-500">确认删除订阅</h3>
    </template>
    <template #body>
      <p class="text-base text-gray-400">您确定要删除此订阅吗？此操作将标记为待保存，不会影响手动节点。</p>
    </template>
  </Modal>

  <!-- 单个节点删除确认模态框 -->
  <Modal v-model:show="showDeleteSingleNodeModal" @confirm="handleConfirmDeleteSingleNode">
    <template #title>
      <h3 class="text-xl font-bold text-red-500">确认删除节点</h3>
    </template>
    <template #body>
      <p class="text-base text-gray-400">您确定要删除此手动节点吗？此操作将标记为待保存，不会影响订阅。</p>
    </template>
  </Modal>

  <!-- 单个订阅组删除确认模态框 -->
  <Modal v-model:show="showDeleteSingleProfileModal" @confirm="handleConfirmDeleteSingleProfile">
    <template #title>
      <h3 class="text-xl font-bold text-red-500">确认删除订阅组</h3>
    </template>
    <template #body>
      <p class="text-base text-gray-400">您确定要删除此订阅组吗？此操作不可逆。</p>
    </template>
  </Modal>

  <ProfileModal v-if="showProfileModal" v-model:show="showProfileModal" :profile="editingProfile" :is-new="isNewProfile"
    :all-subscriptions="subscriptions" :all-manual-nodes="manualNodes" @save="handleSaveProfile" size="2xl" />

  <Modal v-if="editingNode" v-model:show="showNodeModal" @confirm="handleSaveNode">
    <template #title>
      <h3 class="text-xl font-bold text-gray-800 dark:text-white">{{ isNewNode ? '新增手动节点' : '编辑手动节点' }}</h3>
    </template>
    <template #body>
      <div class="space-y-4">
        <div><label for="node-name"
            class="block text-base font-medium text-gray-700 dark:text-gray-300">节点名称</label><input type="text"
            id="node-name" v-model="editingNode.name" placeholder="（可选）不填将自动获取"
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none text-base dark:text-white">
        </div>
        <div><label for="node-url"
            class="block text-base font-medium text-gray-700 dark:text-gray-300">节点链接</label><textarea id="node-url"
            v-model="editingNode.url" @input="handleNodeUrlInput" rows="4"
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none text-base font-mono dark:text-white"></textarea>
        </div>
      </div>
    </template>
  </Modal>

  <Modal v-if="editingSubscription" v-model:show="showSubModal" @confirm="handleSaveSubscription">
    <template #title>
      <h3 class="text-xl font-bold text-gray-800 dark:text-white">{{ isNewSubscription ? '新增订阅' : '编辑订阅' }}</h3>
    </template>
    <template #body>
      <div class="space-y-4">
        <div><label for="sub-edit-name"
            class="block text-base font-medium text-gray-700 dark:text-gray-300">订阅名称</label><input type="text"
            id="sub-edit-name" v-model="editingSubscription.name" placeholder="（可选）不填将自动获取"
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none text-base dark:text-white">
        </div>
        <div><label for="sub-edit-url"
            class="block text-base font-medium text-gray-700 dark:text-gray-300">订阅链接</label><input type="text"
            id="sub-edit-url" v-model="editingSubscription.url" placeholder="https://..."
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none text-base font-mono dark:text-white"></input>
        </div>
        <div>
          <label class="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">节点过滤规则</label>
          <NodeFilterEditor v-model="editingSubscription.exclude" />
        </div>
      </div>
    </template>
  </Modal>

  <SettingsModal v-model:show="uiStore.isSettingsModalVisible" />
  <SubscriptionImportModal :show="showSubscriptionImportModal" @update:show="showSubscriptionImportModal = $event"
    :add-nodes-from-bulk="addNodesFromBulk"
    :on-import-success="async () => { await handleDirectSave('导入订阅'); triggerDataUpdate(); }" />
  <NodeDetailsModal :show="showNodeDetailsModal" @update:show="showNodeDetailsModal = $event"
    :subscription="selectedSubscription" :profile="selectedProfile" :all-subscriptions="subscriptions"
    :all-manual-nodes="manualNodes" />




</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-out;
}

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

/* 移动端响应式优化 */
@media (max-width: 1024px) {

  /* 强制移动端汉堡菜单显示时，主界面不受影响 */
  .container-optimized {
    width: 100% !important;
  }
}

/* 小屏手机优化 (≤640px) */
@media (max-width: 640px) {

  /* 按钮文字在小屏幕上可见 */
  .btn-modern-enhanced {
    font-size: 0.8125rem !important;
    padding: 0.5rem 0.75rem !important;
  }

  /* 搜索框和操作按钮响应式布局 */
  .flex.flex-wrap.items-center.gap-3 {
    gap: 0.5rem !important;
  }
}
</style>
