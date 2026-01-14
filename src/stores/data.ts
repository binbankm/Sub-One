import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Subscription, Profile, Node, AppConfig } from '../types/index';
import * as api from '../utils/api';
import { useToastStore } from './toast';
import { HTTP_REGEX } from '../utils/constants';

// Data Store: Manages global business data (Subscriptions, Nodes, Profiles, Config)
export const useDataStore = defineStore('data', () => {
    // ==================== Dependencies ====================
    const { showToast } = useToastStore();

    // ==================== State ====================
    const subscriptions = ref<Subscription[]>([]);
    const manualNodes = ref<Node[]>([]);
    const profiles = ref<Profile[]>([]);
    const config = ref<AppConfig>({
        // Auth & Security
        mytoken: 'auto',
        profileToken: '',

        // UI & Display
        theme: 'dark',

        FileName: 'Sub-One',

        // Converter / Network Logic
        udp: false,
        skipCertVerify: false,

        // Processing Logic
        prependSubName: false,
        dedupe: false, // Default off to prevent accidental loss

        // Notifications
        NotifyThresholdDays: 3,
        NotifyThresholdPercent: 90,


    });

    const isInitialized = ref(false);
    const isLoading = ref(false);
    const hasUnsavedChanges = ref(false);

    // ==================== Getters ====================
    const activeSubscriptions = computed(() => subscriptions.value.filter(s => s.enabled));
    const activeManualNodes = computed(() => manualNodes.value.filter(n => n.enabled));

    // Total nodes (subs nodes + manual nodes)
    const totalNodeCount = computed(() => {
        let count = manualNodes.value.length;
        subscriptions.value.forEach(sub => {
            if (sub.nodeCount) count += sub.nodeCount;
        });
        return count;
    });

    // Active nodes count
    const activeNodeCount = computed(() => {
        let count = manualNodes.value.filter(n => n.enabled).length;
        subscriptions.value.forEach(sub => {
            if (sub.enabled && sub.nodeCount) count += sub.nodeCount;
        });
        return count;
    });

    // ==================== Actions: Initialization ====================

    // Initialize store with fetched data
    function initData(data: { subs?: any[], profiles?: Profile[], config?: AppConfig }) {
        if (!data) return;

        // Split subs into subscriptions (http) and manual nodes (others)
        const allSubs = data.subs || [];

        subscriptions.value = allSubs
            .filter(item => item.url && HTTP_REGEX.test(item.url))
            .map(item => ({ ...item, isUpdating: false })) as Subscription[];

        manualNodes.value = allSubs
            .filter(item => !item.url || !HTTP_REGEX.test(item.url)) as Node[];

        profiles.value = data.profiles || [];

        if (data.config) {
            config.value = { ...config.value, ...data.config };
        }

        isInitialized.value = true;
    }

    // ==================== Actions: Persistence ====================

    // Save all data to backend
    async function saveData(reason: string = '数据变动', showSuccessToast: boolean = true): Promise<boolean> {
        if (isLoading.value) return false; // 防止重叠保存

        // Merge subs and nodes back into one list
        const combinedSubs = [...subscriptions.value, ...manualNodes.value] as unknown as Subscription[];

        const payload = {
            subs: combinedSubs,
            profiles: profiles.value,
            config: config.value
        };

        try {
            isLoading.value = true;
            hasUnsavedChanges.value = true;
            console.log(`[DataStore] Saving: ${reason}`);

            const response = await api.saveAllData(payload);

            if (response.success) {
                if (showSuccessToast) {
                    showToast(`${reason} 已保存`, 'success');
                }
                hasUnsavedChanges.value = false;
                return true;
            } else {
                showToast(`保存失败: ${response.message}`, 'error');
                return false;
            }
        } catch (error) {
            console.error('Save failed:', error);
            showToast('保存数据时发生未知错误', 'error');
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    // ==================== Actions: Subscriptions ====================

    async function addSubscription(sub: Subscription): Promise<boolean> {
        subscriptions.value.unshift(sub);
        return await saveData('新增订阅');
    }

    async function updateSubscription(sub: Subscription) {
        const index = subscriptions.value.findIndex(s => s.id === sub.id);
        if (index !== -1) {
            subscriptions.value[index] = { ...sub }; // Reactive replacement
            await saveData('更新订阅');
        }
    }

    async function deleteSubscription(id: string) {
        subscriptions.value = subscriptions.value.filter(s => s.id !== id);
        // Also remove from profiles
        removeIdFromProfiles(id, 'subscriptions');
        await saveData('删除订阅');
    }

    async function deleteAllSubscriptions() {
        subscriptions.value = [];
        // Clean profiles
        clearProfilesField('subscriptions');
        await saveData('清空订阅');
    }

    async function addSubscriptionsFromBulk(newSubs: Subscription[]) {
        if (newSubs.length === 0) return;
        subscriptions.value.push(...newSubs);
        await saveData('批量导入订阅');
    }

    // Update logic is more complex, might need api call
    async function updateSubscriptionNodes(id: string): Promise<boolean> {
        const sub = subscriptions.value.find(s => s.id === id);
        if (!sub) return false;

        if (!sub.url || !HTTP_REGEX.test(sub.url)) return false;

        sub.isUpdating = true;
        try {
            const result = await api.fetchNodeCount(sub.url); // fetchNodeCount takes string directly
            if (result && typeof result.count === 'number') {
                sub.nodeCount = result.count;
                if (result.userInfo) {
                    sub.userInfo = result.userInfo;
                }
                sub.status = 'success';
                return true;
            } else {
                sub.status = 'error';
                sub.errorMsg = '更新失败';
                return false;
            }
        } catch (e) {
            sub.status = 'error';
            return false;
        } finally {
            sub.isUpdating = false;
        }
    }

    async function updateAllEnabledSubscriptions() {
        const enabled = subscriptions.value.filter(s => s.enabled && s.url && HTTP_REGEX.test(s.url));
        if (enabled.length === 0) return { success: true, count: 0, message: '没有启用的订阅' };

        const ids = enabled.map(s => s.id);

        try {
            // Set local loading states
            ids.forEach(id => {
                const s = subscriptions.value.find(sub => sub.id === id);
                if (s) s.isUpdating = true;
            });

            const result = await api.batchUpdateNodes(ids);

            // Process results mapping
            // result is ApiResponse
            if (result.success) {
                // If success, data might be the array of results? Or results field?
                // api.ts says: `const result = await response.json() as ApiResponse; return result;`
                // But typically batch endpoints return an array of results for each item.
                // Let's assume result.data is the array or check `results` field.
                const updates = (result.data || result.results || []) as any[];
                let successCount = 0;

                updates.forEach((update: any) => {
                    const sub = subscriptions.value.find(s => s.id === update.id);
                    if (sub) {
                        sub.isUpdating = false;
                        if (update.success) {
                            sub.nodeCount = update.nodeCount;
                            if (update.userInfo) sub.userInfo = update.userInfo;
                            sub.status = 'success';
                            successCount++;
                        } else {
                            sub.status = 'error';
                        }
                    }
                });

                // Cleanup others just in case
                subscriptions.value.forEach(s => { if (s.isUpdating) s.isUpdating = false; });

                return { success: true, count: successCount };
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            subscriptions.value.forEach(s => { if (s.isUpdating) s.isUpdating = false; });
            return { success: false, count: 0, message: e.message };
        }
    }


    // ==================== Actions: Manual Nodes ====================

    async function addNode(node: Node) {
        manualNodes.value.unshift(node);
        await saveData('新增节点');
    }

    async function updateNode(node: Node) {
        const idx = manualNodes.value.findIndex(n => n.id === node.id);
        if (idx !== -1) {
            manualNodes.value[idx] = { ...node };
            await saveData('更新节点');
        }
    }

    async function deleteNode(id: string) {
        manualNodes.value = manualNodes.value.filter(n => n.id !== id);
        removeIdFromProfiles(id, 'manualNodes');
        await saveData('删除节点');
    }

    async function deleteAllNodes() {
        manualNodes.value = [];
        clearProfilesField('manualNodes');
        await saveData('清空节点');
    }

    async function batchDeleteNodes(ids: string[]) {
        const idSet = new Set(ids);
        manualNodes.value = manualNodes.value.filter(n => !idSet.has(n.id + ''));
        ids.forEach(id => removeIdFromProfiles(id, 'manualNodes'));
        await saveData('批量删除节点');
    }

    async function addNodesFromBulk(nodes: Node[]) {
        if (nodes.length > 0) {
            manualNodes.value.unshift(...nodes);
            await saveData('批量导入节点');
        }
    }

    async function deduplicateNodes() {
        const unique = new Map();
        manualNodes.value.forEach(node => {
            // Use stable key generation
            const key = node.url || `${node.server}|${node.port}|${node.type}`;
            if (!unique.has(key)) {
                unique.set(key, node);
            }
        });

        if (manualNodes.value.length !== unique.size) {
            manualNodes.value = Array.from(unique.values());
            await saveData('节点去重');
        }
    }

    async function autoSortNodes() {
        // Simple sort by name
        manualNodes.value.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'));
        await saveData('自动排序');
    }


    // ==================== Actions: Profiles ====================

    async function addProfile(profile: Profile): Promise<boolean> {
        // Generate ID
        const newProfile = { ...profile };
        if (!newProfile.id) {
            newProfile.id = crypto.randomUUID();
        }

        if (!newProfile.customId?.trim()) {
            newProfile.customId = newProfile.id;
        }

        // Duplicate check (Custom ID)
        if (profiles.value.some(p => p.customId === newProfile.customId)) {
            // Try to append random suffix if auto-generated? Or just fail?
            // If user provided it, fail.
            // If auto-generated, we could retry, but rarity is high.
            showToast('自定义ID已存在，请修改', 'error');
            return false;
        }

        profiles.value.unshift(newProfile);
        return await saveData('新增订阅组');
    }

    async function updateProfile(profile: Profile): Promise<boolean> {
        const idx = profiles.value.findIndex(p => p.id === profile.id);
        if (idx === -1) return false;

        // Check customId conflict if changed
        if (profile.customId !== profiles.value[idx].customId) {
            // If new customId is empty, generate one? Or allow user to clear it (not recommended for profiles)?
            if (!profile.customId?.trim()) {
                showToast('自定义ID不能为空', 'error');
                return false;
            }
            if (profiles.value.some(p => p.id !== profile.id && p.customId === profile.customId)) {
                showToast('自定义ID已存在', 'error');
                return false;
            }
        }

        profiles.value[idx] = { ...profile };
        return await saveData('更新订阅组');
    }

    async function deleteProfile(id: string) {
        profiles.value = profiles.value.filter(p => p.id !== id);
        await saveData('删除订阅组');
    }

    async function deleteAllProfiles() {
        profiles.value = [];
        await saveData('清空订阅组');
    }

    async function batchDeleteProfiles(ids: string[]) {
        const idSet = new Set(ids);
        profiles.value = profiles.value.filter(p => !idSet.has(p.id));
        await saveData('批量删除订阅组');
    }

    async function toggleProfile(id: string, enabled: boolean) {
        const p = profiles.value.find(p => p.id === id);
        if (p) {
            p.enabled = enabled;
            await saveData('切换订阅组状态', false); // Optional: don't show toast for toggle
        }
    }

    // Helper: Remove subscription/node ID from all profiles
    function removeIdFromProfiles(id: string, type: 'subscriptions' | 'manualNodes') {
        profiles.value.forEach(p => {
            if (type === 'subscriptions' && p.subscriptions) {
                p.subscriptions = p.subscriptions.filter(sid => sid !== id);
            } else if (type === 'manualNodes' && p.manualNodes) {
                p.manualNodes = p.manualNodes.filter(nid => nid !== id);
            }
        });
    }

    // Helper: Clear field from all profiles
    function clearProfilesField(type: 'subscriptions' | 'manualNodes') {
        profiles.value.forEach(p => {
            if (type === 'subscriptions') p.subscriptions = [];
            if (type === 'manualNodes') p.manualNodes = [];
        });
    }


    // ==================== Actions: Config ====================
    function updateConfig(newConfig: Partial<AppConfig>) {
        config.value = { ...config.value, ...newConfig };
        // Config saving is usually handled by Settings component individually using api.saveSettings
        // But if we update via store, we might want to sync?
        // Let's leave it as is, or add persistence if needed. 
        // Based on SettingsModal.vue, it calls api.saveSettings then store.updateConfig.
        // So store.updateConfig is just for local sync. No need to saveData here.
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

        // Actions
        initData,
        saveData,

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
        toggleProfile,

        // Config Actions
        updateConfig
    };
});
