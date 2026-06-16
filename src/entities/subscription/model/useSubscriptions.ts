import { computed, ref } from 'vue';

import type { Subscription } from '@/common/types/index';
import * as api from '@/common/utils/api';
import { HTTP_REGEX } from '@/common/utils/constants';
import i18n from '@/i18n';

export function useSubscriptions(
    saveData: (reason: string, showToast?: boolean) => Promise<boolean>
) {
    const subscriptions = ref<Subscription[]>([]);

    const activeSubscriptions = computed(() =>
        subscriptions.value.filter((s: Subscription) => s.enabled)
    );

    async function addSubscription(sub: Subscription): Promise<boolean> {
        subscriptions.value.unshift(sub);
        return await saveData(i18n.global.t('entities.subscription.actions.add'));
    }

    async function updateSubscription(sub: Subscription, silent: boolean = false) {
        const index = subscriptions.value.findIndex((s: Subscription) => s.id === sub.id);
        if (index !== -1) {
            subscriptions.value[index] = { ...sub };
            await saveData(i18n.global.t('entities.subscription.actions.update'), !silent);
        }
    }

    async function deleteSubscription(
        id: string,
        removeIdFromProfiles: (id: string, type: 'subscriptions' | 'manualNodes') => void
    ) {
        subscriptions.value = subscriptions.value.filter((s: Subscription) => s.id !== id);
        removeIdFromProfiles(id, 'subscriptions');
        await saveData(i18n.global.t('entities.subscription.actions.delete'));
    }

    async function deleteAllSubscriptions(
        clearProfilesField: (type: 'subscriptions' | 'manualNodes') => void
    ) {
        subscriptions.value = [];
        clearProfilesField('subscriptions');
        await saveData(i18n.global.t('entities.subscription.actions.clear'));
    }

    async function addSubscriptionsFromBulk(newSubs: Subscription[]) {
        if (newSubs.length === 0) return;
        subscriptions.value.push(...newSubs);
        await saveData(i18n.global.t('entities.subscription.actions.batchImport'));
    }

    async function updateSubscriptionNodes(id: string): Promise<boolean> {
        const sub = subscriptions.value.find((s: Subscription) => s.id === id);
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
                sub.errorMsg = i18n.global.t('entities.subscription.actions.updateFailed');
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
            (s: Subscription) => s.enabled && s.url && HTTP_REGEX.test(s.url)
        );
        if (enabled.length === 0) return { success: true, count: 0, message: i18n.global.t('entities.subscription.actions.noEnabled') };

        const ids = enabled.map((s: Subscription) => s.id);

        try {
            ids.forEach((id: string) => {
                const s = subscriptions.value.find((sub: Subscription) => sub.id === id);
                if (s) s.isUpdating = true;
            });

            const result = await api.batchUpdateNodes(ids);

            if (result.success) {
                const updates = (result.data || result.results || []) as any[];
                let successCount = 0;

                updates.forEach((update: any) => {
                    const sub = subscriptions.value.find((s: Subscription) => s.id === update.id);
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

                subscriptions.value.forEach((s: Subscription) => {
                    if (s.isUpdating) s.isUpdating = false;
                });

                // 发送 TG 通知（仪表板立即更新）
                if (successCount > 0) {
                    const message = 
                        i18n.global.t('entities.subscription.tg.batchUpdateSuccess') +
                        i18n.global.t('entities.subscription.management.batchUpdated').replace('{count}', String(successCount)) + '\n' +
                        i18n.global.t('entities.subscription.tg.batchUpdateSynced');
                    api.sendNotification(message).catch((err) => {
                        console.error(`${i18n.global.t('entities.subscription.actions.tgFail')}`, err);
                    });
                }

                return { success: true, count: successCount };
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            subscriptions.value.forEach((s: Subscription) => {
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
