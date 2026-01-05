<!--
  订阅链接生成器卡片
  功能：生成不同格式的订阅链接（Base64、Clash、Sing-Box等）
-->

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useToastStore } from '../../stores/toast';
import NodeDetailsModal from '../modals/NodeDetailsModal.vue';
import QRCode from 'qrcode';
import type { AppConfig, Profile, Subscription } from '../../types';

const props = withDefaults(defineProps<{
  subscriptions?: Subscription[];
  profiles?: Profile[];
  config?: AppConfig;
}>(), {
  subscriptions: () => [],
  profiles: () => [],
  config: () => ({}) as AppConfig
});

const { showToast } = useToastStore();

const selectedId = ref('default');
const selectedFormat = ref('自适应');
const showUrl = ref(false);
const copied = ref(false);
let copyTimeout: ReturnType<typeof setTimeout> | null = null;

const formats = ['自适应', 'V2Ray', 'Clash', 'Sing-Box', 'Quantumult X', 'Surge', 'Loon'];

/** 格式映射表 */
const FORMAT_MAPPING: Record<string, string> = {
  'V2Ray': 'base64',
  'Clash': 'clash',
  'Sing-Box': 'singbox',
  'Quantumult X': 'quantumultx',
  'Surge': 'surge',
  'Loon': 'loon'
};



/** 只显示已启用的订阅组 */
const enabledProfiles = computed(() => {
  return props.profiles.filter(profile => profile.enabled);
});

/** 生成订阅链接 */
const subLink = computed(() => {
  const baseUrl = window.location.origin;
  const format = selectedFormat.value;

  let token = '';
  if (selectedId.value === 'default') {
    if (!props.config?.mytoken) return '';
    token = props.config.mytoken;
  } else {
    if (!props.config?.profileToken || props.config.profileToken === 'auto' || !props.config.profileToken.trim()) {
      return '';
    }
    token = props.config.profileToken;
  }

  const url = selectedId.value === 'default'
    ? `${baseUrl}/${token}`
    : `${baseUrl}/${token}/${selectedId.value}`;

  if (format === '自适应') {
    return url;
  }

  const formatParam = FORMAT_MAPPING[format] || format.toLowerCase();
  
  return `${url}?${formatParam}`;
});

/** 复制到剪贴板 */
const copyToClipboard = async () => {
  if (!subLink.value) {
    showToast('链接无效，无法复制', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(subLink.value);
    showToast('链接已复制到剪贴板', 'success');
    copied.value = true;
    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => { copied.value = false; }, 2000);
  } catch (error) {
    console.error('复制失败:', error);
    showToast('复制失败，请手动复制', 'error');
  }
};

const showNodeDetails = ref(false);
const showQrcode = ref(false);
const qrcodeUrl = ref('');

const toggleQrcode = async () => {
  if (!subLink.value) return;
  if (!showQrcode.value) {
    try {
      qrcodeUrl.value = await QRCode.toDataURL(subLink.value, { width: 300, margin: 1 });
    } catch (err) {
      console.error('QR Gen Error:', err);
    }
  }
  showQrcode.value = !showQrcode.value;
};

const previewSubscription = ref<Subscription | null>(null);

/** 打开节点预览 */
const openNodePreview = () => {
  if (!subLink.value) return;

  let previewUrl = subLink.value;
  const urlObj = new URL(previewUrl);
  urlObj.search = '';
  previewUrl = `${urlObj.toString()}?base64`;

  previewSubscription.value = {
    id: 'preview',
    name: '订阅预览',
    url: previewUrl,
    enabled: true
  };
  showNodeDetails.value = true;
};

onUnmounted(() => {
  if (copyTimeout) clearTimeout(copyTimeout);
});
</script>

