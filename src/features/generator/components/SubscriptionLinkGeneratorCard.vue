<!--
  订阅链接生成器卡片
  功能：生成不同格式的订阅链接（Base64、Clash、Sing-Box等）
-->

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useToastStore } from '../../../stores/toast';
import NodeDetailsModal from '../../nodes/components/NodeDetailsModal.vue';
import QRCode from 'qrcode';
import type { AppConfig, Profile, Subscription } from '../../../types/index';

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
const showImport = ref(false);
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

/** 预览节点列表 */
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

/** 一键导入客户端 */
const importToClient = (client: string) => {
  if (!subLink.value) return;
  
  const encodedUrl = encodeURIComponent(subLink.value);
  const name = selectedId.value === 'default' ? 'Sub-One' : selectedId.value;
  
  const schemes: Record<string, string> = {
    'Clash': `clash://install-config?url=${encodedUrl}`,
    'Surge': `surge:///install-config?url=${encodedUrl}`,
    'Stash': `stash:///install-config?url=${encodedUrl}`,
    'Shadowrocket': `shadowrocket://add/sub://${btoa(subLink.value)}?remark=${encodeURIComponent(name)}`,
    'Quantumult X': `quantumult-x:///add-resource?remote-resource={"server_remote":["${subLink.value},tag=${encodeURIComponent(name)}"]}`,
    'Loon': `loon://import?url=${encodedUrl}`,
    'v2rayN': `v2rayN://install-sub?url=${encodedUrl}&name=${encodeURIComponent(name)}`,
    'v2rayNG': `v2rayng://install-sub?url=${encodedUrl}&name=${encodeURIComponent(name)}`
  };

  const scheme = schemes[client];
  if (scheme) {
    window.location.href = scheme;
    showToast(`正在唤起 ${client}...`, 'success');
  }
};

onUnmounted(() => {
  if (copyTimeout) clearTimeout(copyTimeout);
});
</script>

