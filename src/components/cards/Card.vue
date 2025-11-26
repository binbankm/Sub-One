<script setup>
import { computed, ref } from 'vue';
import { useToastStore } from '../../stores/toast.js';

const props = defineProps({
  sub: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['delete', 'change', 'update', 'edit', 'showNodes']);

const toastStore = useToastStore();

// 复制URL函数
const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(props.sub.url);
    toastStore.showToast('链接已复制到剪贴板', 'success');
  } catch (error) {
    console.error('复制失败:', error);
    toastStore.showToast('复制失败', 'error');
  }
};

const getProtocol = (url) => {
  try {
    if (!url) return 'unknown';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.startsWith('https://')) return 'https';
    if (lowerUrl.startsWith('http://')) return 'http';
    if (lowerUrl.includes('clash')) return 'clash';
  } catch {
    return 'unknown';
  }
  return 'unknown';
};

const protocol = computed(() => getProtocol(props.sub.url));

const protocolStyle = computed(() => {
  const p = protocol.value;
  switch (p) {
    case 'https': return { text: 'HTTPS', style: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30' };
    case 'clash': return { text: 'CLASH', style: 'bg-gradient-to-r from-sky-500/20 to-blue-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30' };
    case 'http': return { text: 'HTTP', style: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30' };
    default: return { text: 'SUB', style: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30' };
  }
});

const formatBytes = (bytes, decimals = 2) => {
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
  const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
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
  if (p >= 90) return 'bg-gradient-to-r from-red-500 to-red-600';
  if (p >= 75) return 'bg-gradient-to-r from-orange-500 to-orange-600';
  return 'bg-gradient-to-r from-blue-500 to-indigo-600';
});

// 构建信息文本
const infoText = computed(() => {
  const parts = [];
  
  if (trafficInfo.value) {
    parts.push(`${trafficInfo.value.used} / ${trafficInfo.value.total}`);
  }
  
  if (sub.nodeCount !== undefined) {
    parts.push(`${sub.nodeCount} 个节点`);
  }
  
  return parts.join('，') || '暂无信息';
});
</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 p-4 group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] flex flex-col shadow-sm hover:shadow-lg min-h-[160px]"
    :class="{ 'opacity-50': !sub.enabled }"
  >
    <!-- 装饰性背景 -->
    <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full -translate-y-16 translate-x-16"></div>

    <div class="relative z-10 flex flex-col h-full">
      <!-- 顶部：图标 + 名称 + 操作按钮 -->
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-lg text-gray-800 dark:text-gray-100 truncate" :title="sub.name || '未命名订阅'">
              {{ sub.name || '未命名订阅' }}
            </p>
            <span class="text-xs px-2 py-0.5 rounded-lg border inline-block mt-1" :class="protocolStyle.style">
              {{ protocolStyle.text }}
            </span>
          </div>
        </div>

        <!-- 编辑和删除按钮 -->
        <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button @click.stop="emit('edit')" class="p-2 rounded-lg hover:bg-indigo-500/10 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200" title="编辑">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
            </svg>
          </button>
          <button @click.stop="emit('delete')" class="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all duration-200" title="删除">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 中间：信息文本 -->
      <div class="flex-1 mb-3">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ infoText }}
        </p>
        
        <!-- 流量进度条 -->
        <div v-if="trafficInfo" class="mt-2">
          <div class="relative w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
              :class="trafficColorClass"
              :style="{ width: trafficInfo.percentage + '%' }"
            ></div>
          </div>
          <div class="flex justify-between items-center mt-1">
            <span class="text-xs text-gray-400">{{ trafficInfo.percentage.toFixed(1) }}% 已用</span>
            <span v-if="expiryInfo" class="text-xs px-1.5 py-0.5 rounded" :class="expiryInfo.style">
              {{ expiryInfo.daysRemaining }}
            </span>
          </div>
        </div>
      </div>

      <!-- 底部：开关 + 操作按钮 -->
      <div class="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700" @click.stop>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" v-model="sub.enabled" @change="emit('change')" class="sr-only peer">
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          <span class="ml-3 text-xs font-medium text-gray-600 dark:text-gray-300">{{ sub.enabled ? '已启用' : '已禁用' }}</span>
        </label>

        <div class="flex items-center gap-2 flex-shrink-0">
          <button @click.stop="emit('showNodes')" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-1 transform hover:scale-105" title="显示节点信息">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>节点</span>
          </button>
          <button @click.stop="copyUrl" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-1 transform hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>复制</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>