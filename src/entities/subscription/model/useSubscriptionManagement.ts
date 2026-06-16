import { ref } from 'vue';

import type { Subscription } from '@/common/types/index';
import { HTTP_REGEX } from '@/common/utils/constants';
import { createSubscription } from '@/common/utils/importer';
import { sendNotification } from '@/common/utils/api';

import { useDataStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useNotificationStore';
import i18n from '@/i18n';

export function useSubscriptionManagement() {
    const dataStore = useDataStore();
    const toastStore = useToastStore();

    const showSubModal = ref(false);
    const isNewSubscription = ref(false);
    const editingSubscription = ref<Subscription | null>(null);

    const showDeleteSingleSubModal = ref(false);
    const showDeleteAllSubsModal = ref(false);
    const deletingItemId = ref<string | null>(null);

    const isUpdatingAllSubs = ref(false);
    const isSortingSubs = ref(false);
    const hasUnsavedSortChanges = ref(false);

    const handleAddSubscription = () => {
        isNewSubscription.value = true;
        editingSubscription.value = createSubscription('');
        showSubModal.value = true;
    };

    const handleEditSubscription = (subId: string) => {
        const sub = dataStore.subscriptions.find((s: Subscription) => s.id === subId);
        if (sub) {
            isNewSubscription.value = false;
            editingSubscription.value = { ...sub };
            showSubModal.value = true;
        }
    };

    const handleSaveSubscription = async (updatedSub: Subscription, onSuccess: () => void) => {
        if (!updatedSub.url) {
            toastStore.showToast(i18n.global.t('entities.subscription.management.urlEmpty'), 'error');
            return;
        }
        if (!HTTP_REGEX.test(updatedSub.url)) {
            toastStore.showToast(i18n.global.t('entities.subscription.management.urlInvalid'), 'error');
            return;
        }

        if (isNewSubscription.value) {
            const newSubId = crypto.randomUUID();
            const newSub = { ...updatedSub, id: newSubId };
            const success = await dataStore.addSubscription(newSub);

            if (success) {
                onSuccess();
                handleSubscriptionUpdate(newSubId, true);
            }
        } else {
            await dataStore.updateSubscription(updatedSub);
        }

        showSubModal.value = false;
    };

    const handleSubscriptionToggle = async (subscription: Subscription) => {
        if (subscription) {
            subscription.enabled = !subscription.enabled;
            await dataStore.updateSubscription(subscription, true);
        }
    };

    const handleSubscriptionUpdate = async (subscriptionId: string, silent: boolean = false) => {
        const sub = dataStore.subscriptions.find((s: Subscription) => s.id === subscriptionId);
        if (!sub) return;

        const success = await dataStore.updateSubscriptionNodes(subscriptionId);
        if (success) {
            if (!silent) toastStore.showToast(i18n.global.t('entities.subscription.management.updated').replace('{name}', sub.name || ''), 'success');
            await dataStore.saveData(i18n.global.t('entities.subscription.actions.update'), false);

            // 发送 TG 通知（单个订阅更新）
            const nodeCount = sub.nodeCount || 0;
            const message = 
                i18n.global.t('entities.subscription.tg.singleUpdateSuccess') +
                i18n.global.t('entities.subscription.tg.subName') +
                `\`${sub.name || i18n.global.t('entities.subscription.tg.unnamed')}\`\n\n` +
                i18n.global.t('entities.subscription.tg.nodeCount') +
                `\`${nodeCount}\` ${i18n.global.t('entities.subscription.tg.nodesSuffix')}`;
            await sendNotification(message);
        } else {
            toastStore.showToast(i18n.global.t('entities.subscription.management.updateFailedMsg').replace('{msg}', sub.errorMsg || ''), 'error');
        }
    };

    const handleUpdateAllSubscriptions = async () => {
        if (isUpdatingAllSubs.value) return;
        isUpdatingAllSubs.value = true;
        try {
            const result = await dataStore.updateAllEnabledSubscriptions();
            if (result.success) {
                toastStore.showToast(i18n.global.t('entities.subscription.management.batchUpdated').replace('{count}', String(result.count)), 'success');
                await dataStore.saveData(i18n.global.t('entities.subscription.actions.update'), false);

                // 发送 TG 通知（批量更新汇总）
                const message = 
                    i18n.global.t('entities.subscription.tg.batchUpdateSuccess') +
                    i18n.global.t('entities.subscription.tg.batchUpdateSuccessMsg').replace('{count}', String(result.count)) +
                    i18n.global.t('entities.subscription.tg.batchUpdateAllSynced');
                await sendNotification(message);
            } else {
                toastStore.showToast(i18n.global.t('entities.subscription.management.batchFailedWithMessage').replace('{msg}', String(result.message)), 'error');
            }
        } catch (e) {
            toastStore.showToast(i18n.global.t('entities.subscription.management.batchFailed'), 'error');
        } finally {
            isUpdatingAllSubs.value = false;
        }
    };

    const handleDeleteSubscriptionWithCleanup = (subId: string) => {
        deletingItemId.value = subId;
        showDeleteSingleSubModal.value = true;
    };

    const handleConfirmDeleteSingleSub = async () => {
        if (!deletingItemId.value) return;
        await dataStore.deleteSubscription(deletingItemId.value);
        showDeleteSingleSubModal.value = false;
    };

    const handleDeleteAllSubscriptionsWithCleanup = async () => {
        await dataStore.deleteAllSubscriptions();
        showDeleteAllSubsModal.value = false;
    };

    const handleBatchDeleteSubs = async (ids: string[]) => {
        if (!ids || ids.length === 0) return;
        for (const id of ids) {
            await dataStore.deleteSubscription(id);
        }
    };

    const handleSortSave = async () => {
        await dataStore.saveData(i18n.global.t('entities.subscription.actions.update'));
        hasUnsavedSortChanges.value = false;
        isSortingSubs.value = false;
    };

    const handleToggleSort = () => {
        isSortingSubs.value = !isSortingSubs.value;
        if (!isSortingSubs.value) hasUnsavedSortChanges.value = false;
    };

    const handleDragEnd = () => {
        hasUnsavedSortChanges.value = true;
    };

    return {
        showSubModal,
        isNewSubscription,
        editingSubscription,
        showDeleteSingleSubModal,
        showDeleteAllSubsModal,
        isUpdatingAllSubs,
        isSortingSubs,
        hasUnsavedSortChanges,

        handleAddSubscription,
        handleEditSubscription,
        handleSaveSubscription,
        handleSubscriptionToggle,
        handleSubscriptionUpdate,
        handleUpdateAllSubscriptions,
        handleDeleteSubscriptionWithCleanup,
        handleConfirmDeleteSingleSub,
        handleDeleteAllSubscriptionsWithCleanup,
        handleBatchDeleteSubs,
        handleSortSave,
        handleToggleSort,
        handleDragEnd
    };
}
