<script setup lang="ts">
import { ref } from 'vue';
import Modal from '../../components/ui/BaseModal.vue';
import { exportBackup, importBackup, validateBackupFile } from '../../utils/api';
import { useToastStore } from '../../stores/toast';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

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

// 导入备份
async function handleImport() {
  if (!selectedBackup.value) {
    showToast('请先选择备份文件', 'error');
    return;
  }

  // 二次确认
  const confirmMessage = restoreMode.value === 'overwrite'
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
  <Modal :show="show" @update:show="emit('update:show', $event)" size="4xl" :hide-footer="true">
    <template #title>
      <div class="flex items-center gap-3">
        <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-800 dark:text-white">备份与恢复</h3>
      </div>
    </template>

    <template #body>
      <div class="space-y-6 px-1">
        <!-- 导出备份 -->
        <section>
          <h4
            class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出备份
          </h4>
          <div class="bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl p-6">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              导出所有数据到本地 JSON 文件，包括订阅源、订阅组、手动节点、系统设置和用户信息。
            </p>
            <button @click="handleExport"
              :disabled="isExporting"
              class="btn-primary flex items-center gap-2 w-full md:w-auto"
              :class="{ 'opacity-50 cursor-not-allowed': isExporting }">
              <svg v-if="!isExporting" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ isExporting ? '导出中...' : '立即导出备份' }}
            </button>
          </div>
        </section>

        <!-- 导入备份 -->
        <section>
          <h4
            class="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 14l-3 3m0 0l-3-3m3 3V5m9 10v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5" />
            </svg>
            导入备份
          </h4>
          <div class="bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl p-6">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              从本地 JSON 文件恢复数据。请谨慎操作，建议先导出当前数据作为备份。
            </p>

            <!-- 文件选择 -->
            <div class="mb-4">
              <input ref="fileInput" 
                type="file" 
                accept=".json" 
                @change="handleFileSelect" 
                class="hidden">
              <button @click="() => fileInput?.click()"
                class="btn-secondary flex items-center gap-2 w-full md:w-auto">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                选择备份文件
              </button>
            </div>

            <!-- 文件预览 -->
            <div v-if="selectedBackup" class="mb-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h5 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📊 备份文件信息</h5>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="text-gray-600 dark:text-gray-400">备份时间:</div>
                <div class="font-mono text-gray-800 dark:text-gray-200">
                  {{ formatTimestamp(selectedBackup.timestamp) }}
                </div>
                
                <div class="text-gray-600 dark:text-gray-400">版本号:</div>
                <div class="font-mono text-gray-800 dark:text-gray-200">
                  {{ selectedBackup.version }}
                </div>

                <div class="text-gray-600 dark:text-gray-400">存储后端:</div>
                <div class="font-mono text-gray-800 dark:text-gray-200 uppercase">
                  {{ selectedBackup.metadata?.storageBackend || 'N/A' }}
                </div>

                <div class="col-span-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div class="text-gray-600 dark:text-gray-400 mb-1">数据统计:</div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>订阅源: <span class="font-semibold">{{ selectedBackup.metadata?.itemCount?.subscriptions || 0 }}</span></div>
                    <div>订阅组: <span class="font-semibold">{{ selectedBackup.metadata?.itemCount?.profiles || 0 }}</span></div>
                    <div>手动节点: <span class="font-semibold">{{ selectedBackup.metadata?.itemCount?.manualNodes || 0 }}</span></div>
                    <div>用户数: <span class="font-semibold">{{ selectedBackup.metadata?.itemCount?.users || 0 }}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 恢复模式选择 -->
            <div v-if="selectedBackup" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">恢复模式</label>
              <div class="space-y-2">
                <label class="flex items-center p-3 bg-white dark:bg-gray-900 border rounded-lg cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                  :class="restoreMode === 'overwrite' ? 'border-indigo-500 dark:border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'border-gray-200 dark:border-gray-700'">
                  <input type="radio" 
                    v-model="restoreMode" 
                    value="overwrite" 
                    class="mr-3">
                  <div class="flex-1">
                    <div class="text-sm font-medium text-gray-800 dark:text-gray-200">覆盖模式</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">删除现有数据，完全恢复备份（⚠️ 慎用）</div>
                  </div>
                </label>

                <label class="flex items-center p-3 bg-white dark:bg-gray-900 border rounded-lg cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                  :class="restoreMode === 'merge' ? 'border-indigo-500 dark:border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'border-gray-200 dark:border-gray-700'">
                  <input type="radio" 
                    v-model="restoreMode" 
                    value="merge" 
                    class="mr-3">
                  <div class="flex-1">
                    <div class="text-sm font-medium text-gray-800 dark:text-gray-200">合并模式（推荐）</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">保留现有数据，仅导入不存在的项</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- 导入按钮 -->
            <button v-if="selectedBackup" 
              @click="handleImport"
              :disabled="isImporting"
              class="btn-primary flex items-center gap-2 w-full md:w-auto"
              :class="{ 'opacity-50 cursor-not-allowed': isImporting }">
              <svg v-if="!isImporting" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ isImporting ? '恢复中...' : '开始恢复' }}
            </button>
          </div>
        </section>

        <!-- 安全提示 -->
        <div class="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div class="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.964-1.333-3.732 0L3.264 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div class="text-sm text-amber-800 dark:text-amber-200">
              <div class="font-semibold mb-1">⚠️ 安全提示</div>
              <ul class="list-disc list-inside space-y-1 text-xs">
                <li>备份文件包含敏感信息（包括密码哈希），请妥善保管</li>
                <li>导入前建议先导出当前数据作为备份</li>
                <li>恢复完成后页面将自动刷新</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>


