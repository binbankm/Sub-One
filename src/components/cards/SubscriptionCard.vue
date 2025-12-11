<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToastStore } from '../../stores/toast';
import type { Subscription } from '../../types';

const props = defineProps<{
  sub: Subscription;
  isBatchMode?: boolean;
  isSelected?: boolean;
}>();

const emit = defineEmits<{
  (e: 'delete'): void;
  (e: 'change'): void;
  (e: 'update'): void;
  (e: 'edit'): void;
  (e: 'showNodes'): void;
  (e: 'toggleSelect'): void;
}>();

const toastStore = useToastStore();

// 复制URL函数
const copyUrl = async () => {
  if (!props.sub.url) return;
  try {
    await navigator.clipboard.writeText(props.sub.url);
    toastStore.showToast('链接已复制到剪贴板', 'success');
  } catch (error) {
    console.error('复制失败:', error);
    toastStore.showToast('复制失败', 'error');
  }
};

// URL显示状态
const showUrl = ref(false);

// 切换URL显示状态
const toggleUrlVisibility = () => {
  showUrl.value = !showUrl.value;
};

// 鼠标事件处理
const mouseDownTime = ref(0);
const mouseDownPosition = ref({ x: 0, y: 0 });
const hasDragged = ref(false);

const handleMouseDown = (event: MouseEvent) => {
  mouseDownTime.value = Date.now();
  mouseDownPosition.value = { x: event.clientX, y: event.clientY };
  hasDragged.value = false;

  // 添加鼠标移动和抬起事件监听
  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = Math.abs(e.clientX - mouseDownPosition.value.x);
    const deltaY = Math.abs(e.clientY - mouseDownPosition.value.y);
    if (deltaX > 5 || deltaY > 5) {
      hasDragged.value = true;
    }
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};





const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const trafficInfo = computed(() => {
  const info = props.sub.userInfo;
  if (!info || info.total === undefined || info.download === undefined || info.upload === undefined) return null;
  const total = info.total;
  const used = info.download + info.upload;
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return {
    used: formatBytes(used),
    total: formatBytes(total),
    percentage: percentage,
  };
});

const expiryInfo = computed(() => {
  const expireTimestamp = props.sub.userInfo?.expire;
  if (!expireTimestamp) return null;
  const expiryDate = new Date(expireTimestamp * 1000);
  const now = new Date();
  expiryDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  let style = 'text-gray-500 dark:text-gray-400';
  if (diffDays < 0) style = 'text-red-500 font-bold';
  else if (diffDays <= 7) style = 'text-yellow-500 font-semibold';
  return {
    date: expiryDate.toLocaleDateString(),
    daysRemaining: diffDays < 0 ? '已过期' : (diffDays === 0 ? '今天到期' : `${diffDays} 天后`),
    style: style
  };
});

const trafficColorClass = computed(() => {
  if (!trafficInfo.value) return '';
  const p = trafficInfo.value.percentage;
  if (p >= 90) return 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30';
  if (p >= 75) return 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/30';
  return 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-500/30';
});


