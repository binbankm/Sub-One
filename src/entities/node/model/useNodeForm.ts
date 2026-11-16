import { computed, ref, watch } from 'vue';

import type { Node } from '@/common/types/index';
import { getProtocol } from '@/common/utils/protocols';
import { extractHostAndPort, extractNodeName } from '@/common/utils/utils';
import { useToastStore } from '@/stores/useNotificationStore';
import i18n from '@/i18n';

export function useNodeForm(
    props: { show: boolean; node: Node | null; isNew: boolean },
    emit: any
) {
    const toastStore = useToastStore();

    const localNode = ref<Node | null>(null);
    const urlError = ref('');
    const hasAutoExtractedName = ref(false);

    const modalTitle = computed(() => (props.isNew ? i18n.global.t('entities.node.form.newManualNode') : i18n.global.t('entities.node.form.editManualNode')));
    const saveButtonText = computed(() => (props.isNew ? i18n.global.t('entities.node.form.add') : i18n.global.t('entities.node.form.save')));
    const canSave = computed(() => {
        return localNode.value?.url && !urlError.value;
    });

    watch(
        [() => props.show, () => props.node],
        ([show, node]) => {
            if (show && node) {
                localNode.value = JSON.parse(JSON.stringify(node));
                urlError.value = '';
                hasAutoExtractedName.value = false;
            }
        },
        { immediate: true }
    );

    const validateUrl = () => {
        urlError.value = '';

        if (!localNode.value?.url) {
            urlError.value = i18n.global.t('entities.node.form.urlEmpty');
            return false;
        }

        const url = localNode.value.url.trim();

        if (!url) {
            urlError.value = i18n.global.t('entities.node.form.urlEmpty');
            return false;
        }

        const hasProtocol = url.includes('://');
        const isBase64 = !hasProtocol && /^[A-Za-z0-9+/=_\-\s]+$/.test(url) && url.length >= 16;

        if (!hasProtocol && !isBase64) {
            urlError.value = i18n.global.t('entities.node.form.urlInvalid');
            return false;
        }

        return true;
    };

    const handleUrlBlur = () => {
        validateUrl();
    };

    const handleUrlInput = () => {
        if (!localNode.value) return;

        const url = localNode.value.url?.trim();

        if (url && !localNode.value.name && !hasAutoExtractedName.value) {
            const firstLine = url.split(/[\r\n]+/)[0]?.trim() || '';
            const extractedName = extractNodeName(firstLine);
            if (extractedName && extractedName !== i18n.global.t('entities.node.fetching.unnamedNode')) {
                localNode.value.name = extractedName;
                hasAutoExtractedName.value = true;
            }
        }
    };

    const handleNameInput = () => {
        hasAutoExtractedName.value = false;
    };

    const handleSave = () => {
        if (!localNode.value) return;

        if (!validateUrl()) {
            toastStore.showToast(i18n.global.t('common.form.fixErrors'), 'error');
            return;
        }

        localNode.value.url = localNode.value.url?.trim();
        if (localNode.value.name) {
            localNode.value.name = localNode.value.name.trim();
        }

        const firstLine = localNode.value.url?.split(/[\r\n]+/)[0]?.trim() || '';

        if (!localNode.value.name && firstLine) {
            localNode.value.name = extractNodeName(firstLine);
        }

        if (firstLine) {
            const { host, port } = extractHostAndPort(firstLine);
            const type = getProtocol(firstLine);

            localNode.value.server = host;
            localNode.value.port = parseInt(port) || 0;
            localNode.value.type = type as any;
        }

        emit('save', localNode.value);
    };

    const handleCancel = () => {
        emit('update:show', false);
    };

    return {
        localNode,
        urlError,
        modalTitle,
        saveButtonText,
        canSave,
        handleUrlBlur,
        handleUrlInput,
        handleNameInput,
        handleSave,
        handleCancel
    };
}
