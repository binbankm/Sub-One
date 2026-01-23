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
import { useToastStore } from '../../../stores/toast';
import type { Node } from '../../../types/index';
import { getProtocol, getProtocolInfo } from '../../../utils/protocols';
import { copyToClipboard } from '../../../utils/utils';

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

const protocol = computed(() => {
  const node = props.node as any;
  return (node.type || getProtocol(node.url)).toLowerCase();
});

/** 协议样式配置 - 不同协议使用不同的渐变色 and 图标 */
const protocolInfo = computed(() => getProtocolInfo(protocol.value));

/** 复制节点链接到剪贴板 */
const handleCopy = async (url: string) => {
  const success = await copyToClipboard(url);
  if (success) {
    toastStore.showToast('已复制节点链接', 'success');
  } else {
    toastStore.showToast('复制失败', 'error');
  }
};
</script>

<template>
  <!-- 卡片容器 -->
  <div
    class="card-glass group relative flex flex-col h-full overflow-hidden transition-all duration-300 rounded-2xl border border-gray-300 dark:border-gray-800 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
    :class="{
      'opacity-60 grayscale filter': !node.enabled,
      'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-900 border-emerald-500/50': isBatchMode && isSelected,
      'cursor-pointer': isBatchMode
    }" @click="isBatchMode ? emit('toggleSelect') : null">
    
    <!-- 顶部彩色条 (更细致的渐变) -->
    <div class="h-1.5 w-full bg-gradient-to-r opacity-80" :class="protocolInfo.gradient"></div>

    <div class="flex-1 flex flex-col p-5">
      <!-- 头部：复选框 + 协议标签 + 操作按钮 -->
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="flex items-center gap-3 overflow-hidden">
          <!-- 批量模式复选框 -->
          <div v-if="isBatchMode" class="flex-shrink-0 animate-in fade-in zoom-in duration-200" @click.stop>
            <div class="relative flex items-center justify-center w-5 h-5">
                <input type="checkbox" :checked="isSelected" @change="emit('toggleSelect')"
                  class="peer appearance-none w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-md checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer" />
                <svg class="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" 
                  viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
          </div>

          <!-- 协议标签 (胶囊样式) -->
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm border"
            :class="[protocolInfo.bg, protocolInfo.color, 'border-transparent bg-opacity-10 dark:bg-opacity-20']">
            <span class="text-sm font-normal filter drop-shadow-sm">{{ protocolInfo.icon }}</span>
            <span>{{ protocolInfo.text }}</span>
          </span>
        </div>

        <!-- 操作按钮 (悬浮显示) -->
        <div class="flex items-center gap-1 transition-all duration-200"
          :class="isBatchMode ? 'opacity-100' : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'"
          @click.stop>
          <button @click="emit('edit')"
            class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-400 transition-colors"
            title="编辑">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
            </svg>
          </button>
          <button @click="emit('delete')"
            class="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/40 dark:hover:text-rose-400 transition-colors"
            title="删除">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 节点名称 -->
      <div class="mb-4">
        <h4 class="text-base font-bold text-gray-800 dark:text-gray-100 leading-snug break-words line-clamp-2 hover:line-clamp-none transition-all duration-300"
          :title="node.name || '未命名节点'">
          {{ node.name || '未命名节点' }}
        </h4>
      </div>

      <!-- 底部信息：地址 & 复制 -->
      <div class="mt-auto pt-3 border-t border-gray-300 dark:border-gray-700/50">
        <div class="flex items-center justify-between gap-2 text-xs">
          <!-- 服务器地址展示 (更简洁) -->
          <div class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 overflow-hidden" title="服务器地址">
             <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span class="truncate font-mono">{{ node.server }}</span>
              <span class="text-gray-300 dark:text-gray-600">:</span>
              <span class="font-mono text-gray-400">{{ node.port }}</span>
          </div>

          <!-- 复制链接按钮 -->
          <button v-if="node.url" @click.stop="handleCopy(node.url)"
            class="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all font-medium"
            title="复制完整链接">
            <span class="hidden sm:inline">复制</span>
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 01-2-2V3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


