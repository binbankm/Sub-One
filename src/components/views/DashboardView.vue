<!--
  ==================== 仪表盘主视图组件 ====================
  
  功能说明：
  - 应用的核心视图组件，协调所有标签页
  - 管理订阅、节点和订阅组的所有操作
  - 处理数据持久化和状态同步
  - 协调各个子组件和模态框
  
  Props：
  - data: 初始数据（订阅、订阅组、配置）
  - activeTab: 当前激活的标签页
  
  Events：
  - update-data: 数据更新事件
  
  子组件：
  - DashboardHome: 仪表盘首页
  - SubscriptionsTab: 订阅管理标签页
  - ProfilesTab: 订阅组标签页
  - GeneratorTab: 链接生成标签页
  - NodesTab: 手动节点标签页
  
  ==================================================
-->

<script setup lang="ts">
// ==================== 导入依赖 ====================

// Vue 核心功能
import { ref, computed, onMounted, defineAsyncComponent, type PropType } from 'vue';

// API 和工具函数
import { batchUpdateNodes } from '../../lib/api';
import { useToastStore } from '../../stores/toast';

// Composables（组合式函数）
import { useSubscriptions } from '../../composables/useSubscriptions';
import { useManualNodes } from '../../composables/useManualNodes';
import { useProfiles } from '../../composables/useProfiles';
import { useAppPersistence } from '../../composables/useAppPersistence';

// 常量和工具
import { HTTP_REGEX } from '../../lib/constants';
import { parseImportText, createSubscription, createNode } from '../../lib/importer';

// 类型定义
import type { Subscription, Profile, Node as AppNode, AppConfig, InitialData, SubscriptionUserInfo } from '../../types';

// 同步加载的组件（核心标签页）
import DashboardHome from '../tabs/DashboardHome.vue';
import SubscriptionsTab from '../tabs/SubscriptionsTab.vue';
import ProfilesTab from '../tabs/ProfilesTab.vue';
import NodesTab from '../tabs/NodesTab.vue';
import GeneratorTab from '../tabs/GeneratorTab.vue';
import SubscriptionImportModal from '../modals/SubscriptionImportModal.vue';
import NodeDetailsModal from '../modals/NodeDetailsModal.vue';
import ConfirmModal from '../modals/ConfirmModal.vue';

// 异步加载的组件（按需加载，优化性能）
const BulkImportModal = defineAsyncComponent(() => import('../modals/BulkImportModal.vue'));
const ProfileModal = defineAsyncComponent(() => import('../modals/ProfileModal.vue'));
const SubscriptionEditModal = defineAsyncComponent(() => import('../modals/SubscriptionEditModal.vue'));
const NodeEditModal = defineAsyncComponent(() => import('../modals/NodeEditModal.vue'));

// ==================== Props 定义 ====================

const props = defineProps({
  /** 初始数据（订阅、订阅组、配置） */
  data: {
    type: Object as PropType<InitialData | null>,
    required: false
  },
  /** 当前激活的标签页 */
  activeTab: {
    type: String,
    default: 'subscriptions'
  }
});

// ==================== Emit 事件定义 ====================

/** 定义组件的 emit 事件 */
const emit = defineEmits(['update-data']);

// ==================== Store 和工具 ====================

const { showToast } = useToastStore();

/** 加载状态 */
const isLoading = ref(true);

// ==================== 初始化状态 ====================

/** 初始订阅列表（HTTP/HTTPS 链接） */
const initialSubs = ref<Subscription[]>([]);

/** 初始手动节点列表（非 HTTP 链接） */
const initialNodes = ref<AppNode[]>([]);

/** 应用配置 */
const config = ref<AppConfig>({});

// ==================== Composables 初始化 ====================

/**
 * 订阅管理 Composable
 * 提供：订阅列表、分页、增删改查等功能
 */
const {
  subscriptions, subsCurrentPage, subsTotalPages, paginatedSubscriptions,
  changeSubsPage, addSubscription, updateSubscription, deleteSubscription, deleteAllSubscriptions,
  addSubscriptionsFromBulk, handleUpdateNodeCount,
} = useSubscriptions(initialSubs);

/**
 * 手动节点管理 Composable
 * 提供：节点列表、搜索、分页、去重、排序等功能
 */
