<!--
  ==================== 系统设置模态框 ====================
  
  功能说明：
  - 管理应用的全局配置
  - 包括基础配置、订阅组、转换配置、Telegram通知等设置
  - 提供预设选项和自定义输入
  - 自动加载和保存配置
  - 输入验证（空格检测）
  
  配置项：
  - 基础配置：订阅文件名、订阅Token
  - 订阅组：分享Token、节点名前缀设置、配置文件URL
  - Telegram：Bot Token、Chat ID、通知阈值
  
  ==================================================
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AppConfig } from '@/common/types/index';
import { fetchSettings, saveSettings } from '@/common/utils/api';
import Modal from '@/common/ui/BaseModal.vue';
import StorageBackendSwitcher from '@/widgets/settings/StorageBackendSwitcher.vue';

import { useDataStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useNotificationStore';

import BackupView from '@/widgets/settings/BackupView.vue';

const props = defineProps<{
    show: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
}>();

const { showToast } = useToastStore();
const dataStore = useDataStore();
const isLoading = ref(false);
const isSaving = ref(false);

const { t } = useI18n();

// 默认设置值（与后端保持一致）
const defaultSettings: AppConfig = {
    // 基础配置
    FileName: 'Sub-One',
    mytoken: 'auto',
    profileToken: '', // 默认为空，用户需主动设置

    prependSubName: false,
    dedupe: false, // 默认关闭去重，保留所有节点

    // 转换配置
    useExternalConverter: false, // 默认使用后端自带转换
    externalConverterUrl: 'api-suc.0z.gs', // 默认外部转换API
    externalConverterApis: [
        'api-suc.0z.gs',
        'subapi.fxxk.dedyn.io',
        'subapi.cmliussss.net',
        'url.v1.mk',
        'api.v1.mk'
    ],

    // Telegram 通知配置
    BotToken: '',
    ChatID: '',

    // 通知阈值配置
    NotifyThresholdDays: 3, // 订阅到期提醒阈值（剩余天数）
    NotifyThresholdPercent: 90 // 流量使用提醒阈值（使用百分比）
};

// 初始化时直接使用默认值，确保界面不会显示空白
const settings = ref<AppConfig>({ ...defaultSettings });

const hasWhitespace = computed(() => {
    const fieldsToCkeck: (keyof AppConfig)[] = [
        'FileName',
        'mytoken',
        'profileToken',
        'BotToken',
        'ChatID',
        'cronSecret'
    ];

    for (const key of fieldsToCkeck) {
        const value = settings.value[key];
        if (value && typeof value === 'string' && /\s/.test(value)) {
            return true;
        }
    }
    return false;
});

const loadSettings = async () => {
    isLoading.value = true;
    try {
        const loaded = await fetchSettings();

        // 确保 loaded 是有效对象
        if (loaded && typeof loaded === 'object') {
            for (const key in loaded) {
                // 只要后端返回了值（包括空字符串），就使用后端的值
                // 这样用户可以主动清空某些配置（如 profileToken）
                const k = key as string;
                if ((loaded as any)[k] !== undefined && (loaded as any)[k] !== null) {
                    (settings.value as any)[k] = (loaded as any)[k];
                }
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast(t('widgets.settings.modal.loadFail'), 'warning');
    } finally {
        isLoading.value = false;
    }
};

const handleSave = async () => {
    if (hasWhitespace.value) {
        showToast(t('widgets.settings.modal.noWhitespace'), 'error');
        return;
    }

    isSaving.value = true;
    try {
        const result = await saveSettings(settings.value);
        if (result.success) {
            // 弹出成功提示
            showToast(t('widgets.settings.modal.saveSuccess'), 'success');

            // 同步到 Store，防止在此期间的其他操作覆盖配置
            dataStore.updateConfig(settings.value);

            // 仅在非存储标签页（常规/高级设置）保存时刷新页面
            if (activeTab.value !== 'storage') {
                showToast(t('widgets.settings.modal.saveSuccessRefresh'), 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                // 如果是在存储页点确认，仅关闭弹窗
                emit('update:show', false);
            }
        } else {
            throw new Error(result.message || t('widgets.settings.modal.saveFail'));
        }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        showToast(msg, 'error');
        isSaving.value = false; // 只有失败时才需要重置保存状态
    }
};

const cronUrl = computed(() => {
    if (!settings.value.cronEnabled || !settings.value.cronSecret) return '';
    return `${window.location.origin}/api/cron/trigger?token=${settings.value.cronSecret}`;
});

const copyCronUrl = async () => {
    if (!cronUrl.value) return;
    try {
        await navigator.clipboard.writeText(cronUrl.value);
        showToast(t('widgets.settings.modal.copySuccess'), 'success');
    } catch (err) {
        showToast(t('widgets.settings.modal.copyFail'), 'error');
    }
};

// 标签页状态
const activeTab = ref<'general' | 'advanced' | 'storage'>('general');

// 监听 show 属性，当模态框显示时加载设置
// 添加 immediate: true 确保组件挂载时如果 show 为 true 也能触发
watch(
    () => props.show,
    (newValue) => {
        if (newValue) {
            loadSettings();
            activeTab.value = 'general'; // 重置到第一个标签页
        }
    },
    { immediate: true }
);
</script>

<template>
    <Modal
        :show="show"
        :is-saving="isSaving"
        :confirm-disabled="hasWhitespace"
        :confirm-button-title="t('widgets.settings.modal.saveDisabled')"
        size="4xl"
        @update:show="emit('update:show', $event)"
        @confirm="handleSave"
    >
        <template #title>
            <div class="flex items-center gap-3">
                <div class="rounded-element bg-primary-100 p-2 dark:bg-primary-900/30">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 text-primary-600 dark:text-primary-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-800 dark:text-white">{{ t('widgets.settings.modal.title') }}</h3>
            </div>
        </template>
        <template #body>
            <div v-if="isLoading" class="flex flex-col items-center justify-center p-12">
                <div
                    class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"
                ></div>
                <p class="font-medium text-gray-500">{{ t('widgets.settings.modal.loading') }}</p>
            </div>

            <div v-else class="space-y-6 px-1">
                <!-- 标签页导航 -->
                <div class="border-b border-gray-300 dark:border-white/10">
                    <nav class="-mb-px flex gap-2" aria-label="Tabs">
                        <button
                            :class="[
                                'border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                                activeTab === 'general'
                                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            ]"
                            @click="activeTab = 'general'"
                        >
                            {{ t('widgets.settings.modal.tabGeneral') }}
                        </button>
                        <button
                            :class="[
                                'border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                                activeTab === 'advanced'
                                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            ]"
                            @click="activeTab = 'advanced'"
                        >
                            {{ t('widgets.settings.modal.tabAdvanced') }}
                        </button>
                        <button
                            :class="[
                                'border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                                activeTab === 'storage'
                                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            ]"
                            @click="activeTab = 'storage'"
                        >
                            {{ t('widgets.settings.modal.tabStorage') }}
                        </button>
                    </nav>
                </div>

                <!-- 标签页内容 -->
                <div class="space-y-8">
                    <!-- 第1页：常规设置 -->
                    <div v-show="activeTab === 'general'" class="space-y-8">
                        <!-- 基础设置 -->
                        <section>
                            <h4
                                class="mb-4 flex items-center gap-2 text-sm font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                    />
                                </svg>
                                {{ t('widgets.settings.modal.basic.title') }}
                            </h4>
                            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div class="group">
                                    <label
                                        for="fileName"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-primary-600 dark:text-gray-300 dark:group-hover:text-primary-400"
                                        >{{ t('widgets.settings.modal.basic.filename') }}</label
                                    >
                                    <input
                                        id="fileName"
                                        v-model="settings.FileName"
                                        type="text"
                                        class="input-modern-enhanced w-full"
                                        :placeholder="t('widgets.settings.modal.basic.filenamePlaceholder')"
                                    />
                                </div>
                                <div class="group">
                                    <label
                                        for="myToken"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-primary-600 dark:text-gray-300 dark:group-hover:text-primary-400"
                                        >{{ t('widgets.settings.modal.basic.token') }}</label
                                    >
                                    <input
                                        id="myToken"
                                        v-model="settings.mytoken"
                                        type="text"
                                        class="input-modern-enhanced w-full"
                                        :placeholder="t('widgets.settings.modal.basic.tokenPlaceholder')"
                                    />
                                </div>
                            </div>
                        </section>

                        <!-- 订阅组设置 -->
                        <section>
                            <h4
                                class="mb-4 flex items-center gap-2 text-sm font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                </svg>
                                {{ t('widgets.settings.modal.profile.title') }}
                            </h4>
                            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <!-- 分享Token (全宽) -->
                                <div class="group md:col-span-2">
                                    <label
                                        for="profileToken"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-primary-600 dark:text-gray-300 dark:group-hover:text-primary-400"
                                        >{{ t('widgets.settings.modal.profile.token') }}</label
                                    >
                                    <input
                                        id="profileToken"
                                        v-model="settings.profileToken"
                                        type="text"
                                        class="input-modern-enhanced w-full"
                                        :placeholder="t('widgets.settings.modal.profile.tokenPlaceholder')"
                                    />
                                    <p
                                        class="mt-2 flex items-start gap-1 text-xs text-warning-600 dark:text-warning-400"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            class="mt-0.5 h-3 w-3 shrink-0"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z"
                                            />
                                        </svg>
                                        <span
                                            >{{ t('widgets.settings.modal.profile.tokenHint') }}</span
                                        >
                                    </p>
                                </div>

                                <!-- 开关组：自动前缀 -->
                                <div>
                                    <label
                                        class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >{{ t('widgets.settings.modal.profile.prefixLabel') }}</label
                                    >
                                    <div
                                        class="flex h-22 items-center justify-between rounded-element border border-gray-300 bg-gray-50/80 p-4 transition-colors hover:border-primary-200 dark:border-white/10 dark:bg-white/5 dark:hover:border-primary-800"
                                    >
                                        <div>
                                            <p
                                                class="text-sm font-medium text-gray-700 dark:text-gray-200"
                                            >
                                                {{ t('widgets.settings.modal.profile.prefixTitle') }}
                                            </p>
                                            <p
                                                class="mt-1 mr-2 text-xs text-gray-500 dark:text-gray-400"
                                            >
                                                {{ t('widgets.settings.modal.profile.prefixDesc') }}
                                            </p>
                                        </div>
                                        <label
                                            class="relative inline-flex shrink-0 cursor-pointer items-center"
                                        >
                                            <input
                                                v-model="settings.prependSubName"
                                                type="checkbox"
                                                class="peer sr-only"
                                            />
                                            <div
                                                class="peer h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-primary-600 peer-focus:outline-none after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-white/10 dark:bg-white/10"
                                            ></div>
                                        </label>
                                    </div>
                                </div>

                                <!-- 开关组：自动去重 -->
                                <div>
                                    <label
                                        class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >{{ t('widgets.settings.modal.profile.dedupeLabel') }}</label
                                    >
                                    <div
                                        class="flex h-22 items-center justify-between rounded-element border border-gray-300 bg-gray-50/80 p-4 transition-colors hover:border-primary-200 dark:border-white/10 dark:bg-white/5 dark:hover:border-primary-800"
                                    >
                                        <div>
                                            <p
                                                class="text-sm font-medium text-gray-700 dark:text-gray-200"
                                            >
                                                {{ t('widgets.settings.modal.profile.dedupeTitle') }}
                                            </p>
                                            <p
                                                class="mt-1 mr-2 text-xs text-gray-500 dark:text-gray-400"
                                            >
                                                {{ t('widgets.settings.modal.profile.dedupeDesc') }}
                                            </p>
                                        </div>
                                        <label
                                            class="relative inline-flex shrink-0 cursor-pointer items-center"
                                        >
                                            <input
                                                v-model="settings.dedupe"
                                                type="checkbox"
                                                class="peer sr-only"
                                            />
                                            <div
                                                class="peer h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-primary-600 peer-focus:outline-none after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-white/10 dark:bg-white/10"
                                            ></div>
                                        </label>
                                    </div>
                                </div>

                                <!-- 开关组：使用外部转换API -->
                                <div class="md:col-span-2">
                                    <label
                                        class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >{{ t('widgets.settings.modal.convert.title') }}</label
                                    >
                                    <div
                                        class="flex h-22 items-center justify-between rounded-element border border-gray-300 bg-gray-50/80 p-4 transition-colors hover:border-primary-200 dark:border-white/10 dark:bg-white/5 dark:hover:border-primary-800"
                                    >
                                        <div>
                                            <p
                                                class="text-sm font-medium text-gray-700 dark:text-gray-200"
                                            >
                                                {{ t('widgets.settings.modal.convert.useExternal') }}
                                            </p>
                                            <p
                                                class="mt-1 mr-2 text-xs text-gray-500 dark:text-gray-400"
                                            >
                                                {{ t('widgets.settings.modal.convert.useExternalDesc') }}
                                            </p>
                                        </div>
                                        <label
                                            class="relative inline-flex shrink-0 cursor-pointer items-center"
                                        >
                                            <input
                                                v-model="settings.useExternalConverter"
                                                type="checkbox"
                                                class="peer sr-only"
                                            />
                                            <div
                                                class="peer h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-primary-600 peer-focus:outline-none after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-white/10 dark:bg-white/10"
                                            ></div>
                                        </label>
                                    </div>
                                </div>

                                <!-- 外部API地址 (仅当启用外部转换时显示) -->
                                <div
                                    v-if="settings.useExternalConverter"
                                    class="group md:col-span-2"
                                >
                                    <label
                                        for="externalConverterUrl"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-primary-600 dark:text-gray-300 dark:group-hover:text-primary-400"
                                        >{{ t('widgets.settings.modal.convert.apiUrl') }}</label
                                    >
                                    <div class="flex gap-2">
                                        <select
                                            v-model="settings.externalConverterUrl"
                                            class="input-modern-enhanced w-1/3 min-w-37.5"
                                        >
                                            <option
                                                v-for="api in settings.externalConverterApis"
                                                :key="api"
                                                :value="api"
                                            >
                                                {{ api }}
                                            </option>
                                            <option value="custom">{{ t('widgets.settings.modal.convert.manualInput') }}</option>
                                        </select>
                                        <input
                                            id="externalConverterUrl"
                                            v-model="settings.externalConverterUrl"
                                            type="text"
                                            class="input-modern-enhanced flex-1"
                                            :placeholder="t('widgets.settings.modal.convert.apiUrlPlaceholder')"
                                        />
                                    </div>
                                    <p
                                        class="mt-2 flex items-start gap-1 text-xs text-info-600 dark:text-info-400"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            class="mt-0.5 h-3 w-3 shrink-0"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        <span
                                            >{{ t('widgets.settings.modal.convert.apiUrlHint') }}</span
                                        >
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                    <!-- 第1页结束 -->

                    <!-- 第2页：高级设置 -->
                    <div v-show="activeTab === 'advanced'" class="space-y-8">
                        <!-- Telegram设置 -->
                        <section>
                            <h4
                                class="mb-4 flex items-center gap-2 text-sm font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                    />
                                </svg>
                                {{ t('widgets.settings.modal.tg.title') }}
                            </h4>
                            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div class="group">
                                    <label
                                        for="tgBotToken"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-primary-600 dark:text-gray-300 dark:group-hover:text-primary-400"
                                        >Bot Token</label
                                    >
                                    <input
                                        id="tgBotToken"
                                        v-model="settings.BotToken"
                                        type="text"
                                        class="input-modern-enhanced w-full"
                                        :placeholder="t('widgets.settings.modal.tg.tokenPlaceholder')"
                                    />
                                </div>
                                <div class="group">
                                    <label
                                        for="tgChatID"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-primary-600 dark:text-gray-300 dark:group-hover:text-primary-400"
                                        >Chat ID</label
                                    >
                                    <input
                                        id="tgChatID"
                                        v-model="settings.ChatID"
                                        type="text"
                                        class="input-modern-enhanced w-full"
                                        :placeholder="t('widgets.settings.modal.tg.chatIdPlaceholder')"
                                    />
                                </div>
                            </div>
                        </section>

                        <!-- 通知阈值设置 -->
                        <section>
                            <h4
                                class="mb-4 flex items-center gap-2 text-sm font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                    />
                                </svg>
                                {{ t('widgets.settings.modal.notify.title') }}
                            </h4>
                            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <!-- 到期提醒阈值 -->
                                <div class="group">
                                    <label
                                        for="notifyThresholdDays"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-primary-600 dark:text-gray-300 dark:group-hover:text-primary-400"
                                    >
                                        {{ t('widgets.settings.modal.notify.expireDays') }}
                                    </label>
                                    <input
                                        id="notifyThresholdDays"
                                        v-model.number="settings.NotifyThresholdDays"
                                        type="number"
                                        min="1"
                                        max="30"
                                        class="input-modern-enhanced w-full"
                                        :placeholder="t('widgets.settings.modal.notify.daysPlaceholder')"
                                    />
                                    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        {{ t('widgets.settings.modal.notify.expireHint') }}
                                    </p>
                                </div>

                                <!-- 流量提醒阈值 -->
                                <div class="group">
                                    <label
                                        for="notifyThresholdPercent"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-primary-600 dark:text-gray-300 dark:group-hover:text-primary-400"
                                    >
                                        {{ t('widgets.settings.modal.notify.trafficPercent') }}
                                    </label>
                                    <input
                                        id="notifyThresholdPercent"
                                        v-model.number="settings.NotifyThresholdPercent"
                                        type="number"
                                        min="50"
                                        max="100"
                                        class="input-modern-enhanced w-full"
                                        :placeholder="t('widgets.settings.modal.notify.percentPlaceholder')"
                                    />
                                    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        {{ t('widgets.settings.modal.notify.trafficHint') }}
                                    </p>
                                </div>
                            </div>
                        </section>

                        <!-- 自动更新配置 -->
                        <section>
                            <h4
                                class="mb-4 flex items-center gap-2 text-sm font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {{ t('widgets.settings.modal.cron.title') }}
                            </h4>
                            <!-- 定时更新总开关 -->
                            <div class="mb-6 flex items-center justify-between rounded-element bg-gray-50 p-4 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                                <div>
                                    <h5 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ t('widgets.settings.modal.cron.enable') }}</h5>
                                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {{ t('widgets.settings.modal.cron.enableDesc') }}
                                    </p>
                                </div>
                                <label class="relative inline-flex cursor-pointer items-center">
                                    <input
                                        v-model="settings.cronEnabled"
                                        type="checkbox"
                                        class="peer sr-only"
                                    />
                                    <!-- 背景轨道 -->
                                    <div
                                        class="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-primary-600 peer-focus:ring-2 peer-focus:ring-primary-500 peer-focus:ring-offset-2 dark:bg-white/10 dark:peer-focus:ring-offset-white/10"
                                    ></div>
                                    <!-- 滑块 -->
                                    <span
                                        class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"
                                    ></span>
                                </label>
                            </div>

                            <!-- 定时更新配置（仅在开启时显示） -->
                            <div v-if="settings.cronEnabled" class="grid grid-cols-1 gap-6 md:grid-cols-2 animate-fade-in">
                                <div class="group md:col-span-2">
                                    <label
                                        for="cronSecret"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-primary-600 dark:text-gray-300 dark:group-hover:text-primary-400"
                                    >
                                        {{ t('widgets.settings.modal.cron.secret') }}
                                    </label>
                                    <input
                                        id="cronSecret"
                                        v-model="settings.cronSecret"
                                        type="text"
                                        class="input-modern-enhanced w-full"
                                        :placeholder="t('widgets.settings.modal.cron.secretPlaceholder')"
                                    />
                                    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span v-html="t('widgets.settings.modal.cron.hint1')"></span>
                                        <code class="px-1 py-0.5 mt-1 bg-gray-100 dark:bg-white/5 text-primary-600 dark:text-primary-400 rounded inline-block select-all">/api/cron/trigger?token={{ settings.cronSecret || 'YOUR_TOKEN' }}</code><br />
                                        {{ t('widgets.settings.modal.cron.hint2') }}
                                    </p>
                                    
                                    <!-- 动态生成的触发链接展示 -->
                                    <div v-if="cronUrl" class="mt-4 rounded-element bg-gray-50 p-3 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                                        <label class="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                                            {{ t('widgets.settings.modal.cron.triggerUrl') }}
                                        </label>
                                        <div class="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readonly
                                                :value="cronUrl"
                                                class="flex-1 rounded-element border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-white/10 dark:bg-black/80 dark:text-gray-300"
                                            />
                                            <button
                                                type="button"
                                                class="rounded-element bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50 transition-colors"
                                                @click="copyCronUrl"
                                            >
                                                复制链接
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 关闭状态提示 -->
                            <div v-else class="rounded-element bg-gray-100 p-4 text-center dark:bg-white/5">
                                <p class="text-sm text-gray-500 dark:text-gray-400">
                                    <span class="inline-flex items-center gap-1">
                                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                        </svg>
                                        定时更新功能已关闭
                                    </span>
                                </p>
                            </div>
                        </section>
                    </div>
                    <!-- 第2页结束 -->

                    <!-- 第3页：存储与备份 -->
                    <div v-show="activeTab === 'storage'" class="space-y-8">
                        <!-- 存储后端设置 -->
                        <section>
                            <h4
                                class="mb-4 flex items-center gap-2 text-sm font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                                    />
                                </svg>
                                存储设置
                            </h4>
                            <StorageBackendSwitcher />
                        </section>

                        <!-- 备份与恢复 -->
                        <BackupView />
                    </div>
                    <!-- 第3页结束 -->
                </div>
                <!-- 标签页内容结束 -->
            </div>
        </template>
    </Modal>
</template>
```
