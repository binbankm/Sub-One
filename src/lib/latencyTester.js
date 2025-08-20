// latencyTester.js - 延迟测试工具函数

/**
 * 测试单个节点的延迟
 * @param {Object} node - 节点对象
 * @param {number} timeout - 超时时间(毫秒)
 * @returns {Promise<Object>} 测试结果
 */
export async function testNodeLatency(node, timeout = 5000) {
  const startTime = Date.now();
  
  try {
    // 根据节点类型选择不同的测试方法
    if (node.type === 'subscription' || node.type === 'manual') {
      return await testHttpLatency(node, timeout, startTime);
    } else {
      // 默认使用HTTP测试
      return await testHttpLatency(node, timeout, startTime);
    }
  } catch (error) {
    const endTime = Date.now();
    return {
      id: node.id,
      name: node.name,
      url: node.url,
      type: node.type,
      status: 'failed',
      latency: null,
      error: error.message,
      testTime: new Date(),
      duration: endTime - startTime
    };
  }
}

/**
 * 测试HTTP节点延迟
 * @param {Object} node - 节点对象
 * @param {number} timeout - 超时时间
 * @param {number} startTime - 开始时间
 * @returns {Promise<Object>} 测试结果
 */
async function testHttpLatency(node, timeout, startTime) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('请求超时'));
    }, timeout);
    
    // 创建一个简单的HTTP请求来测试延迟
    // 使用HEAD方法减少数据传输
    const controller = new AbortController();
    const signal = controller.signal;
    
    // 如果超时，取消请求
    timeoutId.unref();
    
    fetch(node.url, {
      method: 'HEAD',
      mode: 'no-cors', // 避免CORS问题
      signal: signal,
      cache: 'no-cache' // 避免缓存影响
    })
    .then(() => {
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      resolve({
        id: node.id,
        name: node.name,
        url: node.url,
        type: node.type,
        status: 'success',
        latency: latency,
        error: null,
        testTime: new Date(),
        duration: latency
      });
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
    
    // 超时时取消请求
    setTimeout(() => {
      controller.abort();
    }, timeout);
  });
}

/**
 * 批量测试节点延迟
 * @param {Array} nodes - 节点数组
 * @param {Object} options - 测试选项
 * @param {Function} onProgress - 进度回调
 * @param {Function} onCancel - 取消回调
 * @returns {Promise<Array>} 测试结果数组
 */
