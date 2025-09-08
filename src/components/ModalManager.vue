<!--
  ModalManager.vue
  模态框管理组件
  统一管理所有模态框的显示和隐藏
-->
<script setup>
import { defineAsyncComponent } from 'vue';
import Modal from './Modal.vue';

// 异步加载大型模态框组件
const BulkImportModal = defineAsyncComponent(() => import('./modals/BulkImportModal.vue'));
const ProfileModal = defineAsyncComponent(() => import('./modals/ProfileModal.vue'));
const SettingsModal = defineAsyncComponent(() => import('./modals/SettingsModal.vue'));
const SubscriptionImportModal = defineAsyncComponent(() => import('./modals/SubscriptionImportModal.vue'));
const NodeDetailsModal = defineAsyncComponent(() => import('./modals/NodeDetailsModal.vue'));
const ProfileNodeDetailsModal = defineAsyncComponent(() => import('./modals/ProfileNodeDetailsModal.vue'));

// Props
const props = defineProps({
  // 模态框显示状态
  showBulkImportModal: { type: Boolean, default: false },
  showDeleteSubsModal: { type: Boolean, default: false },
  showDeleteNodesModal: { type: Boolean, default: false },
  showDeleteProfilesModal: { type: Boolean, default: false },
  showProfileModal: { type: Boolean, default: false },
  showNodeModal: { type: Boolean, default: false },
  showSubModal: { type: Boolean, default: false },
  showSubscriptionImportModal: { type: Boolean, default: false },
  showNodeDetailsModal: { type: Boolean, default: false },
  showProfileNodeDetailsModal: { type: Boolean, default: false },
  showSettingsModal: { type: Boolean, default: false },
  
  // 编辑数据
  editingNode: { type: Object, default: null },
  editingSubscription: { type: Object, default: null },
  editingProfile: { type: Object, default: null },
  selectedSubscription: { type: Object, default: null },
  selectedProfile: { type: Object, default: null },
  
  // 状态标识
  isNewNode: { type: Boolean, default: false },
  isNewSubscription: { type: Boolean, default: false },
  isNewProfile: { type: Boolean, default: false },
  
  // 数据
  subscriptions: { type: Array, default: () => [] },
  manualNodes: { type: Array, default: () => [] }
});

// Emits
const emit = defineEmits([
  'update:showBulkImportModal',
  'update:showDeleteSubsModal',
  'update:showDeleteNodesModal',
  'update:showDeleteProfilesModal',
  'update:showProfileModal',
  'update:showNodeModal',
  'update:showSubModal',
  'update:showSubscriptionImportModal',
  'update:showNodeDetailsModal',
  'update:showProfileNodeDetailsModal',
  'update:showSettingsModal',
  'bulk-import',
  'confirm-delete-subs',
  'confirm-delete-nodes',
  'confirm-delete-profiles',
  'save-profile',
  'save-node',
  'save-subscription',
  'import-subscription',
  'add-nodes-from-bulk',
  'on-import-success'
]);

// 方法
const handleBulkImport = (importText) => {
  emit('bulk-import', importText);
};

const handleConfirmDeleteSubs = () => {
  emit('confirm-delete-subs');
};

const handleConfirmDeleteNodes = () => {
  emit('confirm-delete-nodes');
};

const handleConfirmDeleteProfiles = () => {
  emit('confirm-delete-profiles');
};

const handleSaveProfile = (profileData) => {
  emit('save-profile', profileData);
};

const handleSaveNode = () => {
  emit('save-node');
};

const handleSaveSubscription = () => {
  emit('save-subscription');
};

const handleImportSubscription = () => {
  emit('import-subscription');
};

const handleAddNodesFromBulk = (nodes) => {
  emit('add-nodes-from-bulk', nodes);
};

const handleOnImportSuccess = () => {
  emit('on-import-success');
};
</script>

