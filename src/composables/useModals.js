// FILE: src/composables/useModals.js
import { ref } from 'vue';

export function useModals() {
  // 订阅相关模态框
  const showSubModal = ref(false);
  const editingSubscription = ref(null);
  const isNewSubscription = ref(false);

  // 节点相关模态框
  const showNodeModal = ref(false);
  const editingNode = ref(null);
  const isNewNode = ref(false);

  // 订阅组相关模态框
  const showProfileModal = ref(false);
  const editingProfile = ref(null);
  const isNewProfile = ref(false);

  // 其他模态框
  const showBulkImportModal = ref(false);
  const showDeleteSubsModal = ref(false);
  const showDeleteNodesModal = ref(false);
  const showDeleteProfilesModal = ref(false);
  const showSubscriptionImportModal = ref(false);
  const showNodeDetailsModal = ref(false);
  const showProfileNodeDetailsModal = ref(false);

  // 选中的数据
  const selectedSubscription = ref(null);
  const selectedProfile = ref(null);

  // 订阅模态框方法
  const openAddSubscriptionModal = () => {
    isNewSubscription.value = true;
    editingSubscription.value = { name: '', url: '', enabled: true, exclude: '' };
    showSubModal.value = true;
  };

  const openEditSubscriptionModal = (subscription) => {
    isNewSubscription.value = false;
    editingSubscription.value = { ...subscription };
    showSubModal.value = true;
  };

  const closeSubscriptionModal = () => {
    showSubModal.value = false;
    editingSubscription.value = null;
    isNewSubscription.value = false;
  };

  // 节点模态框方法
  const openAddNodeModal = () => {
    isNewNode.value = true;
    editingNode.value = { id: crypto.randomUUID(), name: '', url: '', enabled: true };
    showNodeModal.value = true;
  };

  const openEditNodeModal = (node) => {
    isNewNode.value = false;
    editingNode.value = { ...node };
    showNodeModal.value = true;
  };

  const closeNodeModal = () => {
    showNodeModal.value = false;
    editingNode.value = null;
    isNewNode.value = false;
  };

  // 订阅组模态框方法
  const openAddProfileModal = () => {
    isNewProfile.value = true;
    editingProfile.value = { 
      name: '', 
      enabled: true, 
      subscriptions: [], 
      manualNodes: [], 
      customId: '', 
      subConverter: '', 
      subConfig: '', 
      expiresAt: ''
    };
    showProfileModal.value = true;
  };

  const openEditProfileModal = (profile) => {
    isNewProfile.value = false;
    editingProfile.value = JSON.parse(JSON.stringify(profile));
    editingProfile.value.expiresAt = profile.expiresAt || '';
    showProfileModal.value = true;
  };

  const closeProfileModal = () => {
    showProfileModal.value = false;
    editingProfile.value = null;
    isNewProfile.value = false;
  };

  // 节点详情模态框方法
  const openNodeDetailsModal = (subscription) => {
    selectedSubscription.value = subscription;
    showNodeDetailsModal.value = true;
  };

  const openProfileNodeDetailsModal = (profile) => {
    selectedProfile.value = profile;
    showProfileNodeDetailsModal.value = true;
  };

  // 重置所有模态框状态
  const resetAllModals = () => {
    showSubModal.value = false;
    showNodeModal.value = false;
    showProfileModal.value = false;
    showBulkImportModal.value = false;
    showDeleteSubsModal.value = false;
    showDeleteNodesModal.value = false;
    showDeleteProfilesModal.value = false;
    showSubscriptionImportModal.value = false;
    showNodeDetailsModal.value = false;
    showProfileNodeDetailsModal.value = false;
    
    editingSubscription.value = null;
    editingNode.value = null;
    editingProfile.value = null;
    selectedSubscription.value = null;
    selectedProfile.value = null;
    
    isNewSubscription.value = false;
    isNewNode.value = false;
    isNewProfile.value = false;
  };

  return {
    // 状态
    showSubModal,
    editingSubscription,
    isNewSubscription,
    showNodeModal,
    editingNode,
    isNewNode,
    showProfileModal,
    editingProfile,
    isNewProfile,
    showBulkImportModal,
    showDeleteSubsModal,
    showDeleteNodesModal,
    showDeleteProfilesModal,
    showSubscriptionImportModal,
    showNodeDetailsModal,
    showProfileNodeDetailsModal,
    selectedSubscription,
    selectedProfile,

    // 方法
    openAddSubscriptionModal,
    openEditSubscriptionModal,
    closeSubscriptionModal,
    openAddNodeModal,
    openEditNodeModal,
    closeNodeModal,
    openAddProfileModal,
    openEditProfileModal,
    closeProfileModal,
    openNodeDetailsModal,
    openProfileNodeDetailsModal,
    resetAllModals
  };
}
