import { computed, ref, watch } from 'vue';

import type { Node } from '@/common/types/index';
import { getProtocol } from '@/common/utils/protocols';
import { extractHostAndPort, extractNodeName } from '@/common/utils/utils';

import { useToastStore } from '@/stores/useNotificationStore';

export function useNodeForm(
    props: { show: boolean; node: Node | null; isNew: boolean },
    emit: any
) {
    const toastStore = useToastStore();

    const localNode = ref<Node | null>(null);
    const urlError = ref('');
    const hasAutoExtractedName = ref(false);

    const modalTitle = computed(() => (props.isNew ? '新增手动节点' : '编辑手动节点'));
    const saveButtonText = computed(() => (props.isNew ? '添加' : '保存'));
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
            urlError.value = '节点链接不能为空';
            return false;
        }

        const url = localNode.value.url.trim();

        if (!url) {
            urlError.value = '节点链接不能为空';
            return false;
        }

        if (!url.includes('://')) {
            urlError.value = '无效的节点链接格式';
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
            const extractedName = extractNodeName(url);
            if (extractedName && extractedName !== '未命名节点') {
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
            toastStore.showToast('请修正错误后再保存', 'error');
            return;
        }

        localNode.value.url = localNode.value.url?.trim();
        if (localNode.value.name) {
            localNode.value.name = localNode.value.name.trim();
        }

        if (!localNode.value.name && localNode.value.url) {
            localNode.value.name = extractNodeName(localNode.value.url);
        }

        if (localNode.value.url) {
            const { host, port } = extractHostAndPort(localNode.value.url);
            const type = getProtocol(localNode.value.url);

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
