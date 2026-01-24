<script setup lang="ts">
import { ref } from 'vue';

import { useToastStore } from '../../stores/toast';
import { exportBackup, importBackup, validateBackupFile } from '../../utils/api';

const { showToast } = useToastStore();
const isExporting = ref(false);
const isImporting = ref(false);
const selectedBackup = ref<any>(null);
const restoreMode = ref<'overwrite' | 'merge'>('merge');
const fileInput = ref<HTMLInputElement | null>(null);

// 格式化时间戳
function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 导出备份
async function handleExport() {
    isExporting.value = true;
    try {
        const result = await exportBackup();

        if (!result.success || !result.data) {
            throw new Error(result.error || '导出失败');
        }

        // 生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
        const filename = `sub-one-backup-${timestamp}-${timeStr}.json`;

        // 创建下载链接
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('备份文件已导出', 'success');
    } catch (error: any) {
        console.error('导出备份失败:', error);
        showToast(error.message || '导出备份失败', 'error');
    } finally {
        isExporting.value = false;
    }
}

// 文件选择处理
async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    try {
        const text = await file.text();
        const backupData = JSON.parse(text);

        // 验证备份文件
        const validation = await validateBackupFile(backupData);

        if (!validation.valid) {
            showToast(validation.error || '备份文件格式错误', 'error');
            selectedBackup.value = null;
            return;
        }

        selectedBackup.value = backupData;
        showToast('备份文件验证成功', 'success');
    } catch (error: any) {
        console.error('读取备份文件失败:', error);
        showToast('备份文件格式错误或损坏', 'error');
        selectedBackup.value = null;
    } finally {
        // 清空文件输入
        target.value = '';
    }
}

// 拖拽文件处理
async function handleDrop(event: DragEvent) {
    const file = event.dataTransfer?.files?.[0];

    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        showToast('仅支持 JSON 格式的备份文件', 'error');
        return;
    }

    // 复用文件处理逻辑
    try {
        const text = await file.text();
        const backupData = JSON.parse(text);

        // 验证备份文件
        const validation = await validateBackupFile(backupData);

        if (!validation.valid) {
            showToast(validation.error || '备份文件格式错误', 'error');
            selectedBackup.value = null;
            return;
        }

        selectedBackup.value = backupData;
        showToast('备份文件验证成功', 'success');
    } catch (error: any) {
        console.error('读取备份文件失败:', error);
        showToast('备份文件格式错误或损坏', 'error');
        selectedBackup.value = null;
    }
}

