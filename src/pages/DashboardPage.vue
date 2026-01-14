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
import { ref, computed, onMounted, type PropType } from 'vue';

// API 和工具函数
import { useToastStore } from '../stores/toast';

// Composables（组合式函数）
import { useSubscriptions } from '../features/subscriptions/useSubscriptions';
import { useManualNodes } from '../features/nodes/useManualNodes';
import { useProfiles } from '../features/profiles/useProfiles';
import { useAppPersistence } from '../composables/useAppPersistence';

// 常量和工具
import { HTTP_REGEX } from '../utils/constants';

// 类型定义
import type { Subscription, Profile, Node as AppNode, AppConfig, InitialData } from '../types/index';

// 同步加载的组件（核心标签页）
import DashboardHome from '../features/dashboard/DashboardHome.vue';
import SubscriptionsTab from '../features/subscriptions/SubscriptionsTab.vue';
import ProfilesTab from '../features/profiles/ProfilesTab.vue';
import NodesTab from '../features/nodes/NodesTab.vue';
import GeneratorTab from '../features/generator/GeneratorTab.vue';
import NodeDetailsModal from '../features/nodes/components/NodeDetailsModal.vue';

// Note: Other modals moved to specific tabs

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
const emit = defineEmits(['update-data', 'update:activeTab']);

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
const config = ref<AppConfig>({} as AppConfig);

// ==================== Composables 初始化 ====================

/**
 * 订阅管理 Composable
 */
const {
  subscriptions, subsCurrentPage, subsTotalPages, paginatedSubscriptions,
  changeSubsPage, addSubscription, updateSubscription, deleteSubscription, deleteAllSubscriptions,
  addSubscriptionsFromBulk, handleUpdateNodeCount, updateAllEnabledSubscriptions
} = useSubscriptions(initialSubs);

/**
 * 手动节点管理 Composable
 */
const {
  manualNodes, manualNodesCurrentPage, manualNodesTotalPages, paginatedManualNodes, searchTerm: nodeSearchTerm,
  changeManualNodesPage, addNode, updateNode, deleteNode, deleteAllNodes, batchDeleteNodes,
  addNodesFromBulk, autoSortNodes, deduplicateNodes,
} = useManualNodes(initialNodes);

/**
 * 订阅组管理 Composable
 */
const {
  profiles, profilesCurrentPage, profilesTotalPages, paginatedProfiles, activeProfiles,
  changeProfilesPage, initializeProfiles, addProfile, updateProfile, 
  deleteProfile, toggleProfile, deleteAllProfiles, batchDeleteProfiles, copyProfileLink,
  removeIdFromProfiles, clearProfilesField
} = useProfiles(config);

/**
 * 数据持久化 Composable
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

const handleToggleSortSubs = () => {
  if (isSortingSubs.value && hasUnsavedSortChanges.value && !confirm('有未保存的排序更改，确定要退出吗？')) return;
  isSortingSubs.value = !isSortingSubs.value;
  if (!isSortingSubs.value) hasUnsavedSortChanges.value = false;
};

const handleToggleSortNodes = () => {
  if (isSortingNodes.value && hasUnsavedSortChanges.value && !confirm('有未保存的排序更改，确定要退出吗？')) return;
  isSortingNodes.value = !isSortingNodes.value;
  if (!isSortingNodes.value) hasUnsavedSortChanges.value = false;
};

const handleSaveSortChanges = async () => {
  if (await handleDirectSave('排序')) {
     hasUnsavedSortChanges.value = false;
     isSortingSubs.value = false;
     isSortingNodes.value = false;
  }
};

const handleSubscriptionDragEnd = () => { hasUnsavedSortChanges.value = true; };
const handleNodeDragEnd = () => { hasUnsavedSortChanges.value = true; };

// ==================== 模态框状态管理 (保留 global / unfiltered ones) ====================

/** 节点详情模态框显示状态 */
const showNodeDetailsModal = ref(false);

/** 选中的订阅（用于查看节点详情） */
const selectedSubscription = ref<Subscription | null>(null);
/** 选中的订阅组（用于查看节点详情） */
const selectedProfile = ref<Profile | null>(null);
/** 是否正在更新所有订阅 */
const isUpdatingAllSubs = ref(false);


// ==================== 跨标签页交互控制 ====================
const tabAction = ref<{ action: string, payload?: any } | null>(null);

const handleHomeAddSubscription = () => {
  emit('update:activeTab', 'subscriptions');
  // Need to wait for tab switch? Usually prop update is fast enough or watch inside component handles it.
  // Using setTimeout to ensure component mount if transitions are involved?
  // But standard prop update might be enough. 
  // Let's set it immediately.
  tabAction.value = { action: 'add' };
};

const handleHomeAddNode = () => {
  emit('update:activeTab', 'nodes');
  tabAction.value = { action: 'add' };
};

const handleImportSubs = () => {
    emit('update:activeTab', 'subscriptions');
    tabAction.value = { action: 'import' };
};

const handleHomeAddProfile = () => {
    emit('update:activeTab', 'profiles');
    tabAction.value = { action: 'add' };
};

const handleUpdateAllSubscriptions = async () => {
    if (isUpdatingAllSubs.value) return;
    isUpdatingAllSubs.value = true;
    try {
        const result = await updateAllEnabledSubscriptions();
        if (result.success) {
            showToast(`成功更新了 ${result.count} 个订阅`, 'success');
            await handleDirectSave('订阅更新', false);
            triggerDataUpdate();
        } else {
            showToast(result.message || '更新失败', result.count > 0 ? 'warning' : 'error');
        }
    } finally {
        isUpdatingAllSubs.value = false;
    }
};


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

