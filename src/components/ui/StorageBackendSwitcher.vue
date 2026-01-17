<template>
  <div class="storage-backend-switcher">
    <div class="switcher-header">
      <h3>存储后端设置</h3>
      <button
        class="refresh-btn"
        @click="loadBackendInfo"
        :disabled="loading"
        title="刷新状态"
      >
        <span v-if="loading">⟳</span>
        <span v-else>↻</span>
      </button>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-else-if="backendInfo" class="backend-info">
      <div class="current-backend">
        <label>当前存储后端：</label>
        <span class="backend-badge" :class="`backend-${backendInfo.current}`">
          {{ backendInfo.current.toUpperCase() }}
        </span>
      </div>

      <div v-if="backendInfo.canSwitch" class="backend-options">
        <label>切换到：</label>
        <div class="button-group">
          <button
            v-for="backend in backendInfo.available"
            :key="backend"
            class="backend-button"
            :class="{
              active: backend === backendInfo.current,
              disabled: backend === backendInfo.current || switching
            }"
            :disabled="backend === backendInfo.current || switching"
            @click="switchBackend(backend)"
          >
            {{ backend.toUpperCase() }}
          </button>
        </div>
      </div>

      <div v-else class="no-switch-info">
        <p>仅配置了一个存储后端，无法切换</p>
        <p class="hint">
          如需使用 D1 存储，请在 Cloudflare 控制台创建名为 <strong>SUB_ONE_D1</strong> 的 D1 数据库并绑定到项目
        </p>
      </div>

      <div class="backend-description">
        <div class="desc-item">
          <strong>KV：</strong>
          <span>键值存储，简单快速，适合小规模数据</span>
        </div>
        <div class="desc-item">
          <strong>D1：</strong>
          <span>关系数据库，支持复杂查询，适合大规模数据</span>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="loading">
      加载中...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface BackendInfo {
  current: 'kv' | 'd1';
  available: ('kv' | 'd1')[];
  canSwitch: boolean;
}

const backendInfo = ref<BackendInfo | null>(null);
const loading = ref(false);
const switching = ref(false);
const error = ref<string>('');

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
  } finally {
    loading.value = false;
  }
}

async function switchBackend(backend: 'kv' | 'd1') {
  if (backend === backendInfo.value?.current || switching.value) {
    return;
  }

  const confirmed = confirm(
    `确定要切换到 ${backend.toUpperCase()} 存储后端吗?\n\n` +
    `提示：切换后将自动迁移当前存储后端的所有数据到新后端。`
  );

  if (!confirmed) {
    return;
  }

  switching.value = true;
  error.value = '';

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
      alert(
        `✓ 迁移和切换成功！\n\n` +
        `已迁移 ${migratedKeys.length} 项数据：\n` +
        `${migratedKeys.join(', ')}\n\n` +
        `页面将刷新以应用新的存储后端设置`
      );
      // 刷新页面以使用新的存储后端
      window.location.reload();
    } else {
      throw new Error(switchData.message || '切换失败');
    }
  } catch (err: any) {
    console.error('Failed to migrate and switch backend:', err);
    error.value = err.message || '迁移或切换存储后端失败';
    alert(`✗ 操作失败：${error.value}`);
  } finally {
    switching.value = false;
  }
}

onMounted(() => {
  loadBackendInfo();
});
</script>

<style scoped>
.storage-backend-switcher {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.switcher-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.switcher-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.refresh-btn {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  padding: 12px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #991b1b;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #6b7280;
}

.backend-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.current-backend {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-backend label {
  font-weight: 500;
  color: #374151;
}

.backend-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.backend-badge.backend-kv {
  background: #dbeafe;
  color: #1e40af;
}

.backend-badge.backend-d1 {
  background: #dcfce7;
  color: #166534;
}

.backend-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.backend-options label {
  font-weight: 500;
  color: #374151;
}

.button-group {
  display: flex;
  gap: 8px;
}

.backend-button {
  flex: 1;
  padding: 10px 16px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.backend-button:hover:not(:disabled) {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1e40af;
}

.backend-button.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: #fff;
  cursor: not-allowed;
}

.backend-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-switch-info {
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.no-switch-info p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.no-switch-info p:first-child {
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.no-switch-info .hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.backend-description {
  margin-top: 8px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.desc-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.desc-item:last-child {
  margin-bottom: 0;
}

.desc-item strong {
  color: #374151;
  min-width: 32px;
}

.desc-item span {
  color: #6b7280;
}
</style>
