<!--
  ==================== 批量导入模态框 ====================
  
  功能说明：
  - 批量导入订阅链接和节点
  - 支持多行输入
  - 自动识别订阅链接和节点链接
  
  ==================================================
-->

<script setup lang="ts">
import { ref } from 'vue';

import Modal from './BaseModal.vue';

// ==================== Props 和 Emit ====================

defineProps<{
    /** 显示状态 */
    show: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
    (e: 'import', text: string): void;
}>();

// ==================== 状态 ====================

/** 导入文本 */
const importText = ref('');

// ==================== 事件处理 ====================

/**
 * 确认导入
 * 触发导入事件并清空输入
 */
const handleConfirm = () => {
    emit('import', importText.value);
    emit('update:show', false);
    importText.value = '';
};
</script>

<template>
    <Modal :show="show" @update:show="emit('update:show', $event)" @confirm="handleConfirm">
        <template #title>
            <h3 class="gradient-text text-lg font-bold">批量导入</h3>
        </template>
        <template #body>
            <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
                每行一个订阅链接或分享节点。将自动识别节点名称。
            </p>
            <textarea
                v-model="importText"
                rows="8"
                class="input-modern w-full resize-none font-mono text-sm"
                placeholder="http://...&#10;https://...&#10;vmess://...&#10;vless://...&#10;trojan://..."
            ></textarea>
        </template>
    </Modal>
</template>
