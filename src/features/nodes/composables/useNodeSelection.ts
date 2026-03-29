import { ref, Ref } from 'vue';
import { copyToClipboard } from '../../../utils/helpers';
import { useToastStore } from '../../../stores/toast';
import type { DisplayNode } from './useNodeFetching';

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
            filteredNodes.value.forEach((node) => selectedNodes.value.add(node.id));
        }
    };

    const copySelectedNodes = async () => {
        const selectedNodeUrls = filteredNodes.value
            .filter((node) => selectedNodes.value.has(node.id))
            .map((node) => node.url);

        if (selectedNodeUrls.length === 0) {
            toastStore.showToast('⚠️ 请先选择要复制的节点', 'warning');
            return;
        }

        const success = await copyToClipboard(selectedNodeUrls.join('\n'));
        if (success) {
            toastStore.showToast(`📋 已复制 ${selectedNodeUrls.length} 个节点到剪贴板`, 'success');
        } else {
            toastStore.showToast('❌ 复制失败', 'error');
        }
    };

    const handleCopySingle = async (url: string) => {
        const success = await copyToClipboard(url);
        if (success) {
            toastStore.showToast('📋 已复制节点链接', 'success');
        } else {
            toastStore.showToast('❌ 复制失败', 'error');
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
