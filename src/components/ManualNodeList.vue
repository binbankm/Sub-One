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
  }
});

const emit = defineEmits(['delete', 'edit']);

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
</script>

<template>
  <div
    class="group w-full max-w-full px-2 py-3 sm:px-4 sm:py-4 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50 last:border-0"
    :class="{ 'opacity-50': !node.enabled }"
  >
    <div class="flex items-start justify-between gap-2 sm:gap-3">
      <div class="flex items-start gap-1.5 sm:gap-3 flex-1 min-w-0">
        <!-- 序号 -->
        <div class="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-gray-200 dark:bg-gray-700/50 rounded-full flex-shrink-0 mt-0.5">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-300">
            {{ index }}
          </span>
        </div>

        <!-- 协议标签 -->
        <div class="flex-shrink-0 text-center mt-0.5">
          <div
            class="text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border inline-block whitespace-nowrap"
            :class="protocolStyle.style"
          >
            {{ protocolStyle.text }}
          </div>
        </div>

        <!-- 节点名称 - 支持换行 -->
        <div class="flex-1 min-w-0 overflow-hidden">
          <p 
            class="font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-100 break-words line-clamp-2 sm:line-clamp-3" 
            :title="node.name"
            style="word-break: break-word; overflow-wrap: break-word;"
          >
            {{ node.name || '未命名节点' }}
          </p>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex-shrink-0 flex items-center gap-1 sm:gap-2 pt-0.5">
        <button @click.stop="emit('edit')" class="p-1.5 sm:p-2 rounded-lg hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200" title="编辑节点">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
            </svg>
        </button>
        <button @click.stop="emit('delete')" class="p-1.5 sm:p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200" title="删除节点">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
      </div>
    </div>
  </div>
</template>