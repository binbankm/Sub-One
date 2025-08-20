<!-- LatencyTestModal.vue - 延迟测试模态框组件 -->
<template>
  <Modal :show="show" @close="$emit('close')" size="max-w-6xl" :confirm-keyword="''" :confirm-disabled="true">
    <template #title>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 class="text-2xl font-bold gradient-text-enhanced">延迟测试</h2>
          <p class="text-gray-500 dark:text-gray-400">测试所有节点的延迟和连接性</p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- 测试控制区域 -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/30">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="space-y-2">
              <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">测试设置</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">选择要测试的节点类型和测试参数</p>
            </div>
            
            <div class="flex items-center gap-3">
              <!-- 测试类型选择 -->
              <div class="flex items-center gap-2">
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input 
                    type="checkbox" 
                    v-model="testSettings.testSubscriptions" 
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  >
                  订阅节点
                </label>
                <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input 
                    type="checkbox" 
                    v-model="testSettings.testManualNodes" 
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  >
                  手动节点
                </label>
              </div>
              
              <!-- 超时设置 -->
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-700 dark:text-gray-300">超时:</span>
                <select 
                  v-model="testSettings.timeout" 
                  class="rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="3000">3秒</option>
                  <option value="5000">5秒</option>
                  <option value="10000">10秒</option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- 开始测试按钮 -->
          <div class="mt-4 flex items-center gap-3">
            <button 
              @click="startLatencyTest" 
              :disabled="isTesting || !canStartTest"
              class="btn-modern-enhanced btn-primary text-base font-semibold px-8 py-3 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <svg v-if="!isTesting" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <svg v-else class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isTesting ? '测试中...' : '开始测试' }}
            </button>
            
            <button 
              v-if="isTesting"
              @click="stopLatencyTest" 
              class="btn-modern-enhanced btn-secondary text-base font-semibold px-6 py-3 transform hover:scale-105 transition-all duration-300"
            >
              停止测试
            </button>
            
            <button 
              v-if="testResults.length > 0"
              @click="exportResults" 
              class="btn-modern-enhanced btn-export text-base font-semibold px-6 py-3 transform hover:scale-105 transition-all duration-300"
            >
              导出CSV
            </button>
            
            <button 
              v-if="testAnalysis"
              @click="exportReport" 
              class="btn-modern-enhanced btn-report text-base font-semibold px-6 py-3 transform hover:scale-105 transition-all duration-300"
            >
              导出报告
            </button>
          </div>
        </div>

        <!-- 测试进度 -->
        <div v-if="isTesting" class="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200/50 dark:border-green-700/30">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">测试进度</h3>
            <span class="text-sm text-gray-600 dark:text-gray-400">{{ currentTestIndex + 1 }} / {{ totalTestCount }}</span>
          </div>
          
          <!-- 进度条 -->
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
            <div 
              class="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-300"
              :style="{ width: `${progressPercentage}%` }"
            ></div>
          </div>
          
          <!-- 当前测试节点 -->
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
                正在测试: {{ currentTestNode?.name || '准备中...' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ currentTestNode?.url || '' }}
              </p>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {{ currentTestStatus }}
            </div>
          </div>
        </div>

        <!-- 测试结果 -->
        <div v-if="testResults.length > 0" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">测试结果</h3>
            <div class="flex items-center gap-3">
              <button 
                @click="sortResults('latency')" 
                class="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                按延迟排序
              </button>
              <button 
                @click="sortResults('name')" 
                class="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                按名称排序
              </button>
              <button 
                @click="clearResults" 
                class="text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                清空结果
              </button>
            </div>
          </div>
          
          <!-- 结果统计 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-white/60 dark:bg-gray-800/75 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/30">
              <div class="text-2xl font-bold text-green-600">{{ successfulCount }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">成功连接</div>
            </div>
            <div class="bg-white/60 dark:bg-gray-800/75 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/30">
              <div class="text-2xl font-bold text-red-600">{{ failedCount }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">连接失败</div>
            </div>
            <div class="bg-white/60 dark:bg-gray-800/75 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/30">
              <div class="text-2xl font-bold text-blue-600">{{ averageLatency }}ms</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">平均延迟</div>
            </div>
            <div class="bg-white/60 dark:bg-gray-800/75 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/30">
              <div class="text-2xl font-bold text-purple-600">{{ bestLatency }}ms</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">最佳延迟</div>
            </div>
          </div>
          
          <!-- 结果列表 -->
          <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl border border-gray-200/50 dark:border-gray-700/30 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">节点名称</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">类型</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">延迟</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">状态</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">测试时间</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr 
                    v-for="result in sortedResults" 
                    :key="result.id"
                    class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="flex-shrink-0 w-8 h-8">
                          <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="getStatusColor(result.status).bg">
                            <svg class="w-4 h-4" :class="getStatusColor(result.status).text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path v-if="result.status === 'success'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        </div>
                        <div class="ml-3">
                          <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ result.name }}</div>
                          <div class="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{{ result.url }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getTypeColor(result.type).bg">
                        {{ getTypeLabel(result.type) }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span v-if="result.status === 'success'" class="text-sm font-medium" :class="getLatencyColor(result.latency).text">
                        {{ result.latency }}ms
                      </span>
                      <span v-else class="text-sm text-gray-400">-</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getStatusColor(result.status).badge">
                        {{ getStatusLabel(result.status) }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ formatTime(result.testTime) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 测试说明 -->
        <div v-if="!isTesting && testResults.length === 0" class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/30">
          <div class="text-center space-y-4">
            <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg class="w-8 h-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">开始延迟测试</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                选择要测试的节点类型，点击"开始测试"按钮开始测试所有节点的延迟和连接性。
                测试结果将显示每个节点的延迟时间、连接状态和测试时间。
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <template #footer>
      <div class="flex justify-end space-x-3">
        <button 
          @click="$emit('close')" 
          class="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold text-sm rounded-xl transition-all duration-200"
        >
          关闭
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue';
import Modal from './Modal.vue';
import { useToastStore } from '../stores/toast.js';
import { batchTestLatency, analyzeLatencyResults, generateLatencyReport, exportResultsToCSV, exportResultsToJSON } from '../lib/latencyTester.js';

// Props
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  subscriptions: {
    type: Array,
    default: () => []
  },
  manualNodes: {
    type: Array,
    default: () => []
  }
});