</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] flex flex-col h-full min-h-[280px] sm:min-h-[240px] shadow-sm hover:shadow-lg"
    :class="{
      'opacity-50': !sub.enabled,
      'ring-2 ring-indigo-500/50': sub.isNew,
      'ring-2 ring-indigo-600 dark:ring-indigo-400': isBatchMode && isSelected,
      'cursor-pointer': isBatchMode
    }" @mousedown="handleMouseDown" @click="isBatchMode ? emit('toggleSelect') : null">
    <div class="relative z-10 flex-1 flex flex-col p-5">
      <!-- 头部区域 -->
      <div class="flex items-start justify-between gap-3 mb-4 sm:mb-6">
        <!-- 复选框（批量模式） -->
        <div v-if="isBatchMode" class="flex-shrink-0 pt-1" @click.stop>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" :checked="isSelected" @change="emit('toggleSelect')"
              class="w-5 h-5 text-indigo-600 bg-gray-100 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer">
          </label>
        </div>

        <div class="w-full truncate">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-lg text-gray-800 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300"
                :title="sub.name || '未命名订阅'">
                {{ sub.name || '未命名订阅' }}
              </p>
              <!-- 规则过滤提示 -->
              <div v-if="sub.exclude && sub.exclude.trim()"
                class="flex items-center gap-1.5 mt-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-500/15 to-amber-500/15 dark:from-orange-500/20 dark:to-amber-500/20 rounded-lg border border-orange-300/50 dark:border-orange-500/30 w-fit animate-pulse-slow"
                :title="`已启用规则过滤: ${sub.exclude}`">
                <svg xmlns="http://www.w3.org/2000/svg"
                  class="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span class="text-[10px] font-bold text-orange-700 dark:text-orange-300 tracking-wide">规则过滤</span>
              </div>
            </div>
          </div>
        </div>

        <div
          class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button @click.stop="emit('edit')"
            class="p-2.5 rounded-xl hover:bg-indigo-500/10 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 hover-lift"
            title="编辑">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
            </svg>
          </button>
          <button @click.stop="emit('delete')"
            class="p-2.5 rounded-xl hover:bg-red-500/10 text-gray-500 dark:text-gray-300 hover:text-red-500 transition-all duration-200 hover-lift"
            title="删除">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- URL区域 -->
      <div class="flex-grow flex flex-col justify-start space-y-3 sm:space-y-4">
        <div class="relative">
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">订阅链接</label>
          <input type="text" :value="showUrl ? sub.url : '••••••••••••••••••••••••••••••••••••••••'" readonly
            class="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-500 dark:text-gray-400 font-mono bg-gray-50/60 dark:bg-gray-900/75 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-300"
            :class="{ 'select-none': !showUrl }" />
          <div class="flex items-center gap-2 mt-2 sm:mt-3">
            <button @click.stop="toggleUrlVisibility"
              class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl hover:bg-orange-500/20 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200 flex items-center gap-1 sm:gap-2 text-xs font-medium hover-lift"
              :title="showUrl ? '隐藏链接' : '显示链接'">
              <svg v-if="showUrl" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
              <svg v-else class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {{ showUrl ? '隐藏' : '显示' }}
            </button>
            <button v-if="showUrl" @click.stop="copyUrl"
              class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl hover:bg-yellow-500/20 text-gray-600 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 transition-all duration-200 flex items-center gap-1 sm:gap-2 text-xs font-medium hover-lift"
              title="复制链接">
              <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制
            </button>
          </div>
        </div>

        <!-- 流量信息 -->
        <!-- 流量信息 -->
        <div v-if="trafficInfo"
          class="mt-2 p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
          <div class="flex justify-between items-end mb-2">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clip-rule="evenodd" />
              </svg>
              流量使用
            </span>
            <div class="text-right">
              <span class="text-sm font-bold text-gray-800 dark:text-gray-200">{{ trafficInfo.used }}</span>
              <span class="text-xs text-gray-400 mx-1">/</span>
              <span class="text-xs text-gray-500">{{ trafficInfo.total }}</span>
            </div>
          </div>
          <div class="relative w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
              :class="trafficColorClass" :style="{ width: trafficInfo.percentage + '%' }">
              <div class="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>
          <div class="flex justify-between mt-2 items-center">
            <span class="text-[10px] text-gray-400 font-medium">已用 {{ trafficInfo.percentage.toFixed(1) }}%</span>
            <span v-if="expiryInfo"
              class="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600"
              :class="expiryInfo.style">{{ expiryInfo.daysRemaining }}</span>
          </div>
        </div>
      </div>

      <!-- 底部控制区域 -->
      <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50"
        @click.stop>
        <div class="flex items-center gap-3">
          <label class="relative inline-flex items-center cursor-pointer group/toggle">
            <input type="checkbox" :checked="sub.enabled" @change="emit('change')" class="sr-only peer">
            <div
              class="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500 group-hover/toggle:shadow-md transition-all duration-300">
            </div>
          </label>
          <span class="text-xs text-gray-600 dark:text-gray-300 font-medium">{{ sub.enabled ? '已启用' : '已禁用' }}</span>
        </div>

        <div class="flex items-center gap-2">
          <button @click.stop="emit('showNodes')"
            class="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 flex items-center gap-1.5 group/btn">
            <span class="w-1.5 h-1.5 rounded-full"
              :class="(sub.nodeCount || 0) > 0 ? 'bg-green-500' : 'bg-gray-300'"></span>
            {{ sub.nodeCount }} 节点
            <svg xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3 opacity-0 group-hover/btn:opacity-100 -ml-1 transition-all duration-200" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button @click.stop="emit('update')" :disabled="sub.isUpdating"
            class="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :title="sub.isUpdating ? '更新中...' : '更新订阅'">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4"
              :class="{ 'animate-spin text-indigo-500': sub.isUpdating }" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse-slow {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.75;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}
</style>
