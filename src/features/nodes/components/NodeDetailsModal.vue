<!--
  ==================== 节点详情模态框 ====================
  
  功能说明：
  - 查看订阅或订阅组的所有节点信息
  - 支持搜索和筛选节点（含国家/地区别名智能匹配）
  - 支持批量选择和复制节点
  - 显示节点协议、名称、URL等详细信息
  - 区分订阅组中的订阅节点和手动节点
  
  使用场景：
  - 查看单个订阅的节点列表
  - 查看订阅组聚合后的所有节点
  - 复制选中的节点链接
  
  ==================================================
-->

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { storeToRefs } from 'pinia';

import { Base64 } from 'js-base64';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useDataStore } from '../../../stores/data';
import { useToastStore } from '../../../stores/toast';
import type { Profile, Subscription } from '../../../types/index';
import { getProtocol, getProtocolInfo } from '../../../utils/protocols';
import { filterNodes } from '../../../utils/search';
import { copyToClipboard } from '../../../utils/utils';

const props = defineProps<{
    show: boolean;
    subscription?:
        | Subscription
        | { name: string; url: string; exclude?: string; nodeCount?: number }
        | null;
    profile?: Profile | null;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
}>();

interface DisplayNode {
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

const nodes = ref<DisplayNode[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const searchTerm = ref('');
const selectedNodes = ref(new Set<string>());

const toastStore = useToastStore();
const dataStore = useDataStore();
const { subscriptions: allSubscriptions, manualNodes: allManualNodes } = storeToRefs(dataStore);

// 监听模态框显示状态
watch(
    () => props.show,
    async (newVal) => {
        if (newVal) {
            if (props.profile) {
                await fetchProfileNodes();
            } else if (props.subscription) {
                await fetchNodes();
            }
        } else {
            nodes.value = [];
            searchTerm.value = '';
            selectedNodes.value.clear();
            errorMessage.value = '';
        }
    }
);

// 过滤后的节点列表（支持国家/地区别名智能搜索）
const filteredNodes = computed(() => {
    return filterNodes(nodes.value, searchTerm.value);
});

// 协议分布统计
const protocolStats = computed(() => {
    const stats: Record<string, number> = {};
    nodes.value.forEach((node) => {
        const p = node.protocol || 'unknown';
        stats[p] = (stats[p] || 0) + 1;
    });
    return Object.entries(stats)
        .map(([protocol, count]) => ({
            protocol,
            count,
            info: getProtocolInfo(protocol)
        }))
        .sort((a, b) => b.count - a.count);
});

// 获取单个订阅的节点信息
const fetchNodes = async () => {
    if (!props.subscription?.url) return;

    isLoading.value = true;
    errorMessage.value = '';

    try {
        // 使用 /api/node_count API 获取节点列表（后端已解析）
        const response = await fetch('/api/node_count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: props.subscription.url,
                returnNodes: true, // 请求返回节点列表
                exclude: props.subscription?.exclude || '' // 应用过滤规则
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as any;

        // 后端已解析并过滤，直接使用返回的节点
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
        console.error('获取节点信息失败:', error);
        const msg = error instanceof Error ? error.message : String(error);
        errorMessage.value = `获取节点信息失败: ${msg}`;
        toastStore.showToast('❌ 获取节点信息失败', 'error');
    } finally {
        isLoading.value = false;
    }
};

// 获取订阅组的所有节点信息 (聚合逻辑)
const fetchProfileNodes = async () => {
    if (!props.profile) return;

    isLoading.value = true;
    errorMessage.value = '';

    try {
        const profileNodes: DisplayNode[] = [];

        // 1. 添加手动节点
        if (allManualNodes.value) {
            const selectedManualNodes = (allManualNodes.value || []).filter(
                (node) => props.profile?.manualNodes?.includes(node.id) ?? false
            ) as any[];

            for (const node of selectedManualNodes) {
                profileNodes.push({
                    id: node.id,
                    name: node.name || '未命名节点',
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
        if (allSubscriptions.value) {
            const selectedSubscriptions = allSubscriptions.value.filter(
                (sub) => (props.profile?.subscriptions?.includes(sub.id) ?? false) && sub.enabled
            );

            // 并行获取所有订阅内容，提升速度
            const promises = selectedSubscriptions.map(async (subscription) => {
                if (subscription.url && subscription.url.startsWith('http')) {
                    try {
                        // 使用 /api/node_count API 获取节点列表
                        const response = await fetch('/api/node_count', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                url: subscription.url,
                                returnNodes: true, // 请求返回节点列表
                                exclude: subscription.exclude || '' // 应用过滤规则
                            })
                        });

                        if (response.ok) {
                            const data = (await response.json()) as any;
                            // 后端已解析并过滤，直接使用返回的节点
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
                        console.error(`获取订阅 ${subscription.name} 节点失败:`, error);
                    }
                }
                return [];
            });

            const results = await Promise.all(promises);
            results.forEach((subNodes: DisplayNode[]) => profileNodes.push(...subNodes));
        }

        nodes.value = profileNodes;
    } catch (error: unknown) {
        console.error('获取订阅组节点信息失败:', error);
        const msg = error instanceof Error ? error.message : String(error);
        errorMessage.value = `获取节点信息失败: ${msg}`;
        toastStore.showToast('❌ 获取节点信息失败', 'error');
    } finally {
        isLoading.value = false;
    }
};

// 选择/取消选择节点
const toggleNodeSelection = (nodeId: string) => {
    if (selectedNodes.value.has(nodeId)) {
        selectedNodes.value.delete(nodeId);
    } else {
        selectedNodes.value.add(nodeId);
    }
};

// 全选/取消全选
const toggleSelectAll = () => {
    if (selectedNodes.value.size === filteredNodes.value.length) {
        selectedNodes.value.clear();
    } else {
        filteredNodes.value.forEach((node) => selectedNodes.value.add(node.id));
    }
};

// 复制选中的节点
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

// 复制单个节点到剪贴板
const handleCopySingle = async (url: string) => {
    const success = await copyToClipboard(url);
    if (success) {
        toastStore.showToast('📋 已复制节点链接', 'success');
    } else {
        toastStore.showToast('❌ 复制失败', 'error');
    }
};

// 刷新节点信息
const refreshNodes = async () => {
    await fetchNodes();
    toastStore.showToast('🔄 节点信息已刷新', 'success');
};

// 键盘事件处理 - ESC 键关闭
const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.show) {
        emit('update:show', false);
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
});
// 修改后的提取主机名 helper
const extractHost = (url: string) => {
    if (!url) return { host: '', port: '' };

    try {
        // 1. 特殊处理 VMess 协议
        if (url.startsWith('vmess://')) {
            const base64 = url.replace('vmess://', '');
            try {
                const decoded = Base64.decode(base64);
                const config = JSON.parse(decoded);
                return {
                    host: config.add || '未知地址',
                    port: config.port ? String(config.port) : ''
                };
            } catch (e) {
                return { host: 'VMess 格式错误', port: '' };
            }
        }

        // 2. 特殊处理 SS (Legacy 格式)
        if (url.startsWith('ss://') && !url.includes('@')) {
            const base64 = url.replace('ss://', '').split('#')[0];
            try {
                const decoded = Base64.decode(base64);
                const parts = decoded.split('@');
                if (parts.length > 1) {
                    const addrParts = parts[1].split(':');
                    return { host: addrParts[0], port: addrParts[1] || '' };
                }
            } catch (e) {
                // Keep trying or fail silently for legacy format
            }
        }

        // 3. 处理标准协议
        const urlObj = new URL(url);
        return {
            host: urlObj.hostname,
            port: urlObj.port || ''
        };
    } catch (e) {
        // 兜底逻辑：尝试手动切割
        const parts = url.split('://')[1]?.split('#')[0].split('@').pop()?.split(':');
        if (parts) {
            return { host: parts[0] || '', port: parts[1] || '' };
        }
        return { host: '解析错误', port: '' };
    }
};
</script>

<template>
    <Teleport to="body">
        <Transition name="fade">
            <div
                v-if="show"
                class="fixed inset-0 z-99 flex items-center justify-center bg-black/60 p-4"
                @click="emit('update:show', false)"
            >
                <Transition name="scale-fade-bounce">
                    <div
                        v-if="show"
                        class="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-3xl border border-gray-300 bg-white text-left shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                        @click.stop
                    >
                        <!-- 标题 -->
                        <div class="shrink-0 p-6 pb-4">
                            <h3 class="gradient-text text-xl font-bold">节点详情</h3>
                        </div>

                        <!-- 内容 -->
                        <div class="grow overflow-y-auto px-6 pb-6">
                            <div class="space-y-4">
                                <!-- 订阅/订阅组信息头部 -->
                                <div
                                    v-if="subscription || profile"
                                    class="rounded-2xl border border-gray-300 bg-gray-50/60 p-5 dark:border-gray-700 dark:bg-gray-800/75"
                                >
                                    <div
                                        class="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"
                                    >
                                        <div class="min-w-0 flex-1">
                                            <div class="flex items-center gap-2">
                                                <h3
                                                    class="truncate text-lg font-bold text-gray-900 dark:text-gray-100"
                                                >
                                                    {{
                                                        subscription
                                                            ? subscription.name || '未命名订阅'
                                                            : profile?.name || '未命名订阅组'
                                                    }}
                                                </h3>
                                                <span
                                                    class="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                                                >
                                                    {{ nodes.length }} 节点
                                                </span>
                                            </div>
                                            <p
                                                class="mt-1.5 break-all text-xs text-gray-500 dark:text-gray-400"
                                            >
                                                <span v-if="subscription" class="font-mono">{{
                                                    subscription.url
                                                }}</span>
                                                <span v-else-if="profile" class="flex items-center gap-2">
                                                    <span class="inline-flex items-center gap-1">
                                                        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                        {{ profile.subscriptions?.length ?? 0 }} 订阅
                                                    </span>
                                                    <span class="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                                    <span class="inline-flex items-center gap-1">
                                                        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                                                        {{ profile.manualNodes?.length ?? 0 }} 手动节点
                                                    </span>
                                                </span>
                                            </p>
                                        </div>
                                        <div class="flex flex-wrap gap-1.5 sm:justify-end">
                                            <div
                                                v-for="stat in protocolStats"
                                                :key="stat.protocol"
                                                class="flex items-center gap-1 rounded-full border border-gray-200 bg-white/50 px-2 py-0.5 text-[10px] font-medium dark:border-gray-600 dark:bg-gray-700/50"
                                            >
                                                <span :class="stat.info.color">{{ stat.info.icon }}</span>
                                                <span class="text-gray-700 dark:text-gray-300">{{ stat.info.text }}</span>
                                                <span class="font-bold text-gray-400">{{ stat.count }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 搜索和操作栏 -->
                                <div class="flex items-center justify-between gap-4">
                                    <div class="relative flex-1">
                                        <Input
                                            v-model="searchTerm"
                                            type="text"
                                            placeholder="搜索节点名称或链接..."
                                            class="pl-10"
                                        />
                                        <svg
                                            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                            />
                                        </svg>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <Button
                                            :disabled="isLoading"
                                            size="sm"
                                            @click="refreshNodes"
                                        >
                                            <svg
                                                v-if="isLoading"
                                                class="h-4 w-4 animate-spin"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    class="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    stroke-width="4"
                                                    fill="none"
                                                ></circle>
                                                <path
                                                    class="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            <span v-else>刷新</span>
                                        </Button>

                                        <Button
                                            :disabled="selectedNodes.size === 0"
                                            variant="default"
                                            size="sm"
                                            class="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                            @click="copySelectedNodes"
                                        >
                                            复制选中
                                        </Button>
                                    </div>
                                </div>

                                <!-- 错误信息 -->
                                <div
                                    v-if="errorMessage"
                                    class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
                                >
                                    <p class="text-sm text-red-600 dark:text-red-400">
                                        {{ errorMessage }}
                                    </p>
                                </div>

                                <!-- 加载状态 -->
                                <div v-if="isLoading" class="flex items-center justify-center py-8">
                                    <div
                                        class="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"
                                    ></div>
                                    <span class="ml-2 text-gray-600 dark:text-gray-400"
                                        >正在获取节点信息...</span
                                    >
                                </div>

                                <!-- 节点内容区域 -->
                                <div v-else-if="filteredNodes.length > 0" class="space-y-4">
                                    <div
                                        class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50/60 p-3 dark:bg-gray-800/75 border border-gray-200/50 dark:border-gray-700/50"
                                    >
                                        <label class="flex cursor-pointer items-center group">
                                            <div class="relative flex h-5 w-5 items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    :checked="
                                                        selectedNodes.size === filteredNodes.length &&
                                                        filteredNodes.length > 0
                                                    "
                                                    :indeterminate="
                                                        selectedNodes.size > 0 &&
                                                        selectedNodes.size < filteredNodes.length
                                                    "
                                                    class="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 transition-colors checked:border-indigo-500 checked:bg-indigo-500 dark:border-gray-600"
                                                    @change="toggleSelectAll"
                                                />
                                                <svg
                                                    class="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                                                    viewBox="0 0 14 14"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path
                                                        d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                            <span
                                                class="ml-3 text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                                            >
                                                全选 ({{ selectedNodes.size }}/{{
                                                    filteredNodes.length
                                                }})
                                            </span>
                                        </label>
                                        <div class="text-[11px] font-medium text-gray-400 uppercase tracking-tight">
                                            已选 {{ selectedNodes.size }} 个节点
                                        </div>
                                    </div>

                                    <!-- 节点卡片列表 - 采用响应式双列布局 -->
                                    <div
                                        class="custom-scrollbar max-h-[50vh] overflow-y-auto pr-1"
                                    >
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                                            <div
                                                v-for="node in filteredNodes"
                                                :key="node.id"
                                                class="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/40"
                                                :class="{
                                                    'border-indigo-500 ring-1 ring-indigo-500/20 dark:border-indigo-400':
                                                        selectedNodes.has(node.id),
                                                }"
                                                @click="toggleNodeSelection(node.id)"
                                            >
                                                <!-- 协议渐变装饰条 -->
                                                <div
                                                    class="h-1 bg-linear-to-r opacity-70"
                                                    :class="getProtocolInfo(node.protocol).gradient"
                                                ></div>

                                                <div class="flex flex-1 flex-col p-4">
                                                    <!-- 卡片头部：协议 + 选择 -->
                                                    <div class="mb-3 flex items-center justify-between">
                                                        <div class="flex items-center gap-2">
                                                            <!-- 协议胶囊 -->
                                                            <span
                                                                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs"
                                                                :class="[
                                                                    getProtocolInfo(node.protocol).bg,
                                                                    getProtocolInfo(node.protocol).color,
                                                                ]"
                                                            >
                                                                <span class="text-xs">{{ getProtocolInfo(node.protocol).icon }}</span>
                                                                {{ getProtocolInfo(node.protocol).text }}
                                                            </span>
                                                            
                                                            <!-- 来源标识 -->
                                                            <span v-if="profile && node.type === 'subscription'" class="text-[10px] text-gray-400 truncate max-w-[80px]">
                                                                @{{ node.subscriptionName }}
                                                            </span>
                                                        </div>

                                                        <!-- 单选框 -->
                                                        <div class="relative flex h-4.5 w-4.5 items-center justify-center" @click.stop>
                                                            <input
                                                                type="checkbox"
                                                                :checked="selectedNodes.has(node.id)"
                                                                class="peer h-4.5 w-4.5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 transition-colors checked:border-indigo-500 checked:bg-indigo-500 dark:border-gray-600"
                                                                @change="toggleNodeSelection(node.id)"
                                                            />
                                                            <svg class="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" viewBox="0 0 14 14" fill="none"><path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                                        </div>
                                                    </div>

                                                    <!-- 节点名称 -->
                                                    <div class="mb-3">
                                                        <h4 class="line-clamp-2 text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug">
                                                            {{ node.name }}
                                                        </h4>
                                                    </div>

                                                    <!-- 服务器信息 & 复制 -->
                                                    <div class="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700/50">
                                                        <div class="flex flex-col gap-0.5 overflow-hidden">
                                                            <div class="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                                                                <svg class="h-3 w-3 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                                <span class="truncate font-mono">{{ node.server && node.port ? node.server : extractHost(node.url).host }}</span>
                                                            </div>
                                                            <div v-if="node.port || extractHost(node.url).port" class="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                                                                <svg class="h-3 w-3 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                                                {{ node.port || extractHost(node.url).port }}
                                                            </div>
                                                        </div>

                                                        <button
                                                            class="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 dark:bg-gray-700 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-400"
                                                            title="复制链接"
                                                            @click.stop="handleCopySingle(node.url)"
                                                        >
                                                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 01-2-2V3" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 空状态 -->
                                <div v-else class="py-8 text-center">
                                    <div class="mb-2 text-gray-400 dark:text-gray-500">
                                        <svg
                                            class="mx-auto h-12 w-12"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                            />
                                        </svg>
                                    </div>
                                    <p class="text-gray-500 dark:text-gray-400">
                                        {{ searchTerm ? '没有找到匹配的节点' : '暂无节点信息' }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- 底部按钮 -->
                        <div
                            class="flex shrink-0 justify-end space-x-3 border-t border-gray-300 p-6 pt-4 dark:border-gray-700"
                        >
                            <button
                                class="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                @click="emit('update:show', false)"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>
