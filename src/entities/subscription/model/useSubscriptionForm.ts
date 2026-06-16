import { computed, ref, watch } from 'vue';

import type { Subscription } from '@/common/types/index';

import { useToastStore } from '@/stores/useNotificationStore';
import { useI18n } from 'vue-i18n';

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
    const { t } = useI18n();

    const localSubscription = ref<Subscription | null>(null);
    const urlError = ref('');
    const nameError = ref('');
    const showAdvanced = ref(false);

    const modalTitle = computed(() => (props.isNew ? t('entities.subscription.modal.addTitle') : t('entities.subscription.modal.editTitle')));
    const saveButtonText = computed(() => (props.isNew ? t('entities.subscription.modal.addBtn') : t('entities.subscription.modal.saveBtn')));

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
            urlError.value = t('entities.subscription.modal.urlEmpty');
            return false;
        }

        const url = localSubscription.value.url.trim();

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            urlError.value = t('entities.subscription.modal.urlInvalidScheme');
            return false;
        }

        try {
            new URL(url);
        } catch {
            urlError.value = t('entities.subscription.modal.urlInvalid');
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
            toastStore.showToast(t('entities.subscription.modal.fixErrors'), 'error');
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
