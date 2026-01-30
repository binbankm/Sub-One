<script setup lang="ts">
import { ref } from 'vue';

import { useToastStore } from '../../stores/toast';
import ConfirmModal from '../../components/ui/ConfirmModal.vue';
import {
    exportBackup,
    importBackup,
    validateBackupFile,
    createSnapshot,
    fetchSnapshots,
    deleteSnapshot,
    restoreSnapshot,
    batchDeleteSnapshots
} from '../../utils/api';
import { onMounted } from 'vue';

// 导入批量选择模块
import { useBatchSelection } from '../../composables/useBatchSelection';

const { showToast } = useToastStore();
const isExporting = ref(false);
const isImporting = ref(false);
const selectedBackup = ref<any>(null);
const restoreMode = ref<'overwrite' | 'merge'>('merge');
const fileInput = ref<HTMLInputElement | null>(null);

// 快照相关状态
const snapshots = ref<any[]>([]);
const isLoadingSnapshots = ref(false);
const isCreatingSnapshot = ref(false);
const snapshotName = ref('');

// 批量选择逻辑
const batch = useBatchSelection(snapshots);

// 确认模态框状态
const showDeleteConfirm = ref(false);
const showBatchDeleteConfirm = ref(false); // 批量删除确认框
const showRestoreConfirm = ref(false);
const showImportConfirm = ref(false);
const pendingSnapshotId = ref('');

// 获取快照列表
async function loadSnapshots() {
    isLoadingSnapshots.value = true;
    try {
        const result = await fetchSnapshots();
        if (result.success) {
            snapshots.value = result.data;
        }
    } catch (error) {
        console.error('获取快照列表失败:', error);
    } finally {
        isLoadingSnapshots.value = false;
    }
}

// 创建快照
async function handleCreateSnapshot() {
    isCreatingSnapshot.value = true;
    try {
        const result = await createSnapshot(snapshotName.value);
        if (result.success) {
            showToast('📸 快照创建成功', 'success');
            snapshotName.value = '';
            await loadSnapshots();
        } else {
            showToast('❌ ' + (result.message || '创建快照失败'), 'error');
        }
    } catch (error) {
        showToast('❌ 创建快照失败', 'error');
    } finally {
        isCreatingSnapshot.value = false;
    }
}

// 删除快照 (打开确认框)
function handleDeleteSnapshot(id: string) {
    pendingSnapshotId.value = id;
    showDeleteConfirm.value = true;
}

// 批量删除 (打开确认框)
function handleBatchDelete() {
    if (batch.selectedCount.value === 0) return;
    showBatchDeleteConfirm.value = true;
}

// 执行批量删除
async function confirmBatchDelete() {
    const ids = batch.getSelectedIds();

    showToast(`⏳ 正在删除 ${ids.length} 个快照...`, 'info');

    try {
        // 使用后端批量删除接口，原子操作，性能更优，且避免并发冲突
        const result = await batchDeleteSnapshots(ids);

        if (result.success) {
           showToast(`🗑️ 成功删除 ${result.deletedCount} 个快照`, 'success');
           await loadSnapshots();
           batch.toggleBatchDeleteMode(); // 退出批量模式
        } else {
           showToast('❌ ' + (result.message || '批量删除失败'), 'error');
        }
    } catch (error) {
        console.error('批量删除失败:', error);
        showToast('❌ 批量删除过程中发生错误', 'error');
    } finally {
        showBatchDeleteConfirm.value = false;
    }
}

// 执行删除
async function confirmDeleteSnapshot() {
    if (!pendingSnapshotId.value) return;

    try {
        const success = await deleteSnapshot(pendingSnapshotId.value);
        if (success) {
            showToast('🗑️ 快照已删除', 'success');
            await loadSnapshots();
        } else {
            showToast('❌ 删除快照失败', 'error');
        }
    } catch (error) {
        showToast('❌ 删除快照失败', 'error');
    } finally {
        pendingSnapshotId.value = '';
    }
}

// 从快照恢复 (打开确认框)
function handleRestoreFromSnapshot(id: string) {
    pendingSnapshotId.value = id;
    showRestoreConfirm.value = true;
}

