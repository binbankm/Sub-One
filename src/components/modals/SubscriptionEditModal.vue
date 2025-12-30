<!--
  ==================== 订阅编辑模态框 ====================
  
  功能说明：
  - 新增和编辑订阅链接
  - 订阅名称和URL配置
  - 启用/禁用开关
  - 节点过滤规则编辑
  - 验证和错误提示
  
  ==================================================
-->

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useToastStore } from '../../stores/toast';
import Modal from './BaseModal.vue';
import NodeFilterEditor from '../editors/NodeFilterEditor.vue';
import type { Subscription } from '../../types';

// ==================== Props 和 Emit ====================

const props = defineProps<{
  /** 显示状态 */
  show: boolean;
  /** 正在编辑的订阅（空表示新建） */
  subscription: Subscription | null;
  /** 是否为新建模式 */
  isNew: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'save', subscription: Subscription): void;
}>();

// ==================== 状态 ====================

const toastStore = useToastStore();

/** 本地编辑的订阅副本 */
const localSubscription = ref<Subscription | null>(null);

/** URL 错误提示 */
const urlError = ref('');

/** 名称错误提示 */
const nameError = ref('');

/** 是否显示高级选项 */
const showAdvanced = ref(false);

// ==================== 计算属性 ====================

/** 模态框标题 */
const modalTitle = computed(() => props.isNew ? '新增订阅' : '编辑订阅');

/** 保存按钮文本 */
const saveButtonText = computed(() => props.isNew ? '添加' : '保存');

/** 是否可以保存 */
const canSave = computed(() => {
  return localSubscription.value?.url && 
         !urlError.value && 
         !nameError.value;
});

// ==================== 监听器 ====================

/** 监听显示状态和订阅变化，初始化本地副本 */
watch([() => props.show, () => props.subscription], ([show, sub]) => {
  if (show && sub) {
    localSubscription.value = JSON.parse(JSON.stringify(sub));
    urlError.value = '';
    nameError.value = '';
    showAdvanced.value = false;
  }
}, { immediate: true });

// ==================== 验证 ====================

/** 验证订阅 URL */
const validateUrl = () => {
  urlError.value = '';
  
  if (!localSubscription.value?.url) {
    urlError.value = '订阅链接不能为空';
    return false;
  }

  const url = localSubscription.value.url.trim();
  
  // 检查协议
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    urlError.value = '订阅链接必须以 http:// 或 https:// 开头';
    return false;
  }

  // 验证 URL 格式
  try {
    new URL(url);
  } catch {
    urlError.value = '无效的 URL 格式';
    return false;
  }

  return true;
};

/** URL 输入失焦时验证 */
const handleUrlBlur = () => {
  validateUrl();
};

/** 名称输入变化时清除错误 */
const handleNameInput = () => {
  nameError.value = '';
};

// ==================== 保存逻辑 ====================

/**
 * 保存订阅
 */
const handleSave = () => {
  if (!localSubscription.value) return;

  // 验证
  if (!validateUrl()) {
    toastStore.showToast('请修正错误后再保存', 'error');
    return;
  }

  // 清理空白字符
  localSubscription.value.url = localSubscription.value.url?.trim();
  if (localSubscription.value.name) {
    localSubscription.value.name = localSubscription.value.name.trim();
  }

  // 触发保存事件
  emit('save', localSubscription.value);
};

/**
 * 取消编辑
 */
const handleCancel = () => {
  emit('update:show', false);
};

/**
 * 切换高级选项
 */
const toggleAdvanced = () => {
  showAdvanced.value = !showAdvanced.value;
};
</script>

<template>
  <Modal 
    :show="show" 
    @update:show="handleCancel"
    @confirm="handleSave"
    :confirm-text="saveButtonText"
    :confirm-disabled="!canSave"
    size="2xl"
  >
    <template #title>
      <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
        {{ modalTitle }}
      </h3>
    </template>

    <template #body>
      <div v-if="localSubscription" class="space-y-6">
        <!-- 基础信息 -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>
            </svg>
            基础信息
          </h4>

          <!-- 订阅名称 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              订阅名称
              <span class="text-gray-400 text-xs ml-1">(可选)</span>
            </label>
            <input
              v-model="localSubscription.name"
              type="text"
              placeholder="留空时自动从链接提取"
              class="input-modern w-full"
              @input="handleNameInput"
            />
            <p v-if="nameError" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ nameError }}
            </p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              如留空，系统将自动从订阅链接中提取名称
            </p>
          </div>

          <!-- 订阅链接 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              订阅链接
              <span class="text-red-500">*</span>
            </label>
            <input
              v-model="localSubscription.url"
              type="url"
              placeholder="https://example.com/sub?token=xxx"
              class="input-modern w-full font-mono text-sm"
              :class="{ 'border-red-500 dark:border-red-500': urlError }"
              @blur="handleUrlBlur"
            />
            <p v-if="urlError" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ urlError }}
            </p>
            <p v-else class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              请输入有效的 HTTP 或 HTTPS 订阅链接
            </p>
          </div>



        </div>

        <!-- 高级选项 -->
        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            @click="toggleAdvanced"
            class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <svg 
              class="w-4 h-4 transition-transform duration-200" 
              :class="{ 'rotate-90': showAdvanced }"
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
            </svg>
            高级选项
          </button>

          <Transition name="slide-fade">
            <div v-if="showAdvanced" class="mt-4 space-y-4">
              <!-- 节点过滤规则 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  节点过滤规则
                  <span class="text-gray-400 text-xs ml-1">(可选)</span>
                </label>
                <NodeFilterEditor
                  v-model="localSubscription.exclude"
                  placeholder="输入节点过滤规则..."
                />
                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  支持正则表达式，多个规则用换行分隔。使用 <code class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">keep:</code> 前缀表示白名单
                </p>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 提示信息 -->
        <div v-if="isNew" class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
            <div class="flex-1">
              <p class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                添加订阅后自动获取节点
              </p>
              <p class="text-xs text-blue-700 dark:text-blue-300">
                保存后系统将自动从订阅链接获取节点数量和流量信息
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
