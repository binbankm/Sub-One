<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useToastStore } from '@/stores/useNotificationStore';
import { useI18n } from 'vue-i18n';
import ConfirmModal from '@/common/ui/ConfirmModal.vue';

interface BackendInfo {
    current: 'kv' | 'd1';
    available: ('kv' | 'd1')[];
    canSwitch: boolean;
}

const { showToast } = useToastStore();
const backendInfo = ref<BackendInfo | null>(null);
const loading = ref(false);
const switching = ref(false);
const error = ref<string>('');
const showConfirm = ref(false);
const targetBackend = ref<'kv' | 'd1' | null>(null);

const { t } = useI18n();

async function loadBackendInfo() {
    loading.value = true;
    error.value = '';

    try {
        const response = await fetch('/api/storage/backend');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        backendInfo.value = (await response.json()) as BackendInfo;
    } catch (err: any) {
        console.error('Failed to load backend info:', err);
        error.value = err.message || t('widgets.settings.storage.loadFail');
        showToast(error.value, 'error');
    } finally {
        loading.value = false;
    }
}

function initiateSwitch(backend: 'kv' | 'd1') {
    if (backend === backendInfo.value?.current || switching.value) {
        return;
    }

    targetBackend.value = backend;
    showConfirm.value = true;
}

async function confirmSwitch() {
    if (!targetBackend.value) return;

    const backend = targetBackend.value;
    switching.value = true;
    error.value = '';

    // 关闭确认框
    showConfirm.value = false;

    showToast(t('widgets.settings.storage.migrating'), 'info', 5000);

    try {
        // 第一步：执行数据迁移
        const migrateResponse = await fetch('/api/storage/migrate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ targetBackend: backend })
        });

        const migrateData = (await migrateResponse.json()) as {
            success?: boolean;
            message?: string;
            error?: string;
            details?: {
                migrated: string[];
                failed: string[];
                total: number;
            };
        };

        if (!migrateResponse.ok || !migrateData.success) {
            throw new Error(migrateData.message || migrateData.error || t('widgets.settings.storage.migrateFail'));
        }

        // 第二步：切换存储后端
        const switchResponse = await fetch('/api/storage/backend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ backend })
        });

        const switchData = (await switchResponse.json()) as {
            success?: boolean;
            message?: string;
            error?: string;
            backend?: string;
        };

        if (!switchResponse.ok) {
            throw new Error(switchData.message || switchData.error || t('widgets.settings.storage.switchFail'));
        }

        if (switchData.success) {
            const migratedKeys = migrateData.details?.migrated || [];
            const count = migratedKeys.length;

            showToast(t('widgets.settings.storage.switchSuccess', { count }), 'success');

            // 延迟刷新页面以展示成功提示
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            throw new Error(switchData.message || t('widgets.settings.storage.switchFail'));
        }
    } catch (err: any) {
        console.error('Failed to migrate and switch backend:', err);
        error.value = err.message || t('widgets.settings.backendFail');
        showToast(`操作失败：${error.value}`, 'error', 5000);
    } finally {
        switching.value = false;
        targetBackend.value = null;
    }
}

onMounted(() => {
    loadBackendInfo();
});
</script>