<template>
  <div class="sticky top-24">
    <div
      class="card-glass rounded-2xl p-6 relative overflow-hidden">

      <div class="relative z-10">
        <!-- 1. 选择订阅内容 -->
        <div class="mb-8">
          <label class="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">01. 选择订阅内容</label>
          <div class="relative group">
            <select v-model="selectedId"
              class="w-full px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white bg-gray-50/50 dark:bg-gray-800/40 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-sm focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none transition-all duration-300 appearance-none cursor-pointer">
              <option value="default" class="py-2 bg-white text-gray-900 dark:bg-gray-800 dark:text-white">默认订阅 (全部启用节点)
              </option>
              <option v-for="profile in enabledProfiles" :key="profile.id" :value="profile.customId || profile.id"
                class="py-2 bg-white text-gray-900 dark:bg-gray-800 dark:text-white">
                {{ profile.name }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400 group-hover:text-indigo-500 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- 2. 选择格式 -->
        <div class="mb-8">
          <label class="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">02. 选择导出格式</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button v-for="format in formats" :key="format" @click="selectedFormat = format"
              class="px-2 py-3 text-xs font-bold rounded-xl transition-all duration-300 flex justify-center items-center border-2 border-transparent active:scale-95"
              :class="[
                selectedFormat === format
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 border-indigo-400'
                  : 'bg-white dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
              ]">
              {{ format }}
            </button>
          </div>
        </div>

        <!-- 3. 复制链接 -->
        <div class="mb-6">
          <label class="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">03. 订阅地址</label>
          <div class="relative group">
            <div class="flex flex-col gap-3">
              <div class="relative">
                <input type="text" :value="showUrl ? subLink : '••••••••••••••••••••••••••••••••••••••••'" readonly
                  class="w-full pl-4 pr-12 py-4 text-sm font-mono bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-300 dark:border-gray-700 rounded-2xl focus:border-indigo-500 transition-all duration-300"
                  :class="{ 'select-none': !showUrl }" />
                <button @click="showUrl = !showUrl" 
                  class="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all">
                  <svg v-if="showUrl" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                  <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-4 gap-2">
                <button @click="copyToClipboard"
                  class="flex flex-col items-center justify-center py-3 px-1 rounded-2xl border-2 transition-all duration-300 active:scale-95"
                  :class="copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'">
                  <svg v-if="copied" class="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <svg v-else class="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  <span class="text-[10px] font-bold">{{ copied ? '已复制' : '复制' }}</span>
                </button>

                <button @click="openNodePreview"
                  class="flex flex-col items-center justify-center py-3 px-1 rounded-2xl border-2 border-blue-100 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-300 active:scale-95">
                  <svg class="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  <span class="text-[10px] font-bold">预览</span>
                </button>

                <button @click="toggleQrcode"
                  class="flex flex-col items-center justify-center py-3 px-1 rounded-2xl border-2 transition-all duration-300 active:scale-95"
                  :class="showQrcode ? 'bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-700' : 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'">
                  <svg class="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zm-6 0H6.414a1 1 0 00-.707.293L4 17.086v1.828l1.707 1.707a1 1 0 00.707.293H8v-4zM17 14h2v2h-2v-2zm-4-4h4m-4 4h2v2h-2v-2zm-10 6h2v2H3v-2zm6-10H5a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2zm10 0h-4a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2zM5 8h4v4H5V8zm10 0h4v4h-4V8z" /></svg>
                  <span class="text-[10px] font-bold">二维码</span>
                </button>

                <button @click="showImport = !showImport; showQrcode = false"
                  class="flex flex-col items-center justify-center py-3 px-1 rounded-2xl border-2 transition-all duration-300 active:scale-95"
                  :class="showImport ? 'bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-900/40 dark:border-violet-700' : 'bg-violet-50 border-violet-100 text-violet-600 dark:bg-violet-900/20 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/40'">
                  <svg class="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span class="text-[10px] font-bold">导入</span>
                </button>
              </div>
            </div>

            <!-- 二维码显示区域 -->
            <Transition name="scale-fade">
              <div v-if="showQrcode && qrcodeUrl" class="mt-4 flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-amber-100 dark:border-amber-900 shadow-xl shadow-amber-500/10">
                <div class="p-2 bg-white rounded-lg">
                  <img :src="qrcodeUrl" alt="订阅二维码" class="w-48 h-48 object-contain" />
                </div>
                <p class="mt-4 text-[10px] font-bold text-amber-600 uppercase tracking-widest">请使用客户端扫描添加到订阅</p>
              </div>
            </Transition>

            <!-- 客户端列表显示区域 -->
            <Transition name="scale-fade">
              <div v-if="showImport" class="mt-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border-2 border-violet-100 dark:border-violet-900 shadow-xl shadow-violet-500/10">
                <div class="grid grid-cols-3 gap-2">
                  <button v-for="client in ['Clash', 'v2rayN', 'Shadowrocket', 'Quantumult X', 'Surge', 'v2rayNG', 'Stash', 'Loon']" 
                    :key="client"
                    @click="importToClient(client)"
                    class="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-gray-50 dark:bg-gray-900/40 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all duration-200 border-2 border-transparent hover:border-violet-200 active:scale-90">
                    <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300">{{ client }}</span>
                  </button>
                </div>
              </div>
            </Transition>

            <NodeDetailsModal v-model:show="showNodeDetails" :subscription="previewSubscription" />
          </div>
        </div>



        <!-- Token提示 -->
        <div
          v-if="(selectedId === 'default' && config?.mytoken === 'auto') || (selectedId !== 'default' && (!config?.profileToken || config.profileToken === 'auto' || !config.profileToken.trim()))"
          class="relative mt-8 p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border-2 border-amber-200/60 dark:border-amber-800/40 overflow-hidden">
          <div class="absolute -right-4 -top-4 w-16 h-16 bg-amber-200/20 dark:bg-amber-800/10 rounded-full blur-xl"></div>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <svg class="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h4 class="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1 leading-tight">Token 配置提示</h4>
              <p class="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                <span v-if="selectedId === 'default'">
                  当前使用的是系统分配的自动 Token，为确保订阅链接长期稳定，强烈建议在设置中自定义一个固定 Token。
                </span>
                <span v-else>
                  订阅组需要独立的分享 Token 才能导出。请前往设置页面配置一个固定的"订阅组分享 Token"。
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
.scale-fade-enter-active,
.scale-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-fade-enter-from,
.scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
