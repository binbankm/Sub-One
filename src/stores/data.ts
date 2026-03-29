import { computed } from 'vue';
import { defineStore } from 'pinia';

import type { AppConfig, Profile, Subscription, Node } from '../types/index';
import * as api from '../utils/api';
import { HTTP_REGEX } from '../utils/constants';
import { useToastStore } from './toast';

// Import store modules
import { useConfig } from './modules/useConfig';
import { useNodes } from './modules/useNodes';
import { useProfiles } from './modules/useProfiles';
import { useSubscriptions } from './modules/useSubscriptions';

export const useDataStore = defineStore('data', () => {
    const { showToast } = useToastStore();

    // Instantiate domains
    const { config, isInitialized, isLoading, hasUnsavedChanges, updateConfig } = useConfig();

    // We bind saveData early so domains can use it
    async function saveData(
        reason: string = '数据变动',
        showSuccessToast: boolean = true
    ): Promise<boolean> {
        if (isLoading.value) return false;

        const combinedSubs = [
            ...subscriptions.value,
            ...manualNodes.value
        ] as unknown as Subscription[];

        const payload = {
            subs: combinedSubs,
            profiles: profiles.value,
            config: config.value
        };

        try {
            isLoading.value = true;
            hasUnsavedChanges.value = true;

            const response = await api.saveAllData(payload);

            if (response.success) {
                if (showSuccessToast) showToast(`✅ ${reason} 已保存`, 'success');
                hasUnsavedChanges.value = false;
                return true;
            } else {
                showToast(`❌ 保存失败: ${response.message}`, 'error');
                return false;
            }
        } catch (error) {
            console.error('Save failed:', error);
            showToast('❌ 保存数据时发生未知错误', 'error');
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    const triggerSave = async (reason: string, showToast = true) => await saveData(reason, showToast);

    // Instantiate Subscriptions Domain
    const {
        subscriptions,
        activeSubscriptions,
        addSubscription,
        updateSubscription,
        deleteSubscription: _deleteSub,
        deleteAllSubscriptions: _deleteAllSubs,
        addSubscriptionsFromBulk,
        updateSubscriptionNodes,
        updateAllEnabledSubscriptions
    } = useSubscriptions(triggerSave);

    // Instantiate Profiles Domain
    const {
        profiles,
        addProfile,
        updateProfile,
        deleteProfile,
        deleteAllProfiles,
        batchDeleteProfiles,
        toggleProfile,
        removeIdFromProfiles,
        clearProfilesField
    } = useProfiles(triggerSave, showToast);

    // Apply specific cross-domain injections: 
    const deleteSubscription = (id: string) => _deleteSub(id, removeIdFromProfiles);
    const deleteAllSubscriptions = () => _deleteAllSubs(clearProfilesField);

    // Instantiate Nodes Domain
    const {
        manualNodes,
        activeManualNodes,
        addNode,
        updateNode,
        deleteNode: _deleteNode,
        deleteAllNodes: _deleteAllNodes,
        batchDeleteNodes: _batchDeleteNodes,
        addNodesFromBulk,
        deduplicateNodes,
        autoSortNodes
    } = useNodes(triggerSave);

    // Apply specific cross-domain injections for nodes
    const deleteNode = (id: string) => _deleteNode(id, removeIdFromProfiles);
    const deleteAllNodes = () => _deleteAllNodes(clearProfilesField);
    const batchDeleteNodes = (ids: string[]) => _batchDeleteNodes(ids, removeIdFromProfiles);

    // Computed Counts (Cross Domain)
    const totalNodeCount = computed(() => {
        let count = manualNodes.value.length;
        subscriptions.value.forEach((sub) => {
            if (sub.nodeCount) count += sub.nodeCount;
        });
        return count;
    });

    const activeNodeCount = computed(() => {
        let count = manualNodes.value.filter((n) => n.enabled).length;
        subscriptions.value.forEach((sub) => {
            if (sub.enabled && sub.nodeCount) count += sub.nodeCount;
        });
        return count;
    });

    // Init logic (cross-domain payload mapping)
    function initData(data: { subs?: any[]; profiles?: Profile[]; config?: AppConfig }) {
        if (!data) return;

        const allSubs = data.subs || [];
        subscriptions.value = allSubs
            .filter((item) => item.url && HTTP_REGEX.test(item.url))
            .map((item) => ({ ...item, isUpdating: false })) as Subscription[];

        manualNodes.value = allSubs.filter(
            (item) => !item.url || !HTTP_REGEX.test(item.url)
        ) as Node[];

        profiles.value = data.profiles || [];
        if (data.config) config.value = { ...config.value, ...data.config };

        isInitialized.value = true;
    }

    return {
        // State
        subscriptions,
        manualNodes,
        profiles,
        config,
        isInitialized,
        isLoading,
        hasUnsavedChanges,

        // Getters
        activeSubscriptions,
        activeManualNodes,
        totalNodeCount,
        activeNodeCount,

        // Orchestration Actions
        initData,
        saveData,

        // Config Actions
        updateConfig,

        // Subscription Actions
        addSubscription,
        updateSubscription,
        deleteSubscription,
        deleteAllSubscriptions,
        addSubscriptionsFromBulk,
        updateSubscriptionNodes,
        updateAllEnabledSubscriptions,

        // Manual Node Actions
        addNode,
        updateNode,
        deleteNode,
        deleteAllNodes,
        batchDeleteNodes,
        addNodesFromBulk,
        deduplicateNodes,
        autoSortNodes,

        // Profile Actions
        addProfile,
        updateProfile,
        deleteProfile,
        deleteAllProfiles,
        batchDeleteProfiles,
        toggleProfile
    };
});
