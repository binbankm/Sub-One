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
}

const nodes = ref<DisplayNode[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const searchTerm = ref('');
const showDecoded = ref(false); // 是否显示解码后的 URL
const expandedNodes = ref(new Set<string>()); // 展开查看详情的节点 ID
const selectedNodes = ref(new Set<string>());


const toastStore = useToastStore();

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
    showDecoded.value = false;
    expandedNodes.value.clear();
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
        ...n,
        id: n.id,
        name: n.name,
        url: n.url || '',
        protocol: n.type || getProtocol(n.url || ''),
        enabled: true
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
          type: 'manual'
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
                  ...node,
                  id: node.id,
                  name: node.name,
                  url: node.url || '',
                  protocol: node.type || getProtocol(node.url || ''),
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

// 展开/折叠节点详情
const toggleNodeExpansion = (nodeId: string) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId);
  } else {
    expandedNodes.value.add(nodeId);
  }
};

// 智能解码 URL
const decodeUrl = (url: string) => {
  if (!url) return '';
  try {
    // 处理 vmess 特殊编码
    if (url.startsWith('vmess://')) {
      const b64 = url.slice(8);
      try {
        // 尝试用现代方式解码 Base64 UTF-8
        const json = decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const obj = JSON.parse(json);
        return `vmess://${JSON.stringify(obj, null, 2)}`;
      } catch {
        return decodeURIComponent(url);
      }
    }
    // 通用 URL 解码 (针对 VLESS/Trojan/SS 等)
    return decodeURIComponent(url);
  } catch (e) {
    return url;
  }
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

              <button @click="showDecoded = !showDecoded"
                :class="showDecoded ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'"
                class="px-4 py-2 text-sm rounded-xl transition-all duration-300 shadow hover:shadow-md flex items-center gap-1.5"
                title="显示解码后的 URL (Emoji 恢复)">
                <svg v-if="showDecoded" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.04m5.882-2.282A10.05 10.05 0 0112 5c4.477 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21m-2.101-2.101L3 3m9 9a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
                {{ showDecoded ? '已解码' : '解码' }}
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
            <div class="max-h-96 overflow-y-auto space-y-3">
              <div v-for="node in filteredNodes" :key="node.id"
                @click="toggleNodeSelection(node.id)"
                class="group relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 overflow-hidden cursor-pointer"
                :class="{ 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20': selectedNodes.has(node.id) }">
                
                <!-- 顶部彩色条 -->
                <div class="h-1 bg-gradient-to-r"
                  :class="getProtocolInfo(node.protocol).bg.includes('blue') ? 'from-blue-400 to-indigo-500' :
                          getProtocolInfo(node.protocol).bg.includes('purple') ? 'from-purple-400 to-pink-500' :
                          getProtocolInfo(node.protocol).bg.includes('green') ? 'from-green-400 to-emerald-500' :
                          getProtocolInfo(node.protocol).bg.includes('red') ? 'from-red-400 to-rose-500' :
                          'from-gray-400 to-gray-500'">
                </div>

                <div class="p-4">
                  <!-- 头部：选择框 + 协议标签 + 来源标签 -->
                  <div class="flex items-start gap-3 mb-3">
                    <!-- 选择框 -->
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
                  </div>

                  <!-- 节点名称 -->
                  <div class="mb-3 flex items-center justify-between gap-2">
                    <h4 class="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {{ node.name }}
                    </h4>
                    <button @click.stop="toggleNodeExpansion(node.id)"
                      class="flex-shrink-0 text-xs text-indigo-500 hover:text-indigo-600 font-medium flex items-center gap-1 group/details">
                      <span>{{ expandedNodes.has(node.id) ? '收起详情' : '查看详情' }}</span>
                      <svg class="w-3.5 h-3.5 transition-transform duration-200" :class="{ 'rotate-180': expandedNodes.has(node.id) }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  <!-- URL 展示区域 -->
                  <div class="relative">
                    <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div class="flex items-start gap-2">
                        <!-- URL 图标 -->
                        <svg class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                        </svg>
                        
                        <!-- URL 文本 -->
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-mono text-gray-600 dark:text-gray-400 break-all leading-relaxed"
                            :class="{ 'hidden': showDecoded }">
                            {{ node.url ? node.url.trim() : '' }}
                          </p>
                          <p v-if="showDecoded" 
                             class="text-xs font-mono text-indigo-600 dark:text-indigo-400 break-all leading-relaxed whitespace-pre-wrap">
                            {{ decodeUrl(node.url) }}
                          </p>
                        </div>

                        <!-- 复制按钮 -->
                        <button 
                          @click.stop="copyToClipboard(node.url)"
                          class="flex-shrink-0 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group/copy"
                          title="复制节点链接">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- 详情展开区域 (原始节点数据) -->
                  <Transition name="fade">
                    <div v-if="expandedNodes.has(node.id)" 
                      class="mt-3 p-3 bg-gray-50/80 dark:bg-gray-900/80 rounded-lg border border-indigo-100 dark:border-indigo-900/50 overflow-hidden">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">原始节点详情 (Structured Data)</span>
                      </div>
                      <div class="max-h-48 overflow-y-auto">
                        <pre class="text-[11px] font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ JSON.stringify(node, (key, value) => ['id', 'url', 'enabled', 'type', 'subscriptionName'].includes(key) ? undefined : value, 2) }}</pre>
                      </div>
                    </div>
                  </Transition>
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