const initializeState = () => {
  isLoading.value = true;
  if (props.data) {
    const subsData = props.data.subs || [];
    initialSubs.value = subsData.filter(item => item.url && HTTP_REGEX.test(item.url)) as Subscription[];
    initialNodes.value = subsData.filter(item => !item.url || !HTTP_REGEX.test(item.url)) as AppNode[];
    initializeProfiles(props.data.profiles || []);
    config.value = props.data.config || {} as AppConfig;
  }
  isLoading.value = false;
  dirty.value = false;
};

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


// Note: Old Handlers for Nodes/Profiles are still here roughly? 
// The user asked to split DashboardPage. I have split Subscriptions.
// I should probably clean up Nodes/Profiles handlers too IF I had moved them.
// But I haven't moved Nodes/Profiles modals yet.
// So I MUST KEEP Nodes/Profiles legacy handlers for now to avoid breaking the app.
// I will keep them but compressed or just re-insert them if needed.
// Wait, looking at lines 521+ in original file, there are many node/profile handlers.
// If I delete them, Nodes/Profiles tabs will break.
// I should Keep them for now, OR refactor Nodes/Profiles tabs right now.
// Given strict instructions, I should probably refactor them too or keep the code.
// I will Keep the Node/Profile handlers for now, but remove Subscription handlers.



// ==================== 订阅组操作 (Legacy - Pending Refactor) ====================

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

// ==================== End Legacy ====================

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
    <Transition name="page-fade" mode="out-in">
      <div :key="activeTab" class="space-y-6 lg:space-y-8">

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
          @add-subscription="handleHomeAddSubscription" 
          @update-all-subscriptions="handleUpdateAllSubscriptions"
          @add-node="handleHomeAddNode" 
          @add-profile="handleHomeAddProfile" 
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
          
          :add-subscription="addSubscription"
          :update-subscription="updateSubscription"
          :delete-subscription="deleteSubscription"
          :delete-all-subscriptions="deleteAllSubscriptions"
          :handle-update-node-count="handleUpdateNodeCount"
          :add-subscriptions-from-bulk="addSubscriptionsFromBulk"
          :save-data="handleDirectSave"
          :trigger-update="triggerDataUpdate"
          :add-nodes-from-bulk="async (n: any[]) => addNodesFromBulk(n)"
          :tab-action="tabAction"
          
          @save-sort="handleSaveSortChanges" 
          @toggle-sort="handleToggleSortSubs"
          @drag-end="handleSubscriptionDragEnd" 
          @show-nodes="handleShowNodeDetails" 
          @change-page="changeSubsPage"
          
          @subscription-deleted="(id: string) => removeIdFromProfiles(id, 'subscriptions')"
          @all-subscriptions-deleted="clearProfilesField('subscriptions')"
          @batch-subscriptions-deleted="(ids: string[]) => ids.forEach(id => removeIdFromProfiles(id, 'subscriptions'))"
          @action-handled="tabAction = null"
        />

        <!-- 订阅组标签页 -->
        <ProfilesTab 
          v-if="activeTab === 'profiles'" 
          :profiles="profiles" 
          :paginated-profiles="paginatedProfiles"
          :profiles-current-page="profilesCurrentPage" 
          :profiles-total-pages="profilesTotalPages"
          :subscriptions="subscriptions"
          :manual-nodes="manualNodes"
          :config="config"
          :tab-action="tabAction"
          
          :add-profile="addProfile"
          :update-profile="updateProfile"
          :delete-profile="deleteProfile"
          :delete-all-profiles="deleteAllProfiles"
          :batch-delete-profiles="batchDeleteProfiles"
          :toggle-profile="toggleProfile"
          :copy-profile-link="copyProfileLink"
          :save-data="handleDirectSave"
          :trigger-update="triggerDataUpdate"
           
          @show-nodes="handleShowProfileNodeDetails" 
          @change-page="changeProfilesPage"
          @action-handled="tabAction = null"
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
          :manual-nodes="manualNodes" 
          :paginated-manual-nodes="paginatedManualNodes" 
          :manual-nodes-current-page="manualNodesCurrentPage"
          :manual-nodes-total-pages="manualNodesTotalPages" 
          :search-term="nodeSearchTerm"
          :is-sorting-nodes="isSortingNodes"
          :has-unsaved-sort-changes="hasUnsavedSortChanges" 
          :tab-action="tabAction"

          :add-node="addNode"
          :update-node="updateNode"
          :delete-node="deleteNode"
          :delete-all-nodes="deleteAllNodes"
          :batch-delete-nodes="batchDeleteNodes"
          :add-nodes-from-bulk="addNodesFromBulk"
          :add-subscriptions-from-bulk="addSubscriptionsFromBulk"
          :deduplicate-nodes="deduplicateNodes"
          :auto-sort-nodes="autoSortNodes"
          :save-data="handleDirectSave"
          :trigger-update="triggerDataUpdate"

          @update:search-term="nodeSearchTerm = $event"
          @import-subs="handleImportSubs"
          @save-sort="handleSaveSortChanges"
          @toggle-sort="handleToggleSortNodes" 
          @drag-end="handleNodeDragEnd" 
          @change-page="changeManualNodesPage" 
          @action-handled="tabAction = null"
          @node-deleted="(id) => removeIdFromProfiles(id, 'manualNodes')"
          @all-nodes-deleted="clearProfilesField('manualNodes')"
          @batch-nodes-deleted="(ids) => ids.forEach(id => removeIdFromProfiles(id, 'manualNodes'))" 
        />
      </div>
    </Transition>
  </div>

  <!-- ==================== 模态框组件 ==================== -->


  

  








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
