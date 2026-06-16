import { computed, ref, watch } from 'vue';

import type { Subscription } from '@/common/types/index';

import { useToastStore } from '@/stores/useNotificationStore';

interface UseSubscriptionFormProps {
    show: boolean;
    subscription: Subscription | null;
    isNew: boolean;
}

export function useSubscriptionForm(
    props: UseSubscriptionFormProps,
    onSave: (subscription: Subscription) => void,
    onCancel: () => void
) {
    const toastStore = useToastStore();

    const localSubscription = ref<Subscription | null>(null);
    const urlError = ref('');
    const nameError = ref('');
    const showAdvanced = ref(false);

    const modalTitle = computed(() => (props.isNew ? '新增订阅' : '编辑订阅'));
    const saveButtonText = computed(() => (props.isNew ? '添加' : '保存'));

    const canSave = computed(() => {
        return localSubscription.value?.url && !urlError.value && !nameError.value;
    });

    watch(
        [() => props.show, () => props.subscription],
        ([show, sub]) => {
            if (show && sub) {
                localSubscription.value = JSON.parse(JSON.stringify(sub));
                urlError.value = '';
                nameError.value = '';
                showAdvanced.value = false;
            }
        },
        { immediate: true }
    );

    const validateUrl = () => {
        urlError.value = '';

        if (!localSubscription.value?.url) {
            urlError.value = '订阅链接不能为空';
            return false;
        }

        const url = localSubscription.value.url.trim();

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            urlError.value = '订阅链接必须以 http:// 或 https:// 开头';
            return false;
        }

        try {
            new URL(url);
        } catch {
            urlError.value = '无效的 URL 格式';
            return false;
        }

        return true;
    };

    const handleUrlBlur = () => {
        validateUrl();
    };

    const handleNameInput = () => {
        nameError.value = '';
    };

    const handleSave = () => {
        if (!localSubscription.value) return;

        if (!validateUrl()) {
            toastStore.showToast('请修正错误后再保存', 'error');
            return;
        }

        localSubscription.value.url = localSubscription.value.url?.trim();
        if (localSubscription.value.name) {
            localSubscription.value.name = localSubscription.value.name.trim();
        }

        onSave(localSubscription.value);
    };

    const handleCancel = () => {
        onCancel();
    };

    const toggleAdvanced = () => {
        showAdvanced.value = !showAdvanced.value;
    };

    return {
        localSubscription,
        urlError,
        nameError,
        showAdvanced,
        modalTitle,
        saveButtonText,
        canSave,
        handleUrlBlur,
        handleNameInput,
        handleSave,
        handleCancel,
        toggleAdvanced
    };
}
