<!--
  ==================== 订阅导入模态框 ====================
  
  功能说明：
  - 支持 URL 链接导入
  - 支持文件导入（YAML/JSON/TXT）
  - 支持文本内容粘贴导入
  - 自动解析 Clash/Base64 等多种格式
  
  ==================================================
-->

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useToastStore } from '../../../stores/toast';
import Modal from '../../../components/ui/BaseModal.vue';
import type { Node } from '../../../types/index';
import { parseImportText } from '../../../utils/importer';

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

const mode = ref<'url' | 'text'>('url');
const subscriptionUrl = ref('');
const textContent = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const isDragging = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const toastStore = useToastStore();

// ==================== 自定义指令 ====================
// 简单的 v-focus 指令
const vFocus = {
  mounted: (el: HTMLElement) => el.focus()
};

// ==================== 监听器 ====================

watch(() => props.show, (newVal) => {
  if (!newVal) {
    // 关闭时重置状态
    subscriptionUrl.value = '';
    textContent.value = '';
    errorMessage.value = '';
    isLoading.value = false;
    mode.value = 'url';
    isDragging.value = false;
  }
});

// ==================== 文件处理逻辑 ====================

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const readFileContent = (file: File) => {
  if (file.size > 5 * 1024 * 1024) { // 5MB 限制
    errorMessage.value = '文件过大，请上传小于 5MB 的文件';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result;
    if (typeof result === 'string') {
      textContent.value = result;
      errorMessage.value = ''; // 清除之前的错误
      toastStore.showToast(`已读取文件: ${file.name}`, 'success');
    }
  };
  reader.onerror = () => {
    errorMessage.value = '文件读取失败';
  };
  reader.readAsText(file);
};

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    readFileContent(input.files[0]);
    // 清空 input 允许重复选择同一文件
    input.value = '';
  }
};

const handleFileDrop = (event: DragEvent) => {
  isDragging.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    readFileContent(event.dataTransfer.files[0]);
  }
};

// ==================== 导入逻辑 ====================