<template>
  <!-- 批量导入模态框 -->
  <BulkImportModal 
    :show="showBulkImportModal" 
    @update:show="$emit('update:showBulkImportModal', $event)"
    @import="handleBulkImport" 
  />
  
  <!-- 删除确认模态框 -->
  <Modal 
    :show="showDeleteSubsModal" 
    @update:show="$emit('update:showDeleteSubsModal', $event)"
    @confirm="handleConfirmDeleteSubs"
  >
    <template #title>
      <h3 class="text-xl font-bold text-red-500">确认清空订阅</h3>
    </template>
    <template #body>
      <p class="text-base text-gray-400">您确定要删除所有**订阅**吗？此操作将标记为待保存，不会影响手动节点。</p>
    </template>
  </Modal>
  
  <Modal 
    :show="showDeleteNodesModal" 
    @update:show="$emit('update:showDeleteNodesModal', $event)"
    @confirm="handleConfirmDeleteNodes"
  >
    <template #title>
      <h3 class="text-xl font-bold text-red-500">确认清空节点</h3>
    </template>
    <template #body>
      <p class="text-base text-gray-400">您确定要删除所有**手动节点**吗？此操作将标记为待保存，不会影响订阅。</p>
    </template>
  </Modal>
  
  <Modal 
    :show="showDeleteProfilesModal" 
    @update:show="$emit('update:showDeleteProfilesModal', $event)"
    @confirm="handleConfirmDeleteProfiles"
  >
    <template #title>
      <h3 class="text-xl font-bold text-red-500">确认清空订阅组</h3>
    </template>
    <template #body>
      <p class="text-base text-gray-400">您确定要删除所有**订阅组**吗？此操作不可逆。</p>
    </template>
  </Modal>
  
  <!-- 订阅组编辑模态框 -->
  <ProfileModal 
    v-if="showProfileModal" 
    :show="showProfileModal" 
    @update:show="$emit('update:showProfileModal', $event)"
    :profile="editingProfile" 
    :is-new="isNewProfile" 
    :all-subscriptions="subscriptions" 
    :all-manual-nodes="manualNodes" 
    @save="handleSaveProfile" 
    size="2xl" 
  />
  
  <!-- 节点编辑模态框 -->
  <Modal 
    v-if="editingNode" 
    :show="showNodeModal" 
    @update:show="$emit('update:showNodeModal', $event)"
    @confirm="handleSaveNode"
  >
    <template #title>
      <h3 class="text-xl font-bold text-gray-800 dark:text-white">
        {{ isNewNode ? '新增手动节点' : '编辑手动节点' }}
      </h3>
    </template>
    <template #body>
      <div class="space-y-4">
        <div>
          <label for="node-name" class="block text-base font-medium text-gray-700 dark:text-gray-300">节点名称</label>
          <input 
            type="text" 
            id="node-name" 
            v-model="editingNode.name" 
            placeholder="（可选）不填将自动获取" 
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base dark:text-white"
          >
        </div>
        <div>
          <label for="node-url" class="block text-base font-medium text-gray-700 dark:text-gray-300">节点链接</label>
          <textarea 
            id="node-url" 
            v-model="editingNode.url" 
            rows="4" 
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base font-mono dark:text-white"
          ></textarea>
        </div>
      </div>
    </template>
  </Modal>

  <!-- 订阅编辑模态框 -->
  <Modal 
    v-if="editingSubscription" 
    :show="showSubModal" 
    @update:show="$emit('update:showSubModal', $event)"
    @confirm="handleSaveSubscription"
  >
    <template #title>
      <h3 class="text-xl font-bold text-gray-800 dark:text-white">
        {{ isNewSubscription ? '新增订阅' : '编辑订阅' }}
      </h3>
    </template>
    <template #body>
      <div class="space-y-4">
        <div>
          <label for="sub-edit-name" class="block text-base font-medium text-gray-700 dark:text-gray-300">订阅名称</label>
          <input 
            type="text" 
            id="sub-edit-name" 
            v-model="editingSubscription.name" 
            placeholder="（可选）不填将自动获取" 
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base dark:text-white"
          >
        </div>
        <div>
          <label for="sub-edit-url" class="block text-base font-medium text-gray-700 dark:text-gray-300">订阅链接</label>
          <input 
            type="text" 
            id="sub-edit-url" 
            v-model="editingSubscription.url" 
            placeholder="https://..." 
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base font-mono dark:text-white"
          >
        </div>
        <div>
          <label for="sub-edit-exclude" class="block text-base font-medium text-gray-700 dark:text-gray-300">包含/排除节点</label>
          <textarea 
            id="sub-edit-exclude" 
            v-model="editingSubscription.exclude"
            placeholder="[排除模式 (默认)]&#10;proto:vless,trojan&#10;(过期|官网)&#10;---&#10;[包含模式 (只保留匹配项)]&#10;keep:(香港|HK)&#10;keep:proto:ss"
            rows="5" 
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base font-mono dark:text-white"
          ></textarea>
          <p class="text-sm text-gray-400 mt-1">每行一条规则。使用 `keep:` 切换为白名单模式。</p>
        </div>
      </div>
    </template>
  </Modal>
  
  <!-- 设置模态框 -->
  <SettingsModal 
    :show="showSettingsModal" 
    @update:show="$emit('update:showSettingsModal', $event)"
  />
  
  <!-- 订阅导入模态框 -->
  <SubscriptionImportModal 
    :show="showSubscriptionImportModal" 
    @update:show="$emit('update:showSubscriptionImportModal', $event)" 
    :add-nodes-from-bulk="handleAddNodesFromBulk"
    :on-import-success="handleOnImportSuccess"
  />
  
  <!-- 节点详情模态框 -->
  <NodeDetailsModal 
    :show="showNodeDetailsModal" 
    :subscription="selectedSubscription" 
    @update:show="$emit('update:showNodeDetailsModal', $event)" 
  />
  
  <!-- 订阅组节点详情模态框 -->
  <ProfileNodeDetailsModal 
    :show="showProfileNodeDetailsModal" 
    :profile="selectedProfile" 
    :all-subscriptions="subscriptions"
    :all-manual-nodes="manualNodes"
    @update:show="$emit('update:showProfileNodeDetailsModal', $event)" 
  />
</template>
