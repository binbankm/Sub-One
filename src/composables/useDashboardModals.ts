/**
 * ==================== 仪表盘模态框状态管理 ====================
 * 
 * 功能说明：
 * - 集中管理所有模态框的显示状态
 * - 管理正在编辑的数据对象
 * - 提供模态框打开/关闭的便捷方法
 * - 减少 DashboardPage.vue 的代码量
 * 
 * =============================================================
 */

import { ref } from 'vue';
import type { Subscription, Profile, Node } from '../types/index';

/**
 * 仪表盘模态框状态管理 Composable
 */
export function useDashboardModals() {
    // ==================== 订阅编辑模态框 ====================

    /** 订阅编辑模态框显示状态 */
    const showSubModal = ref(false);
    /** 正在编辑的订阅 */
    const editingSubscription = ref<Subscription | null>(null);
    /** 是否为新建订阅 */
    const isNewSubscription = ref(false);

    // ==================== 节点编辑模态框 ====================

    /** 节点编辑模态框显示状态 */
    const showNodeModal = ref(false);
    /** 正在编辑的节点 */
    const editingNode = ref<Node | null>(null);
    /** 是否为新建节点 */
    const isNewNode = ref(false);

    // ==================== 订阅组编辑模态框 ====================

    /** 订阅组编辑模态框显示状态 */
    const showProfileModal = ref(false);
    /** 正在编辑的订阅组 */
    const editingProfile = ref<Profile | null>(null);
    /** 是否为新建订阅组 */
    const isNewProfile = ref(false);

    // ==================== 其他模态框 ====================

    /** 批量导入模态框 */
    const showBulkImportModal = ref(false);
    /** 订阅导入模态框（从URL导入节点） */
    const showSubscriptionImportModal = ref(false);
    /** 节点详情模态框 */
    const showNodeDetailsModal = ref(false);

    // ==================== 删除确认模态框 ====================

    /** 删除单个订阅确认模态框 */
    const showDeleteSingleSubModal = ref(false);
    /** 删除所有订阅确认模态框 */
    const showDeleteSubsModal = ref(false);
    /** 删除单个节点确认模态框 */
    const showDeleteSingleNodeModal = ref(false);
    /** 删除所有节点确认模态框 */
    const showDeleteNodesModal = ref(false);
    /** 删除单个订阅组确认模态框 */
    const showDeleteSingleProfileModal = ref(false);
    /** 删除所有订阅组确认模态框 */
    const showDeleteProfilesModal = ref(false);

    // ==================== 选中状态 ====================

    /** 选中的订阅（用于查看节点详情） */
    const selectedSubscription = ref<Subscription | null>(null);
    /** 选中的订阅组（用于查看节点详情） */
    const selectedProfile = ref<Profile | null>(null);
    /** 待删除的项目 ID */
    const deletingItemId = ref<string | null>(null);

    // ==================== 操作状态 ====================

    /** 是否正在更新所有订阅 */
    const isUpdatingAllSubs = ref(false);

    // ==================== 订阅模态框操作 ====================

    /**
     * 打开新建订阅模态框
     * @param defaultSub 默认订阅数据
     */
    const openAddSubscriptionModal = (defaultSub: Subscription) => {
        isNewSubscription.value = true;
        editingSubscription.value = defaultSub;
        showSubModal.value = true;
    };

    /**
     * 打开编辑订阅模态框
     * @param subscription 要编辑的订阅
     */
    const openEditSubscriptionModal = (subscription: Subscription) => {
        isNewSubscription.value = false;
        editingSubscription.value = { ...subscription };
        showSubModal.value = true;
    };

    /**
     * 关闭订阅编辑模态框
     */
    const closeSubscriptionModal = () => {
        showSubModal.value = false;
        editingSubscription.value = null;
    };

    // ==================== 节点模态框操作 ====================

    /**
     * 打开新建节点模态框
     * @param defaultNode 默认节点数据
     */
    const openAddNodeModal = (defaultNode: Node) => {
        isNewNode.value = true;
        editingNode.value = defaultNode;
        showNodeModal.value = true;
    };

    /**
     * 打开编辑节点模态框
     * @param node 要编辑的节点
     */
    const openEditNodeModal = (node: Node) => {
        isNewNode.value = false;
        editingNode.value = { ...node };
        showNodeModal.value = true;
    };

    /**
     * 关闭节点编辑模态框
     */
    const closeNodeModal = () => {
        showNodeModal.value = false;
        editingNode.value = null;
    };

    // ==================== 订阅组模态框操作 ====================

    /**
     * 打开新建订阅组模态框
     * @param defaultProfile 默认订阅组数据
     */
    const openAddProfileModal = (defaultProfile: Profile) => {
        isNewProfile.value = true;
        editingProfile.value = defaultProfile;
        showProfileModal.value = true;
    };

    /**
     * 打开编辑订阅组模态框
     * @param profile 要编辑的订阅组
     */
    const openEditProfileModal = (profile: Profile) => {
        isNewProfile.value = false;
        editingProfile.value = JSON.parse(JSON.stringify(profile));
        showProfileModal.value = true;
    };

    /**
     * 关闭订阅组编辑模态框
     */
    const closeProfileModal = () => {
        showProfileModal.value = false;
        editingProfile.value = null;
    };

    // ==================== 删除确认模态框操作 ====================

    /**
     * 打开删除确认模态框
     * @param itemId 要删除的项目 ID
     * @param type 类型：subscription/node/profile
     */
    const openDeleteConfirmModal = (itemId: string, type: 'subscription' | 'node' | 'profile') => {
        deletingItemId.value = itemId;
        switch (type) {
            case 'subscription':
                showDeleteSingleSubModal.value = true;
                break;
            case 'node':
                showDeleteSingleNodeModal.value = true;
                break;
            case 'profile':
                showDeleteSingleProfileModal.value = true;
                break;
        }
    };

    /**
     * 关闭所有删除确认模态框
     */
    const closeDeleteConfirmModals = () => {
        showDeleteSingleSubModal.value = false;
        showDeleteSingleNodeModal.value = false;
        showDeleteSingleProfileModal.value = false;
        deletingItemId.value = null;
    };

    // ==================== 节点详情模态框操作 ====================

    /**
     * 显示订阅的节点详情
     * @param subscription 订阅对象
     */
    const showSubscriptionNodeDetails = (subscription: Subscription) => {
        selectedSubscription.value = subscription;
        selectedProfile.value = null;
        showNodeDetailsModal.value = true;
    };

    /**
     * 显示订阅组的节点详情
     * @param profile 订阅组对象
     */
    const showProfileNodeDetails = (profile: Profile) => {
        selectedSubscription.value = null;
        selectedProfile.value = profile;
        showNodeDetailsModal.value = true;
    };

    /**
     * 关闭节点详情模态框
     */
    const closeNodeDetailsModal = () => {
        showNodeDetailsModal.value = false;
        selectedSubscription.value = null;
        selectedProfile.value = null;
    };

    // ==================== 导出 ====================

    return {
        // 订阅编辑模态框状态
        showSubModal,
        editingSubscription,
        isNewSubscription,

        // 节点编辑模态框状态
        showNodeModal,
        editingNode,
        isNewNode,

        // 订阅组编辑模态框状态
        showProfileModal,
        editingProfile,
        isNewProfile,

        // 其他模态框状态
        showBulkImportModal,
        showSubscriptionImportModal,
        showNodeDetailsModal,

        // 删除确认模态框状态
        showDeleteSingleSubModal,
        showDeleteSubsModal,
        showDeleteSingleNodeModal,
        showDeleteNodesModal,
        showDeleteSingleProfileModal,
        showDeleteProfilesModal,

        // 选中状态
        selectedSubscription,
        selectedProfile,
        deletingItemId,

        // 操作状态
        isUpdatingAllSubs,

        // 订阅模态框操作
        openAddSubscriptionModal,
        openEditSubscriptionModal,
        closeSubscriptionModal,

        // 节点模态框操作
        openAddNodeModal,
        openEditNodeModal,
        closeNodeModal,

        // 订阅组模态框操作
        openAddProfileModal,
        openEditProfileModal,
        closeProfileModal,

        // 删除确认模态框操作
        openDeleteConfirmModal,
        closeDeleteConfirmModals,

        // 节点详情模态框操作
        showSubscriptionNodeDetails,
        showProfileNodeDetails,
        closeNodeDetailsModal,
    };
}