const {
  manualNodes, manualNodesCurrentPage, manualNodesTotalPages, paginatedManualNodes, searchTerm,
  changeManualNodesPage, addNode, updateNode, deleteNode, deleteAllNodes,
  addNodesFromBulk, autoSortNodes, deduplicateNodes,
} = useManualNodes(initialNodes);

/**
 * 订阅组管理 Composable
 * 提供：订阅组列表、分页、增删改查等功能
 */
const {
  profiles, profilesCurrentPage, profilesTotalPages, paginatedProfiles, activeProfiles,
  changeProfilesPage, initializeProfiles, addProfile, updateProfile, 
  deleteProfile, toggleProfile, deleteAllProfiles, batchDeleteProfiles, copyProfileLink,
  removeIdFromProfiles, clearProfilesField
} = useProfiles(config);

/**
 * 数据持久化 Composable
 * 提供：自动保存、脏数据标记等功能
 */
const {
  dirty, handleDirectSave,
} = useAppPersistence(subscriptions, manualNodes, profiles, config);

// ==================== 仪表盘统计数据 ====================

/** 已启用的订阅数量 */
const activeSubscriptions = computed(() => subscriptions.value.filter(sub => sub.enabled).length);

/** 已启用的手动节点数量 */
const activeManualNodes = computed(() => manualNodes.value.filter(node => node.enabled).length);

/** 总节点数量（订阅节点 + 手动节点） */
const totalNodeCount = computed(() => {
  let count = manualNodes.value.length;
  subscriptions.value.forEach(sub => {
    if (sub.nodeCount) count += sub.nodeCount;
  });
  return count;
});

/** 已启用的节点数量 */
const activeNodeCount = computed(() => {
  let count = manualNodes.value.filter(node => node.enabled).length;
  subscriptions.value.forEach(sub => {
    if (sub.enabled && sub.nodeCount) count += sub.nodeCount;
  });
  return count;
});

// ==================== 排序状态管理 ====================

/** 订阅排序模式是否开启 */
const isSortingSubs = ref(false);

/** 节点排序模式是否开启 */
const isSortingNodes = ref(false);

/** 是否有未保存的排序更改 */
const hasUnsavedSortChanges = ref(false);

/**
 * 切换订阅排序模式
 * 如果有未保存的更改，会提示用户确认
 */
const handleToggleSortSubs = () => {
  if (isSortingSubs.value && hasUnsavedSortChanges.value && !confirm('有未保存的排序更改，确定要退出吗？')) return;
  isSortingSubs.value = !isSortingSubs.value;
  if (!isSortingSubs.value) hasUnsavedSortChanges.value = false;
};

/**
 * 切换节点排序模式
 * 如果有未保存的更改，会提示用户确认
 */
const handleToggleSortNodes = () => {
  if (isSortingNodes.value && hasUnsavedSortChanges.value && !confirm('有未保存的排序更改，确定要退出吗？')) return;
  isSortingNodes.value = !isSortingNodes.value;
  if (!isSortingNodes.value) hasUnsavedSortChanges.value = false;
};

/**
 * 保存排序更改
 * 保存成功后自动退出排序模式
 */
const handleSaveSortChanges = async () => {
  if (await handleDirectSave('排序')) {
     hasUnsavedSortChanges.value = false;
     // 保存后自动退出排序模式，提升用户体验
     isSortingSubs.value = false;
     isSortingNodes.value = false;
  }
};

/** 订阅拖拽结束处理 - 标记有未保存的更改 */
const handleSubscriptionDragEnd = () => { hasUnsavedSortChanges.value = true; };

/** 节点拖拽结束处理 - 标记有未保存的更改 */
const handleNodeDragEnd = () => { hasUnsavedSortChanges.value = true; };

// ==================== 模态框状态管理 ====================

/** 正在编辑的订阅 */
const editingSubscription = ref<Subscription | null>(null);
/** 是否为新建订阅 */
const isNewSubscription = ref(false);
/** 订阅编辑模态框显示状态 */
const showSubModal = ref(false);

/** 正在编辑的节点 */
const editingNode = ref<AppNode | null>(null);
/** 是否为新建节点 */
const isNewNode = ref(false);
/** 节点编辑模态框显示状态 */
const showNodeModal = ref(false);

