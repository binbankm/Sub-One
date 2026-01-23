<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToastStore } from '../../stores/toast';
import ConfirmModal from './ConfirmModal.vue';

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
    error.value = err.message || '加载存储后端信息失败';
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

  showToast('正在迁移数据并切换存储后端...', 'info', 5000);

  try {
    // 第一步：执行数据迁移
    const migrateResponse = await fetch('/api/storage/migrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetBackend: backend }),
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
      throw new Error(migrateData.message || migrateData.error || '数据迁移失败');
    }

    // 第二步：切换存储后端
    const switchResponse = await fetch('/api/storage/backend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ backend }),
    });

    const switchData = (await switchResponse.json()) as {
      success?: boolean;
      message?: string;
      error?: string;
      backend?: string;
    };

    if (!switchResponse.ok) {
      throw new Error(switchData.message || switchData.error || '切换失败');
    }

    if (switchData.success) {
      const migratedKeys = migrateData.details?.migrated || [];
      const count = migratedKeys.length;
      
      showToast(`切换成功！已自动迁移 ${count} 项数据`, 'success');
      
      // 延迟刷新页面以展示成功提示
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      throw new Error(switchData.message || '切换失败');
    }
  } catch (err: any) {
    console.error('Failed to migrate and switch backend:', err);
    error.value = err.message || '迁移或切换存储后端失败';
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
  <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 p-6 shadow-sm transition-all hover:shadow-md">
    <!-- 头部：标题与刷新 -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h3 class="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
          存储后端设置
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          管理应用数据的存储位置
        </p>
      </div>
      <button
        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        @click="loadBackendInfo"
        :disabled="loading"
        title="刷新状态"
      >
        <svg v-if="loading" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
      <svg class="h-5 w-5 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {{ error }}
    </div>

    <!-- 内容区域 -->
    <div v-if="backendInfo" class="space-y-6">
      <!-- 当前状态展示 -->
      <div class="relative overflow-hidden bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4">
        <div class="flex items-center justify-between relative z-10">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="backendInfo.current === 'kv' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'">
              <span class="font-bold text-xs">{{ backendInfo.current.toUpperCase() }}</span>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-0.5">当前正在使用</p>
              <p class="text-sm font-bold text-gray-900 dark:text-white">
                {{ backendInfo.current === 'kv' ? 'Cloudflare KV Storage' : 'Cloudflare D1 Database' }}
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm">
            <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            运行中
          </div>
        </div>
      </div>

      <!-- 切换选项 -->
      <div v-if="backendInfo.canSwitch" class="space-y-3">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">切换存储后端</label>
        <div class="grid grid-cols-2 gap-4">
          <button
            v-for="backend in backendInfo.available"
            :key="backend"
            class="group relative flex flex-col items-start p-4 border rounded-xl transition-all duration-200 text-left"
            :class="[
              backend === backendInfo.current
                ? 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-200 dark:ring-indigo-800 cursor-default'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm'
            ]"
            :disabled="backend === backendInfo.current || switching"
            @click="initiateSwitch(backend)"
          >
            <!-- 选中标记 -->
            <div v-if="backend === backendInfo.current" class="absolute top-3 right-3 text-indigo-600 dark:text-indigo-400">
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>

            <!-- 加载状态 -->
            <div v-if="switching && targetBackend === backend" class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-xl z-20">
              <svg class="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>

            <span class="text-sm font-bold mb-1" :class="backend === backendInfo.current ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'">
              {{ backend.toUpperCase() }}
              <span v-if="backend === backendInfo.current" class="ml-1 text-xs font-normal opacity-70">(当前)</span>
            </span>
            <span class="text-xs leading-relaxed" :class="backend === backendInfo.current ? 'text-indigo-600/80 dark:text-indigo-400/80' : 'text-gray-500 dark:text-gray-400'">
              {{ backend === 'kv' ? '读取速度极快，适合数据量较小的场景。' : '功能强大，适合大量订阅和复杂查询。' }}
            </span>
          </button>
        </div>
      </div>

      <!-- 无法切换提示 -->
      <div v-else class="p-4 bg-gray-50 dark:bg-gray-700/30 border border-gray-300 dark:border-gray-700 rounded-lg">
        <div class="flex items-start gap-3">
          <svg class="h-5 w-5 text-gray-400 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">无法切换存储后端</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              仅检测到一个可用的存储后端。如需使用 D1 存储，请在 Cloudflare 控制台创建名为 <strong class="text-indigo-600 dark:text-indigo-400">sub-one-d1</strong> 的 D1 数据库并绑定到项目变量 <code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-gray-800 dark:text-gray-200 font-mono text-xs">SUB_ONE_D1</code>。
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载中状态 -->
    <div v-else-if="loading" class="flex flex-col items-center justify-center p-8 space-y-3">
      <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p class="text-sm text-gray-500 dark:text-gray-400">正在检查存储后端配置...</p>
    </div>
  </div>

  <!-- 确认切换对话框 -->
  <ConfirmModal
    :show="showConfirm"
    @update:show="showConfirm = $event"
    @confirm="confirmSwitch"
    title="切换存储后端"
    type="warning"
    confirm-text="确认切换"
    cancel-text="再想想"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-gray-700 dark:text-gray-300">
          您即将从 <strong class="text-gray-900 dark:text-white">{{ backendInfo?.current.toUpperCase() }}</strong> 切换到 <strong class="text-indigo-600 dark:text-indigo-400">{{ targetBackend?.toUpperCase() }}</strong>。
        </p>
        
        <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h4 class="text-sm font-bold text-yellow-800 dark:text-yellow-400 mb-2 flex items-center gap-2">
            <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            自动数据迁移
          </h4>
          <p class="text-xs text-yellow-700 dark:text-yellow-300 leading-relaxed">
            系统将自动把您的<strong>订阅源、订阅组、系统设置和用户账号</strong>全量迁移到新存储后端。原有数据将保留，但切换后的新数据将写入到新后端。
          </p>
        </div>
        
        <p class="text-sm text-gray-500 dark:text-gray-400">
          切换成功后，页面将自动刷新以应用更改。
        </p>
      </div>
    </template>
  </ConfirmModal>
</template>


