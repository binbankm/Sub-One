import { ref, computed } from 'vue';
import type { Subscription } from '../../types/index';
import { HTTP_REGEX } from '../../utils/constants';
import * as api from '../../utils/api';

export function useSubscriptions(saveData: (reason: string, showToast?: boolean) => Promise<boolean>) {
    const subscriptions = ref<Subscription[]>([]);

    const activeSubscriptions = computed(() => subscriptions.value.filter((s) => s.enabled));

    async function addSubscription(sub: Subscription): Promise<boolean> {
        subscriptions.value.unshift(sub);
        return await saveData('新增订阅');
    }

    async function updateSubscription(sub: Subscription, silent: boolean = false) {
        const index = subscriptions.value.findIndex((s) => s.id === sub.id);
        if (index !== -1) {
            subscriptions.value[index] = { ...sub };
            await saveData('更新订阅', !silent);
        }
    }

    async function deleteSubscription(id: string, removeIdFromProfiles: (id: string, type: 'subscriptions' | 'manualNodes') => void) {
        subscriptions.value = subscriptions.value.filter((s) => s.id !== id);
        removeIdFromProfiles(id, 'subscriptions');
        await saveData('删除订阅');
    }

    async function deleteAllSubscriptions(clearProfilesField: (type: 'subscriptions' | 'manualNodes') => void) {
        subscriptions.value = [];
        clearProfilesField('subscriptions');
        await saveData('清空订阅');
    }

    async function addSubscriptionsFromBulk(newSubs: Subscription[]) {
        if (newSubs.length === 0) return;
        subscriptions.value.push(...newSubs);
        await saveData('批量导入订阅');
    }

    async function updateSubscriptionNodes(id: string): Promise<boolean> {
        const sub = subscriptions.value.find((s) => s.id === id);
        if (!sub) return false;

        if (!sub.url || !HTTP_REGEX.test(sub.url)) return false;

        sub.isUpdating = true;
        try {
            const result = await api.fetchNodeCount(sub.url);
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
        const enabled = subscriptions.value.filter(
            (s) => s.enabled && s.url && HTTP_REGEX.test(s.url)
        );
        if (enabled.length === 0) return { success: true, count: 0, message: '没有启用的订阅' };

        const ids = enabled.map((s) => s.id);

        try {
            ids.forEach((id) => {
                const s = subscriptions.value.find((sub) => sub.id === id);
                if (s) s.isUpdating = true;
            });

            const result = await api.batchUpdateNodes(ids);

            if (result.success) {
                const updates = (result.data || result.results || []) as any[];
                let successCount = 0;

                updates.forEach((update: any) => {
                    const sub = subscriptions.value.find((s) => s.id === update.id);
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

                subscriptions.value.forEach((s) => {
                    if (s.isUpdating) s.isUpdating = false;
                });

                return { success: true, count: successCount };
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            subscriptions.value.forEach((s) => {
                if (s.isUpdating) s.isUpdating = false;
            });
            return { success: false, count: 0, message: e.message };
        }
    }

    return {
        subscriptions,
        activeSubscriptions,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        deleteAllSubscriptions,
        addSubscriptionsFromBulk,
        updateSubscriptionNodes,
        updateAllEnabledSubscriptions
    };
}