/** 是否为新建订阅组 */
const isNewProfile = ref(false);
/** 正在编辑的订阅组 */
const editingProfile = ref<Profile | null>(null);
/** 订阅组编辑模态框显示状态 */
const showProfileModal = ref(false);

/** 批量导入模态框显示状态 */
const showBulkImportModal = ref(false);
/** 删除所有订阅确认模态框 */
const showDeleteSubsModal = ref(false);
/** 删除所有节点确认模态框 */
const showDeleteNodesModal = ref(false);
/** 删除单个订阅确认模态框 */
const showDeleteSingleSubModal = ref(false);
/** 删除单个节点确认模态框 */
const showDeleteSingleNodeModal = ref(false);
/** 删除单个订阅组确认模态框 */
const showDeleteSingleProfileModal = ref(false);
/** 删除所有订阅组确认模态框 */
const showDeleteProfilesModal = ref(false);
/** 订阅导入模态框显示状态 */
const showSubscriptionImportModal = ref(false);
/** 节点详情模态框显示状态 */
const showNodeDetailsModal = ref(false);

/** 选中的订阅（用于查看节点详情） */
const selectedSubscription = ref<Subscription | null>(null);
/** 选中的订阅组（用于查看节点详情） */
const selectedProfile = ref<Profile | null>(null);
/** 是否正在更新所有订阅 */
const isUpdatingAllSubs = ref(false);
/** 待删除的项目 ID */
const deletingItemId = ref<string | null>(null);

// ==================== 辅助函数 ====================

/**
 * 触发数据更新
 * 将当前数据通过 emit 发送给父组件
 */
const triggerDataUpdate = () => {
  emit('update-data', {
    subs: [...subscriptions.value, ...manualNodes.value]
  });
};

// ==================== 初始化 ====================

/**
 * 初始化组件状态
 * 
 * 说明：
 * - 从 props.data 中提取订阅和节点
 * - 根据 URL 是否为 HTTP/HTTPS 区分订阅和手动节点
 * - 初始化订阅组和配置
 */
const initializeState = () => {
  isLoading.value = true;
  if (props.data) {
    const subsData = props.data.subs || [];
    // 分离订阅和节点（根据 URL 是否为 HTTP/HTTPS）
    initialSubs.value = subsData.filter(item => item.url && HTTP_REGEX.test(item.url)) as Subscription[];
    initialNodes.value = subsData.filter(item => !item.url || !HTTP_REGEX.test(item.url)) as AppNode[];
    
    // 初始化订阅组
    initializeProfiles(props.data.profiles || []);
    config.value = props.data.config || {};
  }
  isLoading.value = false;
  dirty.value = false;
};

/**
 * 组件挂载时执行初始化
 */
onMounted(() => {
  try {
    initializeState();
  } catch (error) {
    console.error('初始化数据失败:', error);
    showToast('初始化数据失败', 'error');
  } finally {
    isLoading.value = false;
  }
});

// ==================== 订阅操作 ====================

/**
 * 添加新订阅
 * 打开订阅编辑模态框
 */
const handleAddSubscription = () => {
  isNewSubscription.value = true;
  editingSubscription.value = createSubscription('');
  showSubModal.value = true;
};

/**
 * 编辑订阅
 * 
 * @param {string} subId - 订阅 ID
 */
const handleEditSubscription = (subId: string) => {
  const sub = subscriptions.value.find(s => s.id === subId);
  if (sub) {
    isNewSubscription.value = false;
    editingSubscription.value = { ...sub };
    showSubModal.value = true;
  }
};

/**
 * 保存订阅
 * 
 * 说明：
 * - 验证订阅链接
 * - 新建或更新订阅
 * - 自动保存并触发数据更新
 * - 新建订阅时自动获取节点数量
 * 
 * @param {Subscription} updatedSub - 编辑后的订阅对象（来自模态框）
 */
