<script setup>
import { computed } from 'vue';

const props = defineProps({
  node: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['delete', 'edit', 'testLatency']);

// 延迟测试结果（从父组件传递）
const latencyResult = computed(() => props.latencyResult);

const getProtocol = (url) => {
  try {
    if (!url) return 'unknown';
    const lowerUrl = url.toLowerCase();
    // [更新] 新增 anytls 支援
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

const protocol = computed(() => getProtocol(props.node.url));

const protocolStyle = computed(() => {
  const p = protocol.value;
  switch (p) {
    // [更新] 新增 anytls 的樣式
    case 'anytls':
      return { text: 'AnyTLS', style: 'bg-gradient-to-r from-slate-500/20 to-gray-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30' };
    case 'vless':
      return { text: 'VLESS', style: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' };
    case 'hysteria2':
      return { text: 'HY2', style: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30' };
    case 'hysteria':
       return { text: 'Hysteria', style: 'bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30' };
    case 'tuic':
        return { text: 'TUIC', style: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' };
    case 'trojan':
      return { text: 'TROJAN', style: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-600 dark:text-red-400 border-red-500/30' };
    case 'ssr':
      return { text: 'SSR', style: 'bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30' };
    case 'ss':
      return { text: 'SS', style: 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30' };
    case 'vmess':
      return { text: 'VMESS', style: 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30' };
    case 'socks5':
      return { text: 'SOCKS5', style: 'bg-gradient-to-r from-lime-500/20 to-green-500/20 text-lime-600 dark:text-lime-400 border-lime-500/30' };
    case 'http':
      return { text: 'HTTP', style: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30' };
    default:
      return { text: 'LINK', style: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30' };
  }
});

// 延迟状态样式
const getLatencyStatusStyle = (latency) => {
  if (!latency || typeof latency !== 'number') {
    return { text: '未测试', style: 'text-gray-500 bg-gray-100 dark:bg-gray-800' };
  }
  
  if (latency < 100) {
    return { text: `${latency}ms`, style: 'text-green-600 bg-green-100 dark:bg-green-900/30' };
  } else if (latency < 300) {
    return { text: `${latency}ms`, style: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' };
  } else if (latency < 1000) {
    return { text: `${latency}ms`, style: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' };
  } else {
    return { text: `${latency}ms`, style: 'text-red-600 bg-red-100 dark:bg-red-900/30' };
  }
};
</script>

<template>
  <div 
    class="bg-white/60 dark:bg-gray-800/75 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-4 group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] flex items-center justify-between gap-3 shadow-sm hover:shadow-lg"
    :class="{ 'opacity-50': !node.enabled }"
  >
    <!-- 装饰性背景 -->
    <div class="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-full -translate-y-8 translate-x-8"></div>
    
    <div class="relative z-10 flex items-center gap-3 overflow-hidden flex-1 min-w-0">
      <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" />
        </svg>
      </div>
      
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <div 
            class="text-xs font-bold px-2 py-0.5 rounded-lg border flex-shrink-0"
            :class="protocolStyle.style"
          >
            {{ protocolStyle.text }}
          </div>
          <p class="font-medium text-sm text-gray-800 dark:text-gray-100 truncate" :title="node.name">
            {{ node.name || '未命名节点' }}
          </p>
          
          <!-- 延迟测试结果显示 -->
          <div v-if="latencyResult && latencyResult.status === 'success'" class="flex-shrink-0">
            <span 
              class="text-xs px-2 py-1 rounded-full font-mono font-bold"
              :class="getLatencyStatusStyle(latencyResult.latency).style"
            >
              {{ getLatencyStatusStyle(latencyResult.latency).text }}
            </span>
          </div>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 truncate" :title="node.url">
          {{ node.url.substring(0, 50) }}{{ node.url.length > 50 ? '...' : '' }}
        </p>
      </div>
    </div>

    <div class="relative z-10 flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <button @click.stop="emit('testLatency')" class="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-400 hover:text-blue-500 transition-all duration-200" title="测试延迟">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        </button>
        <button @click.stop="emit('edit')" class="p-1.5 rounded-lg hover:bg-indigo-500/10 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200" title="编辑节点">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.500 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
            </svg>
        </button>
        <button @click.stop="emit('delete')" class="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all duration-200" title="删除节点">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-2-2V7a2 2 0 00-2-2V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h16" />
            </svg>
        </button>
    </div>
  </div>
</template>