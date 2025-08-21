<script setup>
import { computed } from 'vue';

const props = defineProps({
  profile: {
    type: Object,
    required: true
  },
  allSubscriptions: {
    type: Array,
    default: () => []
  },
});

const emit = defineEmits(['delete', 'change', 'edit', 'copy-link', 'showNodes']);

// 计算实际的节点数量
const totalNodeCount = computed(() => {
  // 手动节点数量
  const manualNodeCount = props.profile.manualNodes.length;
  
  // 订阅节点数量
  const subscriptionNodeCount = props.profile.subscriptions.reduce((total, subId) => {
    const subscription = props.allSubscriptions.find(sub => sub.id === subId);
    return total + (subscription?.nodeCount || 0);
  }, 0);
  
  return manualNodeCount + subscriptionNodeCount;
});

</script>

<template>
  <div
    class="bg-white/60 dark:bg-gray-800/75 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-4 group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] flex flex-col shadow-sm hover:shadow-lg min-h-[140px]"
    :class="{ 'opacity-50': !profile.enabled }"
  >
    <!-- 装饰性背景 -->
    <div class="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full -translate-y-8 translate-x-8"></div>
    
    <div class="relative z-10 flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2">
          <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p class="font-bold text-lg text-gray-800 dark:text-gray-100 truncate" :title="profile.name">
            {{ profile.name }}
          </p>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 break-words leading-relaxed">
          包含 {{ profile.subscriptions.length }} 个订阅，{{ totalNodeCount }} 个节点
        </p>
      </div>

      <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <button @click.stop="emit('edit')" class="p-1.5 rounded-lg hover:bg-indigo-500/10 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200" title="编辑">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
          </svg>
        </button>
        <button @click.stop="emit('delete')" class="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all duration-200" title="删除">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex-grow"></div>

    <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" :checked="profile.enabled" @change="$emit('change', { ...profile, enabled: $event.target.checked })" class="sr-only peer">
        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        <span class="ml-3 text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">{{ profile.enabled ? '已启用' : '已禁用' }}</span>
      </label>

      <div class="flex items-center gap-2 flex-shrink-0">
        <button @click.stop="emit('showNodes')" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-1 transform hover:scale-105 whitespace-nowrap" title="显示节点信息">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>节点</span>
        </button>
        <button @click.stop="emit('copy-link')" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-1 transform hover:scale-105 whitespace-nowrap">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>复制</span>
        </button>
      </div>
    </div>
  </div>
</template>