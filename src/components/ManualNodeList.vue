<script setup>
import { computed } from 'vue';
import { extractHostAndPort } from '../lib/utils.js';

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true,
  },
  latencyResult: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['delete', 'edit', 'testLatency']);

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

const protocol = computed(() => getProtocol(props.node.url));
const hostAndPort = computed(() => extractHostAndPort(props.node.url));

const protocolStyle = computed(() => {
  const p = protocol.value;
  const styles = {
    anytls: { text: 'AnyTLS', style: 'bg-gradient-to-r from-slate-500/20 to-gray-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30' },
    vless: { text: 'VLESS', style: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    hysteria2: { text: 'HY2', style: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30' },
    hysteria: { text: 'Hysteria', style: 'bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30' },
    tuic: { text: 'TUIC', style: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' },
    trojan: { text: 'TROJAN', style: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-600 dark:text-red-400 border-red-500/30' },
    ssr: { text: 'SSR', style: 'bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30' },
    ss: { text: 'SS', style: 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30' },
    vmess: { text: 'VMESS', style: 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30' },
    socks5: { text: 'SOCKS5', style: 'bg-gradient-to-r from-lime-500/20 to-green-500/20 text-lime-600 dark:text-lime-400 border-lime-500/30' },
    http: { text: 'HTTP', style: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30' },
    unknown: { text: 'LINK', style: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30' }
  };
  return styles[p] || styles['unknown'];
});

// 延迟状态样式
const getLatencyStatusStyle = (latency) => {
  if (!latency || typeof latency !== 'number') {
    return { text: '未测试', style: 'text-gray-500 bg-gray-100 dark:bg-gray-800' };
  }
  
  if (latency < 100) {
    return { text: `${latency}ms`, style: 'text-green-600 bg-green-100 dark:bg-green-900/30' };
  } else if (latency < 300) {
    return { text: `${latency}ms`, style: 'text-green-600 bg-green-100 dark:bg-green-900/30' };
  } else if (latency < 1000) {
    return { text: `${latency}ms`, style: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' };
  } else {
    return { text: `${latency}ms`, style: 'text-red-600 bg-red-100 dark:bg-red-900/30' };
  }
};
</script>

<template>
  <div
    class="group w-full card-modern p-4 transition-all duration-300 hover:scale-[1.02] flex items-center gap-4"
    :class="{ 'opacity-50': !node.enabled }"
  >
    <div class="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-200 dark:bg-gray-700/50 rounded-full">
      <span class="text-xs font-semibold text-gray-500 dark:text-gray-300">
        {{ index }}
      </span>
    </div>

    <div class="flex-shrink-0 w-20 text-center">
      <div
        class="text-xs font-bold px-3 py-1 rounded-full border inline-block"
        :class="protocolStyle.style"
      >
        {{ protocolStyle.text }}
      </div>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <p class="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate" :title="node.name">
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
    </div>

    <div class="flex-1 min-w-0 hidden md:block">
      <p class="font-mono text-xs text-gray-500 dark:text-gray-400 truncate" :title="hostAndPort.host">
        {{ hostAndPort.host || 'N/A' }}
      </p>
    </div>

    <div class="flex-shrink-0 w-16 text-center hidden md:block">
       <p class="font-mono text-xs text-gray-500 dark:text-gray-400">
        {{ hostAndPort.port || 'N/A' }}
      </p>
    </div>

    <div class="flex-shrink-0 flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
      <button @click.stop="emit('testLatency')" class="p-1.5 rounded-full hover:bg-blue-500/10 text-gray-400 hover:text-blue-500" title="测试延迟">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
      <button @click.stop="emit('edit')" class="p-1.5 rounded-full hover:bg-gray-500/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="编辑节点">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
      </button>
      <button @click.stop="emit('delete')" class="p-1.5 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-500" title="删除节点">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  </div>
</template>