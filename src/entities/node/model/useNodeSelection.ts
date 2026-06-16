import { Ref, ref } from 'vue';

import { copyToClipboard } from '@/common/utils/utils';

import { useNotificationStore as useToastStore } from '@/stores/useNotificationStore';

import type { DisplayNode } from '@/entities/node/model/useNodeFetching';
import i18n from '@/i18n';

export function useNodeSelection(filteredNodes: Ref<DisplayNode[]>) {
    const selectedNodes = ref(new Set<string>());
    const toastStore = useToastStore();

    const toggleNodeSelection = (nodeId: string) => {
        if (selectedNodes.value.has(nodeId)) {
            selectedNodes.value.delete(nodeId);
        } else {
            selectedNodes.value.add(nodeId);
        }
    };

    const toggleSelectAll = () => {
        if (selectedNodes.value.size === filteredNodes.value.length) {
            selectedNodes.value.clear();
        } else {
            filteredNodes.value.forEach((node: DisplayNode) => selectedNodes.value.add(node.id));
        }
    };

    const copySelectedNodes = async () => {
        const selectedNodeUrls = filteredNodes.value
            .filter((node: DisplayNode) => selectedNodes.value.has(node.id))
            .map((node: DisplayNode) => node.url);

        if (selectedNodeUrls.length === 0) {
            toastStore.showToast(i18n.global.t('entities.node.selection.selectFirst'), 'warning');
            return;
        }

        const success = await copyToClipboard(selectedNodeUrls.join('\n'));
        if (success) {
            toastStore.showToast(i18n.global.t('entities.node.selection.copyMultiple').replace('{count}', String(selectedNodeUrls.length)), 'success');
        } else {
            toastStore.showToast(i18n.global.t('entities.node.selection.copyFailed'), 'error');
        }
    };

    const handleCopySingle = async (url: string) => {
        const success = await copyToClipboard(url);
        if (success) {
            toastStore.showToast(i18n.global.t('entities.node.selection.copySingle'), 'success');
        } else {
            toastStore.showToast(i18n.global.t('entities.node.selection.copyFailed'), 'error');
        }
    };

    const clearSelection = () => {
        selectedNodes.value.clear();
    };

    return {
        selectedNodes,
        toggleNodeSelection,
        toggleSelectAll,
        copySelectedNodes,
        handleCopySingle,
        clearSelection
    };
}
