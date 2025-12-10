<script setup lang="ts">
import { ref, watch } from 'vue';
import { useToastStore } from '../../stores/toast';
import Modal from './BaseModal.vue';
import { parseSubscription } from '../../lib/api';
import type { Node } from '../../types';

const props = defineProps<{
  show: boolean;
  addNodesFromBulk: (nodes: Node[]) => void;
  onImportSuccess?: () => Promise<void>;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const subscriptionUrl = ref('');
const isLoading = ref(false);
const errorMessage = ref('');

const toastStore = useToastStore();

watch(() => props.show, (newVal) => {
  if (!newVal) { // If modal is being hidden
    subscriptionUrl.value = '';
    errorMessage.value = '';
    isLoading.value = false;
  }
});

const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const importSubscription = async () => {
  errorMessage.value = '';
  if (!isValidUrl(subscriptionUrl.value)) {
    errorMessage.value = '请输入有效的 HTTP 或 HTTPS 订阅链接。';
    return;
  }

  isLoading.value = true;
  try {
    // 使用新的 parseSubscription API
    const result = await parseSubscription(subscriptionUrl.value, {
      subscriptionName: '导入的订阅'
    });

    if (!result.success) {
      throw new Error(result.message || '解析订阅失败');
    }

    if (result.nodes.length > 0) {
      props.addNodesFromBulk(result.nodes);
      // 调用直接保存函数
      if (props.onImportSuccess) {
        await props.onImportSuccess();
      }
      toastStore.showToast(`✅ 成功添加了 ${result.nodes.length} 个节点。`, 'success');
      // 只有在成功时才关闭模态框
      emit('update:show', false);
    } else {
      errorMessage.value = '未能从订阅链接中解析出任何节点。请检查链接内容。';
      // 失败时不关闭模态框，让用户看到错误信息
    }
  } catch (error: any) {
    console.error('导入订阅失败:', error);
    errorMessage.value = `导入失败: ${error.message}`;
    toastStore.showToast(`❌ 导入失败: ${error.message}`, 'error');
    // 失败时不关闭模态框，让用户看到错误信息
  } finally {
    isLoading.value = false;
  }
};

</script>

<template>
  <Modal :show="show" @update:show="emit('update:show', $event)" @confirm="importSubscription" confirm-text="导入"
    :confirm-disabled="isLoading">
    <template #title>
      <h3 class="text-lg font-bold gradient-text">导入订阅</h3>
    </template>
    <template #body>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        请输入订阅链接，系统将尝试解析其中的节点信息。支持多种格式：
      </p>
      <ul class="text-xs text-gray-500 dark:text-gray-400 mb-4 list-disc list-inside space-y-1">
        <li>Base64 编码的节点列表</li>
        <li>纯文本节点链接（每行一个）</li>
        <li>Clash 配置文件（YAML 格式）</li>
        <li>其他 YAML 格式的节点配置</li>
        <li>支持的协议：SS、SSR、VMess、VLESS、Trojan、Hysteria、TUIC、Socks5 等</li>
      </ul>
      <input type="text" v-model="subscriptionUrl" placeholder="https://example.com/your-subscription-link"
        class="input-modern w-full" @keyup.enter="importSubscription" />
      <div v-if="errorMessage"
        class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
        <p class="text-red-600 dark:text-red-400 text-sm">{{ errorMessage }}</p>
      </div>
    </template>
  </Modal>
</template>
