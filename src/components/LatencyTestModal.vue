<script setup>
import { computed } from 'vue';
import { useLatencyTest } from '../composables/useLatencyTest.js';

const props = defineProps({
  show: Boolean,
  nodes: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:show']);

const { 
  testResults, 
  getNodeLatency, 
  getLatencyStatusStyle,
  clearResults,
  exportLatencyData
} = useLatencyTest();

// 计算统计信息
const statistics = computed(() => {
  if (testResults.size === 0) return null;
  
  const results = Array.from(testResults.values());
  const successful = results.filter(r => r.status === 'success' && r.latency !== null);
  const failed = results.filter(r => r.status === 'error');
  
  if (successful.length === 0) {
    return {
      total: testResults.size,
      successful: 0,
      failed: failed.length,
      avgLatency: 0,
      minLatency: 0,
      maxLatency: 0
    };
  }
  
  const latencies = successful.map(r => r.latency);
  const avgLatency = Math.round(latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  
  return {
    total: testResults.size,
    successful: successful.length,
    failed: failed.length,
    avgLatency,
    minLatency,
    maxLatency
  };
});

// 按延迟排序的节点
const sortedNodes = computed(() => {
  if (testResults.size === 0) return props.nodes;
  
  return [...props.nodes].sort((a, b) => {
    const resultA = getNodeLatency(a.id);
    const resultB = getNodeLatency(b.id);
    
    if (!resultA || !resultB) return 0;
    if (resultA.status === 'error' && resultB.status === 'success') return 1;
    if (resultA.status === 'success' && resultB.status === 'error') return -1;
    if (resultA.status === 'error' && resultB.status === 'error') return 0;
    
    return (resultA.latency || 0) - (resultB.latency || 0);
  });
});

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
    'anytls': { icon: '🔐', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-900/30' },
  };
  
  return protocolMap[protocol] || { icon: '❓', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/30' };
};

// 获取协议名称
const getProtocol = (url) => {
  try {
    if (!url) return 'unknown';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.startsWith('anytls://')) return 'anytls';
    if (lowerUrl.startsWith('hysteria2://') || lowerUrl.startsWith('hy2://')) return 'hysteria2';
    if (lowerUrl.startsWith('hysteria://') || lowerUrl.startsWith('hy://')) return 'hysteria';
    if (lowerUrl.startsWith('ssr://')) return 'ssr';
    if (lowerUrl.startsWith('tuic://')) return 'tuic';
    if (lowerUrl.startsWith('ss://')) return 'ss';
    if (lowerUrl.startsWith('vmess://')) return 'vmess';
    if (lowerUrl.startsWith('vless://')) return 'vless';
    if (lowerUrl.startsWith('trojan://')) return 'trojan';
    if (lowerUrl.startsWith('socks5://')) return 'socks5';
    if (lowerUrl.startsWith('http')) return 'http';
  } catch {
    return 'unknown';
  }
  return 'unknown';
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 z-[99] flex items-center justify-center p-4" @click="emit('update:show', false)">
    <div class="card-modern w-full max-w-5xl text-left flex flex-col max-h-[90vh]" @click.stop>
      <!-- 标题 -->
      <div class="p-6 pb-4 flex-shrink-0">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold gradient-text">延迟测试结果</h3>
          <div class="flex items-center gap-2">
            <button
              v-if="testResults.size > 0"
              @click="exportLatencyData"
              class="px-4 py-2 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出结果
            </button>
            <button
              v-if="testResults.size > 0"
              @click="clearResults"
              class="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              清除结果
            </button>
          </div>
        </div>
      </div>
      
      <!-- 内容 -->
      <div class="px-6 pb-6 flex-grow overflow-y-auto">
        <div class="space-y-6">
          <!-- 统计信息 -->
          <div v-if="statistics" class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
            <h4 class="text-lg font-semibold text-indigo-800 dark:text-indigo-200 mb-4">测试统计</h4>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {{ statistics.total }}
                </div>
                <div class="text-sm text-indigo-500 dark:text-indigo-300">总测试数</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600 dark:text-green-400">
                  {{ statistics.successful }}
                </div>
                <div class="text-sm text-green-500 dark:text-green-300">成功连接</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-red-600 dark:text-red-400">
                  {{ statistics.failed }}
                </div>
                <div class="text-sm text-red-500 dark:text-red-300">连接失败</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {{ statistics.avgLatency }}ms
                </div>
                <div class="text-sm text-blue-500 dark:text-blue-300">平均延迟</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {{ statistics.minLatency }}-{{ statistics.maxLatency }}ms
                </div>
                <div class="text-sm text-purple-500 dark:text-purple-300">延迟范围</div>
              </div>
            </div>
          </div>

          <!-- 节点列表 -->
          <div class="space-y-3">
            <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200">节点延迟详情</h4>
            
            <div v-if="sortedNodes.length === 0" class="text-center py-8">
              <div class="text-gray-400 dark:text-gray-500 mb-2">
                <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p class="text-gray-500 dark:text-gray-400">暂无节点信息</p>
            </div>

            <div v-else class="max-h-96 overflow-y-auto space-y-2">
              <div
                v-for="node in sortedNodes"
                :key="node.id"
                class="flex items-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <!-- 协议图标 -->
                <div class="flex-shrink-0 mr-4">
                  <span 
                    class="text-lg"
                    :class="getProtocolInfo(getProtocol(node.url)).color"
                  >
                    {{ getProtocolInfo(getProtocol(node.url)).icon }}
                  </span>
                </div>
                
                <!-- 节点信息 -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span 
                      class="text-xs px-2 py-1 rounded-full"
                      :class="getProtocolInfo(getProtocol(node.url)).bg + ' ' + getProtocolInfo(getProtocol(node.url)).color"
                    >
                      {{ getProtocolInfo(getProtocol(node.url)).icon }} {{ getProtocol(node.url).toUpperCase() }}
                    </span>
                    
                    <!-- 延迟测试结果显示 -->
                    <div v-if="testResults.has(node.id)" class="flex items-center gap-1">
                      <span 
                        class="text-xs px-2 py-1 rounded-full font-mono font-bold"
                        :class="getLatencyStatusStyle(getNodeLatency(node.id)?.latency).style"
                      >
                        {{ getLatencyStatusStyle(getNodeLatency(node.id)?.latency).text }}
                      </span>
                    </div>
                  </div>
                  <p class="font-medium text-gray-900 dark:text-gray-100 truncate" :title="node.name">
                    {{ node.name || '未命名节点' }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1" :title="node.url">
                    {{ node.url }}
                  </p>
                </div>

                <!-- 延迟状态 -->
                <div class="flex-shrink-0 ml-4">
                  <div v-if="testResults.has(node.id)" class="text-right">
                    <div v-if="getNodeLatency(node.id)?.status === 'success'" class="text-sm font-mono">
                      <span class="text-green-600 dark:text-green-400">
                        {{ getNodeLatency(node.id)?.latency }}ms
                      </span>
                    </div>
                    <div v-else class="text-sm text-red-500 dark:text-red-400">
                      {{ getNodeLatency(node.id)?.error || '连接失败' }}
                    </div>
                  </div>
                  <div v-else class="text-sm text-gray-400 dark:text-gray-500">
                    未测试
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="p-6 pt-4 flex justify-end space-x-3 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
        <button 
          @click="emit('update:show', false)" 
          class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold text-sm rounded-lg transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style> 