// 执行恢复
async function confirmRestoreFromSnapshot() {
    if (!pendingSnapshotId.value) return;

    isImporting.value = true;
    try {
            showToast('⏳ 正在恢复快照，请稍候...', 'info');
            const result = await restoreSnapshot(pendingSnapshotId.value, restoreMode.value);
            if (result.success) {
                showToast('🔄 快照恢复成功，页面即将刷新...', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
        } else {
            showToast('❌ ' + (result.message || '快照恢复失败'), 'error');
        }
    } catch (error) {
        showToast('❌ 快照恢复失败', 'error');
    } finally {
        isImporting.value = false;
        pendingSnapshotId.value = '';
    }
}

onMounted(() => {
    loadSnapshots();
});

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

        showToast('📦 备份文件已导出', 'success');
    } catch (error: any) {
        console.error('导出备份失败:', error);
        showToast('❌ ' + (error.message || '导出备份失败'), 'error');
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
            showToast('❌ ' + (validation.error || '备份文件格式错误'), 'error');
            selectedBackup.value = null;
            return;
        }

        selectedBackup.value = backupData;
        showToast('✅ 备份文件验证成功', 'success');
    } catch (error: any) {
        console.error('读取备份文件失败:', error);
        showToast('❌ 备份文件格式错误或损坏', 'error');
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
        showToast('⚠️ 仅支持 JSON 格式的备份文件', 'error');
        return;
    }

    // 复用文件处理逻辑
    try {
        const text = await file.text();
        const backupData = JSON.parse(text);

        // 验证备份文件
        const validation = await validateBackupFile(backupData);

        if (!validation.valid) {
            showToast('❌ ' + (validation.error || '备份文件格式错误'), 'error');
            selectedBackup.value = null;
            return;
        }

        selectedBackup.value = backupData;
        showToast('✅ 备份文件验证成功', 'success');
    } catch (error: any) {
        console.error('读取备份文件失败:', error);
        showToast('❌ 备份文件格式错误或损坏', 'error');
        selectedBackup.value = null;
    }
}

// 导入备份 (打开确认框)
async function handleImport() {
    if (!selectedBackup.value) {
        showToast('⚠️ 请先选择备份文件', 'error');
        return;
    }
    showImportConfirm.value = true;
}

