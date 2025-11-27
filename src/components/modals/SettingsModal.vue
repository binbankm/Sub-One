<script setup>
import { ref, watch, computed } from 'vue';
import Modal from './Modal.vue';
import { fetchSettings, saveSettings } from '../../lib/api.js';
import { useToastStore } from '../../stores/toast.js';
import { useThemeStore } from '../../stores/theme.js';

const props = defineProps({
  show: Boolean
});

const emit = defineEmits(['update:show']);

const { showToast } = useToastStore();
const themeStore = useThemeStore();
const isLoading = ref(false);
const isSaving = ref(false);
const settings = ref({});

const hasWhitespace = computed(() => {
  const fieldsToCkeck = [
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
    if (value && /\s/.test(value)) {
      return true;
    }
  }
  return false;
});    

const loadSettings = async () => {
  isLoading.value = true;
  try {
    settings.value = await fetchSettings();
  } catch (error) {
    showToast('加载设置失败', 'error');
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
  } catch (error) {
    showToast(error.message, 'error');
    isSaving.value = false; // 只有失败时才需要重置保存状态
  }
};

// 监听 show 属性，当模态框从隐藏变为显示时，加载设置
watch(() => props.show, (newValue) => {
  if (newValue) {
    loadSettings();
  }
});
</script>

<template>
  <Modal 
    :show="show" 
    @update:show="emit('update:show', $event)" 
    @confirm="handleSave" 
    :is-saving="isSaving"
    :confirm-disabled="hasWhitespace" 
    confirm-button-title="输入内容包含空格，无法保存"
    size="4xl"
  >
    <template #title><h3 class="text-lg font-bold text-gray-800 dark:text-white">设置</h3></template>
    <template #body>
      <div v-if="isLoading" class="text-center p-8">
        <p class="text-gray-500">正在加载设置...</p>
      </div>
      <div v-else class="space-y-6">
        <!-- 基础设置 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label for="fileName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">自定义订阅文件名</label>
            <input 
              type="text" id="fileName" v-model="settings.FileName" 
              class="input-modern-enhanced w-full"
              placeholder="例如：my_subscription"
            >
          </div>
          <div>
            <label for="myToken" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">自定义订阅Token</label>
            <input 
              type="text" id="myToken" v-model="settings.mytoken"
              class="input-modern-enhanced w-full"
              placeholder="用于访问订阅链接的Token"
            >
          </div>
        </div>

        <!-- 订阅组设置 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label for="profileToken" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">订阅组分享Token</label>
            <input 
              type="text" id="profileToken" v-model="settings.profileToken"
              class="input-modern-enhanced w-full"
              placeholder="用于生成订阅组链接专用Token"
            >
            <p class="text-xs text-gray-400 mt-2">此Token专门用于生成订阅组链接，增强安全性。</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">节点名前缀</label>
            <div class="flex items-center justify-between p-4 bg-gray-50/60 dark:bg-gray-800/75 rounded-xl">
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-300">自动将订阅名添加为节点名的前缀</p>
                <p class="text-xs text-gray-400 mt-1">有助于区分不同订阅的节点</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="settings.prependSubName" class="sr-only peer">
                <div class="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r from-indigo-500 to-purple-600"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- SubConverter设置 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label for="subConverter" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SubConverter后端地址</label>
            <input 
              type="text" id="subConverter" v-model="settings.subConverter" 
              class="input-modern-enhanced w-full"
              placeholder="例如：https://sub.xeton.dev"
            >
          </div>
          <div>
            <label for="subConfig" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SubConverter配置文件</label>
            <input 
              type="text" id="subConfig" v-model="settings.subConfig"
              class="input-modern-enhanced w-full"
              placeholder="例如：https://raw.githubusercontent.com/.../config.ini"
            >
          </div>
        </div>

        <!-- Telegram设置 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label for="tgBotToken" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Telegram Bot Token</label>
            <input 
              type="text" id="tgBotToken" v-model="settings.BotToken"
              class="input-modern-enhanced w-full"
              placeholder="从 @BotFather 获取的Bot Token"
            >
          </div>
          <div>
            <label for="tgChatID" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Telegram Chat ID</label>
            <input 
              type="text" id="tgChatID" v-model="settings.ChatID"
              class="input-modern-enhanced w-full"
              placeholder="接收通知的聊天ID"
            >
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>