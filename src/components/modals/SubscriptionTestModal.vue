<script setup>
import { ref, watch } from 'vue';
import { useToastStore } from '../stores/toast.js';
import Modal from './Modal.vue';
import { subscriptionParser } from '../lib/subscriptionParser.js';

const props = defineProps({
  show: Boolean,
});

const emit = defineEmits(['update:show']);

const testContent = ref('');
const testResult = ref(null);
const isLoading = ref(false);
const errorMessage = ref('');

const toastStore = useToastStore();

watch(() => props.show, (newVal) => {
  if (!newVal) {
    testContent.value = '';
    testResult.value = null;
    errorMessage.value = '';
    isLoading.value = false;
  }
});

const testParser = () => {
  if (!testContent.value.trim()) {
    errorMessage.value = '请输入要测试的内容';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  testResult.value = null;

  try {
    // 验证内容格式
    const validation = subscriptionParser.validateContent(testContent.value);
    
    if (!validation.valid) {
      errorMessage.value = `格式验证失败: ${validation.error}`;
      return;
    }

    // 解析内容
    const nodes = subscriptionParser.parse(testContent.value, '测试订阅');
    
    testResult.value = {
      format: validation.format,
      nodeCount: nodes.length,
      nodes: nodes,
      validation: validation
    };

    if (nodes.length === 0) {
      errorMessage.value = '未能解析出任何节点';
    } else {
      toastStore.showToast(`成功解析出 ${nodes.length} 个节点`, 'success');
    }
  } catch (error) {
    console.error('解析测试失败:', error);
    errorMessage.value = `解析失败: ${error.message}`;
    toastStore.showToast(`解析失败: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
  }
};

const getProtocolIcon = (protocol) => {
  const icons = {
    vmess: '🔵',
    vless: '🟣',
    trojan: '🟠',
    ss: '🔴',
    ssr: '🟡',
    hysteria: '🟢',
    hysteria2: '🟢',
    tuic: '🟤',
    socks5: '⚫'
  };
  return icons[protocol] || '❓';
};

const getProtocolColor = (protocol) => {
  const colors = {
    vmess: 'text-blue-600 dark:text-blue-400',
    vless: 'text-purple-600 dark:text-purple-400',
    trojan: 'text-orange-600 dark:text-orange-400',
    ss: 'text-red-600 dark:text-red-400',
    ssr: 'text-yellow-600 dark:text-yellow-400',
    hysteria: 'text-green-600 dark:text-green-400',
    hysteria2: 'text-green-600 dark:text-green-400',
    tuic: 'text-amber-600 dark:text-amber-400',
    socks5: 'text-gray-600 dark:text-gray-400'
  };
  return colors[protocol] || 'text-gray-600 dark:text-gray-400';
};
</script>

<template>
  <Modal
    :show="show"
    @update:show="emit('update:show', $event)"
    @confirm="testParser"
    confirm-text="测试解析"
    :confirm-disabled="isLoading"
  >
    <template #title>
      <h3 class="text-lg font-bold gradient-text">订阅解析测试</h3>
    </template>
    <template #body>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            测试内容
          </label>
          <textarea
            v-model="testContent"
            placeholder="请输入要测试的订阅内容（支持Base64、YAML、纯文本等格式）"
            class="input-modern w-full h-32 resize-none"
            @keydown.ctrl.enter="testParser"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            支持格式：Base64、Clash配置、纯文本节点列表等 | 快捷键：Ctrl+Enter 测试
          </p>
        </div>

        <!-- 错误信息 -->
        <div v-if="errorMessage" class="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <p class="text-red-600 dark:text-red-400 text-sm">{{ errorMessage }}</p>
        </div>

        <!-- 测试结果 -->
        <div v-if="testResult" class="space-y-4">
          <!-- 解析摘要 -->
          <div class="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-semibold text-gray-900 dark:text-gray-100">解析成功</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  格式：{{ testResult.format }} | 节点数：{{ testResult.nodeCount }}
                </p>
              </div>
              <div class="text-right">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {{ testResult.nodeCount }} 个节点
                </span>
              </div>
            </div>
          </div>

          <!-- 节点列表 -->
          <div v-if="testResult.nodes.length > 0" class="space-y-2">
            <h4 class="font-medium text-gray-900 dark:text-gray-100">解析结果</h4>
            <div class="max-h-60 overflow-y-auto space-y-2">
              <div
                v-for="node in testResult.nodes"
                :key="node.id"
                class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">{{ getProtocolIcon(node.protocol) }}</span>
                    <div>
                      <p class="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {{ node.name }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ node.url.substring(0, 50) }}{{ node.url.length > 50 ? '...' : '' }}
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <span :class="['text-xs font-medium px-2 py-1 rounded-full', getProtocolColor(node.protocol)]">
                      {{ node.protocol.toUpperCase() }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 验证信息 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <h5 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">验证信息</h5>
            <div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>格式：{{ testResult.validation.format }}</p>
              <p>有效性：{{ testResult.validation.valid ? '✅ 有效' : '❌ 无效' }}</p>
              <p v-if="testResult.validation.error">错误：{{ testResult.validation.error }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template> 