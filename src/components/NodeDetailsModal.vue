<script setup>
import { ref, computed, watch } from 'vue';
import { useToastStore } from '../stores/toast.js';
import { subscriptionParser } from '../lib/subscriptionParser.js';

const props = defineProps({
  show: Boolean,
  subscription: Object,
});

const emit = defineEmits(['update:show']);

const nodes = ref([]);
const isLoading = ref(false);
const errorMessage = ref('');
const searchTerm = ref('');
const selectedNodes = ref(new Set());


const toastStore = useToastStore();

// 监听模态框显示状态
watch(() => props.show, async (newVal) => {
  if (newVal && props.subscription) {
    await fetchNodes();
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

// 获取节点信息
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
    nodes.value = parsedNodes;
    
  } catch (error) {
    console.error('获取节点信息失败:', error);
    errorMessage.value = `获取节点信息失败: ${error.message}`;
    toastStore.showToast('获取节点信息失败', 'error');
  } finally {
    isLoading.value = false;
  }
};

// 获取协议图标和样式
const getProtocolInfo = (protocol) => {
  const protocolMap = {
    'ss': { icon: '🔒', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    'ssr': { icon: '🛡️', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    'vmess': { icon: '⚡', color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    'vless': { icon: '🚀', color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    'trojan': { icon: '🛡️', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    'hysteria': { icon: '⚡', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    'hysteria2': { icon: '⚡', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    'tuic': { icon: '🚀', color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' },
    'socks5': { icon: '🔌', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/30' },
  };
  
  return protocolMap[protocol] || { icon: '❓', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/30' };
};

// 选择/取消选择节点
const toggleNodeSelection = (nodeId) => {
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
  <div v-if="show" class="fixed inset-0 z-[99] flex items-center justify-center p-2 sm:p-4" @click="emit('update:show', false)">
    <div class="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 text-left flex flex-col h-[90vh] sm:h-[85vh] max-h-[90vh] sm:max-h-[85vh]" @click.stop>
      <!-- 标题栏 -->
      <div class="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">节点详情</h3>
        <button 
          @click="emit('update:show', false)" 
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- 内容区域 -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
        <div class="space-y-4">
          <!-- 订阅信息头部 -->
          <div v-if="subscription" class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                  {{ subscription.name || '未命名订阅' }}
                </h3>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-1 break-all">
                  {{ subscription.url }}
                </p>
              </div>
              <div class="text-right sm:text-left">
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  共 {{ nodes.length }} 个节点
                </p>
                <p v-if="subscription.nodeCount" class="text-xs text-gray-500 dark:text-gray-400">
                  上次更新: {{ subscription.nodeCount }} 个
                </p>
              </div>
            </div>
          </div>

          <!-- 搜索和操作栏 -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div class="flex-1 relative">
              <input
                v-model="searchTerm"
                type="text"
                placeholder="搜索节点名称或链接..."
                class="w-full px-4 py-2 pl-10 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-gray-100"
              />
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div class="flex items-center gap-2 justify-end">
              <button
                @click="refreshNodes"
                :disabled="isLoading"
                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg v-if="isLoading" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span v-else>刷新</span>
              </button>

              <button
                @click="copySelectedNodes"
                :disabled="selectedNodes.size === 0"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                复制选中
              </button>
            </div>
          </div>

          <!-- 错误信息 -->
          <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p class="text-red-600 dark:text-red-400 text-sm">{{ errorMessage }}</p>
          </div>

          <!-- 加载状态 -->
          <div v-if="isLoading" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600 dark:text-gray-400">正在获取节点信息...</span>
          </div>

          <!-- 节点列表 -->
          <div v-else-if="filteredNodes.length > 0" class="space-y-3">
            <!-- 全选按钮 -->
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  :checked="selectedNodes.size === filteredNodes.length && filteredNodes.length > 0"
                  :indeterminate="selectedNodes.size > 0 && selectedNodes.size < filteredNodes.length"
                  @change="toggleSelectAll"
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  全选 ({{ selectedNodes.size }}/{{ filteredNodes.length }})
                </span>
              </label>
            </div>

            <!-- 节点卡片列表 -->
            <div class="space-y-2 max-h-[50vh] sm:max-h-[45vh] overflow-y-auto">
              <div
                v-for="node in filteredNodes"
                :key="node.id"
                class="flex items-start p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <input
                  type="checkbox"
                  :checked="selectedNodes.has(node.id)"
                  @change="toggleNodeSelection(node.id)"
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3 mt-1 flex-shrink-0"
                />
                
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-2">
                    <span 
                      class="text-xs px-2 py-1 rounded-full font-medium"
                      :class="getProtocolInfo(node.protocol).bg + ' ' + getProtocolInfo(node.protocol).color"
                    >
                      {{ getProtocolInfo(node.protocol).icon }} {{ node.protocol.toUpperCase() }}
                    </span>
                  </div>
                  <p class="font-medium text-gray-900 dark:text-gray-100 text-sm break-words" :title="node.name">
                    {{ node.name }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 break-all mt-1" :title="node.url">
                    {{ node.url }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="text-center py-8">
            <div class="text-gray-400 dark:text-gray-500 mb-3">
              <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p class="text-gray-500 dark:text-gray-400 text-sm">
              {{ searchTerm ? '没有找到匹配的节点' : '暂无节点信息' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 响应式设计 */
@media (max-width: 640px) {
  .fixed {
    padding: 0.5rem;
  }
  
  .max-w-4xl {
    height: calc(100vh - 1rem) !important;
    max-height: calc(100vh - 1rem) !important;
  }
}

@media (max-height: 600px) {
  .max-w-4xl {
    height: calc(100vh - 1rem) !important;
    max-height: calc(100vh - 1rem) !important;
  }
}

/* 滚动条样式 */
.overflow-y-auto {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* 文本换行优化 */
.break-words {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.break-all {
  word-break: break-all;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.fixed {
  animation: fadeIn 0.2s ease-out;
}

/* 按钮悬停效果 */
button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

/* 输入框焦点效果 */
input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 复选框样式优化 */
input[type="checkbox"] {
  transition: all 0.2s ease;
}

input[type="checkbox"]:checked {
  transform: scale(1.1);
}

/* 协议标签悬停效果 */
.rounded-full {
  transition: all 0.2s ease;
}

.rounded-full:hover {
  transform: scale(1.05);
}

/* 节点卡片悬停效果 */
.border {
  transition: all 0.2s ease;
}

.border:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 暗色模式优化 */
@media (prefers-color-scheme: dark) {
  .shadow-2xl {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
  }
}

/* 小屏幕优化 */
@media (max-width: 480px) {
  .space-y-4 > * + * {
    margin-top: 0.75rem;
  }
  
  .space-y-3 > * + * {
    margin-top: 0.5rem;
  }
  
  .space-y-2 > * + * {
    margin-top: 0.375rem;
  }
}
</style> 