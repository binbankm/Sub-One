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

// 鼠标事件处理
const mouseDownTime = ref(0);
const mouseDownPosition = ref({ x: 0, y: 0 });
const hasDragged = ref(false);

const handleMouseDown = (event) => {
  mouseDownTime.value = Date.now();
  mouseDownPosition.value = { x: event.clientX, y: event.clientY };
  hasDragged.value = false;
  
  // 添加鼠标移动和抬起事件监听
  const handleMouseMove = (e) => {
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
  if (p >= 90) return 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30';
  if (p >= 75) return 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/30';
  return 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-500/30';
});
</script>

<template>
  <div 
    class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 group relative overflow-hidden transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg flex flex-col h-full"
    :class="{ 'opacity-60': !sub.enabled, 'ring-2 ring-indigo-500/50': sub.isNew }"
    @mousedown="handleMouseDown"
  >
    <div class="relative z-10 flex-1 flex flex-col p-4 sm:p-5">
      <!-- 头部区域 -->
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-base text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" :title="sub.name || '未命名订阅'">
                {{ sub.name || '未命名订阅' }}
              </h3>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wider" :class="protocolStyle.style">{{ protocolStyle.text }}</span>
              <span v-if="sub.nodeCount > 0" class="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                <span class="w-1 h-1 rounded-full bg-green-500"></span>
                {{ sub.nodeCount }} 节点
              </span>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 (Hover显示) -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button @click.stop="emit('edit')" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="编辑">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
            </svg>
          </button>
          <button @click.stop="emit('delete')" class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors" title="删除">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- 链接区域 (紧凑版) -->
      <div class="mb-4 group/url">
        <div class="relative flex items-center">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <input 
            type="text" 
            :value="sub.url"
            readonly 
            class="w-full pl-9 pr-20 py-2 text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors truncate" 
          />
          <div class="absolute inset-y-0 right-0 flex items-center pr-1">
            <button 
              @click.stop="copyUrl"
              class="px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
            >
              复制
            </button>
          </div>
        </div>
      </div>
      
      <!-- 流量信息 (紧凑版) -->
      <div v-if="trafficInfo" class="mt-auto bg-gray-50/50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50">
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-baseline gap-1">
            <span class="text-sm font-bold text-gray-800 dark:text-gray-200">{{ trafficInfo.used }}</span>
            <span class="text-xs text-gray-400">/ {{ trafficInfo.total }}</span>
          </div>
          <span v-if="expiryInfo" class="text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 shadow-sm" :class="expiryInfo.style">
            {{ expiryInfo.daysRemaining }}
          </span>
        </div>
        
        <div class="relative w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            class="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
            :class="trafficColorClass"
            :style="{ width: trafficInfo.percentage + '%' }"
          ></div>
        </div>
      </div>
      
      <div v-else class="mt-auto flex items-center justify-center h-[66px] bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 text-xs text-gray-400">
        暂无流量信息
      </div>

      <!-- 底部开关 -->
      <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50" @click.stop>
        <div class="flex items-center gap-2">
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" :checked="sub.enabled" @change="emit('change')" class="sr-only peer">
            <div class="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[0px] after:left-[0px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500"></div>
          </label>
          <span class="text-xs text-gray-400 dark:text-gray-500">{{ sub.enabled ? '已启用' : '已禁用' }}</span>
        </div>
        
        <button 
          @click.stop="emit('update')" 
          :disabled="sub.isUpdating" 
          class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50" 
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" :class="{'animate-spin': sub.isUpdating}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ sub.isUpdating ? '更新中' : '更新' }}
        </button>
      </div>
    </div>
  </div>
</template>