<template>
  <div class="sticky top-24">
    <div
      class="bg-white/60 dark:bg-gray-800/75 rounded-2xl border border-gray-300/50 dark:border-gray-700/30 p-6 relative overflow-hidden hover:shadow-xl transition-all duration-300">

      <div class="relative z-10">
        <!-- 1. 选择订阅内容 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">1. 选择订阅内容</label>
          <div class="relative">
            <select v-model="selectedId"
              class="w-full px-4 py-3 text-sm text-gray-900 dark:text-white bg-white/60 dark:bg-gray-800/75 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:outline-none transition-all duration-300 appearance-none cursor-pointer">
              <option value="default" class="py-2 bg-white text-gray-900 dark:bg-gray-800 dark:text-white">默认订阅 (全部启用节点)
              </option>
              <option v-for="profile in enabledProfiles" :key="profile.id" :value="profile.customId || profile.id"
                class="py-2 bg-white text-gray-900 dark:bg-gray-800 dark:text-white">
                {{ profile.name }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
              <svg class="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-300" fill="none"
                stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- 2. 选择格式 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">2. 选择格式</label>
          <div class="grid grid-cols-2 gap-2">
            <button v-for="format in formats" :key="format" @click="selectedFormat = format"
              class="px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 flex justify-center items-center transform hover:scale-105"
              :class="[
                selectedFormat === format
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800/75 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800/85 border border-gray-300 dark:border-gray-700'
              ]">
              {{ format }}
            </button>
          </div>
        </div>

        <!-- 2.1 选择规则策略 (动态显示) -->


        <!-- 3. 复制链接 -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">3. 复制链接</label>
          <div class="relative">
            <input type="text" :value="showUrl ? subLink : '••••••••••••••••••••••••••••••••••••••••'" readonly
              class="w-full px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono bg-white/60 dark:bg-gray-800/75 border border-gray-200/50 dark:border-gray-700/50 rounded-xl"
              :class="{ 'select-none': !showUrl }" />
            <div class="flex items-center gap-2 mt-3">
              <button @click="showUrl = !showUrl"
                class="flex-1 px-3 py-2 rounded-xl hover:bg-orange-500/20 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200 flex items-center justify-center gap-2"
                :title="showUrl ? '隐藏链接' : '显示链接'">
                <svg v-if="showUrl" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
                <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span class="text-sm">{{ showUrl ? '隐藏' : '显示' }}</span>
              </button>
              <button v-if="showUrl" @click="copyToClipboard"
                class="flex-1 px-3 py-2 rounded-xl hover:bg-yellow-500/20 text-gray-600 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 transition-all duration-200 flex items-center justify-center gap-2"
                :title="copied ? '已复制' : '复制'">
                <Transition name="fade" mode="out-in">
                  <svg v-if="copied" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-500" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </Transition>
                <span class="text-sm">{{ copied ? '已复制' : '复制' }}</span>
              </button>
              <button v-if="showUrl" @click="openNodePreview"
                class="flex-1 px-3 py-2 rounded-xl hover:bg-indigo-500/20 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 flex items-center justify-center gap-2"
                title="预览节点列表">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span class="text-sm">预览</span>
              </button>
              <button v-if="showUrl" @click="toggleQrcode"
                class="flex-1 px-3 py-2 rounded-xl hover:bg-gray-500/20 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
                :class="{ 'bg-gray-100 dark:bg-gray-700': showQrcode }"
                title="生成二维码">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zm-6 0H6.414a1 1 0 00-.707.293L4 17.086v1.828l1.707 1.707a1 1 0 00.707.293H8v-4zM17 14h2v2h-2v-2zm-4-4h4m-4 4h2v2h-2v-2zm-10 6h2v2H3v-2zm6-10H5a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2zm10 0h-4a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2zM5 8h4v4H5V8zm10 0h4v4h-4V8z" />
                </svg>
                <span class="text-sm">二维码</span>
              </button>
            </div>

            <!-- 二维码显示区域 -->
            <Transition name="fade">
              <div v-if="showQrcode && qrcodeUrl" class="mt-4 flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <img :src="qrcodeUrl" alt="订阅二维码" class="w-48 h-48 sm:w-64 sm:h-64 object-contain" />
                <p class="mt-2 text-xs text-gray-500">请使用客户端扫描添加到订阅</p>
              </div>
            </Transition>


            <NodeDetailsModal v-model:show="showNodeDetails" :subscription="previewSubscription" />
          </div>
        </div>

        <!-- Token提示 -->
        <div
          v-if="(selectedId === 'default' && config?.mytoken === 'auto') || (selectedId !== 'default' && (!config?.profileToken || config.profileToken === 'auto' || !config.profileToken.trim()))"
          class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 animate-pulse-breathing mb-4">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0 animate-bounce" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1 animate-pulse">Token配置提示</p>
              <p class="text-xs text-yellow-600 dark:text-yellow-400">
                <span v-if="selectedId === 'default'">
                  当前为自动Token，链接可能会变化。为确保链接稳定，推荐在"设置"中配置一个固定Token。
                </span>
                <span v-else>
                  订阅组需要使用固定的"订阅组分享Token"。请在"设置"中配置一个固定的"订阅组分享Token"。
                </span>
              </p>
            </div>
          </div>
        </div>


      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse-breathing {

  0%,
  100% {
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

  0%,
  20%,
  53%,
  80%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  40%,
  43% {
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
