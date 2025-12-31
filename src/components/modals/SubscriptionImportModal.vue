<!--
  ==================== 订阅导入模态框 ====================
  
  功能说明：
  - 从订阅链接导入节点
  - 支持多种订阅格式（Base64、Clash YAML等）
  - 自动解析节点信息
  - 错误处理和用户提示
  
  ==================================================
-->

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useToastStore } from '../../stores/toast';
import Modal from './BaseModal.vue';
import { subscriptionParser } from '@shared/subscription-parser';
import type { Node } from '../../types';

// ==================== Props 和 Emit ====================

const props = defineProps<{
  /** 显示状态 */
  show: boolean;
  /** 批量添加节点的方法 */
  addNodesFromBulk: (nodes: Node[]) => void;
  /** 导入成功后的回调 */
  onImportSuccess?: () => Promise<void>;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

// ==================== 状态 ====================

/** 订阅链接 */
const subscriptionUrl = ref('');
/** 加载状态 */
const isLoading = ref(false);
/** 错误消息 */
const errorMessage = ref('');

const toastStore = useToastStore();

// ==================== 监听器 ====================

/** 监听显示状态，重置表单 */
watch(() => props.show, (newVal) => {
  if (!newVal) {
    subscriptionUrl.value = '';
    errorMessage.value = '';
    isLoading.value = false;
  }
});

// ==================== 验证和解析 ====================

/**
 * 验证 URL 格式
 */
const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * 解析节点内容
 * 使用共享的订阅解析器
 */
const parseNodes = (content: string) => {
  return subscriptionParser.parse(content, '导入的订阅');
};

// ==================== 导入逻辑 ====================

/**
 * 导入订阅
 * 
 * 流程：
 * 1. 验证 URL
 * 2. 通过代理 API 获取订阅内容
 * 3. 解析节点
 * 4. 批量添加节点
 * 5. 保存并提示
 */
const importSubscription = async () => {
  errorMessage.value = '';
  
  // 验证 URL
  if (!isValidUrl(subscriptionUrl.value)) {
    errorMessage.value = '请输入有效的 HTTP 或 HTTPS 订阅链接。';
    return;
  }

  isLoading.value = true;
  try {
    // 通过代理 API 获取订阅内容
    const response = await fetch('/api/fetch_external_url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: subscriptionUrl.value })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const content = await response.text();
    const newNodes = parseNodes(content);

    if (newNodes.length > 0) {
      // 添加节点
      props.addNodesFromBulk(newNodes);
      
      // 调用成功回调（保存数据）
      if (props.onImportSuccess) {
        await props.onImportSuccess();
      }
      
      toastStore.showToast(`成功添加了 ${newNodes.length} 个节点。`, 'success');
      // 只有成功时才关闭模态框
      emit('update:show', false);
    } else {
      errorMessage.value = '未能从订阅链接中解析出任何节点。请检查链接内容。';
      // 失败时不关闭，让用户看到错误
    }
  } catch (error: unknown) {
    console.error('导入订阅失败:', error);
    const msg = error instanceof Error ? error.message : String(error);
    errorMessage.value = `导入失败: ${msg}`;
    toastStore.showToast(`导入失败: ${msg}`, 'error');
    // 失败时不关闭，让用户看到错误
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <Modal 
    :show="show" 
    @update:show="emit('update:show', $event)" 
    @confirm="importSubscription" 
    confirm-text="导入"
    :confirm-disabled="isLoading"
  >
    <template #title>
      <h3 class="text-lg font-bold gradient-text">导入订阅</h3>
    </template>
    <template #body>
      <!-- 说明文字 -->
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        请输入订阅链接，系统将尝试解析其中的节点信息。支持多种格式：
      </p>
      
      <!-- 支持的格式列表 -->
      <ul class="text-xs text-gray-500 dark:text-gray-400 mb-4 list-disc list-inside space-y-1">
        <li>Base64 编码的节点列表</li>
        <li>纯文本节点链接（每行一个）</li>
        <li>Clash 配置文件（YAML 格式）</li>
        <li>其他 YAML 格式的节点配置</li>
        <li>支持的协议：SS、SSR、VMess、VLESS、Trojan、Hysteria、TUIC、Socks5 等</li>
      </ul>
      
      <!-- URL 输入框 -->
      <input 
        type="text" 
        v-model="subscriptionUrl" 
        placeholder="https://example.com/your-subscription-link"
        class="input-modern w-full" 
        @keyup.enter="importSubscription" 
      />
      
      <!-- 错误提示 -->
      <div 
        v-if="errorMessage"
        class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800"
      >
        <p class="text-red-600 dark:text-red-400 text-sm">{{ errorMessage }}</p>
      </div>
    </template>
  </Modal>
</template>
