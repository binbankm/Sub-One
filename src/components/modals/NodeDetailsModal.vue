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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useToastStore } from '../../stores/toast';
import type { Subscription, Profile, Node } from '../../types';
import { filterNodes } from '../../utils/search';
import { getProtocolInfo, getProtocol } from '../../utils/protocols';

const props = defineProps<{
  show: boolean;
  subscription?: Subscription | { name: string; url: string; exclude?: string; nodeCount?: number } | null;
  profile?: Profile | null;
  allSubscriptions?: Subscription[];
  allManualNodes?: Node[];
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

interface DisplayNode {
  id: string;
  name: string;
  url: string;
  protocol: string;
  enabled?: boolean;
  type?: 'manual' | 'subscription';
  subscriptionName?: string;
  details?: Node;
}

const nodes = ref<DisplayNode[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const searchTerm = ref('');
const selectedNodes = ref(new Set<string>());
const expandedNodes = ref(new Set<string>()); // [New] Track expanded state


const toastStore = useToastStore();

// 切换节点展开/收起
const toggleNodeExpansion = (nodeId: string) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId);
  } else {
    expandedNodes.value.add(nodeId);
  }
};

// 监听模态框显示状态
watch(() => props.show, async (newVal) => {
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
});

// 过滤后的节点列表（支持国家/地区别名智能搜索）
const filteredNodes = computed(() => {
  return filterNodes(nodes.value, searchTerm.value);
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
        returnNodes: true,  // 请求返回节点列表
        exclude: props.subscription?.exclude || ''  // 应用过滤规则
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as any;
    
    // 后端已解析并过滤，直接使用返回的节点
    if (data.nodes && data.nodes.length > 0) {
      nodes.value = data.nodes.map((n: any) => ({
        id: n.id,
        name: n.name,
        url: n.url || '',
        protocol: getProtocol(n.url || ''),
        enabled: true,
        details: n
      }));
    } else {
      nodes.value = [];
    }

  } catch (error: unknown) {
    console.error('获取节点信息失败:', error);
    const msg = error instanceof Error ? error.message : String(error);
    errorMessage.value = `获取节点信息失败: ${msg}`;
    toastStore.showToast('获取节点信息失败', 'error');
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
    if (props.allManualNodes) {
      const selectedManualNodes = props.allManualNodes.filter(node =>
        props.profile?.manualNodes?.includes(node.id) ?? false
      );

      for (const node of selectedManualNodes) {
        profileNodes.push({
          id: node.id,
          name: node.name || '未命名节点',
          url: node.url || '',
          protocol: getProtocol(node.url || ''),
          enabled: node.enabled,
          type: 'manual',
          details: node
        });
      }
    }

    // 2. 添加订阅节点
    if (props.allSubscriptions) {
      const selectedSubscriptions = props.allSubscriptions.filter(sub =>
        (props.profile?.subscriptions?.includes(sub.id) ?? false) && sub.enabled
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
                returnNodes: true,  // 请求返回节点列表
                exclude: subscription.exclude || ''  // 应用过滤规则
              })
            });

            if (response.ok) {
              const data = await response.json() as any;
              // 后端已解析并过滤，直接使用返回的节点
              if (data.nodes && data.nodes.length > 0) {
                return data.nodes.map((node: any) => ({
                  id: node.id,
                  name: node.name,
                  url: node.url || '',
                  protocol: getProtocol(node.url || ''),
                  enabled: true,
                  type: 'subscription' as const,
                  subscriptionName: subscription.name || '',
                  details: node
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
    toastStore.showToast('获取节点信息失败', 'error');
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
    filteredNodes.value.forEach(node => selectedNodes.value.add(node.id));
  }
};

// 复制选中的节点
const copySelectedNodes = () => {
  const selectedNodeUrls = filteredNodes.value
    .filter(node => selectedNodes.value.has(node.id))
    .map(node => node.url);

  if (selectedNodeUrls.length === 0) {
    toastStore.showToast('请先选择要复制的节点', 'warning');
    return;
  }

  navigator.clipboard.writeText(selectedNodeUrls.join('\n')).then(() => {
    toastStore.showToast(`已复制 ${selectedNodeUrls.length} 个节点到剪贴板`, 'success');
  }).catch(() => {
    toastStore.showToast('复制失败', 'error');
  });
};

// 复制单个节点到剪贴板
const copyToClipboard = (url: string) => {
  navigator.clipboard.writeText(url).then(() => {
    toastStore.showToast('已复制节点链接', 'success');
  }).catch(() => {
    toastStore.showToast('复制失败', 'error');
  });
};

// 刷新节点信息
const refreshNodes = async () => {
  await fetchNodes();
  toastStore.showToast('节点信息已刷新', 'success');
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
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 bg-black/60 z-[99] flex items-center justify-center p-4"
        @click="emit('update:show', false)">
        <Transition name="scale-fade-bounce">
          <div v-if="show"
            class="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-4xl text-left flex flex-col max-h-[85vh]"
            @click.stop>
      <!-- 标题 -->
      <div class="p-6 pb-4 flex-shrink-0">
        <h3 class="text-xl font-bold gradient-text">节点详情</h3>
      </div>

      <!-- 内容 -->
      <div class="px-6 pb-6 flex-grow overflow-y-auto">
        <div class="space-y-4">
          <!-- 订阅/订阅组信息头部 -->
          <div v-if="subscription || profile"
            class="bg-gray-50/60 dark:bg-gray-800/75 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {{ subscription ? (subscription.name || '未命名订阅') : (profile?.name || '未命名订阅组') }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 break-all">
                  <span v-if="subscription">{{ subscription.url }}</span>
                  <span v-else-if="profile">包含 {{ profile.subscriptions?.length ?? 0 }} 个订阅，{{ profile.manualNodes?.length ?? 0 }}
                    个手动节点</span>
                </p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  共 {{ nodes.length }} 个节点
                </p>
                <p v-if="subscription && subscription.nodeCount" class="text-xs text-gray-500 dark:text-gray-400">
                  上次更新: {{ subscription.nodeCount }} 个
                </p>
              </div>
            </div>
          </div>

          <!-- 搜索和操作栏 -->
          <div class="flex items-center justify-between gap-4">
            <div class="flex-1 relative">
              <input v-model="searchTerm" type="text" placeholder="搜索节点名称或链接..." class="search-input-unified w-full" />
              <svg class="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div class="flex items-center gap-2">
              <button @click="refreshNodes" :disabled="isLoading"
                class="btn-modern px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <svg v-if="isLoading" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none">
                  </circle>
                  <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                  </path>
                </svg>
                <span v-else>刷新</span>
              </button>

              <button @click="copySelectedNodes" :disabled="selectedNodes.size === 0"
                class="px-4 py-2 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105">
                复制选中
              </button>
            </div>
          </div>

          <!-- 错误信息 -->
          <div v-if="errorMessage"
            class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p class="text-red-600 dark:text-red-400 text-sm">{{ errorMessage }}</p>
          </div>

          <!-- 加载状态 -->
          <div v-if="isLoading" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span class="ml-2 text-gray-600 dark:text-gray-400">正在获取节点信息...</span>
          </div>

          <!-- 节点列表 -->
          <div v-else-if="filteredNodes.length > 0" class="space-y-2">
            <!-- 全选按钮 -->
            <div class="flex items-center justify-between p-3 bg-gray-50/60 dark:bg-gray-800/75 rounded-lg">
              <label class="flex items-center cursor-pointer">
                <input type="checkbox"
                  :checked="selectedNodes.size === filteredNodes.length && filteredNodes.length > 0"
                  :indeterminate="selectedNodes.size > 0 && selectedNodes.size < filteredNodes.length"
                  @change="toggleSelectAll" class="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  全选 ({{ selectedNodes.size }}/{{ filteredNodes.length }})
                </span>
              </label>
            </div>

            <!-- 节点卡片列表 - 重新设计 -->
            <div class="max-h-96 overflow-y-auto space-y-3 p-1">
              <div v-for="node in filteredNodes" :key="node.id"
                class="group relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 overflow-hidden"
                :class="{ 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20': selectedNodes.has(node.id) }">
                
                <!-- 顶部彩色条 -->
                <div class="h-1 bg-gradient-to-r"
                  :class="getProtocolInfo(node.protocol).bg.includes('blue') ? 'from-blue-400 to-indigo-500' :
                          getProtocolInfo(node.protocol).bg.includes('purple') ? 'from-purple-400 to-pink-500' :
                          getProtocolInfo(node.protocol).bg.includes('green') ? 'from-green-400 to-emerald-500' :
                          getProtocolInfo(node.protocol).bg.includes('red') ? 'from-red-400 to-rose-500' :
                          'from-gray-400 to-gray-500'">
                </div>

                <!-- 卡片主体 (可点击展开) -->
                <div class="p-4 cursor-pointer" @click="toggleNodeExpansion(node.id)">
                  <!-- 头部：选择框 + 协议标签 + 来源标签 + 展开图标 -->
                  <div class="flex items-start gap-3 mb-2">
                    <!-- 选择框 (点击仅选中，不展开) -->
                    <input type="checkbox" 
                      :checked="selectedNodes.has(node.id)" 
                      @click.stop
                      @change="toggleNodeSelection(node.id)"
                      class="mt-1 h-5 w-5 rounded-md border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all" />

                    <!-- 标签组 -->
                    <div class="flex-1 flex flex-wrap items-center gap-2">
                      <!-- 协议标签 -->
                      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm"
                        :class="getProtocolInfo(node.protocol).bg + ' ' + getProtocolInfo(node.protocol).color">
                        <span class="text-base">{{ getProtocolInfo(node.protocol).icon }}</span>
                        <span>{{ node.protocol.toUpperCase() }}</span>
                      </span>

                      <!-- 来源标签（订阅组模式） -->
                      <template v-if="profile">
                        <span v-if="node.type === 'subscription'"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                          </svg>
                          <span>{{ node.subscriptionName }}</span>
                        </span>
                        <span v-else-if="node.type === 'manual'"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                          </svg>
                          <span>手动添加</span>
                        </span>
                      </template>
                    </div>

                    <!-- 展开收起图标 -->
                    <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors transform duration-200"
                      :class="expandedNodes.has(node.id) ? 'rotate-180' : ''">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  <!-- 节点名称 -->
                  <div class="mb-1 ml-8">
                    <h4 class="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {{ node.name }}
                    </h4>
                  </div>
                  
                  <!-- 简要信息 (收起时显示) -->
                  <div v-show="!expandedNodes.has(node.id)" class="ml-8 mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {{ (node.details as any).server }}:{{ (node.details as any).port }}
                  </div>

                  <!-- 展开后的详情详情展示区域 -->
                  <div v-show="expandedNodes.has(node.id)" class="space-y-3 mt-4 animate-fade-in-down">
                    <!-- 关键参数网格 -->
                    <div v-if="node.details" class="grid grid-cols-2 gap-2 text-sm">
                      <div class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">服务器</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200 break-all select-all">{{ node.details.server }}</span>
                      </div>
                      <div class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">端口</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200 select-all">{{ node.details.port }}</span>
                      </div>
                      <!-- 用户名/UUID -->
                      <div v-if="(node.details as any).uuid || (node.details as any).username" class="col-span-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">{{ (node.details as any).uuid ? 'UUID' : 'Username' }}</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200 break-all select-all">{{ (node.details as any).uuid || (node.details as any).username }}</span>
                      </div>
                      <!-- 密码 -->
                      <div v-if="(node.details as any).password" class="col-span-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">密码</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200 break-all select-all">{{ (node.details as any).password }}</span>
                      </div>
                      <!-- 加密方式/流控/网络 -->
                      <div v-if="(node.details as any).cipher" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">加密 / Cipher</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200">{{ (node.details as any).cipher }}</span>
                      </div>
                      
                      <!-- Transport Block Extended -->
                      <div v-if="(node.details.transport as any)?.type" class="col-span-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50 flex flex-col gap-2">
                        <div>
                            <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">传输协议</span>
                            <span class="font-mono font-medium text-gray-800 dark:text-gray-200 uppercase">{{ (node.details.transport as any).type }}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div v-if="(node.details.transport as any).path">
                                <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">路径 / Path</span>
                                <span class="font-mono text-xs font-medium text-gray-800 dark:text-gray-200 break-all">{{ (node.details.transport as any).path }}</span>
                            </div>
                            <div v-if="(node.details.transport as any).headers?.Host">
                                <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Host</span>
                                <span class="font-mono text-xs font-medium text-gray-800 dark:text-gray-200 break-all">{{ (node.details.transport as any).headers.Host }}</span>
                            </div>
                             <div v-if="(node.details.transport as any).serviceName">
                                <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">gRPC Service</span>
                                <span class="font-mono text-xs font-medium text-gray-800 dark:text-gray-200 break-all">{{ (node.details.transport as any).serviceName }}</span>
                            </div>
                        </div>
                      </div>

                      <!-- VLESS / VMess 特有 -->
                      <div v-if="(node.details as any).flow" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">流控 / Flow</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200">{{ (node.details as any).flow }}</span>
                      </div>
                      <div v-if="(node.details as any).alterId !== undefined" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">AlterId</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200">{{ (node.details as any).alterId }}</span>
                      </div>

                      <!-- Hysteria / Tuic 带宽与控制 -->
                      <div v-if="(node.details as any).upMbps || (node.details as any).downMbps" class="col-span-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50 flex gap-4">
                        <div v-if="(node.details as any).upMbps" class="flex-1">
                            <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">上行带宽 (Mbps)</span>
                            <span class="font-mono font-medium text-gray-800 dark:text-gray-200">{{ (node.details as any).upMbps }}</span>
                        </div>
                        <div v-if="(node.details as any).downMbps" class="flex-1">
                            <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">下行带宽 (Mbps)</span>
                            <span class="font-mono font-medium text-gray-800 dark:text-gray-200">{{ (node.details as any).downMbps }}</span>
                        </div>
                      </div>
                      <div v-if="(node.details as any).auth" class="col-span-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">认证载荷 / Auth Payload</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200 break-all select-all">{{ (node.details as any).auth }}</span>
                      </div>
                      <div v-if="(node.details as any).congestionControl" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">拥塞控制</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200">{{ (node.details as any).congestionControl }}</span>
                      </div>

                      <!-- SSR / Shadowsocks 插件与混淆 -->
                      <div v-if="(node.details as any).protocol" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">SSR 协议</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200">{{ (node.details as any).protocol }}</span>
                      </div>
                      <div v-if="(node.details as any).protocolParam" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">SSR 协议参数</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200 break-all">{{ (node.details as any).protocolParam }}</span>
                      </div>
                       <div v-if="(node.details as any).obfs && typeof (node.details as any).obfs === 'string'" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">混淆 / Obfs</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200">{{ (node.details as any).obfs }}</span>
                      </div>
                      <div v-if="(node.details as any).obfsParam" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">混淆参数</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200 break-all">{{ (node.details as any).obfsParam }}</span>
                      </div>
                      <div v-if="(node.details as any).plugin" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">插件 / Plugin</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200">{{ (node.details as any).plugin }}</span>
                      </div>

                      <!-- WireGuard 特有 -->
                      <template v-if="node.protocol === 'wireguard'">
                           <div v-if="(node.details as any).ip || (node.details as any).ipv6" class="col-span-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                                <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">本地 IP (Local Address)</span>
                                <span class="font-mono font-medium text-gray-800 dark:text-gray-200 break-all">
                                    {{ [(node.details as any).ip, (node.details as any).ipv6].filter(Boolean).join(', ') }}
                                </span>
                           </div>
                           <div v-if="(node.details as any).mtu" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                                <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">MTU</span>
                                <span class="font-mono font-medium text-gray-800 dark:text-gray-200">{{ (node.details as any).mtu }}</span>
                           </div>
                           <div v-if="(node.details as any).publicKey" class="col-span-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                                <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Peer Public Key</span>
                                <span class="font-mono font-medium text-gray-800 dark:text-gray-200 break-all select-all text-xs">{{ (node.details as any).publicKey }}</span>
                           </div>
                           <div v-if="(node.details as any).privateKey" class="col-span-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                                <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Private Key</span>
                                <span class="font-mono font-medium text-gray-800 dark:text-gray-200 break-all select-all text-xs filter blur-[2px] hover:blur-0 transition-all cursor-pointer" title="Hover to reveal">{{ (node.details as any).privateKey }}</span>
                           </div>
                           <div v-if="(node.details as any).preSharedKey" class="col-span-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                                <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Pre-Shared Key</span>
                                <span class="font-mono font-medium text-gray-800 dark:text-gray-200 break-all select-all text-xs filter blur-[2px] hover:blur-0 transition-all cursor-pointer">{{ (node.details as any).preSharedKey }}</span>
                           </div>
                      </template>
                      
                      <!-- Snell 特有 -->
                      <div v-if="(node.details as any).version" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">版本 / Version</span>
                        <span class="font-mono font-medium text-gray-800 dark:text-gray-200">{{ (node.details as any).version }}</span>
                      </div>
                      
                      <!-- TLS / Reality安全配置 & SNI -->
                      <template v-if="(node.details.tls as any)?.enabled">
                         <!-- TLS开启状态 & SNI -->
                         <div class="col-span-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-gray-100 dark:border-gray-700/50 flex flex-wrap gap-x-4 gap-y-1">
                            <div>
                                <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">TLS</span>
                                <span class="font-mono font-medium text-green-600 dark:text-green-400">Enabled</span>
                            </div>
                            <div v-if="(node.details.tls as any).serverName" class="flex-1 min-w-[50%]">
                                <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">SNI / ServerName</span>
                                <span class="font-mono font-medium text-gray-800 dark:text-gray-200 break-all">{{ (node.details.tls as any).serverName }}</span>
                            </div>
                            <div v-if="(node.details.tls as any).alpn" class="w-full mt-1">
                                <span class="text-xs text-gray-500 dark:text-gray-400 inline-block mr-1">ALPN:</span>
                                <span class="font-mono text-xs text-gray-600 dark:text-gray-300">{{ (node.details.tls as any).alpn.join(', ') }}</span>
                            </div>
                         </div>

                         <!-- Reality 专属字段 -->
                         <div v-if="(node.details.tls as any).reality?.enabled" class="col-span-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 border border-blue-50 dark:border-blue-900/30">
                            <div class="mb-2 flex items-center gap-2">
                                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">REALITY</span>
                                <span v-if="(node.details.tls as any).fingerprint" class="text-xs text-gray-500 dark:text-gray-400">Fingerprint: {{ (node.details.tls as any).fingerprint }}</span>
                            </div>
                            <div class="grid grid-cols-1 gap-2">
                                <div>
                                    <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Public Key (pbk)</span>
                                    <span class="font-mono text-xs font-medium text-gray-800 dark:text-gray-200 break-all select-all block bg-white dark:bg-gray-800 p-1 rounded border border-gray-100 dark:border-gray-600/50">
                                        {{ (node.details.tls as any).reality.publicKey }}
                                    </span>
                                </div>
                                <div class="flex gap-4">
                                    <div class="flex-1">
                                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Short ID (sid)</span>
                                        <span class="font-mono text-xs font-medium text-gray-800 dark:text-gray-200 select-all">{{ (node.details.tls as any).reality.shortId }}</span>
                                    </div>
                                    <div v-if="(node.details.tls as any).reality.spiderX" class="flex-1">
                                        <span class="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">SpiderX</span>
                                        <span class="font-mono text-xs font-medium text-gray-800 dark:text-gray-200 select-all">{{ (node.details.tls as any).reality.spiderX }}</span>
                                    </div>
                                </div>
                            </div>
                         </div>
                      </template>
                    </div>

                    <!-- 原始链接 (折叠/次要显示) -->
                    <div class="relative group/url">
                      <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                         <div class="flex items-start gap-2">
                            <!-- URL 图标 -->
                            <svg class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                            </svg>
                            
                            <!-- URL 文本 (优先显示原始链接) -->
                            <div class="flex-1 min-w-0">
                              <p class="text-xs font-mono text-gray-500 dark:text-gray-500 break-all leading-relaxed line-clamp-3 group-hover/url:line-clamp-none transition-all duration-300">
                                {{ (node.details && (node.details as any).originalUrl) ? (node.details as any).originalUrl : (node.url ? node.url.trim() : '') }}
                              </p>
                            </div>

                            <!-- 复制按钮 -->
                            <button 
                              @click.stop="copyToClipboard((node.details && (node.details as any).originalUrl) ? (node.details as any).originalUrl : node.url)"
                              class="flex-shrink-0 p-1.5 -my-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                              title="复制节点链接">
                              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                              </svg>
                            </button>
                         </div>
                         
                         <!-- 如果原始链接存在，且与生成的URL不同，或者是编码的，提供解码查看选项（仅展示，不可直接复制为链接因为可能无效） -->
                         <div v-if="node.url && node.url.includes('%')" class="text-[10px] text-gray-400 dark:text-gray-600 border-t border-gray-200 dark:border-gray-800 pt-1 mt-1">
                            <details class="cursor-pointer">
                                <summary class="hover:text-gray-600 dark:hover:text-gray-400 select-none">查看解码后参数 / View Decoded</summary>
                                <p class="mt-1 font-mono break-all bg-white dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-800 select-all text-gray-600 dark:text-gray-400">
                                    {{ decodeURIComponent((node.details && (node.details as any).originalUrl) ? (node.details as any).originalUrl : node.url) }}
                                </p>
                            </details>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="text-center py-8">
            <div class="text-gray-400 dark:text-gray-500 mb-2">
              <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p class="text-gray-500 dark:text-gray-400">
              {{ searchTerm ? '没有找到匹配的节点' : '暂无节点信息' }}
            </p>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="p-6 pt-4 flex justify-end space-x-3 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
        <button @click="emit('update:show', false)"
          class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold text-sm rounded-lg transition-colors">
          关闭
        </button>
      </div>
    </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>