const handleSaveSubscription = async (updatedSub?: Subscription) => {
  // 优先使用模态框传递回来的更新后的对象，如果没有（异常情况）则回退到 editingSubscription.value
  const subToSave = updatedSub || editingSubscription.value;
  
  // 验证订阅链接
  if (!subToSave?.url) return showToast('订阅链接不能为空', 'error');
  if (!HTTP_REGEX.test(subToSave.url)) return showToast('请输入有效的 http:// 或 https:// 订阅链接', 'error');

  let updatePromise = null;
  if (isNewSubscription.value) {
    // 新建订阅
    // 如果是新建，确保有一个新的 ID (虽然 createSubscription 已生成，这里再次确保是个好习惯，或者直接使用 subToSave)
    updatePromise = addSubscription({ ...subToSave, id: subToSave.id || crypto.randomUUID() });
  } else {
    // 更新订阅
    updateSubscription(subToSave);
  }

  // 保存数据
  await handleDirectSave('订阅');
  triggerDataUpdate();
  showSubModal.value = false;

  // 如果是新建订阅，自动更新节点数量
  if (updatePromise && await updatePromise) {
    await handleDirectSave('订阅更新', false);
    triggerDataUpdate();
  }
};

/**
 * 切换订阅启用状态
 * 
 * @param {Subscription} subscription - 订阅对象
 */
const handleSubscriptionToggle = async (subscription: Subscription) => {
  subscription.enabled = !subscription.enabled;
  await handleDirectSave(`${subscription.name || '订阅'} 状态`);
};

/**
 * 更新订阅节点数量
 * 
 * @param {string} subscriptionId - 订阅 ID
 */
const handleSubscriptionUpdate = async (subscriptionId: string) => {
  const sub = subscriptions.value.find(s => s.id === subscriptionId);
  if (!sub) return;

  if (await handleUpdateNodeCount(subscriptionId, false)) {
    showToast(`${sub.name || '订阅'} 已更新`, 'success');
    await handleDirectSave('订阅更新', false);
  } else {
    showToast(`${sub.name || '订阅'} 更新失败`, 'error');
  }
};

/**
 * 删除订阅（带清理）
 * 显示确认对话框
 * 
 * @param {string} subId - 订阅 ID
 */
const handleDeleteSubscriptionWithCleanup = (subId: string) => {
  deletingItemId.value = subId;
  showDeleteSingleSubModal.value = true;
};

/**
 * 确认删除单个订阅
 * 同时从订阅组中移除该订阅
 */
const handleConfirmDeleteSingleSub = async () => {
  if (!deletingItemId.value) return;
  deleteSubscription(deletingItemId.value);
  removeIdFromProfiles(deletingItemId.value, 'subscriptions');
  await handleDirectSave('订阅删除');
  triggerDataUpdate();
  showDeleteSingleSubModal.value = false;
};

/**
 * 删除所有订阅（带清理）
 * 同时清空所有订阅组中的订阅引用
 */
const handleDeleteAllSubscriptionsWithCleanup = async () => {
  deleteAllSubscriptions();
  clearProfilesField('subscriptions');
  await handleDirectSave('订阅清空');
  triggerDataUpdate();
  showDeleteSubsModal.value = false;
};

/**
 * 批量删除订阅
 * 
 * @param {string[]} subIds - 订阅 ID 数组
 */
const handleBatchDeleteSubs = async (subIds: string[]) => {
  if (!subIds || subIds.length === 0) return;
  subIds.forEach(id => {
    deleteSubscription(id);
    removeIdFromProfiles(id, 'subscriptions');
  });
  await handleDirectSave(`批量删除 ${subIds.length} 个订阅`);
  triggerDataUpdate();
};

/**
 * 更新所有订阅
 * 
 * 说明：
 * - 使用批量 API 提升性能
 * - 只更新已启用的订阅
 * - 显示更新进度和结果
 */
const handleUpdateAllSubscriptions = async () => {
  if (isUpdatingAllSubs.value) return;
  const enabledSubs = subscriptions.value.filter(sub => sub.enabled && sub.url && HTTP_REGEX.test(sub.url));
  if (enabledSubs.length === 0) return showToast('没有可更新的订阅', 'warning');

  isUpdatingAllSubs.value = true;
  try {
    const result = await batchUpdateNodes(enabledSubs.map(sub => sub.id));
    
    // 定义更新结果接口
    interface UpdateResult {
      success: boolean;
      id: string;
      nodeCount?: number;
      userInfo?: SubscriptionUserInfo;
    }

    // 兼容 data 和 results 字段，处理后端可能返回的不同结构
    const updateResults = (Array.isArray(result.data) 
      ? result.data 
      : (Array.isArray((result as any).results) ? (result as any).results : null)) as UpdateResult[] | null;

    if (result.success && updateResults) {
       // 使用 Map 提升查找性能
       const subsMap = new Map(subscriptions.value.map(s => [s.id, s]));
       updateResults.forEach((r) => {
         if (r.success) {
           const sub = subsMap.get(r.id);
           if (sub) {
             if (typeof r.nodeCount === 'number') sub.nodeCount = r.nodeCount;
             if (r.userInfo) sub.userInfo = r.userInfo;
           }
         }
       });
       const successCount = updateResults.filter((r) => r.success).length;
       showToast(`成功更新了 ${successCount} 个订阅`, 'success');
       await handleDirectSave('订阅更新', false);
    } else {
      showToast(`更新失败: ${result.message || '未知错误'}`, 'error');
    }
  } catch (error) {
    showToast('批量更新失败', 'error');
  } finally {
    isUpdatingAllSubs.value = false;
  }
};

