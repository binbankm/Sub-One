<!--
  ==================== 订阅组编辑模态框 ====================
  
  功能说明：
  - 创建或编辑订阅组（Profile）
  - 选择包含的订阅和手动节点
  - 支持搜索和智能筛选（国家/地区别名匹配）
  - 配置订阅组属性（名称、ID、后端、配置、到期时间）
  - 批量选择/取消选择功能
  
  配置项：
  - 基本信息：订阅组名称、自定义ID
  - 高级设置：自定义后端、自定义配置、到期时间
  - 内容选择：订阅列表、手动节点列表
  
  ==================================================
-->

<script setup lang="ts">
import { useProfileForm } from '@/entities/profile/model/useProfileForm';
import { useI18n } from 'vue-i18n';
import type { Node, Profile, Subscription } from '@/common/types/index';
import Modal from '@/common/ui/BaseModal.vue';

const props = withDefaults(
    defineProps<{
        show: boolean;
        profile?: Profile | null;
        isNew?: boolean;
        allSubscriptions?: Subscription[];
        allManualNodes?: Node[];
    }>(),
    {
        profile: null,
        isNew: false,
        allSubscriptions: () => [],
        allManualNodes: () => []
    }
);

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
    (e: 'save', profile: Profile): void;
}>();

const {
    localProfile,
    subscriptionSearchTerm,
    nodeSearchTerm,
    handleGenerateShortId,
    filteredSubscriptions,
    filteredManualNodes,
    handleConfirm,
    toggleSelection,
    handleSelectAll,
    handleDeselectAll
} = useProfileForm(props, (profile: Profile) => emit('save', profile));

const { t } = useI18n();
</script>

