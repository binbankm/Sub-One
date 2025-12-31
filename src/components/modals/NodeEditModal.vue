<!--
  ==================== 手动节点编辑模态框 ====================
  
  功能说明：
  - 新增和编辑手动节点
  - 节点名称和URL配置
  - 自动提取节点名称
  - URL格式验证
  
  ==================================================
-->

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useToastStore } from '../../stores/toast';
import { extractNodeName } from '../../lib/utils';
import Modal from './BaseModal.vue';
import type { Node } from '../../types';

// ==================== Props 和 Emit ====================

const props = defineProps<{
  /** 显示状态 */
  show: boolean;
  /** 正在编辑的节点（空表示新建） */
  node: Node | null;
  /** 是否为新建模式 */
  isNew: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'save', node: Node): void;
}>();

// ==================== 状态 ====================

const toastStore = useToastStore();

/** 本地编辑的节点副本 */
const localNode = ref<Node | null>(null);

/** URL 错误提示 */
const urlError = ref('');

/** 是否自动提取过名称 */
const hasAutoExtractedName = ref(false);

// ==================== 计算属性 ====================

/** 模态框标题 */
const modalTitle = computed(() => props.isNew ? '新增手动节点' : '编辑手动节点');

/** 保存按钮文本 */
const saveButtonText = computed(() => props.isNew ? '添加' : '保存');

/** 是否可以保存 */
const canSave = computed(() => {
  return localNode.value?.url && !urlError.value;
});

// ==================== 监听器 ====================

/** 监听显示状态和节点变化，初始化本地副本 */
watch([() => props.show, () => props.node], ([show, node]) => {
  if (show && node) {
    localNode.value = JSON.parse(JSON.stringify(node));
    urlError.value = '';
    hasAutoExtractedName.value = false;
  }
}, { immediate: true });

// ==================== 验证 ====================

/** 验证节点 URL */
const validateUrl = () => {
  urlError.value = '';
  
  if (!localNode.value?.url) {
    urlError.value = '节点链接不能为空';
    return false;
  }

  const url = localNode.value.url.trim();
  
  // 基本检查：确保不是空字符串
  if (!url) {
    urlError.value = '节点链接不能为空';
    return false;
  }

  // 简单验证：应该包含 ://
  if (!url.includes('://')) {
    urlError.value = '无效的节点链接格式';
    return false;
  }

  return true;
};

/** URL 输入失焦时验证 */
const handleUrlBlur = () => {
  validateUrl();
};

// ==================== URL 自动提取名称 ====================

/**
 * URL 输入变化时，自动提取节点名称
 */
const handleUrlInput = () => {
  if (!localNode.value) return;
  
  const url = localNode.value.url?.trim();
  
  // 如果输入了 URL 但没有名称，自动提取名称
  if (url && !localNode.value.name && !hasAutoExtractedName.value) {
    const extractedName = extractNodeName(url);
    if (extractedName && extractedName !== '未命名节点') {
      localNode.value.name = extractedName;
      hasAutoExtractedName.value = true;
    }
  }
};

/**
 * 名称输入变化时，标记为手动输入
 */
const handleNameInput = () => {
  hasAutoExtractedName.value = false;
};

// ==================== 保存逻辑 ====================

/**
 * 保存节点
 */
const handleSave = () => {
  if (!localNode.value) return;

  // 验证
  if (!validateUrl()) {
    toastStore.showToast('请修正错误后再保存', 'error');
    return;
  }

  // 清理空白字符
  localNode.value.url = localNode.value.url?.trim();
  if (localNode.value.name) {
    localNode.value.name = localNode.value.name.trim();
  }

  // 如果没有名称，尝试自动提取
  if (!localNode.value.name && localNode.value.url) {
    localNode.value.name = extractNodeName(localNode.value.url);
  }

  // 触发保存事件
  emit('save', localNode.value);
};

/**
 * 取消编辑
 */
const handleCancel = () => {
  emit('update:show', false);
};
</script>

<template>
  <Modal 
    :show="show" 
    @update:show="handleCancel"
    @confirm="handleSave"
    :confirm-text="saveButtonText"
    :confirm-disabled="!canSave"
  >
    <template #title>
      <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
        {{ modalTitle }}
      </h3>
    </template>

    <template #body>
      <div v-if="localNode" class="space-y-4">
        <!-- 节点名称 -->
        <div>
          <label for="node-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            节点名称
            <span class="text-gray-400 text-xs ml-1">(可选)</span>
          </label>
          <input
            v-model="localNode.name"
            type="text"
            id="node-name"
            placeholder="留空时自动从链接提取"
            class="input-modern w-full"
            @input="handleNameInput"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            如留空，系统将自动从节点链接中提取名称
          </p>
        </div>

        <!-- 节点链接 -->
        <div>
          <label for="node-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            节点链接
            <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="localNode.url"
            id="node-url"
            rows="4"
            placeholder="vmess://... 或 ss://... 等节点分享链接"
            class="input-modern w-full font-mono text-sm resize-none"
            :class="{ 'border-red-500 dark:border-red-500': urlError }"
            @input="handleUrlInput"
            @blur="handleUrlBlur"
          ></textarea>
          <p v-if="urlError" class="mt-1 text-sm text-red-600 dark:text-red-400">
            {{ urlError }}
          </p>
          <p v-else class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            支持 VMess、VLESS、Trojan、Shadowsocks、Hysteria 等协议
          </p>
        </div>

        <!-- 提示信息 -->
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
            <div class="flex-1">
              <p class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                粘贴节点分享链接
              </p>
              <p class="text-xs text-blue-700 dark:text-blue-300">
                从其他应用或网站复制节点分享链接，粘贴到上方输入框即可
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>
