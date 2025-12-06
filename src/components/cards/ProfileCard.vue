<script setup lang="ts">
import { computed } from 'vue';
import type { Profile, Subscription } from '../../types';

const props = withDefaults(defineProps<{
  profile: Profile;
  allSubscriptions?: Subscription[];
  isBatchMode?: boolean;
  isSelected?: boolean;
}>(), {
  allSubscriptions: () => [],
  isBatchMode: false,
  isSelected: false
});

const emit = defineEmits<{
  (e: 'delete'): void;
  (e: 'change', profile: Profile): void;
  (e: 'edit'): void;
  (e: 'copy-link'): void;
  (e: 'showNodes'): void;
  (e: 'toggleSelect'): void;
}>();

// 计算实际的节点数量
const totalNodeCount = computed(() => {
  // 手动节点数量
  const manualNodeCount = props.profile.manualNodes.length;

  // 订阅节点数量
  const subscriptionNodeCount = props.profile.subscriptions.reduce((total, subId) => {
    const subscription = props.allSubscriptions.find(sub => sub.id === subId);
    // 只有当订阅存在且已启用时，才计入节点数
    if (subscription && subscription.enabled) {
      return total + (subscription.nodeCount || 0);
    }
    return total;
  }, 0);

  return manualNodeCount + subscriptionNodeCount;
});

</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 p-4 group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] flex flex-col shadow-sm hover:shadow-lg min-h-[140px]"
    :class="{
      'opacity-50': !profile.enabled,
      'ring-2 ring-purple-600 dark:ring-purple-400': isBatchMode && isSelected,
      'cursor-pointer': isBatchMode
    }" @click="isBatchMode ? emit('toggleSelect') : null">

    <div class="relative z-10 flex items-start justify-between gap-3">
      <!-- 复选框（批量模式） -->
      <div v-if="isBatchMode" class="flex-shrink-0" @click.stop>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" :checked="isSelected" @change="emit('toggleSelect')"
            class="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer">
        </label>
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2">
          <div
            class="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <p class="font-bold text-lg text-gray-800 dark:text-gray-100 truncate" :title="profile.name">
            {{ profile.name }}
          </p>
        </div>
        <p class="text-sm text-gray-700 dark:text-gray-300 break-words leading-relaxed">
          包含 {{ profile.subscriptions.length }} 个订阅，{{ totalNodeCount }} 个节点
        </p>
      </div>

      <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <button @click.stop="emit('edit')"
          class="p-1.5 rounded-lg hover:bg-indigo-500/10 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
          title="编辑">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
          </svg>
        </button>
        <button @click.stop="emit('delete')"
          class="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 dark:text-gray-300 hover:text-red-500 transition-all duration-200"
          title="删除">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex-grow"></div>

    <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" :checked="profile.enabled"
          @change="$emit('change', { ...profile, enabled: ($event.target as HTMLInputElement).checked })"
          class="sr-only peer">
        <div
          class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r from-indigo-500 to-purple-600">
        </div>
        <span class="ml-3 text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">{{ profile.enabled ?
          '已启用' : '已禁用' }}</span>
      </label>

      <div class="flex items-center gap-2 flex-shrink-0">
        <button @click.stop="emit('showNodes')"
          class="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 flex items-center gap-1.5 whitespace-nowrap"
          title="显示节点信息">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>节点</span>
        </button>
        <button @click.stop="emit('copy-link')"
          class="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 flex items-center gap-1.5 whitespace-nowrap">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>复制</span>
        </button>
      </div>
    </div>
  </div>
</template>