// ==================== 节点操作 ====================

/**
 * 添加新节点
 * 打开节点编辑模态框
 */
const handleAddNode = () => {
  isNewNode.value = true;
  editingNode.value = createNode('');
  showNodeModal.value = true;
};

/**
 * 编辑节点
 * 
 * @param {string} nodeId - 节点 ID
 */
const handleEditNode = (nodeId: string) => {
  const node = manualNodes.value.find(n => n.id === nodeId);
  if (node) {
    isNewNode.value = false;
    editingNode.value = { ...node };
    showNodeModal.value = true;
  }
};

/**
 * 保存节点
 * 
 * @param {AppNode} updatedNode - 编辑后的节点对象（来自模态框）
 */
const handleSaveNode = async (updatedNode?: AppNode) => {
  // 优先使用模态框传递回来的更新后的对象，如果没有则回退到 editingNode.value
  const nodeToSave = updatedNode || editingNode.value;

  if (!nodeToSave?.url) return showToast('节点链接不能为空', 'error');

  if (isNewNode.value) {
    addNode(nodeToSave);
  } else {
    updateNode(nodeToSave);
  }
  await handleDirectSave('节点');
  triggerDataUpdate();
  showNodeModal.value = false;
};

/**
 * 删除节点（带清理）
 * 显示确认对话框
 * 
 * @param {string} nodeId - 节点 ID
 */
const handleDeleteNodeWithCleanup = (nodeId: string) => {
  deletingItemId.value = nodeId;
  showDeleteSingleNodeModal.value = true;
};

/**
 * 确认删除单个节点
 * 同时从订阅组中移除该节点
 */
const handleConfirmDeleteSingleNode = async () => {
  if (!deletingItemId.value) return;
  deleteNode(deletingItemId.value);
  removeIdFromProfiles(deletingItemId.value, 'manualNodes');
  await handleDirectSave('节点删除');
  triggerDataUpdate();
  showDeleteSingleNodeModal.value = false;
};

/**
 * 删除所有节点（带清理）
 * 同时清空所有订阅组中的节点引用
 */
const handleDeleteAllNodesWithCleanup = async () => {
  deleteAllNodes();
  clearProfilesField('manualNodes');
  await handleDirectSave('节点清空');
  triggerDataUpdate();
  showDeleteNodesModal.value = false;
};

/**
 * 批量删除节点
 * 
 * @param {string[]} nodeIds - 节点 ID 数组
 */
const handleBatchDeleteNodes = async (nodeIds: string[]) => {
  if (!nodeIds || nodeIds.length === 0) return;
  nodeIds.forEach(id => {
    deleteNode(id);
    removeIdFromProfiles(id, 'manualNodes');
  });
  await handleDirectSave(`批量删除 ${nodeIds.length} 个节点`);
  triggerDataUpdate();
};

/**
 * 节点去重
 * 调用 composable 提供的去重功能
 */
const handleDeduplicateNodes = async () => {
  deduplicateNodes();
  await handleDirectSave('节点去重');
  triggerDataUpdate();
};

/**
 * 节点自动排序
 * 按地区优先级排序
 */
const handleAutoSortNodes = async () => {
  autoSortNodes();
  await handleDirectSave('节点排序');
  triggerDataUpdate();
};

/**
 * 批量导入
 * 解析导入文本并添加订阅和节点
 * 
 * @param {string} importText - 导入的文本
 */
