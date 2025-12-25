<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Modal from './BaseModal.vue';
import { fetchSettings, saveSettings } from '../../lib/api';
import { useToastStore } from '../../stores/toast';
import type { AppConfig } from '../../types';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const { showToast } = useToastStore();
const isLoading = ref(false);
const isSaving = ref(false);

// 默认设置值
const defaultSettings: AppConfig = {
  FileName: 'Sub-One',
  subConverter: 'url.v1.mk',
  subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Full.ini',
  prependSubName: true,
  mytoken: 'auto',
  profileToken: '', // 默认为空，用户需主动设置
  BotToken: '',
  ChatID: ''
};

// 初始化时直接使用默认值，确保界面不会显示空白
const settings = ref<AppConfig>({ ...defaultSettings });

const hasWhitespace = computed(() => {
  const fieldsToCkeck: (keyof AppConfig)[] = [
    'FileName',
    'mytoken',
    'profileToken',
    'subConverter',
    'subConfig',
    'BotToken',
    'ChatID',
  ];

  for (const key of fieldsToCkeck) {
    const value = settings.value[key];
    if (value && typeof value === 'string' && /\s/.test(value)) {
      return true;
    }
  }
  return false;
});

const loadSettings = async () => {
  isLoading.value = true;
  try {
    const loaded = await fetchSettings();

    // 确保 loaded 是有效对象
    if (loaded && typeof loaded === 'object') {
      for (const key in loaded) {
        // 只要后端返回了值（包括空字符串），就使用后端的值
        // 这样用户可以主动清空某些配置（如 profileToken）
        if (loaded[key as keyof AppConfig] !== undefined && loaded[key as keyof AppConfig] !== null) {
          (settings.value as any)[key] = loaded[key as keyof AppConfig];
        }
      }
    }
  } catch (error) {
    console.error('加载设置出错:', error);
    showToast('加载设置失败，将使用默认值', 'error');
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  if (hasWhitespace.value) {
    showToast('输入项中不能包含空格，请检查后再试。', 'error');
    return;
  }

  isSaving.value = true;
  try {
    const result = await saveSettings(settings.value);
    if (result.success) {
      // 弹出成功提示
      showToast('设置已保存，页面将自动刷新...', 'success');

      // 【核心新增】在短暂延迟后刷新页面，让用户能看到提示
      setTimeout(() => {
        window.location.reload();
      }, 1500); // 延迟1.5秒
    } else {
      throw new Error(result.message || '保存失败');
    }
  } catch (error: any) {
    showToast(error.message, 'error');
    isSaving.value = false; // 只有失败时才需要重置保存状态
  }
};

// 监听 show 属性，当模态框显示时加载设置
// 添加 immediate: true 确保组件挂载时如果 show 为 true 也能触发
watch(() => props.show, (newValue) => {
  if (newValue) {
    loadSettings();
  }
}, { immediate: true });

// 预设的后端地址选项
const converterPresets = [
  { label: 'api.v1.mk (推荐)', value: 'api.v1.mk' },
  { label: 'url.v1.mk', value: 'url.v1.mk' },
  { label: 'sub.xeton.dev', value: 'sub.xeton.dev' },
  { label: 'api.dler.io', value: 'api.dler.io' },
  { label: 'sub.id9.cc', value: 'sub.id9.cc' },
  { label: '自定义', value: '' }
];

// 预设的配置文件选项
const configPresets = [
  {
    label: 'ACL4SSR 在线完整版 (推荐)',
    value: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Full.ini'
  },
  {
    label: 'ACL4SSR 精简版',
    value: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Mini.ini'
  },
  {
    label: 'ACL4SSR 去广告版',
    value: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_AdblockPlus.ini'
  },
  {
    label: 'ACL4SSR 无测速版',
    value: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_NoAuto.ini'
  },
  {
    label: 'ACL4SSR 极简版',
    value: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online_Mini_NoAuto.ini'
  },
  { label: '自定义', value: '' }
];
</script>

<template>
  <Modal :show="show" @update:show="emit('update:show', $event)" @confirm="handleSave" :is-saving="isSaving"
    :confirm-disabled="hasWhitespace" confirm-button-title="输入内容包含空格，无法保存" size="4xl">
    <template #title>
      <div class="flex items-center gap-3">
        <div class="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-800 dark:text-white">系统设置</h3>
      </div>
    </template>
    <template #body>
      <div v-if="isLoading" class="flex flex-col items-center justify-center p-12">
        <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p class="text-gray-500 font-medium">正在加载配置...</p>
      </div>

      <div v-else class="space-y-8 px-1">
        <!-- 基础设置 -->
        <section>
          <h4
            class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            基础配置
          </h4>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="group">
              <label for="fileName"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">自定义订阅文件名</label>
              <input type="text" id="fileName" v-model="settings.FileName" class="input-modern-enhanced w-full"
                placeholder="例如：my_subscription">
            </div>
            <div class="group">
              <label for="myToken"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">自定义订阅Token</label>
              <input type="text" id="myToken" v-model="settings.mytoken" class="input-modern-enhanced w-full"
                placeholder="用于访问订阅链接的Token">
            </div>
          </div>
        </section>

        <!-- 订阅组设置 -->
        <section>
          <h4
            class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            订阅组与节点
          </h4>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="group">
              <label for="profileToken"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">订阅组分享Token</label>
              <input type="text" id="profileToken" v-model="settings.profileToken" class="input-modern-enhanced w-full"
                placeholder="例如：my（必须与订阅Token不同）">
              <p class="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mt-0.5 flex-shrink-0" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>重要：此Token必须与"自定义订阅Token"不同，否则会导致访问冲突。留空则无法使用订阅组分享功能。</span>
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">节点名前缀</label>
              <div
                class="flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                <div>
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-200">自动添加前缀</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">将订阅名作为节点名前缀，便于区分</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="settings.prependSubName" class="sr-only peer">
                  <div
                    class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600">
                  </div>
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- SubConverter设置 -->
        <section>
          <h4
            class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            SubConverter 服务
          </h4>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 后端地址 -->
            <div class="group space-y-3">
              <label for="subConverter"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                后端地址
              </label>

              <!-- 预设选择 -->
              <select
                class="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none transition-all"
                @change="(e) => settings.subConverter = (e.target as HTMLSelectElement).value">
                <option value="" disabled :selected="!converterPresets.some(p => p.value === settings.subConverter)"
                  class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  选择预设或自定义
                </option>
                <option v-for="preset in converterPresets" :key="preset.value" :value="preset.value"
                  :selected="preset.value === settings.subConverter"
                  class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  {{ preset.label }}
                </option>
              </select>

              <!-- 输入框 -->
              <input type="text" id="subConverter" v-model="settings.subConverter" class="input-modern-enhanced w-full"
                placeholder="例如：api.v1.mk">
            </div>

            <!-- 配置文件URL -->
            <div class="group space-y-3">
              <label for="subConfig"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                配置文件 URL
              </label>

              <!-- 预设选择 -->
              <select
                class="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none transition-all"
                @change="(e) => settings.subConfig = (e.target as HTMLSelectElement).value">
                <option value="" disabled :selected="!configPresets.some(p => p.value === settings.subConfig)"
                  class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  选择预设或自定义
                </option>
                <option v-for="preset in configPresets" :key="preset.value" :value="preset.value"
                  :selected="preset.value === settings.subConfig"
                  class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  {{ preset.label }}
                </option>
              </select>

              <!-- 输入框 -->
              <input type="text" id="subConfig" v-model="settings.subConfig" class="input-modern-enhanced w-full"
                placeholder="https://raw.githubusercontent.com/.../config.ini">
            </div>
          </div>
        </section>

        <!-- Telegram设置 -->
        <section>
          <h4
            class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Telegram 通知
          </h4>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="group">
              <label for="tgBotToken"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Bot
                Token</label>
              <input type="text" id="tgBotToken" v-model="settings.BotToken" class="input-modern-enhanced w-full"
                placeholder="从 @BotFather 获取的Bot Token">
            </div>
            <div class="group">
              <label for="tgChatID"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Chat
                ID</label>
              <input type="text" id="tgChatID" v-model="settings.ChatID" class="input-modern-enhanced w-full"
                placeholder="接收通知的聊天ID">
            </div>
          </div>
        </section>
      </div>
    </template>
  </Modal>
</template>