<template>
    <div
        class="rounded-element border border-gray-300 bg-white p-6 shadow-elevated-sm transition-all hover:shadow-elevated-sm dark:border-white/10 dark:bg-white/5"
    >
        <!-- 头部：标题与刷新 -->
        <div class="mb-6 flex items-center justify-between">
            <div>
                <h3 class="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
                    {{ t('widgets.settings.storage.title') }}
                </h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t('widgets.settings.storage.desc') }}</p>
            </div>
            <button
                class="rounded-element p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/10"
                :disabled="loading"
                :title="t('widgets.settings.storage.refresh')"
                @click="loadBackendInfo"
            >
                <svg
                    v-if="loading"
                    class="h-5 w-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                    ></circle>
                    <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                </svg>
                <svg
                    v-else
                    class="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
            </button>
        </div>

        <!-- 错误提示 -->
        <div
            v-if="error"
            class="mb-6 flex items-start gap-3 rounded-element border border-danger-200 bg-danger-50 p-4 text-sm text-danger-600 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-400"
        >
            <svg
                class="mt-0.5 h-5 w-5 shrink-0"
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
            {{ error }}
        </div>

        <!-- 内容区域 -->
        <div v-if="backendInfo" class="space-y-6">
            <!-- 当前状态展示 -->
            <div
                class="relative overflow-hidden rounded-element border border-primary-100 bg-primary-50/50 p-4 dark:border-primary-900/30 dark:bg-primary-900/10"
            >
                <div class="relative z-10 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div
                            class="flex h-10 w-10 items-center justify-center rounded-full"
                            :class="
                                backendInfo.current === 'kv'
                                    ? 'bg-info-100 text-info-600 dark:bg-info-900/40 dark:text-info-400'
                                    : 'bg-success-100 text-success-600 dark:bg-success-900/40 dark:text-success-400'
                            "
                        >
                            <span class="text-xs font-bold">{{
                                backendInfo.current.toUpperCase()
                            }}</span>
                        </div>
                        <div>
                            <p
                                class="mb-0.5 text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
                            >
                                {{ t('widgets.settings.storage.currentlyUsing') }}
                            </p>
                            <p class="text-sm font-bold text-gray-900 dark:text-white">
                                {{
                                    backendInfo.current === 'kv'
                                        ? 'Cloudflare KV Storage'
                                        : 'Cloudflare D1 Database'
                                }}
                            </p>
                        </div>
                    </div>

                    <div
                        class="flex items-center gap-2 rounded-full border border-primary-100 bg-white px-3 py-1 text-xs font-semibold text-primary-600 shadow-elevated-sm dark:border-primary-900/30 dark:text-primary-400"
                    >
                        <div class="h-2 w-2 animate-pulse rounded-full bg-success-500"></div>
                        {{ t('widgets.settings.storage.running') }}
                    </div>
                </div>
            </div>

            <!-- 切换选项 -->
            <div v-if="backendInfo.canSwitch" class="space-y-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >{{ t('widgets.settings.storage.switchTitle') }}</label
                >
                <div class="grid grid-cols-2 gap-4">
                    <button
                        v-for="backend in backendInfo.available"
                        :key="backend"
                        class="group relative flex flex-col items-start rounded-element border p-4 text-left transition-all duration-200"
                        :class="[
                            backend === backendInfo.current
                                ? 'cursor-default border-primary-200 bg-primary-50/30 ring-1 ring-primary-200 dark:border-primary-800 dark:bg-primary-900/10 dark:ring-primary-800'
                                : 'border-gray-300 bg-white hover:border-primary-300 hover:shadow-elevated-sm dark:border-white/10 dark:bg-white/5 dark:hover:border-primary-600'
                        ]"
                        :disabled="backend === backendInfo.current || switching"
                        @click="initiateSwitch(backend)"
                    >
                        <!-- 选中标记 -->
                        <div
                            v-if="backend === backendInfo.current"
                            class="absolute top-3 right-3 text-primary-600 dark:text-primary-400"
                        >
                            <svg
                                class="h-5 w-5"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                        </div>

                        <!-- 加载状态 -->
                        <div
                            v-if="switching && targetBackend === backend"
                            class="absolute inset-0 z-20 flex items-center justify-center rounded-element bg-white/80 dark:bg-white/10"
                        >
                            <svg
                                class="h-6 w-6 animate-spin text-primary-600"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    class="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="4"
                                ></circle>
                                <path
                                    class="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                        </div>

                        <span
                            class="mb-1 text-sm font-bold"
                            :class="
                                backend === backendInfo.current
                                    ? 'text-primary-700 dark:text-primary-300'
                                    : 'text-gray-900 dark:text-gray-100'
                            "
                        >
                            {{ backend.toUpperCase() }}
                            <span
                                v-if="backend === backendInfo.current"
                                class="ml-1 text-xs font-normal opacity-70"
                                >{{ t('widgets.settings.storage.current') }}</span
                            >
                        </span>
                        <span
                            class="text-xs leading-relaxed"
                            :class="
                                backend === backendInfo.current
                                    ? 'text-primary-600/80 dark:text-primary-400/80'
                                    : 'text-gray-500 dark:text-gray-400'
                            "
                        >
                            {{
                                backend === 'kv'
                                    ? t('widgets.settings.storage.kvDesc')
                                    : t('widgets.settings.storage.d1Desc')
                            }}
                        </span>
                    </button>
                </div>
            </div>

            <!-- 无法切换提示 -->
            <div
                v-else
                class="rounded-element border border-gray-300 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5"
            >
                <div class="flex items-start gap-3">
                    <svg
                        class="mt-0.5 h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
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
                    <div>
                        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {{ t('widgets.settings.storage.cannotSwitch') }}
                        </p>
                        <p class="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400" v-html="t('widgets.settings.storage.cannotSwitchHint')"></p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 加载中状态 -->
        <div v-else-if="loading" class="flex flex-col items-center justify-center space-y-3 p-8">
            <div
                class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"
            ></div>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('widgets.settings.storage.checking') }}</p>
        </div>
    </div>

    <!-- 确认切换对话框 -->
    <ConfirmModal
        :show="showConfirm"
        :title="t('widgets.settings.storage.confirmTitle')"
        type="warning"
        :confirm-text="t('widgets.settings.storage.confirmBtn')"
        :cancel-text="t('widgets.settings.storage.cancelBtn')"
        @update:show="showConfirm = $event"
        @confirm="confirmSwitch"
    >
        <template #body>
            <div class="space-y-4">
                <p class="text-gray-700 dark:text-gray-300" v-html="t('widgets.settings.storage.switchConfirmText', { current: backendInfo?.current.toUpperCase(), target: targetBackend?.toUpperCase() })"></p>

                <div
                    class="rounded-element border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20"
                >
                    <h4
                        class="mb-2 flex items-center gap-2 text-sm font-bold text-yellow-800 dark:text-yellow-400"
                    >
                        <svg
                            class="h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        {{ t('widgets.settings.storage.autoMigrate') }}
                    </h4>
                    <p class="text-xs leading-relaxed text-yellow-700 dark:text-yellow-300" v-html="t('widgets.settings.storage.autoMigrateHint')"></p>
                </div>

                <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('widgets.settings.storage.refreshHint') }}
                </p>
            </div>
        </template>
    </ConfirmModal>
</template>
