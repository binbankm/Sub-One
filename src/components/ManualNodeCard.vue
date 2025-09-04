<script setup>
import { computed } from 'vue';
import { getProtocolFromUrl, getProtocolInfo } from '../lib';

const props = defineProps({
  node: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['delete', 'edit']);

const protocol = computed(() => getProtocolFromUrl(props.node.url));

const protocolStyle = computed(() => {
  const protocolInfo = getProtocolInfo(protocol.value);
  return {
    text: protocolInfo.text,
    style: protocolInfo.style
  };
});
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
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 truncate" :title="node.url">
          {{ node.url.substring(0, 50) }}{{ node.url.length > 50 ? '...' : '' }}
        </p>
      </div>
    </div>

    <div class="relative z-10 flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <button @click.stop="emit('edit')" class="p-1.5 rounded-lg hover:bg-indigo-500/10 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200" title="编辑节点">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
            </svg>
        </button>
        <button @click.stop="emit('delete')" class="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all duration-200" title="删除节点">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    </div>
  </div>
</template>