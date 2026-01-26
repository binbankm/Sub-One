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

import Modal from '../../components/ui/BaseModal.vue';
import StorageBackendSwitcher from '../../components/ui/StorageBackendSwitcher.vue';
import { useDataStore } from '../../stores/data';
import { useToastStore } from '../../stores/toast';
import type { AppConfig } from '../../types/index';
import { fetchSettings, saveSettings } from '../../utils/api';
import BackupView from './BackupView.vue';

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

// 默认设置值（与后端保持一致）
const defaultSettings: AppConfig = {
    // 基础配置
    FileName: 'Sub-One',
    mytoken: 'auto',
    profileToken: '', // 默认为空，用户需主动设置

    prependSubName: false,
    dedupe: false, // 默认关闭去重，保留所有节点

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
        'ChatID'
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
        console.error('加载设置出错:', error);
        showToast('⚠️ 加载设置失败，将使用默认值', 'warning');
    } finally {
        isLoading.value = false;
    }
};

const handleSave = async () => {
    if (hasWhitespace.value) {
        showToast('⚠️ 输入项中不能包含空格，请检查后再试。', 'error');
        return;
    }

    isSaving.value = true;
    try {
        const result = await saveSettings(settings.value);
        if (result.success) {
            // 弹出成功提示
            showToast('✅ 设置已保存', 'success');

            // 同步到 Store，防止在此期间的其他操作覆盖配置
            dataStore.updateConfig(settings.value);

            // 仅在非存储标签页（常规/高级设置）保存时刷新页面
            if (activeTab.value !== 'storage') {
                showToast('✅ 设置已保存，页面将自动刷新...', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                // 如果是在存储页点确认，仅关闭弹窗
                emit('update:show', false);
            }
        } else {
            throw new Error(result.message || '保存失败');
        }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        showToast('❌ ' + msg, 'error');
        isSaving.value = false; // 只有失败时才需要重置保存状态
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
        confirm-button-title="输入内容包含空格，无法保存"
        size="4xl"
        @update:show="emit('update:show', $event)"
        @confirm="handleSave"
    >
        <template #title>
            <div class="flex items-center gap-3">
                <div class="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 text-indigo-600 dark:text-indigo-400"
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
                <h3 class="text-xl font-bold text-gray-800 dark:text-white">系统设置</h3>
            </div>
        </template>
        <template #body>
            <div v-if="isLoading" class="flex flex-col items-center justify-center p-12">
                <div
                    class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"
                ></div>
                <p class="font-medium text-gray-500">正在加载配置...</p>
            </div>

            <div v-else class="space-y-6 px-1">
                <!-- 标签页导航 -->
                <div class="border-b border-gray-300 dark:border-gray-700">
                    <nav class="-mb-px flex gap-2" aria-label="Tabs">
                        <button
                            :class="[
                                'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                                activeTab === 'general'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            ]"
                            @click="activeTab = 'general'"
                        >
                            常规设置
                        </button>
                        <button
                            :class="[
                                'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                                activeTab === 'advanced'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            ]"
                            @click="activeTab = 'advanced'"
                        >
                            高级设置
                        </button>
                        <button
                            :class="[
                                'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                                activeTab === 'storage'
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            ]"
                            @click="activeTab = 'storage'"
                        >
                            存储与备份
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
                                class="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
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
                                基础配置
                            </h4>
                            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div class="group">
                                    <label
                                        for="fileName"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-indigo-600 dark:text-gray-300 dark:group-hover:text-indigo-400"
                                        >自定义订阅文件名</label
                                    >
                                    <input
                                        id="fileName"
                                        v-model="settings.FileName"
                                        type="text"
                                        class="input-modern-enhanced w-full"
                                        placeholder="例如：my_subscription"
                                    />
                                </div>
                                <div class="group">
                                    <label
                                        for="myToken"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-indigo-600 dark:text-gray-300 dark:group-hover:text-indigo-400"
                                        >自定义订阅Token</label
                                    >
                                    <input
                                        id="myToken"
                                        v-model="settings.mytoken"
                                        type="text"
                                        class="input-modern-enhanced w-full"
                                        placeholder="用于访问订阅链接的Token"
                                    />
                                </div>
                            </div>
                        </section>

                        <!-- 订阅组设置 -->
                        <section>
                            <h4
                                class="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
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
                                订阅组与节点
                            </h4>
                            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <!-- 分享Token (全宽) -->
                                <div class="group md:col-span-2">
                                    <label
                                        for="profileToken"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-indigo-600 dark:text-gray-300 dark:group-hover:text-indigo-400"
                                        >订阅组分享Token</label
                                    >
                                    <input
                                        id="profileToken"
                                        v-model="settings.profileToken"
                                        type="text"
                                        class="input-modern-enhanced w-full"
                                        placeholder="例如：my（必须与订阅Token不同）"
                                    />
                                    <p
                                        class="mt-2 flex items-start gap-1 text-xs text-amber-600 dark:text-amber-400"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            class="mt-0.5 h-3 w-3 flex-shrink-0"
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
                                            >重要：此Token必须与"自定义订阅Token"不同。留空则无法使用订阅组分享。</span
                                        >
                                    </p>
                                </div>

                                <!-- 开关组：自动前缀 -->
                                <div>
                                    <label
                                        class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >节点名前缀</label
                                    >
                                    <div
                                        class="flex h-[88px] items-center justify-between rounded-xl border border-gray-300 bg-gray-50/80 p-4 transition-colors hover:border-indigo-200 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-indigo-800"
                                    >
                                        <div>
                                            <p
                                                class="text-sm font-medium text-gray-700 dark:text-gray-200"
                                            >
                                                自动添加前缀
                                            </p>
                                            <p
                                                class="mr-2 mt-1 text-xs text-gray-500 dark:text-gray-400"
                                            >
                                                将订阅名作为节点名前缀
                                            </p>
                                        </div>
                                        <label
                                            class="relative inline-flex flex-shrink-0 cursor-pointer items-center"
                                        >
                                            <input
                                                v-model="settings.prependSubName"
                                                type="checkbox"
                                                class="peer sr-only"
                                            />
                                            <div
                                                class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                                            ></div>
                                        </label>
                                    </div>
                                </div>

                                <!-- 开关组：自动去重 -->
                                <div>
                                    <label
                                        class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                                        >节点去重</label
                                    >
                                    <div
                                        class="flex h-[88px] items-center justify-between rounded-xl border border-gray-300 bg-gray-50/80 p-4 transition-colors hover:border-indigo-200 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-indigo-800"
                                    >
                                        <div>
                                            <p
                                                class="text-sm font-medium text-gray-700 dark:text-gray-200"
                                            >
                                                自动去重
                                            </p>
                                            <p
                                                class="mr-2 mt-1 text-xs text-gray-500 dark:text-gray-400"
                                            >
                                                去除相同节点(IP+Port)
                                            </p>
                                        </div>
                                        <label
                                            class="relative inline-flex flex-shrink-0 cursor-pointer items-center"
                                        >
                                            <input
                                                v-model="settings.dedupe"
                                                type="checkbox"
                                                class="peer sr-only"
                                            />
                                            <div
                                                class="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                                            ></div>
                                        </label>
                                    </div>
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
                                class="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
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
                                Telegram 通知
                            </h4>
                            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div class="group">
                                    <label
                                        for="tgBotToken"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-indigo-600 dark:text-gray-300 dark:group-hover:text-indigo-400"
                                        >Bot Token</label
                                    >
                                    <input
                                        id="tgBotToken"
                                        v-model="settings.BotToken"
                                        type="text"
                                        class="input-modern-enhanced w-full"
                                        placeholder="从 @BotFather 获取的Bot Token"
                                    />
                                </div>
                                <div class="group">
                                    <label
                                        for="tgChatID"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-indigo-600 dark:text-gray-300 dark:group-hover:text-indigo-400"
                                        >Chat ID</label
                                    >
                                    <input
                                        id="tgChatID"
                                        v-model="settings.ChatID"
                                        type="text"
                                        class="input-modern-enhanced w-full"
                                        placeholder="接收通知的聊天ID"
                                    />
                                </div>
                            </div>
                        </section>

                        <!-- 通知阈值设置 -->
                        <section>
                            <h4
                                class="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
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
                                通知阈值
                            </h4>
                            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <!-- 到期提醒阈值 -->
                                <div class="group">
                                    <label
                                        for="notifyThresholdDays"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-indigo-600 dark:text-gray-300 dark:group-hover:text-indigo-400"
                                    >
                                        到期提醒阈值（天）
                                    </label>
                                    <input
                                        id="notifyThresholdDays"
                                        v-model.number="settings.NotifyThresholdDays"
                                        type="number"
                                        min="1"
                                        max="30"
                                        class="input-modern-enhanced w-full"
                                        placeholder="例如：3"
                                    />
                                    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        当订阅剩余天数小于此值时发送提醒
                                    </p>
                                </div>

                                <!-- 流量提醒阈值 -->
                                <div class="group">
                                    <label
                                        for="notifyThresholdPercent"
                                        class="mb-2 block text-sm font-medium text-gray-700 transition-colors group-hover:text-indigo-600 dark:text-gray-300 dark:group-hover:text-indigo-400"
                                    >
                                        流量提醒阈值（%）
                                    </label>
                                    <input
                                        id="notifyThresholdPercent"
                                        v-model.number="settings.NotifyThresholdPercent"
                                        type="number"
                                        min="50"
                                        max="100"
                                        class="input-modern-enhanced w-full"
                                        placeholder="例如：90"
                                    />
                                    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        当流量使用超过此百分比时发送提醒
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                    <!-- 第2页结束 -->

                    <!-- 第3页：存储与备份 -->
                    <div v-show="activeTab === 'storage'" class="space-y-8">
                        <!-- 存储后端设置 -->
                        <section>
                            <h4
                                class="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
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
