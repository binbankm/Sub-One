<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useToastStore } from '../stores/toast.js';

const props = defineProps({
  subscriptions: {
    type: Array,
    default: () => []
  },
  profiles: {
    type: Array,
    default: () => []
  },
  config: {
    type: Object,
    default: () => ({})
  }
});

const { showToast } = useToastStore();

const selectedId = ref('default');
const selectedFormat = ref('自适应');
const showUrl = ref(false);
const copied = ref(false);
let copyTimeout = null;

const formats = ['自适应', 'Base64', 'Clash', 'Sing-Box', 'Surge', 'Loon'];

const subLink = computed(() => {
  if (!props.config?.mytoken) return '';
  
  const baseUrl = window.location.origin;
  const token = props.config.mytoken;
  const format = selectedFormat.value;
  
  // 构建基础URL
  let url;
  if (selectedId.value === 'default') {
    url = `${baseUrl}/${token}`;
  } else {
    url = `${baseUrl}/${token}/${selectedId.value}`;
  }
  
  // 根据格式添加参数
  if (format === '自适应') {
    return url;
  }
  
  const formatMapping = {
    'Base64': 'base64',
    'Clash': 'clash',
    'Sing-Box': 'singbox',
    'Surge': 'surge',
    'Loon': 'loon'
  };
  
  const formatParam = formatMapping[format] || format.toLowerCase();
  return `${url}?${formatParam}`;
});

const copyToClipboard = async () => {
  if (!subLink.value) {
    showToast('链接无效，无法复制', 'error');
    return;
  }
  navigator.clipboard.writeText(subLink.value);
  showToast('链接已复制到剪贴板', 'success');
  copied.value = true;
  clearTimeout(copyTimeout);
  copyTimeout = setTimeout(() => { copied.value = false; }, 2000);
};

onUnmounted(() => {
  clearTimeout(copyTimeout);
});
</script>

<template>
  <div class="sticky top-24">
    <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl border border-gray-300/50 dark:border-gray-700/30 p-6 relative overflow-hidden hover:shadow-xl transition-all duration-300">
      <!-- 装饰性背景 -->
      <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full -translate-y-12 translate-x-12"></div>
      
      <div class="relative z-10">
        <!-- 选择订阅内容 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">1. 选择订阅内容</label>
          <select v-model="selectedId" class="w-full px-4 py-3 text-sm bg-white/60 dark:bg-gray-800/75 border border-gray-300/50 dark:border-gray-700/50 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200">
            <option value="default">默认订阅 (全部启用节点)</option>
            <option v-for="profile in profiles" :key="profile.id" :value="profile.customId || profile.id">
              {{ profile.name }}
            </option>
          </select>
        </div>

        <!-- 选择格式 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">2. 选择格式</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="format in formats"
              :key="format"
              @click="selectedFormat = format"
              class="px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 flex justify-center items-center transform hover:scale-105"
                              :class="[
                selectedFormat === format
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'bg-white/60 dark:bg-gray-800/75 text-gray-600 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-800/85 border border-gray-200/50 dark:border-gray-700'
              ]"
            >
              {{ format }}
            </button>
          </div>
        </div>

        <!-- 链接显示区域 -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">3. 复制链接</label>
          <div class="relative">
            <input
              type="text"
              :value="showUrl ? subLink : '••••••••••••••••••••••••••••••••••••••••'"
              readonly
              class="w-full px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono bg-white/60 dark:bg-gray-800/75 border border-gray-200/50 dark:border-gray-700/50 rounded-xl"
              :class="{ 'select-none': !showUrl }"
            />
            <div class="flex items-center gap-2 mt-3">
              <button 
                @click="showUrl = !showUrl"
                class="flex-1 px-3 py-2 rounded-xl hover:bg-orange-500/20 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200 flex items-center justify-center gap-2"
                :title="showUrl ? '隐藏链接' : '显示链接'"
              >
                <svg v-if="showUrl" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
                <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span class="text-sm">{{ showUrl ? '隐藏' : '显示' }}</span>
              </button>
              <button 
                v-if="showUrl"
                @click="copyToClipboard"
                class="flex-1 px-3 py-2 rounded-xl hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-all duration-200 flex items-center justify-center gap-2"
                :title="copied ? '已复制' : '复制'"
              >
                <Transition name="fade" mode="out-in">
                  <svg v-if="copied" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </Transition>
                <span class="text-sm">{{ copied ? '已复制' : '复制' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 提示信息 -->
        <div v-if="config?.mytoken === 'auto'" class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 animate-pulse-breathing">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1 animate-pulse">自动Token提示</p>
              <p class="text-xs text-yellow-600 dark:text-yellow-400">当前为自动Token，链接可能会变化。为确保链接稳定，推荐在"设置"中配置一个固定Token。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse-breathing {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
    border-color: rgb(245, 158, 11);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(245, 158, 11, 0.1);
    border-color: rgb(245, 158, 11);
  }
}

.animate-pulse-breathing {
  animation: pulse-breathing 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

.animate-bounce {
  animation: bounce 2s infinite;
}
</style>