// Emits
const emit = defineEmits(['close']);

// Stores
const { showToast } = useToastStore();

// 响应式数据
const isTesting = ref(false);
const testResults = ref([]);
const currentTestIndex = ref(0);
const currentTestNode = ref(null);
const currentTestStatus = ref('');
const testAbortController = ref(null);
const testAnalysis = ref(null);

// 测试设置
const testSettings = ref({
  testSubscriptions: true,
  testManualNodes: true,
  timeout: 5000
});

// 计算属性
const canStartTest = computed(() => {
  return testSettings.value.testSubscriptions || testSettings.value.testManualNodes;
});

const totalTestCount = computed(() => {
  let count = 0;
  if (testSettings.value.testSubscriptions) {
    count += props.subscriptions.filter(sub => sub.url && /^https?:\/\//.test(sub.url)).length;
  }
  if (testSettings.value.testManualNodes) {
    count += props.manualNodes.length;
  }
  return count;
});

const progressPercentage = computed(() => {
  if (totalTestCount.value === 0) return 0;
  return ((currentTestIndex.value + 1) / totalTestCount.value) * 100;
});

const sortedResults = computed(() => {
  return [...testResults.value].sort((a, b) => {
    if (a.status === 'success' && b.status === 'success') {
      return a.latency - b.latency;
    }
    if (a.status === 'success') return -1;
    if (b.status === 'success') return 1;
    return 0;
  });
});

const successfulCount = computed(() => {
  return testAnalysis.value?.successful || 0;
});

const failedCount = computed(() => {
  return testAnalysis.value?.failed || 0;
});

const averageLatency = computed(() => {
  return testAnalysis.value?.averageLatency || 0;
});

const bestLatency = computed(() => {
  return testAnalysis.value?.bestLatency || 0;
});

// 方法
const startLatencyTest = async () => {
  if (isTesting.value) return;
  
  isTesting.value = true;
  currentTestIndex.value = 0;
  testResults.value = [];
  testAnalysis.value = null;
  
  try {
    const nodesToTest = [];
    
    // 收集要测试的节点
    if (testSettings.value.testSubscriptions) {
      const subscriptionNodes = props.subscriptions
        .filter(sub => sub.url && /^https?:\/\//.test(sub.url))
        .map(sub => ({
          id: sub.id,
          name: sub.name || '订阅节点',
          url: sub.url,
          type: 'subscription'
        }));
      nodesToTest.push(...subscriptionNodes);
    }
    
    if (testSettings.value.testManualNodes) {
      const manualNodeItems = props.manualNodes.map(node => ({
        id: node.id,
        name: node.name || '手动节点',
        url: node.url,
        type: 'manual'
      }));
      nodesToTest.push(...manualNodeItems);
    }
    
    if (nodesToTest.length === 0) {
      showToast('没有可测试的节点', 'warning');
      isTesting.value = false;
      return;
    }
    
    // 使用批量测试工具
    const results = await batchTestLatency(
      nodesToTest,
      {
        timeout: parseInt(testSettings.value.timeout),
        concurrency: 3,
        delay: 100
      },
      (progress) => {
        currentTestIndex.value = progress.current - 1;
        currentTestNode.value = nodesToTest[progress.current - 1];
        currentTestStatus.value = '正在测试...';
      }
    );
    
    testResults.value = results;
    testAnalysis.value = analyzeLatencyResults(results);
    
    showToast('延迟测试完成！', 'success');
  } catch (error) {
    showToast('测试过程中发生错误', 'error');
    console.error('延迟测试错误:', error);
  } finally {
    isTesting.value = false;
    currentTestNode.value = null;
    currentTestStatus.value = '';
  }
};

const testNodeLatency = async (node) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('请求超时'));
    }, parseInt(testSettings.value.timeout));
    
    const startTime = Date.now();
    
    // 创建一个简单的HTTP请求来测试延迟
    // 注意：这里使用fetch API，实际项目中可能需要根据节点类型使用不同的测试方法
    fetch(node.url, {
      method: 'HEAD', // 只请求头部，减少数据传输
      mode: 'no-cors', // 避免CORS问题
      signal: testAbortController.value.signal
    })
    .then(() => {
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      resolve({
        id: node.id,
        name: node.name,
        url: node.url,
        type: node.type,
        status: 'success',
        latency: latency,
        error: null,
        testTime: new Date()
      });
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
};

const stopLatencyTest = () => {
  isTesting.value = false;
  currentTestStatus.value = '测试已停止';
};

const sortResults = (type) => {
  if (type === 'latency') {
    testResults.value.sort((a, b) => {
      if (a.status === 'success' && b.status === 'success') {
        return a.latency - b.latency;
      }
      if (a.status === 'success') return -1;
      if (b.status === 'success') return 1;
      return 0;
    });
  } else if (type === 'name') {
    testResults.value.sort((a, b) => a.name.localeCompare(b.name));
  }
};

const clearResults = () => {
  testResults.value = [];
};

const exportResults = () => {
  const csvContent = exportResultsToCSV(testResults.value);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `latency-test-results-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showToast('测试结果已导出', 'success');
};

const exportReport = () => {
  if (!testAnalysis.value) return;
  
  const report = generateLatencyReport(testResults.value, testAnalysis.value);
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `latency-test-report-${new Date().toISOString().split('T')[0]}.txt`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showToast('测试报告已导出', 'success');
};

const getStatusColor = (status) => {
  if (status === 'success') {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    };
  } else {
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
  }
};

const getTypeColor = (type) => {
  if (type === 'subscription') {
    return {
      bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    };
  } else {
    return {
      bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    };
  }
};

const getTypeLabel = (type) => {
  return type === 'subscription' ? '订阅' : '手动';
};

const getStatusLabel = (status) => {
  return status === 'success' ? '成功' : '失败';
};

const getLatencyColor = (latency) => {
  if (latency < 100) return { text: 'text-green-600 dark:text-green-400' };
  if (latency < 300) return { text: 'text-yellow-600 dark:text-yellow-400' };
  if (latency < 500) return { text: 'text-orange-600 dark:text-orange-400' };
  return { text: 'text-red-600 dark:text-red-400' };
};

const formatTime = (time) => {
  return new Date(time).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 生命周期
onUnmounted(() => {
  // 清理工作
});
</script>

<style scoped>
.gradient-text-enhanced {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-modern-enhanced {
  @apply rounded-2xl font-medium transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.btn-primary {
  @apply bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl focus:ring-blue-500;
}

.btn-secondary {
  @apply bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg hover:shadow-xl focus:ring-gray-500;
}

.btn-export {
  @apply bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl focus:ring-green-500;
}

.hover-lift {
  @apply hover:shadow-lg hover:-translate-y-1;
}
</style> 