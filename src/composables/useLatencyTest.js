import { ref, computed } from 'vue';
import { useToastStore } from '../stores/toast.js';

export function useLatencyTest() {
  const isTesting = ref(false);
  const testResults = ref(new Map()); // nodeId -> { latency, status, error }
  const testProgress = ref({ current: 0, total: 0 });
  const toastStore = useToastStore();

  // 测试单个节点的延迟
  const testSingleNode = async (node) => {
    if (!node || !node.url) {
      return { latency: null, status: 'error', error: '无效的节点信息' };
    }

    try {
      // 使用更准确的本地测试方法
      const { host, port } = extractHostAndPort(node.url);
      
      if (!host || !port) {
        throw new Error('无法解析节点地址');
      }

      // 多次测试取平均值，提高准确性
      const testCount = 3;
      const latencies = [];
      
      for (let i = 0; i < testCount; i++) {
        try {
          const startTime = performance.now();
          
          // 使用Image对象测试连接（更准确）
          const img = new Image();
          const testPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('连接超时'));
            }, 3000);

            img.onload = () => {
              clearTimeout(timeout);
              const endTime = performance.now();
              resolve(endTime - startTime);
            };
            
            img.onerror = () => {
              clearTimeout(timeout);
              const endTime = performance.now();
              resolve(endTime - startTime);
            };
          });

          // 尝试多种连接方式
          try {
            // 方式1: 尝试HTTPS连接
            img.src = `https://${host}:${port}/favicon.ico?t=${Date.now()}&test=${i}`;
            const latency = await testPromise;
            latencies.push(latency);
          } catch (httpsError) {
            try {
              // 方式2: 尝试HTTP连接
              img.src = `http://${host}:${port}/favicon.ico?t=${Date.now()}&test=${i}`;
              const latency = await testPromise;
              latencies.push(latency);
            } catch (httpError) {
              // 方式3: 使用fetch测试
              const fetchStart = performance.now();
              await fetch(`https://${host}:${port}`, {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache'
              });
              const fetchLatency = performance.now() - fetchStart;
              latencies.push(fetchLatency);
            }
          }
          
          // 短暂延迟，避免过于频繁的请求
          if (i < testCount - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (testError) {
          console.warn(`第${i + 1}次测试失败:`, testError);
        }
      }

      if (latencies.length === 0) {
        throw new Error('所有测试都失败');
      }

      // 计算平均延迟，去除异常值
      const sortedLatencies = latencies.sort((a, b) => a - b);
      const avgLatency = Math.round(
        sortedLatencies.slice(1, -1).reduce((sum, lat) => sum + lat, 0) / 
        Math.max(sortedLatencies.length - 2, 1)
      );

      return {
        latency: avgLatency,
        status: 'success',
        error: null
      };

    } catch (err) {
      console.error('延迟测试失败:', err);
      return { 
        latency: null, 
        status: 'error', 
        error: err.message || '连接测试失败' 
      };
    }
  };

  // TCP连接测试（模拟）
  const testTCPConnection = async (host, port) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('TCP连接超时'));
      }, 3000);

      // 使用Image对象测试连接（跨域限制下的替代方案）
      const img = new Image();
      const startTime = Date.now();
      
      img.onload = () => {
        clearTimeout(timeout);
        const endTime = Date.now();
        resolve(endTime - startTime);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        // 即使图片加载失败，我们也能获得连接时间
        const endTime = Date.now();
        resolve(endTime - startTime);
      };

      // 尝试加载一个小的图片来测试连接
      img.src = `https://${host}:${port}/favicon.ico?t=${Date.now()}`;
    });
  };

  // 批量测试节点延迟
  const testBatchLatency = async (nodes, options = {}) => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      toastStore.showToast('没有可测试的节点', 'warning');
      return;
    }

    isTesting.value = true;
    testProgress.value = { current: 0, total: nodes.length };
    testResults.value.clear();

    const { 
      maxConcurrent = 3, 
      onProgress = null 
    } = options;

    try {
      // 分批处理，避免同时发起过多请求
      const batches = [];
      for (let i = 0; i < nodes.length; i += maxConcurrent) {
        batches.push(nodes.slice(i, i + maxConcurrent));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        // 并行测试当前批次的节点
        const batchPromises = batch.map(async (node) => {
          const result = await testSingleNode(node);
          testResults.value.set(node.id, result);
          testProgress.value.current++;
          
          if (onProgress) {
            onProgress(node, result, testProgress.value);
          }
          
          return { node, result };
        });

        // 等待当前批次完成
        await Promise.allSettled(batchPromises);
        
        // 批次间短暂延迟，避免过于频繁的请求
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // 计算统计信息
      const successfulTests = Array.from(testResults.value.values())
        .filter(result => result.status === 'success' && result.latency !== null);
      
      if (successfulTests.length > 0) {
        const avgLatency = successfulTests.reduce((sum, result) => sum + result.latency, 0) / successfulTests.length;
        const minLatency = Math.min(...successfulTests.map(result => result.latency));
        const maxLatency = Math.max(...successfulTests.map(result => result.latency));
        
        toastStore.showToast(
          `延迟测试完成！成功: ${successfulTests.length}/${nodes.length}，平均延迟: ${avgLatency.toFixed(0)}ms`,
          'success'
        );
      } else {
        toastStore.showToast('延迟测试完成，但没有成功的连接', 'warning');
      }

    } catch (error) {
      console.error('批量延迟测试失败:', error);
      toastStore.showToast('延迟测试过程中发生错误', 'error');
    } finally {
      isTesting.value = false;
      testProgress.value = { current: 0, total: 0 };
    }
  };

  // 获取节点的延迟测试结果
  const getNodeLatency = (nodeId) => {
    return testResults.value.get(nodeId) || null;
  };

  // 获取延迟状态样式
  const getLatencyStatusStyle = (latency) => {
    if (!latency || typeof latency !== 'number') {
      return { text: '未测试', style: 'text-gray-500 bg-gray-100 dark:bg-gray-800' };
    }
    
    if (latency < 100) {
      return { text: `${latency}ms`, style: 'text-green-600 bg-green-100 dark:bg-green-900/30' };
    } else if (latency < 300) {
      return { text: `${latency}ms`, style: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' };
    } else if (latency < 1000) {
      return { text: `${latency}ms`, style: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' };
    } else {
      return { text: `${latency}ms`, style: 'text-red-600 bg-red-100 dark:bg-red-900/30' };
    }
  };

  // 清除测试结果
  const clearResults = () => {
    testResults.value.clear();
    testProgress.value = { current: 0, total: 0 };
  };

  // 导出节点延迟数据
  const exportLatencyData = () => {
    const data = Array.from(testResults.value.entries()).map(([nodeId, result]) => ({
      nodeId,
      latency: result.latency,
      status: result.status,
      error: result.error
    }));
    
    const csv = [
      '节点ID,延迟(ms),状态,错误信息',
      ...data.map(row => `${row.nodeId},${row.latency || 'N/A'},${row.status},${row.error || ''}`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `latency_test_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    link.click();
  };

  return {
    // 状态
    isTesting,
    testResults,
    testProgress,
    
    // 方法
    testSingleNode,
    testBatchLatency,
    getNodeLatency,
    getLatencyStatusStyle,
    clearResults,
    exportLatencyData
  };
}

// 辅助函数：提取主机和端口
function extractHostAndPort(url) {
  try {
    if (!url) return { host: null, port: null };
    
    // 处理各种协议格式
    let cleanUrl = url;
    if (url.includes('://')) {
      cleanUrl = url.split('://')[1];
    }
    
    // 移除用户名密码部分
    if (cleanUrl.includes('@')) {
      cleanUrl = cleanUrl.split('@')[1];
    }
    
    // 移除路径和参数
    cleanUrl = cleanUrl.split('/')[0];
    cleanUrl = cleanUrl.split('?')[0];
    cleanUrl = cleanUrl.split('#')[0];
    
    // 分离主机和端口
    if (cleanUrl.includes(':')) {
      const [host, port] = cleanUrl.split(':');
      return { host, port: parseInt(port) || port };
    } else {
      return { host: cleanUrl, port: null };
    }
  } catch (error) {
    console.error('解析URL失败:', error);
    return { host: null, port: null };
  }
} 