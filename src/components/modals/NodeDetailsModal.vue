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
  // 详情字段
  server?: string;
  port?: number | string;
  uuid?: string;      // UUID 或 Password
  cipher?: string;    // 加密方式
  network?: string;   // 传输协议 (tcp, ws, grpc...)
  tls?: boolean;      // 是否开启 TLS
  flow?: string;      // VLESS Flow / XTLS
  raw?: any;          // 原始完整对象，便于扩展
  showPassword?: boolean; // UI控制：是否显示密码
}

const nodes = ref<DisplayNode[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const searchTerm = ref('');
const selectedNodes = ref(new Set<string>());
const expandedNodes = ref(new Set<string>()); // 记录展开的节点ID
const toastStore = useToastStore();

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
    expandedNodes.value.clear();
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
        // 映射详情字段
        server: n.server,
        port: n.port,
        uuid: n.uuid || n.password || n.privateKey, // 统一映射为凭证
        cipher: n.cipher,
        network: n.transport?.type || n.network || 'tcp',
        tls: n.tls?.enabled || false,
        flow: n.flow,
        raw: n,
        showPassword: false
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
                  id: node.id,
                  name: node.name,
                  url: node.url || '',
                  protocol: getProtocol(node.url || ''),
                  enabled: true,
                  type: 'subscription' as const,
                  subscriptionName: subscription.name || '',
                  // 映射详情字段
                  server: node.server,
                  port: node.port,
                  uuid: node.uuid || node.password || node.privateKey,
                  cipher: node.cipher,
                  network: node.transport?.type || node.network || 'tcp',
                  tls: node.tls?.enabled || false,
                  flow: node.flow,
                  raw: node,
                  showPassword: false
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

// 展开/收起节点详情
const toggleNodeExpansion = (nodeId: string) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId);
  } else {
    expandedNodes.value.add(nodeId);
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

const safeUrlDecode = (str: string) => {
  if (!str) return '';
  try {
    return decodeURIComponent(str.trim());
  } catch (e) {
    // URL format is likely properly malformed or raw (e.g. contains unescaped %), return original
    return str;
  }
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
            <template v-else-if="filteredNodes.length > 0">
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
                  class="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 overflow-hidden"
                  :class="{ 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10': selectedNodes.has(node.id) }">
                  
                  <!-- 顶部彩色条 (更细) -->
                  <div class="h-0.5 bg-gradient-to-r"
                    :class="getProtocolInfo(node.protocol).bg.includes('blue') ? 'from-blue-400 to-indigo-500' :
                            getProtocolInfo(node.protocol).bg.includes('purple') ? 'from-purple-400 to-pink-500' :
                            getProtocolInfo(node.protocol).bg.includes('green') ? 'from-green-400 to-emerald-500' :
                            getProtocolInfo(node.protocol).bg.includes('red') ? 'from-red-400 to-rose-500' :
                            'from-gray-400 to-gray-500'">
                  </div>

                  <!-- 头部：点击可展开 -->
                  <div class="p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                       @click="toggleNodeExpansion(node.id)">
                      
                      <!-- 选择框 (阻止冒泡，独立操作) -->
                      <div class="flex-shrink-0" @click.stop>
                          <input type="checkbox" 
                            :checked="selectedNodes.has(node.id)" 
                            @change="toggleNodeSelection(node.id)"
                            class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      </div>

                      <!-- 协议标签 (图标+文字) -->
                    <div class="flex-shrink-0 h-8 px-2.5 rounded-lg flex items-center gap-1.5 shadow-sm"
                         :class="getProtocolInfo(node.protocol).bg + ' ' + getProtocolInfo(node.protocol).color">
                        <span class="text-lg leading-none">{{ getProtocolInfo(node.protocol).icon }}</span>
                        <span class="text-xs font-bold uppercase tracking-wide pt-0.5">{{ node.protocol }}</span>
                    </div>

                      <!-- 节点名称 & 简要信息 -->
                      <div class="flex-1 min-w-0 pr-2">
                          <div class="flex items-center gap-2">
                              <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  {{ node.name }}
                              </h4>
                              
                              <!-- 来源标签 (仅在订阅组模式显示) -->
                              <template v-if="profile">
                                  <span v-if="node.type === 'subscription'" class="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium truncate max-w-[100px]">
                                      {{ node.subscriptionName }}
                                  </span>
                                  <span v-else-if="node.type === 'manual'" class="px-1.5 py-0.5 rounded text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium">
                                      Manual
                                  </span>
                              </template>
                          </div>
                          <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-mono opacity-80">
                              {{ node.server }}:{{ node.port }}
                          </p>
                      </div>

                      <!-- 展开/收起 指示器 -->
                      <div class="flex-shrink-0 text-gray-400 transition-transform duration-200"
                           :class="{ 'rotate-180': expandedNodes.has(node.id) }">
                          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                          </svg>
                      </div>
                  </div>

                  <!-- 详情区域 (可折叠) -->
                  <div v-show="expandedNodes.has(node.id)" class="bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700/50 px-4 py-3">
                    <!-- 详情信息网格 (Sub-Store 风格) -->
                    <div class="text-sm space-y-3">
                      
                      <!-- 1. 基础信息行 (Server | Port) -->
                      <div class="grid grid-cols-12 gap-2">
                         <div class="col-span-8 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 flex flex-col justify-center shadow-sm">
                            <span class="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5 uppercase tracking-wider">Server</span>
                            <div class="flex items-center gap-1.5 overflow-hidden">
                               <span class="font-mono text-gray-700 dark:text-gray-300 truncate select-all">{{ node.server }}</span>
                               <button @click.stop="copyToClipboard(node.server || '')" class="text-gray-400 hover:text-indigo-500 transition-colors ml-auto" title="复制服务器地址">
                                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                               </button>
                            </div>
                         </div>
                         <div class="col-span-4 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 flex flex-col justify-center shadow-sm">
                            <span class="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5 uppercase tracking-wider">Port</span>
                            <span class="font-mono text-gray-700 dark:text-gray-300 select-all">{{ node.port }}</span>
                         </div>
                      </div>

                      <!-- 2. 凭证信息 (UUID/Password) -->
                      <div v-if="node.uuid" class="bg-white dark:bg-gray-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
                         <span class="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5 block uppercase tracking-wider">
                           {{ ['ss', 'trojan', 'hysteria2'].includes(node.protocol) ? 'Password' : 'UUID / Key' }}
                         </span>
                         <div class="flex items-center gap-2">
                            <span class="font-mono text-gray-700 dark:text-gray-300 truncate flex-1 select-all" :class="{'tracking-widest': !node.showPassword}">
                               {{ node.showPassword ? node.uuid : (node.uuid.length > 10 ? node.uuid.substring(0, 4) + '******' + node.uuid.substring(node.uuid.length - 4) : '******') }}
                            </span>
                            <button @click.stop="node.showPassword = !node.showPassword" class="text-gray-400 hover:text-indigo-500 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                               <svg v-if="!node.showPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                               <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            </button>
                             <button @click.stop="copyToClipboard(node.uuid)" class="text-gray-400 hover:text-indigo-500 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="复制凭证">
                               <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                            </button>
                         </div>
                      </div>

                      <!-- 3. 技术参数 (Tags) -->
                      <div class="flex flex-wrap items-center gap-2 pt-1">
                         <!-- 传输协议 -->
                         <div v-if="node.network" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 shadow-sm">
                            <svg class="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            {{ node.network.toUpperCase() }}
                         </div>

                         <!-- 安全 -->
                         <div v-if="node.tls" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 shadow-sm">
                            <svg class="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            TLS
                         </div>

                         <!-- SNI (如果有) -->
                          <div v-if="node.raw?.tls?.serverName" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 max-w-[150px] truncate shadow-sm" title="SNI / Server Name">
                            <span class="text-gray-400">SNI:</span> {{ node.raw.tls.serverName }}
                         </div>
                         
                         <!-- Fingerprint (如果有) -->
                         <div v-if="node.raw?.tls?.fingerprint" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm" title="uTLS Fingerprint">
                            <span class="text-gray-400">FP:</span> {{ node.raw.tls.fingerprint }}
                         </div>

                         <!-- Insecure (如果允许) -->
                         <div v-if="node.raw?.tls?.insecure" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-900/30 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800 shadow-sm" title="Allow Insecure">
                            <svg class="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Insecure
                         </div>

                         <!-- Transport Path (WS/H2/HTTP) -->
                         <div v-if="node.raw?.transport?.path" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 max-w-[150px] truncate shadow-sm" title="Path">
                            <span class="text-blue-400">Path:</span> {{ node.raw.transport.path }}
                         </div>
                         
                         <!-- ServiceName (gRPC) -->
                         <div v-if="node.raw?.transport?.serviceName" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 max-w-[150px] truncate shadow-sm" title="Service Name">
                            <span class="text-blue-400">Service:</span> {{ node.raw.transport.serviceName }}
                         </div>
                      </div>
                      
                      <!-- 4. 高级参数区域 (Obfs, Reality, etc.) -->
                      <div v-if="node.raw?.obfs || (node.raw?.tls?.reality?.enabled)" class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800/50">
                          <!-- 混淆 Obfs (Hysteria2/Trojan) -->
                          <div v-if="node.raw.obfs" class="bg-white dark:bg-gray-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
                               <div class="flex justify-between items-center mb-1">
                                  <span class="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Obfuscation</span>
                                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase font-bold">{{ typeof node.raw.obfs === 'string' ? 'Simple' : (node.raw.obfs.type || 'Unknown') }}</span>
                               </div>
                               <div v-if="typeof node.raw.obfs === 'object' && node.raw.obfs.password" class="flex items-center gap-2">
                                  <span class="text-xs font-mono text-gray-700 dark:text-gray-300 truncate tracking-wide">
                                     <span class="text-gray-400 select-none mr-1">PWD:</span>{{ node.raw.obfs.password }}
                                  </span>
                                  <button @click.stop="copyToClipboard(node.raw.obfs.password)" class="text-gray-400 hover:text-indigo-500 ml-auto transition-colors" title="复制混淆密码">
                                     <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                  </button>
                               </div>
                               <div v-else-if="typeof node.raw.obfs === 'string'" class="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
                                  {{ node.raw.obfs }}
                               </div>
                          </div>

                          <!-- Reality Keys -->
                          <div v-if="node.raw.tls?.reality?.enabled" class="bg-white dark:bg-gray-900 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 md:col-span-2 shadow-sm">
                               <span class="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5 block uppercase tracking-wider">Reality Keys</span>
                               <div class="space-y-1.5">
                                  <div class="flex items-center gap-2">
                                     <span class="text-[10px] font-bold text-gray-400 w-6">PK</span>
                                     <span class="text-xs font-mono text-gray-700 dark:text-gray-300 truncate select-all flex-1 bg-gray-50 dark:bg-gray-800 p-1 rounded">{{ node.raw.tls.reality.publicKey }}</span>
                                  </div>
                                  <div v-if="node.raw.tls.reality.shortId" class="flex items-center gap-2">
                                     <span class="text-[10px] font-bold text-gray-400 w-6">SID</span>
                                     <span class="text-xs font-mono text-gray-700 dark:text-gray-300 truncate select-all flex-1 bg-gray-50 dark:bg-gray-800 p-1 rounded">{{ node.raw.tls.reality.shortId }}</span>
                                  </div>
                               </div>
                          </div>
                      </div>

                         <!-- 显示原始URL或解码URL的开关区域 -->
                         <div v-if="node.url" class="w-full mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <div class="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 overflow-hidden">
                                <p class="text-[10px] text-gray-500 dark:text-gray-400 font-mono break-all whitespace-normal leading-relaxed">
                                  {{ safeUrlDecode(node.url) }}
                                </p>
                            </div>
                            <button 
                              @click.stop="copyToClipboard(safeUrlDecode(node.url))"
                              class="flex-shrink-0 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                              title="复制完整链接">
                              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                              </svg>
                            </button>
                         </div>

                    </div>
                  </div>

                </div>
               </div>
            </template>
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