const handleBulkImport = async (importText: string) => {
  const { subs, nodes } = parseImportText(importText);
  
  if (subs.length > 0) addSubscriptionsFromBulk(subs);
  if (nodes.length > 0) addNodesFromBulk(nodes);

  await handleDirectSave('批量导入');
  emit('update-data', { subs: [...subscriptions.value, ...manualNodes.value] });
  showToast(`成功导入 ${subs.length} 条订阅和 ${nodes.length} 个手动节点`, 'success');
};

// ==================== 订阅组操作 ====================

/**
 * 添加新订阅组
 * 打开订阅组编辑模态框
 */
const handleAddProfile = () => {
   // 检查是否已配置 profileToken
   if (!config.value?.profileToken?.trim()) {
     showToast('请先在"设置"中配置"订阅组分享Token"', 'error');
     return;
   }
   isNewProfile.value = true;
   editingProfile.value = { 
     id: '', name: '', enabled: true, subscriptions: [], 
     manualNodes: [], customId: '', subConverter: '', subConfig: '', expiresAt: '' 
   };
   showProfileModal.value = true;
};

/**
 * 编辑订阅组
 * 
 * @param {string} profileId - 订阅组 ID
 */
const handleEditProfile = (profileId: string) => {
  const profile = profiles.value.find(p => p.id === profileId);
  if (profile) {
    isNewProfile.value = false;
    // 深拷贝避免修改原对象
    editingProfile.value = JSON.parse(JSON.stringify(profile));
    if (editingProfile.value) editingProfile.value.expiresAt = profile.expiresAt || '';
    showProfileModal.value = true;
  }
};

/**
 * 保存订阅组
 * 
 * @param {Profile} profileData - 订阅组数据
 */
const handleSaveProfile = async (profileData: Profile) => {
  if (!profileData?.name) return showToast('订阅组名称不能为空', 'error');

  const success = isNewProfile.value ? addProfile(profileData) : updateProfile(profileData);
  if (success) {
    await handleDirectSave('订阅组');
    emit('update-data', { profiles: [...profiles.value] });
    showProfileModal.value = false;
  }
};

/**
 * 切换订阅组启用状态
 * 
 * @param {Profile} updatedProfile - 更新后的订阅组
 */
const handleProfileToggle = async (updatedProfile: Profile) => {
   toggleProfile(updatedProfile.id, updatedProfile.enabled);
   await handleDirectSave(`${updatedProfile.name || '订阅组'} 状态`);
   emit('update-data', { profiles: [...profiles.value] });
};

/**
 * 删除订阅组
 * 显示确认对话框
 * 
 * @param {string} profileId - 订阅组 ID
 */
const handleDeleteProfile = (profileId: string) => {
  deletingItemId.value = profileId;
  showDeleteSingleProfileModal.value = true;
};

/**
 * 确认删除单个订阅组
 */
const handleConfirmDeleteSingleProfile = async () => {
  if (!deletingItemId.value) return;
  deleteProfile(deletingItemId.value);
  await handleDirectSave('订阅组删除');
  emit('update-data', { profiles: [...profiles.value] });
  showDeleteSingleProfileModal.value = false;
};

/**
 * 批量删除订阅组
 * 
 * @param {string[]} profileIds - 订阅组 ID 数组
 */
const handleBatchDeleteProfiles = async (profileIds: string[]) => {
  batchDeleteProfiles(profileIds);
  await handleDirectSave(`批量删除 ${profileIds.length} 个订阅组`);
  emit('update-data', { profiles: [...profiles.value] });
};

/**
 * 删除所有订阅组
 */
const handleDeleteAllProfiles = async () => {
  deleteAllProfiles(); 
  await handleDirectSave('订阅组清空');
  emit('update-data', { profiles: [...profiles.value] });
  showDeleteProfilesModal.value = false;
};

// ==================== 模态框显示辅助函数 ====================

/**
 * 显示订阅节点详情
 * 
 * @param {Subscription} subscription - 订阅对象
 */
const handleShowNodeDetails = (subscription: Subscription) => {
  selectedSubscription.value = subscription;
  selectedProfile.value = null;
  showNodeDetailsModal.value = true;
};

/**
 * 显示订阅组节点详情
 * 
 * @param {Profile} profile - 订阅组对象
 */
const handleShowProfileNodeDetails = (profile: Profile) => {
  selectedProfile.value = profile;
  selectedSubscription.value = null;
  showNodeDetailsModal.value = true;
};
</script>

