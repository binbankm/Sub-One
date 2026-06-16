import { ref } from 'vue';

import type { Subscription } from '@/common/types/index';
import { HTTP_REGEX } from '@/common/utils/constants';
import { createSubscription } from '@/common/utils/importer';
import { sendNotification } from '@/common/utils/api';

import { useDataStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useNotificationStore';

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
            toastStore.showToast('订阅链接不能为空', 'error');
            return;
        }
        if (!HTTP_REGEX.test(updatedSub.url)) {
            toastStore.showToast('请输入有效的 http:// 或 https:// 订阅链接', 'error');
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
            if (!silent) toastStore.showToast(`${sub.name || '订阅'} 已更新`, 'success');
            await dataStore.saveData('订阅节点更新', false);

            // 发送 TG 通知（单个订阅更新）
            const nodeCount = sub.nodeCount || 0;
            const message = 
                `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
                `┃  🔄 订阅更新完成  ┃\n` +
                `┗━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                `📌 *订阅名称*\n` +
                `\`${sub.name || '未命名'}\`\n\n` +
                `📊 *节点数量*\n` +
                `\`${nodeCount}\` 个节点`;
            await sendNotification(message);
        } else {
            toastStore.showToast(`更新失败: ${sub.errorMsg || '未知错误'}`, 'error');
        }
    };

    const handleUpdateAllSubscriptions = async () => {
        if (isUpdatingAllSubs.value) return;
        isUpdatingAllSubs.value = true;
        try {
            const result = await dataStore.updateAllEnabledSubscriptions();
            if (result.success) {
                toastStore.showToast(`成功更新了 ${result.count} 个订阅`, 'success');
                await dataStore.saveData('批量更新', false);

                // 发送 TG 通知（批量更新汇总）
                const message = 
                    `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
                    `┃  🔄 批量更新完成  ┃\n` +
                    `┗━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                    `成功更新了 \`${result.count}\` 个订阅\n` +
                    `📊 所有订阅节点信息已同步完成`;
                await sendNotification(message);
            } else {
                toastStore.showToast(`更新失败: ${result.message}`, 'error');
            }
        } catch (e) {
            toastStore.showToast('批量更新失败', 'error');
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
        await dataStore.saveData('订阅排序');
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
