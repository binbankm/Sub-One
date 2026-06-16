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
                <!-- 节点名称 -->
                <div>
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
                        type="text"
                        :placeholder="t('widgets.node.modal.namePlaceholder')"
                        class="input-modern w-full"
                        @input="handleNameInput"
                    />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {{ t('widgets.node.modal.nameHint') }}
                    </p>
                </div>

                <!-- 节点链接 -->
                <div>
                    <label
                        for="node-url"
                        class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        {{ t('widgets.node.modal.urlLabel') }}
                        <span class="text-danger-500">*</span>
                    </label>
                    <textarea
                        id="node-url"
                        v-model="localNode.url"
                        rows="4"
                        :placeholder="t('widgets.node.modal.urlPlaceholder')"
                        class="input-modern w-full resize-none font-mono text-sm"
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
