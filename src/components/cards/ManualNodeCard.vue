<!--
  ==================== 手动节点卡片组件 ====================
  
  功能说明：
  - 显示单个手动节点的信息卡片
  - 支持编辑、删除功能
  - 支持批量选择模式
  - 一键复制节点链接
  - 彩色顶部条根据协议类型显示
  
  ==================================================
-->

<script setup lang="ts">
import { computed } from 'vue';
import { useToastStore } from '../../stores/toast';
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

const toastStore = useToastStore();

/** 从 URL 提取协议类型 */
const getProtocol = (url?: string) => {
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

/** 协议样式配置 - 不同协议使用不同的渐变色和图标 */
const protocolInfo = computed(() => {
  const p = protocol.value;
  switch (p) {
    case 'anytls':
      return {
        text: 'AnyTLS',
        icon: '🌐',
        gradient: 'from-slate-400 to-gray-500',
        bg: 'bg-slate-100 dark:bg-slate-900/30',
        color: 'text-slate-600 dark:text-slate-400'
      };
    case 'vless':
      return {
        text: 'VLESS',
        icon: '🚀',
        gradient: 'from-blue-400 to-indigo-500',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        color: 'text-blue-600 dark:text-blue-400'
      };
    case 'hysteria2':
      return {
        text: 'HY2',
        icon: '⚡',
        gradient: 'from-purple-400 to-violet-500',
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        color: 'text-purple-600 dark:text-purple-400'
      };
    case 'hysteria':
      return {
        text: 'Hysteria',
        icon: '⚡',
        gradient: 'from-fuchsia-400 to-pink-500',
        bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
        color: 'text-fuchsia-600 dark:text-fuchsia-400'
      };
    case 'tuic':
      return {
        text: 'TUIC',
        icon: '🚀',
        gradient: 'from-cyan-400 to-blue-500',
        bg: 'bg-cyan-100 dark:bg-cyan-900/30',
        color: 'text-cyan-600 dark:text-cyan-400'
      };
    case 'trojan':
      return {
        text: 'TROJAN',
        icon: '🛡️',
        gradient: 'from-red-400 to-rose-500',
        bg: 'bg-red-100 dark:bg-red-900/30',
        color: 'text-red-600 dark:text-red-400'
      };
    case 'ssr':
      return {
        text: 'SSR',
        icon: '🛡️',
        gradient: 'from-rose-400 to-red-500',
        bg: 'bg-rose-100 dark:bg-rose-900/30',
        color: 'text-rose-600 dark:text-rose-400'
      };
    case 'ss':
      return {
        text: 'SS',
        icon: '🔒',
        gradient: 'from-orange-400 to-red-500',
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        color: 'text-orange-600 dark:text-orange-400'
      };
    case 'vmess':
      return {
        text: 'VMESS',
        icon: '⚡',
        gradient: 'from-teal-400 to-cyan-500',
        bg: 'bg-teal-100 dark:bg-teal-900/30',
        color: 'text-teal-600 dark:text-teal-400'
      };
    case 'socks5':
      return {
        text: 'SOCKS5',
        icon: '🔌',
        gradient: 'from-lime-400 to-green-500',
        bg: 'bg-lime-100 dark:bg-lime-900/30',
        color: 'text-lime-600 dark:text-lime-400'
      };
    case 'http':
      return {
        text: 'HTTP',
        icon: '🔓',
        gradient: 'from-green-400 to-emerald-500',
        bg: 'bg-green-100 dark:bg-green-900/30',
        color: 'text-green-600 dark:text-green-400'
      };
    default:
      return {
        text: 'LINK',
        icon: '🔗',
        gradient: 'from-gray-400 to-slate-500',
        bg: 'bg-gray-100 dark:bg-gray-900/30',
        color: 'text-gray-600 dark:text-gray-400'
      };
  }
});

/** 复制节点链接到剪贴板 */
const copyToClipboard = (url: string) => {
  navigator.clipboard.writeText(url).then(() => {
    toastStore.showToast('已复制节点链接', 'success');
  }).catch(() => {
    toastStore.showToast('复制失败', 'error');
  });
};
</script>

<template>
  <!-- 卡片容器 -->
  <div
    class="group relative bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 overflow-hidden h-full flex flex-col shadow-sm hover:shadow-lg"
    :class="{
      'opacity-60': !node.enabled,
      'ring-2 ring-emerald-500 dark:ring-emerald-400 border-emerald-500': isBatchMode && isSelected,
      'cursor-pointer': isBatchMode
    }" @click="isBatchMode ? emit('toggleSelect') : null">
    
    <!-- 顶部彩色条 -->
    <div class="h-1 bg-gradient-to-r" :class="protocolInfo.gradient"></div>

    <div class="flex-1 flex flex-col p-4">
      <!-- 头部：复选框 + 协议标签 + 操作按钮 -->
      <div class="flex items-start gap-3 mb-3">
        <!-- 批量模式复选框 -->
        <div v-if="isBatchMode" class="flex-shrink-0 pt-0.5" @click.stop>
          <input type="checkbox" :checked="isSelected" @change="emit('toggleSelect')"
            class="w-5 h-5 rounded-md border-gray-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-all">
        </div>

        <!-- 协议标签 -->
        <div class="flex-1">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm"
            :class="protocolInfo.bg + ' ' + protocolInfo.color">
            <span class="text-base">{{ protocolInfo.icon }}</span>
            <span>{{ protocolInfo.text }}</span>
          </span>
        </div>

        <!-- 操作按钮 -->
        <div class="flex-shrink-0 flex items-center gap-1" 
          :class="isBatchMode ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity duration-200'"
          @click.stop>
          <button @click="emit('edit')"
            class="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
            title="编辑节点">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
            </svg>
          </button>
          <button @click="emit('delete')"
            class="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
            title="删除节点">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 节点名称 -->
      <div class="mb-3">
        <h4 class="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2"
          :title="node.name || '未命名节点'">
          {{ node.name || '未命名节点' }}
        </h4>
      </div>

      <!-- URL 展示区域 -->
      <div class="mt-auto">
        <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div class="flex items-start gap-2">
            <!-- URL 图标 -->
            <svg class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>

            <!-- URL 文本 -->
            <div class="flex-1 min-w-0">
              <p class="text-xs font-mono text-gray-600 dark:text-gray-400 break-all leading-relaxed line-clamp-2"
                :title="node.url">
                {{ node.url }}
              </p>
            </div>

            <!-- 复制按钮 -->
            <button @click.stop="copyToClipboard(node.url)"
              class="flex-shrink-0 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
              title="复制节点链接">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