// 导入备份
async function handleImport() {
    if (!selectedBackup.value) {
        showToast('请先选择备份文件', 'error');
        return;
    }

    // 二次确认
    const confirmMessage =
        restoreMode.value === 'overwrite'
            ? '确定要覆盖现有数据吗？此操作不可撤销！'
            : '确定要导入备份数据吗？';

    if (!confirm(confirmMessage)) {
        return;
    }

    isImporting.value = true;
    try {
        const result = await importBackup(selectedBackup.value, restoreMode.value);

        if (!result.success) {
            throw new Error(result.message || '导入失败');
        }

        showToast('数据恢复成功，页面即将刷新...', 'success');

        // 延迟刷新页面
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (error: any) {
        console.error('导入备份失败:', error);
        showToast(error.message || '导入备份失败', 'error');
        isImporting.value = false;
    }
}
</script>

<template>
    <div class="space-y-6">
        <!-- 导出备份 -->
        <div
            class="rounded-xl border border-gray-300 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
        >
            <div
                class="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
            >
                <div>
                    <h3
                        class="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white"
                    >
                        导出备份
                    </h3>
                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        下载包含所有数据的 JSON 文件到本地
                    </p>
                </div>
                <button
                    @click="handleExport"
                    :disabled="isExporting"
                    class="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <svg
                        v-if="!isExporting"
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
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                    </svg>
                    <div
                        v-else
                        class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    ></div>
                    {{ isExporting ? '正在导出...' : '导出数据' }}
                </button>
            </div>

            <div
                class="rounded-lg border border-gray-300 bg-gray-50 p-3 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-700/30 dark:text-gray-500"
            >
                包含订阅源、订阅组、手动节点、系统设置和账号信息。包括敏感数据（如密码哈希），请妥善保管。
            </div>
        </div>

        <!-- 导入备份 -->
        <div
            class="rounded-xl border border-gray-300 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
        >
            <div class="mb-6 border-b border-gray-300 pb-4 dark:border-gray-700">
                <h3 class="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
                    导入备份
                </h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    从本地 JSON 文件恢复数据
                </p>
            </div>

            <!-- 文件选择区域 -->
            <div class="space-y-4">
                <div
                    v-if="!selectedBackup"
                    class="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-8 text-center transition-colors hover:border-indigo-500 dark:border-gray-600 dark:bg-gray-700/20 dark:hover:border-indigo-400"
                    @click="() => fileInput?.click()"
                    @dragover.prevent
                    @drop.prevent="handleDrop"
                >
                    <input
                        ref="fileInput"
                        type="file"
                        accept=".json"
                        @change="handleFileSelect"
                        class="hidden"
                    />

                    <div
                        class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30"
                    >
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
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                    </div>
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        点击选择或拖拽文件到此处
                    </p>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        支持 .json 格式备份文件
                    </p>
                </div>

                <!-- 选中文件后的预览和操作 -->
                <div v-else class="animate-fadeIn space-y-6">
                    <!-- 文件信息卡片 -->
                    <div
                        class="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/30 dark:bg-indigo-900/10"
                    >
                        <div class="mb-4 flex items-start justify-between">
                            <div class="flex items-center gap-3">
                                <div
                                    class="rounded-lg border border-indigo-100 bg-white p-2 text-indigo-600 shadow-sm dark:border-indigo-900/30 dark:bg-gray-800 dark:text-indigo-400"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        class="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h5 class="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        备份文件已就绪
                                    </h5>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">
                                        版本 {{ selectedBackup.version }} ·
                                        {{ formatTimestamp(selectedBackup.timestamp) }}
                                    </p>
                                </div>
                            </div>
                            <button
                                @click="selectedBackup = null"
                                class="p-1 text-gray-400 transition-colors hover:text-red-500"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fill-rule="evenodd"
                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                        clip-rule="evenodd"
                                    />
                                </svg>
                            </button>
                        </div>

                        <!-- 数据统计网格 -->
                        <div class="grid grid-cols-4 gap-2 text-center">
                            <div
                                class="rounded border border-indigo-50 bg-white p-2 dark:border-indigo-900/20 dark:bg-gray-800"
                            >
                                <div class="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                    {{ selectedBackup.metadata?.itemCount?.subscriptions || 0 }}
                                </div>
                                <div class="text-[10px] uppercase tracking-wide text-gray-500">
                                    订阅源
                                </div>
                            </div>
                            <div
                                class="rounded border border-indigo-50 bg-white p-2 dark:border-indigo-900/20 dark:bg-gray-800"
                            >
                                <div class="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                    {{ selectedBackup.metadata?.itemCount?.profiles || 0 }}
                                </div>
                                <div class="text-[10px] uppercase tracking-wide text-gray-500">
                                    订阅组
                                </div>
                            </div>
                            <div
                                class="rounded border border-indigo-50 bg-white p-2 dark:border-indigo-900/20 dark:bg-gray-800"
                            >
                                <div class="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                    {{ selectedBackup.metadata?.itemCount?.manualNodes || 0 }}
                                </div>
                                <div class="text-[10px] uppercase tracking-wide text-gray-500">
                                    节点
                                </div>
                            </div>
                            <div
                                class="rounded border border-indigo-50 bg-white p-2 dark:border-indigo-900/20 dark:bg-gray-800"
                            >
                                <div class="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                    {{ selectedBackup.metadata?.itemCount?.users || 0 }}
                                </div>
                                <div class="text-[10px] uppercase tracking-wide text-gray-500">
                                    用户
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 恢复模式 -->
                    <div>
                        <label
                            class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >选择恢复方式</label
                        >
                        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label
                                class="relative flex cursor-pointer items-start rounded-xl border p-3 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                :class="
                                    restoreMode === 'merge'
                                        ? 'border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500'
                                        : 'border-gray-300 dark:border-gray-700'
                                "
                            >
                                <input
                                    type="radio"
                                    v-model="restoreMode"
                                    value="merge"
                                    class="sr-only"
                                />
                                <div class="flex h-5 items-center">
                                    <div
                                        class="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 transition-colors dark:border-gray-600"
                                        :class="{
                                            'border-indigo-600 bg-indigo-600':
                                                restoreMode === 'merge'
                                        }"
                                    >
                                        <div
                                            v-if="restoreMode === 'merge'"
                                            class="h-1.5 w-1.5 rounded-full bg-white"
                                        ></div>
                                    </div>
                                </div>
                                <div class="ml-3">
                                    <span
                                        class="block text-sm font-medium text-gray-900 dark:text-gray-100"
                                        >合并模式 (推荐)</span
                                    >
                                    <span
                                        class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400"
                                        >保留现有数据，仅添加新项</span
                                    >
                                </div>
                            </label>

                            <label
                                class="relative flex cursor-pointer items-start rounded-xl border p-3 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                :class="
                                    restoreMode === 'overwrite'
                                        ? 'border-amber-500 bg-amber-50/20 ring-1 ring-amber-500'
                                        : 'border-gray-300 dark:border-gray-700'
                                "
                            >
                                <input
                                    type="radio"
                                    v-model="restoreMode"
                                    value="overwrite"
                                    class="sr-only"
                                />
                                <div class="flex h-5 items-center">
                                    <div
                                        class="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 transition-colors dark:border-gray-600"
                                        :class="{
                                            'border-amber-600 bg-amber-600':
                                                restoreMode === 'overwrite'
                                        }"
                                    >
                                        <div
                                            v-if="restoreMode === 'overwrite'"
                                            class="h-1.5 w-1.5 rounded-full bg-white"
                                        ></div>
                                    </div>
                                </div>
                                <div class="ml-3">
                                    <span
                                        class="block text-sm font-medium text-gray-900 dark:text-gray-100"
                                        >覆盖模式</span
                                    >
                                    <span
                                        class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400"
                                        >清空现有数据，完全替换</span
                                    >
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- 操作按钮 -->
                    <div class="flex gap-3 pt-2">
                        <button
                            @click="handleImport"
                            :disabled="isImporting"
                            class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <svg
                                v-if="!isImporting"
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
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                />
                            </svg>
                            <div
                                v-else
                                class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                            ></div>
                            {{ isImporting ? '恢复数据中...' : '确认开始恢复' }}
                        </button>
                        <button
                            @click="selectedBackup = null"
                            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            取消
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