const importSubscription = async () => {
  errorMessage.value = '';

  if (mode.value === 'url') {
    // URL 模式：调用后端下载订阅
    if (!subscriptionUrl.value.trim()) {
      errorMessage.value = '请输入订阅链接';
      return;
    }
    // 简单验证 URL
    try {
      new URL(subscriptionUrl.value);
    } catch {
      errorMessage.value = '请输入有效的 URL (例如 https://example.com/...)';
      return;
    }

    isLoading.value = true;

    try {
      const response = await fetch('/api/node_count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: subscriptionUrl.value.trim(),
          returnNodes: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as any;
      
      const newNodes: Node[] = (data.nodes || []).map((n: any) => ({
        ...n,
        id: n.id || crypto.randomUUID(),
        enabled: true
      } as unknown as Node));

      if (newNodes.length > 0) {
        props.addNodesFromBulk(newNodes);
        
        if (props.onImportSuccess) {
          await props.onImportSuccess();
        }
        
        toastStore.showToast(`导入成功！共添加 ${newNodes.length} 个节点`, 'success');
        emit('update:show', false);
      } else {
        errorMessage.value = '未能解析出任何节点，请检查链接是否正确。';
      }
    } catch (error: unknown) {
      console.error('导入失败:', error);
      const msg = error instanceof Error ? error.message : String(error);
      errorMessage.value = `导入失败: ${msg}`;
    } finally {
      isLoading.value = false;
    }
  } else {
    // 文本/文件模式：前端解析（保留原始URL）
    if (!textContent.value.trim()) {
      errorMessage.value = '请粘贴订阅内容或上传文件';
      return;
    }

    isLoading.value = true;

    try {
      // 🎯 使用前端解析器（和单个添加节点一样）
      const { subs, nodes } = parseImportText(textContent.value);
      
      if (nodes.length > 0) {
        // 前端解析的节点已经保留了原始URL
        props.addNodesFromBulk(nodes);
        
        if (props.onImportSuccess) {
          await props.onImportSuccess();
        }
        
        toastStore.showToast(`导入成功！共添加 ${nodes.length} 个节点`, 'success');
        emit('update:show', false);
      } else if (subs.length > 0) {
        // 如果只有订阅链接，提示用户
        errorMessage.value = `检测到 ${subs.length} 个订阅链接，请使用 URL 导入模式或在订阅管理中添加。`;
      } else {
        // 🔄 如果前端解析失败，尝试调用后端解析（可能是 Clash/Base64 等格式）
        const response = await fetch('/api/node_count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: textContent.value,
            returnNodes: true
          })
        });

        if (!response.ok) {
          throw new Error('后端解析也失败了');
        }
        
        const data = await response.json() as any;
        const newNodes: Node[] = (data.nodes || []).map((n: any) => ({
          ...n,
          id: n.id || crypto.randomUUID(),
          enabled: true
        } as unknown as Node));

        if (newNodes.length > 0) {
          props.addNodesFromBulk(newNodes);
          
          if (props.onImportSuccess) {
            await props.onImportSuccess();
          }
          
          toastStore.showToast(`导入成功！共添加 ${newNodes.length} 个节点`, 'success');
          emit('update:show', false);
        } else {
          errorMessage.value = '未能解析出任何节点，请检查内容格式是否正确。';
        }
      }
    } catch (error: unknown) {
      console.error('导入失败:', error);
      const msg = error instanceof Error ? error.message : String(error);
      errorMessage.value = `导入失败: ${msg}。支持节点链接、Clash(YAML)、Base64 等格式。`;
    } finally {
      isLoading.value = false;
    }
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
      <div class="flex flex-col gap-1">
        <h3 class="text-lg font-bold gradient-text">导入订阅</h3>
        <p class="text-xs text-gray-400 font-normal">支持 URL 链接、纯文本、Base64 以及 Clash/YAML 配置文件</p>
      </div>
    </template>
    
    <template #body>
      <!-- 导入模式切换 Tabs -->
      <div class="flex p-1 mb-5 bg-gray-100 dark:bg-gray-800/50 rounded-xl">
        <button
          v-for="m in ['url', 'text'] as const"
          :key="m"
          class="flex-1 py-1.5 text-sm font-medium rounded-lg transition-all"
          :class="mode === m 
            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          @click="mode = m"
        >
          {{ m === 'url' ? '链接导入' : '文本/文件导入' }}
        </button>
      </div>

      <!-- 模式 1: URL 导入 -->
      <div v-if="mode === 'url'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">订阅链接</label>
          <input 
            type="text" 
            v-model="subscriptionUrl" 
            placeholder="https://example.com/api/v1/client/subscribe?token=..."
            class="input-modern w-full"
            @keyup.enter="importSubscription" 
            v-focus
          />
        </div>
        
        <div class="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
          <p class="font-bold mb-1">💡 提示：</p>
          此模式通过后端服务器下载订阅内容，适合需要定期更新的订阅源。如果链接包含敏感参数（如 Token），它们将安全地传输给后端。
        </div>
      </div>

      <!-- 模式 2: 文本/文件导入 -->
      <div v-else class="space-y-4">
        <!-- 文件上传区域 -->
        <div 
          class="relative group cursor-pointer"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleFileDrop"
          @click="triggerFileInput"
        >
          <input 
            type="file" 
            ref="fileInputRef" 
            class="hidden" 
            accept=".yaml,.yml,.txt,.json,.conf"
            @change="handleFileSelect"
          />
          
          <div 
            class="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all"
            :class="isDragging 
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' 
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/30'"
          >
            <div class="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
              <svg class="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
                点击上传或拖拽文件
              </p>
              <p class="text-xs text-gray-400">
                支持 YAML, JSON, TXT 等格式
              </p>
            </div>
          </div>
        </div>

        <!-- 文本内容区域 -->
        <div>
          <div class="flex justify-between items-center mb-1.5">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">订阅内容</label>
            <span v-if="textContent" class="text-xs text-gray-400">
              {{ textContent.length }} 字符
            </span>
          </div>
          <textarea 
            v-model="textContent" 
            rows="6"
            placeholder="在此处粘贴 Base64、节点链接列表或 Clash 配置内容..."
            class="input-modern w-full font-mono text-xs leading-relaxed resize-none"
          ></textarea>
        </div>
      </div>
      
      <!-- 错误提示 -->
      <div 
        v-if="errorMessage"
        class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 flex items-start gap-2"
      >
        <svg class="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-red-600 dark:text-red-400 text-xs leading-relaxed break-all">{{ errorMessage }}</p>
      </div>

    </template>
  </Modal>
</template>
