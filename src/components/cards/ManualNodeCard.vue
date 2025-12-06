<script setup lang="ts">
import { computed } from 'vue';
import type { Node } from '../../types';

const props = defineProps<{
  node: Node;
  isBatchMode?: boolean;
  isSelected?: boolean;
}>();

const emit = defineEmits<{
  (e: 'delete'): void;
  (e: 'edit'): void;
  (e: 'toggleSelect'): void;
}>();

const getProtocol = (url?: string) => {
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
    class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] flex flex-col h-full min-h-[180px] sm:min-h-[160px] shadow-sm hover:shadow-lg"
    :class="{
      'opacity-50': !node.enabled,
      'ring-2 ring-emerald-600 dark:ring-emerald-400': isBatchMode && isSelected,
      'cursor-pointer': isBatchMode
    }" @click="isBatchMode ? emit('toggleSelect') : null">
    <div class="relative z-10 flex-1 flex flex-col p-5">
      <!-- 头部区域 -->
      <div class="flex items-start justify-between gap-3 mb-4">
        <!-- 复选框（批量模式） -->
        <div v-if="isBatchMode" class="flex-shrink-0" @click.stop>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" :checked="isSelected" @change="emit('toggleSelect')"
              class="w-5 h-5 text-emerald-600 bg-gray-100 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer">
          </label>
        </div>

        <div class="w-full truncate">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-lg text-gray-800 dark:text-gray-100 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300"
                :title="node.name || '未命名节点'">
                {{ node.name || '未命名节点' }}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs px-2 py-1 rounded-lg border" :class="protocolStyle.style">{{ protocolStyle.text
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button @click.stop="emit('edit')"
            class="p-2.5 rounded-xl hover:bg-indigo-500/10 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 hover-lift"
            title="编辑节点">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
            </svg>
          </button>
          <button @click.stop="emit('delete')"
            class="p-2.5 rounded-xl hover:bg-red-500/10 text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 hover-lift"
            title="删除节点">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- URL区域 -->
      <div class="flex-grow flex flex-col justify-start space-y-3">
        <div class="relative">
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">节点链接</label>
          <input type="text" :value="node.url" readonly
            class="w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 font-mono bg-gray-50/60 dark:bg-gray-900/75 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-300 truncate" />
        </div>
      </div>
    </div>
  </div>
</template>
