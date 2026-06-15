import { computed, ref } from 'vue';

import type { Node } from '@/common/types/index';
import { createNode, parseImportText } from '@/common/utils/importer';

import { useDataStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useNotificationStore';

export function useNodeManagement() {
    const dataStore = useDataStore();
    const toastStore = useToastStore();
    const manualNodes = computed(() => dataStore.manualNodes);

    // States
    const searchTerm = ref('');
    const isSortingNodes = ref(false);
    const hasUnsavedSortChanges = ref(false);

    // Modal States
    const isNewNode = ref(false);
    const editingNode = ref<Node | null>(null);
    const showNodeModal = ref(false);
    const showBulkImportModal = ref(false);
    const showSubscriptionImportModal = ref(false);
    const showDeleteNodesModal = ref(false);
    const showDeleteSingleNodeModal = ref(false);
    const deletingItemId = ref<string | null>(null);

    const filteredNodes = computed(() => {
        if (!searchTerm.value) return manualNodes.value || [];
        const term = searchTerm.value.toLowerCase();
        return (manualNodes.value || []).filter(
            (node: Node) =>
                (node.name && node.name.toLowerCase().includes(term)) ||
                (node.server && node.server.toLowerCase().includes(term)) ||
                (node.type && node.type.toLowerCase().includes(term))
        );
    });

    const handleAddNode = () => {
        isNewNode.value = true;
        editingNode.value = createNode('');
        showNodeModal.value = true;
    };

    const handleEditNode = (nodeId: string) => {
        const node = (manualNodes.value || []).find((n: Node) => n.id === nodeId);
        if (node) {
            isNewNode.value = false;
            editingNode.value = { ...node };
            showNodeModal.value = true;
        }
    };

    const handleSaveNode = async (updatedNode: Node | undefined, onSuccess: () => void) => {
        const nodeToSave = updatedNode || editingNode.value;
        if (!nodeToSave?.url) {
            toastStore.showToast('⚠️ 节点链接不能为空', 'error');
            return;
        }

        if (isNewNode.value) {
            await dataStore.addNode(nodeToSave);
            onSuccess();
        } else {
            await dataStore.updateNode(nodeToSave);
        }

        showNodeModal.value = false;
    };

    const handleDeleteNode = (nodeId: string) => {
        deletingItemId.value = nodeId;
        showDeleteSingleNodeModal.value = true;
    };

    const handleConfirmDeleteSingleNode = async () => {
        if (!deletingItemId.value) return;
        await dataStore.deleteNode(deletingItemId.value);
        showDeleteSingleNodeModal.value = false;
    };

    const handleDeleteAllNodes = async () => {
        await dataStore.deleteAllNodes();
        showDeleteNodesModal.value = false;
    };

    const handleBatchDelete = async (ids: string[], clearSelection: () => void) => {
        if (!ids || ids.length === 0) return;
        await dataStore.batchDeleteNodes(ids);
        clearSelection();
    };

    const handleBulkImport = async (importText: string, onSuccess: () => void) => {
        const { subs, nodes } = parseImportText(importText);
        if (subs.length > 0) await dataStore.addSubscriptionsFromBulk(subs);
        if (nodes.length > 0) {
            await dataStore.addNodesFromBulk(nodes);
            onSuccess();
        }

        toastStore.showToast(
            `成功导入 ${subs.length} 条订阅和 ${nodes.length} 个手动节点`,
            'success'
        );
        showBulkImportModal.value = false;
    };

    const handleDeduplicate = async () => {
        await dataStore.deduplicateNodes();
    };

    const handleAutoSort = async () => {
        await dataStore.autoSortNodes();
    };

    const handleToggleSort = () => {
        isSortingNodes.value = !isSortingNodes.value;
        if (!isSortingNodes.value) hasUnsavedSortChanges.value = false;
    };

    const handleSaveSort = async () => {
        await dataStore.saveData('节点排序');
        hasUnsavedSortChanges.value = false;
        isSortingNodes.value = false;
    };

    const handleDragEnd = () => {
        hasUnsavedSortChanges.value = true;
    };

    return {
        // States
        searchTerm,
        isSortingNodes,
        hasUnsavedSortChanges,
        filteredNodes,

        // Modal States
        isNewNode,
        editingNode,
        showNodeModal,
        showBulkImportModal,
        showSubscriptionImportModal,
        showDeleteNodesModal,
        showDeleteSingleNodeModal,

        // Handlers
        handleAddNode,
        handleEditNode,
        handleSaveNode,
        handleDeleteNode,
        handleConfirmDeleteSingleNode,
        handleDeleteAllNodes,
        handleBatchDelete,
        handleBulkImport,
        handleDeduplicate,
        handleAutoSort,
        handleToggleSort,
        handleSaveSort,
        handleDragEnd
    };
}