export async function batchTestLatency(nodes, options = {}, onProgress, onCancel) {
  const {
    timeout = 5000,
    concurrency = 3, // 并发测试数量
    delay = 100 // 测试间隔
  } = options;
  
  const results = [];
  const totalNodes = nodes.length;
  let completedCount = 0;
  let isCancelled = false;
  
  // 检查取消状态
  const checkCancel = () => {
    if (isCancelled) {
      throw new Error('测试已取消');
    }
  };
  
  // 并发测试函数
  const testBatch = async (batchNodes) => {
    const batchPromises = batchNodes.map(async (node) => {
      try {
        checkCancel();
        const result = await testNodeLatency(node, timeout);
        results.push(result);
        completedCount++;
        
        if (onProgress) {
          onProgress({
            current: completedCount,
            total: totalNodes,
            result: result,
            progress: (completedCount / totalNodes) * 100
          });
        }
        
        return result;
      } catch (error) {
        const result = {
          id: node.id,
          name: node.name,
          url: node.url,
          type: node.type,
          status: 'failed',
          latency: null,
          error: error.message,
          testTime: new Date(),
          duration: 0
        };
        
        results.push(result);
        completedCount++;
        
        if (onProgress) {
          onProgress({
            current: completedCount,
            total: totalNodes,
            result: result,
            progress: (completedCount / totalNodes) * 100
          });
        }
        
        return result;
      }
    });
    
    await Promise.all(batchPromises);
  };
  
  try {
    // 分批测试
    for (let i = 0; i < totalNodes; i += concurrency) {
      checkCancel();
      
      const batch = nodes.slice(i, i + concurrency);
      await testBatch(batch);
      
      // 添加延迟避免过快请求
      if (i + concurrency < totalNodes) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  } catch (error) {
    if (error.message === '测试已取消') {
      return results; // 返回已完成的测试结果
    }
    throw error;
  }
}

/**
 * 分析测试结果
 * @param {Array} results - 测试结果数组
 * @returns {Object} 分析结果
 */
export function analyzeLatencyResults(results) {
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  
  const analysis = {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    successRate: results.length > 0 ? (successful.length / results.length) * 100 : 0,
    averageLatency: 0,
    bestLatency: 0,
    worstLatency: 0,
    latencyDistribution: {
      excellent: 0, // < 100ms
      good: 0,      // 100-300ms
      fair: 0,      // 300-500ms
      poor: 0       // > 500ms
    }
  };
  
  if (successful.length > 0) {
    const latencies = successful.map(r => r.latency);
    analysis.averageLatency = Math.round(latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length);
    analysis.bestLatency = Math.min(...latencies);
    analysis.worstLatency = Math.max(...latencies);
    
    // 延迟分布统计
    latencies.forEach(latency => {
      if (latency < 100) analysis.latencyDistribution.excellent++;
      else if (latency < 300) analysis.latencyDistribution.good++;
      else if (latency < 500) analysis.latencyDistribution.fair++;
      else analysis.latencyDistribution.poor++;
    });
  }
  
  return analysis;
}

/**
 * 生成测试报告
 * @param {Array} results - 测试结果数组
 * @param {Object} analysis - 分析结果
 * @returns {string} 测试报告
 */
export function generateLatencyReport(results, analysis) {
  const timestamp = new Date().toLocaleString('zh-CN');
  
  let report = `延迟测试报告\n`;
  report += `生成时间: ${timestamp}\n`;
  report += `总节点数: ${analysis.total}\n`;
  report += `成功连接: ${analysis.successful}\n`;
  report += `连接失败: ${analysis.failed}\n`;
  report += `成功率: ${analysis.successRate.toFixed(1)}%\n\n`;
  
  if (analysis.successful > 0) {
    report += `延迟统计:\n`;
    report += `平均延迟: ${analysis.averageLatency}ms\n`;
    report += `最佳延迟: ${analysis.bestLatency}ms\n`;
    report += `最差延迟: ${analysis.worstLatency}ms\n\n`;
    
    report += `延迟分布:\n`;
    report += `优秀 (<100ms): ${analysis.latencyDistribution.excellent} 个\n`;
    report += `良好 (100-300ms): ${analysis.latencyDistribution.good} 个\n`;
    report += `一般 (300-500ms): ${analysis.latencyDistribution.fair} 个\n`;
    report += `较差 (>500ms): ${analysis.latencyDistribution.poor} 个\n\n`;
  }
  
  report += `详细结果:\n`;
  report += `名称\t类型\t延迟\t状态\t错误信息\n`;
  report += `-`.repeat(50) + `\n`;
  
  results.forEach(result => {
    const latency = result.status === 'success' ? `${result.latency}ms` : '-';
    const error = result.error || '-';
    report += `${result.name}\t${result.type}\t${latency}\t${result.status}\t${error}\n`;
  });
  
  return report;
}

/**
 * 导出测试结果为CSV格式
 * @param {Array} results - 测试结果数组
 * @returns {string} CSV格式的字符串
 */
export function exportResultsToCSV(results) {
  const headers = ['节点名称', '类型', '延迟(ms)', '状态', '测试时间', 'URL', '错误信息'];
  const rows = results.map(result => [
    result.name,
    result.type === 'subscription' ? '订阅' : '手动',
    result.status === 'success' ? result.latency : '-',
    result.status === 'success' ? '成功' : '失败',
    result.testTime.toLocaleString('zh-CN'),
    result.url,
    result.error || '-'
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
}

/**
 * 导出测试结果为JSON格式
 * @param {Array} results - 测试结果数组
 * @param {Object} analysis - 分析结果
 * @returns {string} JSON格式的字符串
 */
export function exportResultsToJSON(results, analysis) {
  const exportData = {
    timestamp: new Date().toISOString(),
    summary: analysis,
    results: results
  };
  
  return JSON.stringify(exportData, null, 2);
} 