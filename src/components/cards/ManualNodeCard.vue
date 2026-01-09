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
import { getProtocol, getProtocolInfo } from '../../utils/protocols';

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

const protocol = computed(() => getProtocol(props.node.url));

/** 协议样式配置 - 不同协议使用不同的渐变色和图标 */
const protocolInfo = computed(() => getProtocolInfo(protocol.value));



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
    class="card-glass rounded-xl border-2 hover:border-indigo-300 dark:hover:border-indigo-600 group relative overflow-hidden h-full flex flex-col"
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
            <button v-if="node.url" @click.stop="copyToClipboard(node.url)"
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


