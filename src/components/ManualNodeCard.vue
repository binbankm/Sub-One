<script setup>
import { computed } from 'vue';

const props = defineProps({
  node: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['delete', 'edit']);

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
</script>

<template>
  <div 
    class="bg-white/60 dark:bg-gray-800/75 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-3 xs:p-4 sm:p-4 group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] flex items-center justify-between gap-2 xs:gap-3 sm:gap-3 shadow-sm hover:shadow-lg"
    :class="{ 'opacity-50': !node.enabled }"
  >
    <!-- 装饰性背景 -->
    <div class="absolute top-0 right-0 w-12 h-12 xs:w-16 xs:h-16 sm:w-16 sm:h-16 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-full -translate-y-6 xs:-translate-y-8 sm:-translate-y-8 translate-x-6 xs:translate-x-8 sm:translate-x-8"></div>
    
    <div class="relative z-10 flex items-center gap-2 xs:gap-3 sm:gap-3 overflow-hidden flex-1 min-w-0">
      <div class="w-6 h-6 xs:w-8 xs:h-8 sm:w-8 sm:h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 xs:h-4 xs:w-4 sm:h-4 sm:w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <p class="font-medium text-xs xs:text-sm sm:text-sm text-gray-800 dark:text-gray-100 truncate" :title="node.name">
            {{ node.name || '未命名节点' }}
          </p>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 truncate" :title="node.url">
          {{ node.url.substring(0, 40) }}{{ node.url.length > 40 ? '...' : '' }}
        </p>
      </div>
    </div>

    <div class="relative z-10 flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <button @click.stop="emit('edit')" class="p-1 xs:p-1.5 sm:p-1.5 rounded-lg hover:bg-indigo-500/10 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200" title="编辑节点">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 xs:h-4 xs:w-4 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
            </svg>
        </button>
        <button @click.stop="emit('delete')" class="p-1 xs:p-1.5 sm:p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all duration-200" title="删除节点">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 xs:h-4 xs:w-4 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    </div>
  </div>
</template>