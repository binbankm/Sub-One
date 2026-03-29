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
import NodeFilterRuleEditor from '../../../shared/components/ui/NodeFilterRuleEditor.vue';
import Modal from '../../../shared/components/ui/BaseModal.vue';
import type { Subscription } from '../../../types/index';
import { useSubscriptionForm } from '../composables/useSubscriptionForm';

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
    (e: 'save', subscription: Subscription, silent?: boolean): void;
}>();

const {
    localSubscription,
    urlError,
    nameError,
    showAdvanced,
    modalTitle,
    saveButtonText,
    canSave,
    handleUrlBlur,
    handleNameInput,
    handleSave,
    handleCancel,
    toggleAdvanced
} = useSubscriptionForm(
    props,
    (subscription) => emit('save', subscription),
    () => emit('update:show', false)
);
</script>

<template>
    <Modal
        :show="show"
        :confirm-text="saveButtonText"
        :confirm-disabled="!canSave"
        size="4xl"
        @update:show="handleCancel"
        @confirm="handleSave"
    >
        <template #title>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                {{ modalTitle }}
            </h3>
        </template>

        <template #body>
            <div v-if="localSubscription" class="space-y-8">
                <!-- 基础信息 -->
                <div class="space-y-4">
                    <h4
                        class="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path
                                fill-rule="evenodd"
                                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        基础信息
                    </h4>

                    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <!-- 订阅名称 (1列) -->
                        <div class="md:col-span-1">
                            <label
                                class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                订阅名称
                                <span class="ml-1 text-xs text-gray-400">(可选)</span>
                            </label>
                            <input
                                v-model="localSubscription.name"
                                type="text"
                                placeholder="留空自动提取"
                                class="input-modern w-full"
                                @input="handleNameInput"
                            />
                        </div>

                        <!-- 订阅链接 (2列) -->
                        <div class="md:col-span-2">
                            <label
                                class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
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
                        </div>
                    </div>

                    <div class="px-1 text-xs text-gray-500 dark:text-gray-400">
                        <p v-if="nameError" class="mb-1 text-red-600">{{ nameError }}</p>
                        <p v-else>名称留空将自动从链接中提取</p>
                    </div>
                </div>

                <!-- 高级选项 -->
                <div class="border-t border-gray-300 pt-4 dark:border-gray-700">
                    <button
                        class="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
                        @click="toggleAdvanced"
                    >
                        <svg
                            class="h-4 w-4 transition-transform duration-200"
                            :class="{ 'rotate-90': showAdvanced }"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        高级选项
                    </button>

                    <Transition name="slide-fade">
                        <div v-if="showAdvanced" class="mt-4 space-y-4">
                            <!-- 节点过滤规则 -->
                            <div>
                                <label
                                    class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                    节点过滤规则
                                    <span class="ml-1 text-xs text-gray-400">(可选)</span>
                                </label>
                                <NodeFilterRuleEditor
                                    v-model="localSubscription.exclude"
                                    placeholder="输入节点过滤规则..."
                                />
                                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    支持正则表达式，多个规则用换行分隔。使用
                                    <code class="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-700"
                                        >keep:</code
                                    >
                                    前缀表示白名单
                                </p>
                            </div>
                        </div>
                    </Transition>
                </div>

                <!-- 提示信息 -->
                <div
                    v-if="isNew"
                    class="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
                >
                    <div class="flex items-start gap-3">
                        <svg
                            class="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
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
                            <p class="mb-1 text-sm font-medium text-blue-900 dark:text-blue-100">
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

