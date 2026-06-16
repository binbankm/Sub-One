import { ref } from 'vue';

import type { Profile, Subscription } from '@/common/types/index';
import { getProtocol } from '@/common/utils/protocols';
import { Base64 } from 'js-base64';

import { useDataStore } from '@/stores/useAppStore';
import { useNotificationStore as useToastStore } from '@/stores/useNotificationStore';
import i18n from '@/i18n';

export interface DisplayNode {
    id: string;
    name: string;
    url: string;
    protocol: string;
    server?: string;
    port?: number | string;
    enabled?: boolean;
    type?: 'manual' | 'subscription';
    subscriptionName?: string;
}

export function useNodeFetching(props: {
    subscription?:
        | Subscription
        | { name: string; url: string; exclude?: string; nodeCount?: number }
        | null;
    profile?: Profile | null;
}) {
    const nodes = ref<DisplayNode[]>([]);
    const isLoading = ref(false);
    const errorMessage = ref('');

    const toastStore = useToastStore();
    const dataStore = useDataStore();

    // 获取单个订阅的节点信息
    const fetchNodes = async () => {
        if (!props.subscription?.url) return;

        isLoading.value = true;
        errorMessage.value = '';

        try {
            const response = await fetch('/api/node_count', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: props.subscription.url,
                    returnNodes: true,
                    exclude: props.subscription?.exclude || ''
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = (await response.json()) as any;

            if (data.nodes && data.nodes.length > 0) {
                nodes.value = data.nodes.map((n: any) => ({
                    id: n.id,
                    name: n.name,
                    url: n.url || '',
                    protocol: (n.type || n.protocol || getProtocol(n.url || '')).toLowerCase(),
                    server: n.server || '',
                    port: n.port || '',
                    enabled: true
                }));
            } else {
                nodes.value = [];
            }
        } catch (error: unknown) {
            console.error('Failed to fetch node info:', error);
            const msg = error instanceof Error ? error.message : String(error);
            errorMessage.value = `${i18n.global.t('entities.node.fetching.fetchFailedPrefix')}${msg}`;
            toastStore.showToast(i18n.global.t('entities.node.fetching.fetchFailed'), 'error');
        } finally {
            isLoading.value = false;
        }
    };

    // 获取订阅组的所有节点信息
    const fetchProfileNodes = async () => {
        if (!props.profile) return;

        isLoading.value = true;
        errorMessage.value = '';

        try {
            const profileNodes: DisplayNode[] = [];

            // 1. 添加手动节点
            if (dataStore.manualNodes) {
                const selectedManualNodes = (dataStore.manualNodes || []).filter(
                    (node: any) => props.profile?.manualNodes?.includes(node.id) ?? false
                ) as any[];

                for (const node of selectedManualNodes) {
                    profileNodes.push({
                        id: node.id,
                        name: node.name || i18n.global.t('entities.node.fetching.unnamedNode'),
                        url: node.url || '',
                        protocol: (
                            node.type ||
                            node.protocol ||
                            getProtocol(node.url || '')
                        ).toLowerCase(),
                        server: node.server || '',
                        port: node.port || '',
                        enabled: node.enabled,
                        type: 'manual'
                    });
                }
            }

            // 2. 添加订阅节点
            if (dataStore.subscriptions) {
                const selectedSubscriptions = dataStore.subscriptions.filter(
                    (sub: any) =>
                        (props.profile?.subscriptions?.includes(sub.id) ?? false) && sub.enabled
                );

                const promises = selectedSubscriptions.map(async (subscription: any) => {
                    if (subscription.url && subscription.url.startsWith('http')) {
                        try {
                            const response = await fetch('/api/node_count', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    url: subscription.url,
                                    returnNodes: true,
                                    exclude: subscription.exclude || ''
                                })
                            });

                            if (response.ok) {
                                const data = (await response.json()) as any;
                                if (data.nodes && data.nodes.length > 0) {
                                    return data.nodes.map((node: any) => ({
                                        id: node.id,
                                        name: node.name,
                                        url: node.url || '',
                                        protocol: (
                                            node.type ||
                                            node.protocol ||
                                            getProtocol(node.url || '')
                                        ).toLowerCase(),
                                        server: node.server || '',
                                        port: node.port || '',
                                        enabled: true,
                                        type: 'subscription' as const,
                                        subscriptionName: subscription.name || ''
                                    }));
                                }
                            }
                        } catch (error) {
                            console.error(`Failed to fetch nodes for subscription ${subscription.name}:`, error);
                        }
                    }
                    return [];
                });

                const results = await Promise.all(promises);
                results.forEach((subNodes: DisplayNode[]) => profileNodes.push(...subNodes));
            }

            nodes.value = profileNodes;
        } catch (error: unknown) {
            console.error('Failed to fetch profile node info:', error);
            const msg = error instanceof Error ? error.message : String(error);
            errorMessage.value = `${i18n.global.t('entities.node.fetching.fetchGroupFailedPrefix')}${msg}`;
            toastStore.showToast(i18n.global.t('entities.node.fetching.fetchFailed'), 'error');
        } finally {
            isLoading.value = false;
        }
    };

    const loadData = async () => {
        if (props.profile) {
            await fetchProfileNodes();
        } else if (props.subscription) {
            await fetchNodes();
        } else {
            nodes.value = [];
        }
    };

    const refreshNodes = async () => {
        await loadData();
        toastStore.showToast(i18n.global.t('entities.node.fetching.refreshed'), 'success');
    };

    const extractHost = (url?: string) => {
        if (!url) return '';
        try {
            if (url.startsWith('vmess://')) {
                const base64 = url.replace('vmess://', '');
                try {
                    const decoded = Base64.decode(base64);
                    const config = JSON.parse(decoded);
                    if (config.add && config.port) return `${config.add}:${config.port}`;
                    return config.add || i18n.global.t('entities.node.fetching.unknownAddress');
                } catch (e) {
                    return i18n.global.t('entities.node.fetching.vmessError');
                }
            }
            if (url.startsWith('ss://') && !url.includes('@')) {
                const base64 = url.replace('ss://', '').split('#')[0];
                try {
                    const decoded = Base64.decode(base64);
                    const parts = decoded.split('@');
                    if (parts.length > 1) return parts[1];
                } catch (e) {
                    // ignore
                }
            }
            const urlObj = new URL(url);
            if (!urlObj.hostname) return '';
            return urlObj.port ? `${urlObj.hostname}:${urlObj.port}` : urlObj.hostname;
        } catch (e) {
            return i18n.global.t('entities.node.fetching.urlError');
        }
    };

    return {
        nodes,
        isLoading,
        errorMessage,
        loadData,
        refreshNodes,
        extractHost
    };
}
