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
import { useToastStore } from '../../../stores/toast';
import type { Subscription, Profile } from '../../../types/index';
import { filterNodes } from '../../../utils/search';
import { getProtocolInfo, getProtocol } from '../../../utils/protocols';
import { useDataStore } from '../../../stores/data';
import { storeToRefs } from 'pinia';
import { Base64 } from 'js-base64';
import { copyToClipboard } from '../../../utils/utils';

const props = defineProps<{
  show: boolean;
  subscription?: Subscription | { name: string; url: string; exclude?: string; nodeCount?: number } | null;
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
    if (allManualNodes.value) {
      const selectedManualNodes = (allManualNodes.value || []).filter(node =>
        props.profile?.manualNodes?.includes(node.id) ?? false
      ) as any[];

      for (const node of selectedManualNodes) {
        profileNodes.push({
          id: node.id,
          name: node.name || '未命名节点',
          url: node.url || '',
          protocol: (node.type || node.protocol || getProtocol(node.url || '')).toLowerCase(),
          server: node.server || '',
          port: node.port || '',
          enabled: node.enabled,
          type: 'manual'
        });
      }
    }

    // 2. 添加订阅节点
    if (allSubscriptions.value) {
      const selectedSubscriptions = allSubscriptions.value.filter(sub =>
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
                  protocol: (node.type || node.protocol || getProtocol(node.url || '')).toLowerCase(),
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
const copySelectedNodes = async () => {
  const selectedNodeUrls = filteredNodes.value
    .filter(node => selectedNodes.value.has(node.id))
    .map(node => node.url);

  if (selectedNodeUrls.length === 0) {
    toastStore.showToast('请先选择要复制的节点', 'warning');
    return;
  }

  const success = await copyToClipboard(selectedNodeUrls.join('\n'));
  if (success) {
    toastStore.showToast(`已复制 ${selectedNodeUrls.length} 个节点到剪贴板`, 'success');
  } else {
    toastStore.showToast('复制失败', 'error');
  }
};

// 复制单个节点到剪贴板
const handleCopySingle = async (url: string) => {
  const success = await copyToClipboard(url);
  if (success) {
    toastStore.showToast('已复制节点链接', 'success');
  } else {
    toastStore.showToast('复制失败', 'error');
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
// 修改后的提取主机名 helper
const extractHost = (url: string) => {
  if (!url) return '';

  try {
    // 1. 特殊处理 VMess 协议
    if (url.startsWith('vmess://')) {
      const base64 = url.replace('vmess://', '');
      try {
        // 使用 js-base64 解码（自动处理 Unicode）
        const decoded = Base64.decode(base64);
        const config = JSON.parse(decoded);
        // VMess JSON 标准字段: add (地址), port (端口)
        if (config.add && config.port) {
          return `${config.add}:${config.port}`;
        }
        return config.add || '未知地址';
      } catch (e) {
        console.warn('VMess 解析失败:', e);
        return 'VMess 格式错误';
      }
    }

    // 2. 特殊处理纯 Base64 的 SS (Legacy 格式: ss://Base64)
    // 如果是 ss:// 且不包含 @ 符号，通常是旧版 Base64 格式
    if (url.startsWith('ss://') && !url.includes('@')) {
       const base64 = url.replace('ss://', '').split('#')[0]; // 去掉末尾可能的 #备注
       try {
         // 使用 js-base64 解码
         const decoded = Base64.decode(base64);
         // 解码后通常是 method:password@hostname:port
         const parts = decoded.split('@');
         if (parts.length > 1) {
           return parts[1]; // 返回 hostname:port
         }
       } catch (e) {
         // 解码失败则继续尝试标准 URL 解析
       }
    }

    // 3. 处理标准 URL 格式 (VLESS, Hysteria, Trojan, 标准 SS)
    const urlObj = new URL(url);
    if (!urlObj.hostname) return '';
    return urlObj.port ? `${urlObj.hostname}:${urlObj.port}` : urlObj.hostname;

  } catch (e) {
    return 'URL 解析错误';
  }
};

</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 bg-black/60 z-[99] flex items-center justify-center p-4"
        @click="emit('update:show', false)">
        <Transition name="scale-fade-bounce">
          <div v-if="show"
            class="bg-white dark:bg-gray-900 rounded-3xl border border-gray-300 dark:border-gray-700 shadow-2xl w-full max-w-4xl text-left flex flex-col max-h-[85vh]"
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
            class="bg-gray-50/60 dark:bg-gray-800/75 rounded-xl p-4 border border-gray-300 dark:border-gray-700">
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

            <!-- 节点卡片列表 - 重新设计 (同步 ManualNodeCard 视觉) -->
            <div class="max-h-96 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              <div v-for="node in filteredNodes" :key="node.id"
                @click="toggleNodeSelection(node.id)"
                class="group relative bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700 rounded-2xl hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden cursor-pointer"
                :class="{ 
                  'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900 border-indigo-500/50': selectedNodes.has(node.id),
                  'border-gray-300 dark:border-gray-700': !selectedNodes.has(node.id)
                }">
                
                <!-- 顶部彩色条 -->
                <div class="h-1 bg-gradient-to-r opacity-80"
                  :class="getProtocolInfo(node.protocol).gradient">
                </div>

                <div class="p-4">
                  <!-- 头部信息 -->
                  <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex items-center gap-3 overflow-hidden">
                      <!-- 选择框 -->
                      <div class="flex-shrink-0" @click.stop>
                         <div class="relative flex items-center justify-center w-5 h-5">
                            <input type="checkbox" :checked="selectedNodes.has(node.id)" @change="toggleNodeSelection(node.id)"
                              class="peer appearance-none w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-md checked:bg-indigo-500 checked:border-indigo-500 transition-colors cursor-pointer" />
                            <svg class="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" 
                              viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                      </div>

                      <div class="flex flex-wrap items-center gap-2">
                         <!-- 协议标签 -->
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm border"
                          :class="[getProtocolInfo(node.protocol).bg, getProtocolInfo(node.protocol).color, 'border-transparent bg-opacity-10 dark:bg-opacity-20']">
                          <span class="text-sm font-normal filter drop-shadow-sm">{{ getProtocolInfo(node.protocol).icon }}</span>
                          <span>{{ getProtocolInfo(node.protocol).text }}</span>
                        </span>

                        <!-- 来源标签 -->
                        <template v-if="profile">
                          <span v-if="node.type === 'subscription'"
                            class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30">
                            {{ node.subscriptionName }}
                          </span>
                          <span v-else-if="node.type === 'manual'"
                            class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800/30">
                            手动
                          </span>
                        </template>
                      </div>
                    </div>
                  </div>

                  <!-- 节点名称 -->
                  <div class="mb-3 pl-8">
                    <h4 class="text-base font-bold text-gray-800 dark:text-gray-100 leading-snug break-words">
                      {{ node.name }}
                    </h4>
                  </div>

                  <!-- 底部信息：地址 & 复制 -->
                  <div class="pl-8 pt-2 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between gap-2 text-xs">
                     <div class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 overflow-hidden" title="服务器地址">
                        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span class="truncate font-mono">
                          {{ (node.server && node.port) ? `${node.server}:${node.port}` : extractHost(node.url) }}
                        </span>
                     </div>

                     <button @click.stop="handleCopySingle(node.url)"
                       class="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all font-medium"
                       title="复制链接">
                       <span class="hidden sm:inline">复制</span>
                       <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 01-2-2V3" />
                       </svg>
                     </button>
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
      <div class="p-6 pt-4 flex justify-end space-x-3 flex-shrink-0 border-t border-gray-300 dark:border-gray-700">
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
