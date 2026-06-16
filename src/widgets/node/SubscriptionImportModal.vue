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
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSubscriptionImport } from '@/entities/node/model/useSubscriptionImport';
import type { Node } from '@/common/types/index';
import Modal from '@/common/ui/BaseModal.vue';

const props = defineProps<{
    show: boolean;
    addNodesFromBulk: (nodes: Node[]) => void;
    onImportSuccess?: () => Promise<void>;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
}>();

const {
    mode,
    subscriptionUrl,
    textContent,
    isLoading,
    errorMessage,
    isDragging,
    handleFileSelect,
    handleFileDrop,
    importSubscription
} = useSubscriptionImport(props, emit);

const { t } = useI18n();

// Local UI Refs and Handlers
const fileInputRef = ref<HTMLInputElement | null>(null);
const triggerFileInput = () => {
    fileInputRef.value?.click();
};

// 简单的 v-focus 指令
const vFocus = {
    mounted: (el: HTMLElement) => el.focus()
};
</script>

<template>
    <Modal
        :show="show"
        :confirm-text="t('widgets.node.importModal.importBtn')"
        :confirm-disabled="isLoading"
        @update:show="emit('update:show', $event)"
        @confirm="importSubscription"
    >
        <template #title>
            <div class="flex flex-col gap-1">
                <h3 class="gradient-text text-lg font-bold">{{ t('widgets.node.importModal.title') }}</h3>
                <p class="text-xs font-normal text-gray-400">
                    {{ t('widgets.node.importModal.subtitle') }}
                </p>
            </div>
        </template>

        <template #body>
            <!-- 导入模式切换 Tabs -->
            <div class="mb-5 flex rounded-element bg-gray-100 p-1 dark:bg-white/5">
                <button
                    v-for="m in ['url', 'text'] as const"
                    :key="m"
                    class="flex-1 rounded-element py-1.5 text-sm font-medium transition-all"
                    :class="
                        mode === m
                            ? 'bg-white text-primary-600 shadow-elevated-sm dark:bg-white/10 dark:text-primary-400'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    "
                    @click="mode = m"
                >
                    {{ m === 'url' ? t('widgets.node.importModal.urlMode') : t('widgets.node.importModal.textMode') }}
                </button>
            </div>

            <!-- 模式 1: URL 导入 -->
            <div v-if="mode === 'url'" class="space-y-4">
                <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >{{ t('widgets.node.importModal.urlLabel') }}</label
                    >
                    <input
                        v-model="subscriptionUrl"
                        v-focus
                        type="text"
                        placeholder="https://example.com/api/v1/client/subscribe?token=..."
                        class="input-modern w-full"
                        @keyup.enter="importSubscription"
                    />
                </div>

                <div
                    class="rounded-element border border-info-100 bg-info-50 p-3 text-xs leading-relaxed text-info-600 dark:border-info-800/30 dark:bg-info-900/10 dark:text-info-400"
                >
                    <p class="mb-1 font-bold">{{ t('widgets.node.importModal.hintTitle') }}</p>
                    {{ t('widgets.node.importModal.urlHintDesc') }}
                </div>
            </div>

            <!-- 模式 2: 文本/文件导入 -->
            <div v-else class="space-y-4">
                <!-- 文件上传区域 -->
                <div
                    class="group relative cursor-pointer"
                    @dragover.prevent="isDragging = true"
                    @dragleave.prevent="isDragging = false"
                    @drop.prevent="handleFileDrop"
                    @click="triggerFileInput"
                >
                    <input
                        ref="fileInputRef"
                        type="file"
                        class="hidden"
                        accept=".yaml,.yml,.txt,.json,.conf"
                        @change="handleFileSelect"
                    />

                    <div
                        class="flex items-center gap-3 rounded-element border-2 border-dashed p-3 transition-all"
                        :class="
                            isDragging
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                : 'border-gray-300 bg-gray-50 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/10'
                        "
                    >
                        <div class="rounded-element bg-white p-2 shadow-elevated-sm dark:bg-white/10">
                            <svg
                                class="h-5 w-5 text-gray-500"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {{ t('widgets.node.importModal.uploadTitle') }}
                            </p>
                            <p class="text-xs text-gray-400">{{ t('widgets.node.importModal.uploadDesc') }}</p>
                        </div>
                    </div>
                </div>

                <!-- 文本内容区域 -->
                <div>
                    <div class="mb-1.5 flex items-center justify-between">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >{{ t('widgets.node.importModal.contentLabel') }}</label
                        >
                        <span v-if="textContent" class="text-xs text-gray-400">
                            {{ textContent.length }} {{ t('widgets.node.importModal.chars') }}
                        </span>
                    </div>
                    <textarea
                        v-model="textContent"
                        rows="6"
                        :placeholder="t('widgets.node.importModal.contentPlaceholder')"
                        class="input-modern w-full resize-none font-mono text-xs leading-relaxed"
                    ></textarea>
                </div>
            </div>

            <!-- 错误提示 -->
            <div
                v-if="errorMessage"
                class="mt-4 flex items-start gap-2 rounded-element border border-danger-200 bg-danger-50 p-3 dark:border-danger-800 dark:bg-danger-900/20"
            >
                <svg
                    class="mt-0.5 h-4 w-4 shrink-0 text-danger-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                <p class="text-xs leading-relaxed break-all text-danger-600 dark:text-danger-400">
                    {{ errorMessage }}
                </p>
            </div>
        </template>
    </Modal>
</template>