<template>
    <Modal
        :show="show"
        size="2xl"
        @update:show="emit('update:show', $event)"
        @confirm="handleConfirm"
    >
        <template #title>
            <h3 class="text-xl font-bold text-gray-800 dark:text-white">
                {{ isNew ? t('widgets.profile.modal.newTitle') : t('widgets.profile.modal.editTitle') }}
            </h3>
        </template>
        <template #body>
            <div v-if="localProfile" class="space-y-6">
                <!-- 表单区域 -->
                <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <!-- 订阅组名称 -->
                    <div>
                        <label
                            for="profile-name"
                            class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300"
                        >
                            {{ t('widgets.profile.modal.nameLabel') }}
                        </label>
                        <input
                            id="profile-name"
                            v-model="localProfile.name"
                            type="text"
                            :placeholder="t('widgets.profile.modal.namePlaceholder')"
                            class="input-modern-enhanced"
                        />
                    </div>

                    <!-- 自定义 ID -->
                    <div>
                        <label
                            for="profile-custom-id"
                            class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300"
                        >
                            {{ t('widgets.profile.modal.customIdLabel') }}
                        </label>
                        <div class="flex gap-2">
                            <input
                                id="profile-custom-id"
                                v-model="localProfile.customId"
                                type="text"
                                :placeholder="t('widgets.profile.modal.customIdPlaceholder')"
                                class="input-modern-enhanced flex-1"
                            />
                            <button
                                type="button"
                                class="rounded-element bg-gray-100 px-3 py-2 text-gray-600 shadow-elevated-sm transition-colors hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/10"
                                :title="t('widgets.profile.modal.generateIdBtn')"
                                @click="handleGenerateShortId"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                                    />
                                </svg>
                            </button>
                        </div>
                        <p class="mt-1.5 text-xs text-gray-400">
                            {{ t('widgets.profile.modal.linkPreview') }}<span
                                class="font-bold text-primary-500"
                                >{{ localProfile.customId || 'id' }}</span
                            >
                        </p>
                    </div>

                    <!-- 到期时间 -->
                    <div class="md:col-span-1">
                        <label
                            for="profile-expires-at"
                            class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300"
                        >
                            {{ t('widgets.profile.modal.expiresLabel') }}
                        </label>
                        <div class="relative">
                            <input
                                id="profile-expires-at"
                                v-model="localProfile.expiresAt"
                                type="date"
                                class="input-modern-enhanced"
                            />
                        </div>
                        <p class="mt-1.5 text-xs text-gray-400">
                            {{ t('widgets.profile.modal.expiresHint') }}
                        </p>
                    </div>
                </div>

                <!-- 选择区域 -->
                <div class="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2">
                    <!-- 选择订阅 -->
                    <div class="flex h-80 flex-col">
                        <div class="mb-3 flex items-center justify-between">
                            <h4 class="text-sm font-bold text-gray-700 dark:text-gray-300">
                                {{ t('widgets.profile.modal.selectSub') }}
                            </h4>
                            <div class="space-x-3 text-sm">
                                <button
                                    class="font-medium text-primary-600 transition-colors hover:text-primary-700"
                                    @click="handleSelectAll('subscriptions', filteredSubscriptions)"
                                >
                                    {{ t('widgets.profile.modal.selectAll') }}
                                </button>
                                <button
                                    class="font-medium text-primary-600 transition-colors hover:text-primary-700"
                                    @click="
                                        handleDeselectAll('subscriptions', filteredSubscriptions)
                                    "
                                >
                                    {{ t('widgets.profile.modal.deselectAll') }}
                                </button>
                            </div>
                        </div>

                        <div class="relative mb-3">
                            <input
                                v-model="subscriptionSearchTerm"
                                type="text"
                                :placeholder="t('widgets.profile.modal.searchSubPlaceholder')"
                                class="search-input-unified"
                            />
                            <svg
                                class="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>

                        <div
                            class="custom-scrollbar flex-1 overflow-y-auto rounded-element border border-gray-300 bg-gray-50 p-2 dark:border-white/10 dark:bg-white/5"
                        >
                            <div v-if="filteredSubscriptions.length > 0" class="space-y-1">
                                <div v-for="sub in filteredSubscriptions" :key="sub.id">
                                    <label
                                        class="group relative flex cursor-pointer items-center overflow-hidden rounded-element p-3 transition-all duration-200"
                                        :class="
                                            localProfile.subscriptions?.includes(sub.id)
                                                ? 'bg-primary-50 dark:bg-primary-900/20'
                                                : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                        "
                                    >
                                        <div
                                            v-if="localProfile.subscriptions?.includes(sub.id)"
                                            class="absolute top-0 bottom-0 left-0 w-1 bg-linear-to-b from-primary-500 to-secondary-500"
                                        ></div>
                                        <input
                                            type="checkbox"
                                            :checked="localProfile.subscriptions?.includes(sub.id)"
                                            class="mr-3 h-5 w-5 rounded border-gray-300 text-primary-600 transition-colors"
                                            @change="toggleSelection('subscriptions', sub.id)"
                                        />
                                        <span
                                            class="truncate text-sm font-medium text-gray-700 select-none dark:text-gray-200"
                                        >
                                            {{ sub.name || t('widgets.profile.modal.unnamedSub') }}
                                            <span
                                                v-if="!sub.enabled"
                                                class="ml-1 text-xs text-danger-500"
                                                >{{ t('widgets.profile.modal.disabled') }}</span
                                            >
                                        </span>
                                    </label>
                                </div>
                            </div>
                            <div
                                v-else
                                class="flex h-full flex-col items-center justify-center text-sm text-gray-400"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="mb-2 h-8 w-8 opacity-50"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                {{ t('widgets.profile.modal.noSubFound') }}
                            </div>
                        </div>
                    </div>

                    <!-- 选择手动节点 -->
                    <div class="flex h-80 flex-col">
                        <div class="mb-3 flex items-center justify-between">
                            <h4 class="text-sm font-bold text-gray-700 dark:text-gray-300">
                                {{ t('widgets.profile.modal.selectManual') }}
                            </h4>
                            <div class="space-x-3 text-sm">
                                <button
                                    class="font-medium text-primary-600 transition-colors hover:text-primary-700"
                                    @click="handleSelectAll('manualNodes', filteredManualNodes)"
                                >
                                    {{ t('widgets.profile.modal.selectAll') }}
                                </button>
                                <button
                                    class="font-medium text-primary-600 transition-colors hover:text-primary-700"
                                    @click="handleDeselectAll('manualNodes', filteredManualNodes)"
                                >
                                    {{ t('widgets.profile.modal.deselectAll') }}
                                </button>
                            </div>
                        </div>

                        <div class="relative mb-3">
                            <input
                                v-model="nodeSearchTerm"
                                type="text"
                                :placeholder="t('widgets.profile.modal.searchNodePlaceholder')"
                                class="search-input-unified"
                            />
                            <svg
                                class="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>

                        <div
                            class="custom-scrollbar flex-1 overflow-y-auto rounded-element border border-gray-300 bg-gray-50 p-2 dark:border-white/10 dark:bg-white/5"
                        >
                            <div v-if="filteredManualNodes.length > 0" class="space-y-1">
                                <div v-for="node in filteredManualNodes" :key="node.id">
                                    <label
                                        class="group relative flex cursor-pointer items-center overflow-hidden rounded-element p-3 transition-all duration-200"
                                        :class="
                                            localProfile.manualNodes?.includes(node.id)
                                                ? 'bg-primary-50 dark:bg-primary-900/20'
                                                : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                        "
                                    >
                                        <div
                                            v-if="localProfile.manualNodes?.includes(node.id)"
                                            class="absolute top-0 bottom-0 left-0 w-1 bg-linear-to-b from-primary-500 to-secondary-500"
                                        ></div>
                                        <input
                                            type="checkbox"
                                            :checked="localProfile.manualNodes?.includes(node.id)"
                                            class="mr-3 h-5 w-5 rounded border-gray-300 text-primary-600 transition-colors"
                                            @change="toggleSelection('manualNodes', node.id)"
                                        />
                                        <span
                                            class="truncate text-sm font-medium text-gray-700 select-none dark:text-gray-200"
                                            >{{ node.name || t('widgets.profile.modal.unnamedNode') }}</span
                                        >
                                    </label>
                                </div>
                            </div>
                            <div
                                v-else
                                class="flex h-full flex-col items-center justify-center text-sm text-gray-400"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="mb-2 h-8 w-8 opacity-50"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                {{ t('widgets.profile.modal.noNodeFound') }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </Modal>
</template>