// 执行导入
async function confirmImport() {
    if (!selectedBackup.value) return;

    isImporting.value = true;
    try {
        const result = await importBackup(selectedBackup.value, restoreMode.value);

        if (!result.success) {
            throw new Error(result.message || '导入失败');
        }

        showToast('🚀 数据恢复成功，页面即将刷新...', 'success');

        // 延迟刷新页面
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (error: any) {
        console.error('导入备份失败:', error);
        showToast('❌ ' + (error.message || '导入备份失败'), 'error');
        isImporting.value = false;
    }
}
</script>

<template>
    <div class="space-y-6 pb-12">
        <!-- 快照管理 (备份储存) -->
        <div
            class="rounded-xl border border-gray-300 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
        >
            <div class="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center border-b border-gray-300 pb-4 dark:border-gray-700">
                <div>
                    <h3 class="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
                        服务器快照
                        <span class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                            储存功能
                        </span>
                    </h3>
                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        在服务器上保存数据的历史版本，随时快速恢复 (保留最近 20 条)
                    </p>
                </div>
                <!-- 快速创建 -->
                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <input
                        v-model="snapshotName"
                        type="text"
                        placeholder="快照名称 (可选)"
                        class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:w-48"
                        @keyup.enter="handleCreateSnapshot"
                    />
                    <button
                        :disabled="isCreatingSnapshot"
                        class="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
                        @click="handleCreateSnapshot"
                    >
                        <svg v-if="!isCreatingSnapshot" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <div v-else class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        创建快照
                    </button>
                </div>
            </div>

            <!-- 快照列表 -->
            <div v-if="isLoadingSnapshots" class="flex justify-center py-12">
                <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>

            <div v-else-if="snapshots.length === 0" class="py-12 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                 还没有任何服务器快照
            </div>

            <div v-else>
                <!-- 批量操作栏 -->
                <div v-if="batch.isBatchDeleteMode.value" class="mb-4 flex items-center justify-between rounded-lg bg-indigo-50 p-3 px-4 dark:bg-indigo-900/20">
                    <div class="flex items-center gap-4">
                        <label class="flex cursor-pointer items-center gap-2">
                            <input
                                type="checkbox"
                                :checked="batch.selectedCount.value === snapshots.length && snapshots.length > 0"
                                class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                @change="batch.selectedCount.value === snapshots.length ? batch.deselectAll() : batch.selectAll()"
                            />
                            <span class="text-sm font-medium text-indigo-900 dark:text-indigo-300">
                                全选 ({{ batch.selectedCount.value }}/{{ snapshots.length }})
                            </span>
                        </label>
                    </div>
                    <div class="flex items-center gap-3">
                         <button
                            class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            @click="batch.toggleBatchDeleteMode()"
                        >
                            取消
                        </button>
                        <button
                            :disabled="batch.selectedCount.value === 0"
                            class="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-600 disabled:opacity-50"
                            @click="handleBatchDelete"
                        >
                            删除选中 ({{ batch.selectedCount.value }})
                        </button>
                    </div>
                </div>

                <!-- 列表控制栏 (非批量模式) -->
                <div v-else class="mb-4 flex justify-end">
                    <button
                        class="text-xs text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400"
                        @click="batch.toggleBatchDeleteMode()"
                    >
                        批量管理
                    </button>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <div
                        v-for="snapshot in snapshots"
                        :key="snapshot.id"
                        class="group relative flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-all hover:border-indigo-300 hover:bg-white dark:border-gray-700/50 dark:bg-gray-700/20 dark:hover:border-indigo-900/50 dark:hover:bg-gray-700/40"
                        @click="batch.isBatchDeleteMode.value && batch.toggleSelection(snapshot.id)"
                    >
                        <div class="flex items-center gap-4">
                            <!-- 批量选择框 -->
                            <div v-if="batch.isBatchDeleteMode.value" class="flex items-center" @click.stop>
                                <input
                                    type="checkbox"
                                    :checked="batch.isSelected(snapshot.id)"
                                    class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    @change="batch.toggleSelection(snapshot.id)"
                                />
                            </div>

                            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h4 class="text-sm font-bold text-gray-800 dark:text-white">{{ snapshot.name }}</h4>
                                <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>{{ formatTimestamp(snapshot.timestamp) }}</span>
                                    <span>·</span>
                                    <span>{{ snapshot.metadata?.itemCount?.subscriptions || 0 }} 订阅</span>
                                    <span>·</span>
                                    <span>{{ snapshot.metadata?.itemCount?.manualNodes || 0 }} 手动节点</span>
                                    <span>·</span>
                                    <span>{{ snapshot.metadata?.itemCount?.proxyCount || 0 }} 总节点</span>
                                </div>
                            </div>
                        </div>

                        <div v-if="!batch.isBatchDeleteMode.value" class="flex items-center gap-2 opacity-100 transition-opacity">
                            <button
                                class="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700"
                                @click.stop="handleRestoreFromSnapshot(snapshot.id)"
                            >
                                恢复
                            </button>
                            <button
                                class="rounded-lg bg-white p-1.5 text-red-500 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-red-50 dark:bg-gray-800 dark:ring-gray-600 dark:hover:bg-red-900/20"
                                title="删除"
                                @click.stop="handleDeleteSnapshot(snapshot.id)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    :disabled="isExporting"
                    class="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    @click="handleExport"
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
                        class="hidden"
                        @change="handleFileSelect"
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
                                class="p-1 text-gray-400 transition-colors hover:text-red-500"
                                @click="selectedBackup = null"
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
                        <div class="grid grid-cols-5 gap-2 text-center">
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
                                    手动节点
                                </div>
                            </div>
                            <div
                                class="rounded border border-indigo-50 bg-white p-2 dark:border-indigo-900/20 dark:bg-gray-800"
                            >
                                <div class="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                    {{ selectedBackup.metadata?.itemCount?.proxyCount || 0 }}
                                </div>
                                <div class="text-[10px] uppercase tracking-wide text-gray-500">
                                    总节点
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
                                    v-model="restoreMode"
                                    type="radio"
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
                                    v-model="restoreMode"
                                    type="radio"
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
                            :disabled="isImporting"
                            class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            @click="handleImport"
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
                            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            @click="selectedBackup = null"
                        >
                            取消
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </div>

        <!-- 确认框 -->
        <ConfirmModal
            :show="showBatchDeleteConfirm"
            title="确认批量删除"
            :message="`您确定要删除选中的 <strong>${batch.selectedCount.value}</strong> 个快照吗？删除后将无法恢复。`"
            type="danger"
            confirm-text="批量删除"
            @update:show="showBatchDeleteConfirm = $event"
            @confirm="confirmBatchDelete"
        />

        <ConfirmModal
            :show="showDeleteConfirm"
            title="确认删除快照"
            message="您确定要删除此快照吗？删除后将无法恢复。"
            type="danger"
            confirm-text="删除"
            @update:show="showDeleteConfirm = $event"
            @confirm="confirmDeleteSnapshot"
        />

        <ConfirmModal
            :show="showRestoreConfirm"
            title="确认恢复快照"
            :type="restoreMode === 'overwrite' ? 'danger' : 'warning'"
            :message="
                restoreMode === 'overwrite'
                    ? '确定要从快照恢复并 <strong class=\'text-red-500\'>覆盖</strong> 现有数据吗？此操作不可撤销！'
                    : '确定要从快照恢复（合并）数据吗？'
            "
            confirm-text="确认恢复"
            @update:show="showRestoreConfirm = $event"
            @confirm="confirmRestoreFromSnapshot"
        />

        <ConfirmModal
            :show="showImportConfirm"
            title="确认导入备份"
            :type="restoreMode === 'overwrite' ? 'danger' : 'warning'"
            :message="
                restoreMode === 'overwrite'
                    ? '确定要覆盖现有数据吗？现有数据将被完全替换，此操作不可撤销！'
                    : '确定要导入备份数据吗？现有数据将保留。'
            "
            confirm-text="开始导入"
            @update:show="showImportConfirm = $event"
            @confirm="confirmImport"
        />
    </div>
</template>
