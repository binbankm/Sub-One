import { computed, ref } from 'vue';

import type { Node } from '@/common/types/index';
import i18n from '@/i18n';

export function useNodes(saveData: (reason: string, showToast?: boolean) => Promise<boolean>) {
    const manualNodes = ref<Node[]>([]);

    const activeManualNodes = computed(() => manualNodes.value.filter((n: Node) => n.enabled));

    async function addNode(node: Node) {
        manualNodes.value.unshift(node);
        await saveData(i18n.global.t('entities.node.actions.add'));
    }

    async function updateNode(node: Node) {
        const idx = manualNodes.value.findIndex((n: Node) => n.id === node.id);
        if (idx !== -1) {
            manualNodes.value[idx] = { ...node };
            await saveData(i18n.global.t('entities.node.actions.update'));
        }
    }

    async function deleteNode(
        id: string,
        removeIdFromProfiles: (id: string, type: 'subscriptions' | 'manualNodes') => void
    ) {
        manualNodes.value = manualNodes.value.filter((n: Node) => n.id !== id);
        removeIdFromProfiles(id, 'manualNodes');
        await saveData(i18n.global.t('entities.node.actions.delete'));
    }

    async function deleteAllNodes(
        clearProfilesField: (type: 'subscriptions' | 'manualNodes') => void
    ) {
        manualNodes.value = [];
        clearProfilesField('manualNodes');
        await saveData(i18n.global.t('entities.node.actions.clear'));
    }

    async function batchDeleteNodes(
        ids: string[],
        removeIdFromProfiles: (id: string, type: 'subscriptions' | 'manualNodes') => void
    ) {
        const idSet = new Set(ids);
        manualNodes.value = manualNodes.value.filter((n: Node) => !idSet.has(n.id + ''));
        ids.forEach((id: string) => removeIdFromProfiles(id, 'manualNodes'));
        await saveData(i18n.global.t('entities.node.actions.batchDelete'));
    }

    async function addNodesFromBulk(nodes: Node[]) {
        if (nodes.length > 0) {
            manualNodes.value.unshift(...nodes);
            await saveData(i18n.global.t('entities.node.actions.batchImport'));
        }
    }

    async function deduplicateNodes() {
        const unique = new Map<string, Node>();
        manualNodes.value.forEach((node: Node) => {
            const key = node.url || `${node.server}|${node.port}|${node.type}`;
            if (!unique.has(key)) {
                unique.set(key, node);
            }
        });

        if (manualNodes.value.length !== unique.size) {
            manualNodes.value = Array.from(unique.values());
            await saveData(i18n.global.t('entities.node.actions.deduplicate'));
        }
    }

    async function autoSortNodes() {
        manualNodes.value.sort((a: Node, b: Node) =>
            (a.name || '').localeCompare(b.name || '', 'zh-CN')
        );
        await saveData(i18n.global.t('entities.node.actions.autoSort'));
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
