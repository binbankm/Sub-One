import { ref, computed } from 'vue';
import type { Node } from '../../types/index';

export function useNodes(saveData: (reason: string, showToast?: boolean) => Promise<boolean>) {
    const manualNodes = ref<Node[]>([]);

    const activeManualNodes = computed(() => manualNodes.value.filter((n) => n.enabled));

    async function addNode(node: Node) {
        manualNodes.value.unshift(node);
        await saveData('新增节点');
    }

    async function updateNode(node: Node) {
        const idx = manualNodes.value.findIndex((n) => n.id === node.id);
        if (idx !== -1) {
            manualNodes.value[idx] = { ...node };
            await saveData('更新节点');
        }
    }

    async function deleteNode(id: string, removeIdFromProfiles: (id: string, type: 'subscriptions' | 'manualNodes') => void) {
        manualNodes.value = manualNodes.value.filter((n) => n.id !== id);
        removeIdFromProfiles(id, 'manualNodes');
        await saveData('删除节点');
    }

    async function deleteAllNodes(clearProfilesField: (type: 'subscriptions' | 'manualNodes') => void) {
        manualNodes.value = [];
        clearProfilesField('manualNodes');
        await saveData('清空节点');
    }

    async function batchDeleteNodes(ids: string[], removeIdFromProfiles: (id: string, type: 'subscriptions' | 'manualNodes') => void) {
        const idSet = new Set(ids);
        manualNodes.value = manualNodes.value.filter((n) => !idSet.has(n.id + ''));
        ids.forEach((id) => removeIdFromProfiles(id, 'manualNodes'));
        await saveData('批量删除节点');
    }

    async function addNodesFromBulk(nodes: Node[]) {
        if (nodes.length > 0) {
            manualNodes.value.unshift(...nodes);
            await saveData('批量导入节点');
        }
    }

    async function deduplicateNodes() {
        const unique = new Map();
        manualNodes.value.forEach((node) => {
            const key = node.url || `${node.server}|${node.port}|${node.type}`;
            if (!unique.has(key)) {
                unique.set(key, node);
            }
        });

        if (manualNodes.value.length !== unique.size) {
            manualNodes.value = Array.from(unique.values());
            await saveData('节点去重');
        }
    }

    async function autoSortNodes() {
        manualNodes.value.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'));
        await saveData('自动排序');
    }

    return {
        manualNodes,
        activeManualNodes,
        addNode,
        updateNode,
        deleteNode,
        deleteAllNodes,
        batchDeleteNodes,
        addNodesFromBulk,
        deduplicateNodes,
        autoSortNodes
    };
}
