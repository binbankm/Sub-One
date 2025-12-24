<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useToastStore } from '../../stores/toast';
import { subscriptionParser } from '@shared/subscription-parser';
import type { Subscription, Profile, Node } from '../../types';

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
const selectedNodes = ref(new Set<string>());


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
    errorMessage.value = '';
  }
});

// 过滤后的节点列表
const filteredNodes = computed(() => {
  if (!searchTerm.value) return nodes.value;
  const term = searchTerm.value.toLowerCase();
  return nodes.value.filter(node =>
    node.name.toLowerCase().includes(term) ||
    node.url.toLowerCase().includes(term)
  );
});

// 获取单个订阅的节点信息
const fetchNodes = async () => {
  if (!props.subscription?.url) return;

  isLoading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch('/api/fetch_external_url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: props.subscription.url })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const content = await response.text();
    const parsedNodes = subscriptionParser.parse(content, props.subscription?.name || '');
    // Apply filtering and processing
    const processedNodes = subscriptionParser.processNodes(parsedNodes, props.subscription?.name || '', {
      exclude: (props.subscription as any).exclude
    });

    nodes.value = processedNodes.map(n => ({
      id: n.id,
      name: n.name,
      url: n.url,
      protocol: getProtocolFromUrl(n.url),
      enabled: true
    }));

  } catch (error: any) {
    console.error('获取节点信息失败:', error);
    errorMessage.value = `获取节点信息失败: ${error.message}`;
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
        props.profile!.manualNodes.includes(node.id)
      );

      for (const node of selectedManualNodes) {
        profileNodes.push({
          id: node.id,
          name: node.name || '未命名节点',
          url: node.url,
          protocol: getProtocolFromUrl(node.url),
          enabled: node.enabled,
          type: 'manual'
        });
      }
    }

    // 2. 添加订阅节点
    if (props.allSubscriptions) {
      const selectedSubscriptions = props.allSubscriptions.filter(sub =>
        props.profile!.subscriptions.includes(sub.id) && sub.enabled
      );

      // 并行获取所有订阅内容，提升速度
      const promises = selectedSubscriptions.map(async (subscription) => {
        if (subscription.url && subscription.url.startsWith('http')) {
          try {
            const response = await fetch('/api/fetch_external_url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: subscription.url })
            });

            if (response.ok) {
              const content = await response.text();
              const parsedNodes = subscriptionParser.parse(content, subscription.name);
              // 应用过滤规则 - 关键修复：确保订阅的exclude规则在订阅组中也生效
              const processedNodes = subscriptionParser.processNodes(parsedNodes, subscription.name || '', {
                exclude: subscription.exclude || ''
              });
              // 标记来源，方便显示
              return processedNodes.map(node => ({
                id: node.id,
                name: node.name,
                url: node.url,
                protocol: getProtocolFromUrl(node.url),
                enabled: true,
                type: 'subscription' as const,
                subscriptionName: subscription.name
              }));
            }
          } catch (error) {
            console.error(`获取订阅 ${subscription.name} 节点失败:`, error);
          }
        }
        return [];
      });

      const results = await Promise.all(promises);
      results.forEach(subNodes => profileNodes.push(...subNodes));
    }

    nodes.value = profileNodes;

  } catch (error: any) {
    console.error('获取订阅组节点信息失败:', error);
    errorMessage.value = `获取节点信息失败: ${error.message}`;
    toastStore.showToast('获取节点信息失败', 'error');
  } finally {
    isLoading.value = false;
  }
};

// 从URL获取协议类型 (辅助函数)
const getProtocolFromUrl = (url: string) => {
  const nodeRegex = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//;
  const match = url.match(nodeRegex);
  return match ? match[1] : 'unknown';
};

// 获取协议图标和样式
const getProtocolInfo = (protocol: string) => {
  const protocolMap: Record<string, { icon: string; color: string; bg: string }> = {
    'ss': { icon: '🔒', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    'ssr': { icon: '🛡️', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    'vmess': { icon: '⚡', color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    'vless': { icon: '🚀', color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    'trojan': { icon: '🛡️', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    'hysteria': { icon: '⚡', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    'hysteria2': { icon: '⚡', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    'tuic': { icon: '🚀', color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' },
    'socks5': { icon: '🔌', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/30' },
    'anytls': { icon: '🌐', color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  };

  return protocolMap[protocol] || { icon: '❓', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/30' };
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

// 刷新节点信息
const refreshNodes = async () => {
  await fetchNodes();
  toastStore.showToast('节点信息已刷新', 'success');
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 z-[99] flex items-center justify-center p-4"
    @click="emit('update:show', false)">
    <div
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
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                  {{ subscription ? (subscription.name || '未命名订阅') : (profile?.name || '未命名订阅组') }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span v-if="subscription">{{ subscription.url }}</span>
                  <span v-else-if="profile">包含 {{ profile.subscriptions.length }} 个订阅，{{ profile.manualNodes.length }}
                    个手动节点</span>
                </p>
              </div>
              <div class="text-right">
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

            <!-- 节点卡片列表 -->
            <div class="max-h-96 overflow-y-auto space-y-2">
              <div v-for="node in filteredNodes" :key="node.id"
                class="flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <input type="checkbox" :checked="selectedNodes.has(node.id)" @change="toggleNodeSelection(node.id)"
                  class="h-4 w-4 rounded border-gray-300 text-indigo-600 mr-3" />

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs px-2 py-1 rounded-full"
                      :class="getProtocolInfo(node.protocol).bg + ' ' + getProtocolInfo(node.protocol).color">
                      {{ getProtocolInfo(node.protocol).icon }} {{ node.protocol.toUpperCase() }}
                    </span>
                    <!-- 仅在订阅组模式下显示来源标签 -->
                    <template v-if="profile">
                      <span v-if="node.type === 'subscription'"
                        class="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500">
                        📡 {{ node.subscriptionName }}
                      </span>
                      <span v-else-if="node.type === 'manual'"
                        class="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500">
                        ✋ 手动
                      </span>
                    </template>
                  </div>
                  <p class="font-medium text-gray-900 dark:text-gray-100 truncate" :title="node.name">
                    {{ node.name }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1" :title="node.url">
                    {{ node.url }}
                  </p>
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
  </div>
</template>

<style scoped>
/* 模态框过渡动画已在 BaseModal.vue 中定义 */
</style>

