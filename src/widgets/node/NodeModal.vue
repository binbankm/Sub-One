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
import { useNodeForm } from '@/entities/node/model/useNodeForm';
import { useI18n } from 'vue-i18n';
import type { Node } from '@/common/types/index';
import Modal from '@/common/ui/BaseModal.vue';

const props = defineProps<{
    show: boolean;
    node: Node | null;
    isNew: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
    (e: 'save', node: Node): void;
}>();

const {
    localNode,
    urlError,
    lineCount,
    isMultiLine,
    modalTitle,
    saveButtonText,
    canSave,
    handleUrlBlur,
    handleUrlInput,
    handleNameInput,
    handleSave,
    handleCancel
} = useNodeForm(props, emit);

const { t } = useI18n();
</script>

<template>
    <Modal
        :show="show"
        :confirm-text="saveButtonText"
        :confirm-disabled="!canSave"
        @update:show="handleCancel"
        @confirm="handleSave"
    >
        <template #title>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                {{ modalTitle }}
            </h3>
        </template>

        <template #body>
            <div v-if="localNode" class="space-y-4">
                <!-- 节点名称 (多行批量导入时隐藏，单节点时显示) -->
                <div v-if="!isMultiLine">
                    <label
                        for="node-name"
                        class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        {{ t('widgets.node.modal.nameLabel') }}
                        <span class="ml-1 text-xs text-gray-400">{{ t('widgets.node.modal.optional') }}</span>
                    </label>
                    <input
                        id="node-name"
                        v-model="localNode.name"
                        name="nodeName"
                        type="text"
                        :placeholder="t('widgets.node.modal.namePlaceholder')"
                        class="input-modern w-full"
                        @input="handleNameInput"
                    />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {{ t('widgets.node.modal.nameHint') }}
                    </p>
                </div>

                <!-- 批量导入模式提示条 -->
                <div
                    v-else
                    class="flex items-center gap-2 rounded-element border border-primary-200 bg-primary-50 px-3.5 py-2.5 text-xs text-primary-700 dark:border-primary-800/40 dark:bg-primary-950/30 dark:text-primary-300"
                >
                    <svg class="h-4 w-4 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{{ t('entities.node.form.batchDetected', { count: lineCount }) }}</span>
                </div>

                <!-- 节点链接 -->
                <div>
                    <div class="mb-2 flex items-center justify-between">
                        <label
                            for="node-url"
                            class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            {{ t('widgets.node.modal.urlLabel') }}
                            <span class="text-danger-500">*</span>
                        </label>
                        <span v-if="lineCount > 1" class="text-xs font-medium text-primary-600 dark:text-primary-400">
                            {{ t('widgets.node.modal.lineCount', { count: lineCount }) }}
                        </span>
                    </div>
                    <textarea
                        id="node-url"
                        v-model="localNode.url"
                        name="nodeUrl"
                        :rows="isMultiLine ? 7 : 4"
                        :placeholder="t('widgets.node.modal.urlPlaceholder')"
                        class="input-modern w-full resize-y font-mono text-xs leading-relaxed"
                        :class="{ 'border-danger-500 dark:border-danger-500': urlError }"
                        @input="handleUrlInput"
                        @blur="handleUrlBlur"
                    ></textarea>
                    <p v-if="urlError" class="mt-1 text-sm text-danger-600 dark:text-danger-400">
                        {{ urlError }}
                    </p>
                    <p v-else class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {{ t('widgets.node.modal.urlHint') }}
                    </p>
                </div>

                <!-- 提示信息 -->
                <div
                    class="rounded-element border border-info-200 bg-info-50 p-4 dark:border-info-800 dark:bg-info-900/20"
                >
                    <div class="flex items-start gap-3">
                        <svg
                            class="mt-0.5 h-5 w-5 shrink-0 text-info-600 dark:text-info-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        <div class="flex-1">
                            <p class="mb-1 text-sm font-medium text-info-900 dark:text-info-100">
                                {{ t('widgets.node.modal.pasteTitle') }}
                            </p>
                            <p class="text-xs text-info-700 dark:text-info-300">
                                {{ t('widgets.node.modal.pasteDesc') }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </Modal>
</template>