<template>
  <!-- 加载状态 -->
  <div v-if="isLoading" class="text-center py-16 text-gray-500">
    正在加载...
  </div>
  
  <!-- 主容器 -->
  <div v-else class="w-full container-optimized">

    <!-- ==================== 主要内容区域 ==================== -->
    <!-- 根据当前激活的标签页显示不同内容 -->
    <div class="space-y-6 lg:space-y-8">

      <!-- 仪表盘首页 -->
      <DashboardHome 
        v-if="activeTab === 'dashboard'" 
        :subscriptions="subscriptions"
        :active-subscriptions="activeSubscriptions" 
        :total-node-count="totalNodeCount"
        :active-node-count="activeNodeCount" 
        :profiles="profiles" 
        :active-profiles="activeProfiles"
        :manual-nodes="manualNodes" 
        :active-manual-nodes="activeManualNodes" 
        :is-updating-all-subs="isUpdatingAllSubs"
        @add-subscription="handleAddSubscription" 
        @update-all-subscriptions="handleUpdateAllSubscriptions"
        @add-node="handleAddNode" 
        @add-profile="handleAddProfile" 
      />

      <!-- 订阅管理标签页 -->
      <SubscriptionsTab 
        v-if="activeTab === 'subscriptions'" 
        v-model:subscriptions="subscriptions"
        :paginated-subscriptions="paginatedSubscriptions" 
        :subs-current-page="subsCurrentPage"
        :subs-total-pages="subsTotalPages" 
        :is-sorting-subs="isSortingSubs"
        :has-unsaved-sort-changes="hasUnsavedSortChanges" 
        :is-updating-all-subs="isUpdatingAllSubs"
        @add-subscription="handleAddSubscription" 
        @update-all-subscriptions="handleUpdateAllSubscriptions"
        @save-sort="handleSaveSortChanges" 
        @toggle-sort="handleToggleSortSubs"
        @delete-all-subs="showDeleteSubsModal = true" 
        @batch-delete-subs="handleBatchDeleteSubs"
        @drag-end="handleSubscriptionDragEnd" 
        @delete-sub="handleDeleteSubscriptionWithCleanup"
        @toggle-sub="handleSubscriptionToggle" 
        @update-sub="handleSubscriptionUpdate" 
        @edit-sub="handleEditSubscription"
        @show-nodes="handleShowNodeDetails" 
        @change-page="changeSubsPage" 
      />

      <!-- 订阅组标签页 -->
      <ProfilesTab 
        v-if="activeTab === 'profiles'" 
        :profiles="profiles" 
        :paginated-profiles="paginatedProfiles"
        :profiles-current-page="profilesCurrentPage" 
        :profiles-total-pages="profilesTotalPages"
        :subscriptions="subscriptions" 
        @add-profile="handleAddProfile"
        @delete-all-profiles="showDeleteProfilesModal = true" 
        @batch-delete-profiles="handleBatchDeleteProfiles"
        @edit-profile="handleEditProfile" 
        @delete-profile="handleDeleteProfile" 
        @toggle-profile="handleProfileToggle"
        @copy-link="copyProfileLink" 
        @show-nodes="handleShowProfileNodeDetails" 
        @change-page="changeProfilesPage" 
      />

      <!-- 链接生成标签页 -->
      <GeneratorTab 
        v-if="activeTab === 'generator'" 
        :config="config" 
        :profiles="profiles" 
      />

      <!-- 手动节点标签页 -->
      <NodesTab 
        v-if="activeTab === 'nodes'" 
        v-model:manual-nodes="manualNodes" 
        v-model:search-term="searchTerm"
        :paginated-manual-nodes="paginatedManualNodes" 
        :manual-nodes-current-page="manualNodesCurrentPage"
        :manual-nodes-total-pages="manualNodesTotalPages" 
        :is-sorting-nodes="isSortingNodes"
        :has-unsaved-sort-changes="hasUnsavedSortChanges" 
        @add-node="handleAddNode"
        @bulk-import="showBulkImportModal = true" 
        @save-sort="handleSaveSortChanges"
        @toggle-sort="handleToggleSortNodes" 
        @import-subs="showSubscriptionImportModal = true"
        @auto-sort="handleAutoSortNodes" 
        @deduplicate="handleDeduplicateNodes"
        @delete-all-nodes="showDeleteNodesModal = true" 
        @batch-delete-nodes="handleBatchDeleteNodes"
        @drag-end="handleNodeDragEnd" 
        @edit-node="handleEditNode" 
        @delete-node="handleDeleteNodeWithCleanup"
        @change-page="changeManualNodesPage" 
      />
    </div>
  </div>

  <!-- ==================== 模态框组件 ==================== -->

  <!-- 批量导入模态框 -->
  <BulkImportModal v-model:show="showBulkImportModal" @import="handleBulkImport" />
  
  <!-- 删除所有订阅确认模态框 -->
  <ConfirmModal
    v-model:show="showDeleteSubsModal"
    @confirm="handleDeleteAllSubscriptionsWithCleanup"
    title="确认清空订阅"
    message="您确定要删除所有<strong>订阅</strong>吗？此操作将标记为待保存，不会影响手动节点。"
    type="danger"
  />
  
  <!-- 删除所有节点确认模态框 -->
  <ConfirmModal
    v-model:show="showDeleteNodesModal"
    @confirm="handleDeleteAllNodesWithCleanup"
    title="确认清空节点"
    message="您确定要删除所有<strong>手动节点</strong>吗？此操作将标记为待保存，不会影响订阅。"
    type="danger"
  />
  
  <!-- 删除所有订阅组确认模态框 -->
  <ConfirmModal
    v-model:show="showDeleteProfilesModal"
    @confirm="handleDeleteAllProfiles"
    title="确认清空订阅组"
    message="您确定要删除所有<strong>订阅组</strong>吗？此操作不可逆。"
    type="danger"
  />

  <!-- 单个订阅删除确认模态框 -->
  <ConfirmModal
    v-model:show="showDeleteSingleSubModal"
    @confirm="handleConfirmDeleteSingleSub"
    title="确认删除订阅"
    message="您确定要删除此订阅吗？此操作将标记为待保存，不会影响手动节点。"
    type="danger"
  />

  <!-- 单个节点删除确认模态框 -->
  <ConfirmModal
    v-model:show="showDeleteSingleNodeModal"
    @confirm="handleConfirmDeleteSingleNode"
    title="确认删除节点"
    message="您确定要删除此手动节点吗？此操作将标记为待保存，不会影响订阅。"
    type="danger"
  />

  <!-- 单个订阅组删除确认模态框 -->
  <ConfirmModal
    v-model:show="showDeleteSingleProfileModal"
    @confirm="handleConfirmDeleteSingleProfile"
    title="确认删除订阅组"
    message="您确定要删除此订阅组吗？此操作不可逆。"
    type="danger"
  />

  <!-- 订阅组编辑模态框（异步加载） -->
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

  <!-- 节点编辑模态框（异步加载） -->
  <NodeEditModal
    v-if="showNodeModal"
    v-model:show="showNodeModal"
    :node="editingNode"
    :is-new="isNewNode"
    @save="handleSaveNode"
  />

  <!-- 订阅编辑模态框（异步加载） -->
  <SubscriptionEditModal
    v-if="showSubModal"
    v-model:show="showSubModal"
    :subscription="editingSubscription"
    :is-new="isNewSubscription"
    @save="handleSaveSubscription"
  />

  <!-- 注意：SettingsModal 已移至 App.vue ，通过 uiStore 管理状态 -->
  
  <!-- 订阅导入模态框 -->
  <SubscriptionImportModal 
    :show="showSubscriptionImportModal" 
    @update:show="showSubscriptionImportModal = $event"
    :add-nodes-from-bulk="addNodesFromBulk"
    :on-import-success="async () => { await handleDirectSave('导入订阅'); triggerDataUpdate(); }" 
  />
  
  <!-- 节点详情模态框 -->
  <NodeDetailsModal 
    :show="showNodeDetailsModal" 
    @update:show="showNodeDetailsModal = $event"
    :subscription="selectedSubscription" 
    :profile="selectedProfile" 
    :all-subscriptions="subscriptions"
    :all-manual-nodes="manualNodes" 
  />
</template>

<style scoped>
/* 拖拽光标 */
.cursor-move {
  cursor: move;
}

/* ==================== 响应式设计 ==================== */

/* 平板和小型桌面 (≤1024px) */
@media (max-width: 1024px) {
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
