<script setup>
import { computed } from 'vue';
import { extractHostAndPort, getProtocolFromUrl, getProtocolInfo } from '../lib';

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

const protocol = computed(() => getProtocolFromUrl(props.node.url));
const hostAndPort = computed(() => extractHostAndPort(props.node.url));

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
      <p class="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate" :title="node.name">
        {{ node.name || '未命名节点' }}
      </p>
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
      <button @click.stop="emit('edit')" class="p-1.5 rounded-full hover:bg-gray-500/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="编辑节点">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
      </button>
      <button @click.stop="emit('delete')" class="p-1.5 rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-500" title="删除节点">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  </div>
</template>