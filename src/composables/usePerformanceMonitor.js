import { ref, onMounted, onUnmounted, onUpdated } from 'vue';

/**
 * 性能监控 Hook
 * @param {Object} options 配置选项
 * @returns {Object} 性能监控对象
 */
export function usePerformanceMonitor(options = {}) {
  const {
    enableRenderTiming = true,    // 启用渲染时间监控
    enableInteractionTiming = true, // 启用交互时间监控
    enableMemoryMonitoring = false, // 启用内存监控
    logThreshold = 16,            // 渲染时间阈值（毫秒）
    sampleRate = 0.1              // 采样率（0-1）
  } = options;

  // 性能数据
  const performanceData = ref({
    renderTimes: [],
    interactionTimes: [],
    memoryUsage: [],
    errors: [],
    warnings: []
  });

  // 监控状态
  const isMonitoring = ref(false);
  const startTime = ref(0);

  // 渲染时间监控
  const renderStartTime = ref(0);
  const renderEndTime = ref(0);

  // 交互时间监控
  const interactionStartTime = ref(0);
  const interactionEndTime = ref(0);

  // 性能观察器
  let performanceObserver = null;
  let memoryObserver = null;

  /**
   * 开始监控
   */
  const startMonitoring = () => {
    if (isMonitoring.value) return;
    
    isMonitoring.value = true;
    startTime.value = performance.now();
    
    if (enableRenderTiming) {
      setupRenderTiming();
    }
    
    if (enableInteractionTiming) {
      setupInteractionTiming();
    }
    
    if (enableMemoryMonitoring && 'memory' in performance) {
      setupMemoryMonitoring();
    }
    
    console.log('🚀 性能监控已启动');
  };

  /**
   * 停止监控
   */
  const stopMonitoring = () => {
    if (!isMonitoring.value) return;
    
    isMonitoring.value = false;
    
    if (performanceObserver) {
      performanceObserver.disconnect();
      performanceObserver = null;
    }
    
    if (memoryObserver) {
      memoryObserver.disconnect();
      memoryObserver = null;
    }
    
    console.log('⏹️ 性能监控已停止');
  };

  /**
   * 设置渲染时间监控
   */
  const setupRenderTiming = () => {
    onMounted(() => {
      renderStartTime.value = performance.now();
    });

    onUpdated(() => {
      renderEndTime.value = performance.now();
      const renderTime = renderEndTime.value - renderStartTime.value;
      
      if (renderTime > logThreshold) {
        performanceData.value.renderTimes.push({
          timestamp: Date.now(),
          duration: renderTime,
          type: 'update'
        });
        
        console.warn(`⚠️ 组件渲染时间过长: ${renderTime.toFixed(2)}ms`);
      }
      
      renderStartTime.value = performance.now();
    });
  };

  /**
   * 设置交互时间监控
   */
  const setupInteractionTiming = () => {
    const handleInteractionStart = () => {
      interactionStartTime.value = performance.now();
    };

    const handleInteractionEnd = () => {
      interactionEndTime.value = performance.now();
      const interactionTime = interactionEndTime.value - interactionStartTime.value;
      
      if (Math.random() < sampleRate) {
        performanceData.value.interactionTimes.push({
          timestamp: Date.now(),
          duration: interactionTime,
          type: 'interaction'
        });
      }
    };

    // 监听用户交互事件
    document.addEventListener('click', handleInteractionStart, true);
    document.addEventListener('click', handleInteractionEnd, false);
    
    document.addEventListener('input', handleInteractionStart, true);
    document.addEventListener('input', handleInteractionEnd, false);
    
    document.addEventListener('scroll', handleInteractionStart, true);
    document.addEventListener('scroll', handleInteractionEnd, false);
  };

  /**
   * 设置内存监控
   */
  const setupMemoryMonitoring = () => {
    if (!('memory' in performance)) return;
    
    const checkMemory = () => {
      const memory = performance.memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const totalMB = memory.totalJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      
      performanceData.value.memoryUsage.push({
        timestamp: Date.now(),
        used: usedMB,
        total: totalMB,
        limit: limitMB,
        percentage: (usedMB / limitMB) * 100
      });
      
      // 内存使用率超过80%时发出警告
      if ((usedMB / limitMB) > 0.8) {
        console.warn(`⚠️ 内存使用率过高: ${((usedMB / limitMB) * 100).toFixed(1)}%`);
      }
    };
    
    // 每5秒检查一次内存使用情况
    memoryObserver = setInterval(checkMemory, 5000);
  };

  /**
   * 记录错误
   */
  const recordError = (error, context = {}) => {
    performanceData.value.errors.push({
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context
    });
  };

  /**
   * 记录警告
   */
  const recordWarning = (message, context = {}) => {
    performanceData.value.warnings.push({
      timestamp: Date.now(),
      message,
      context
    });
  };

  /**
   * 获取性能报告
   */
  const getPerformanceReport = () => {
    const totalTime = performance.now() - startTime.value;
    
    const renderStats = calculateStats(performanceData.value.renderTimes);
    const interactionStats = calculateStats(performanceData.value.interactionTimes);
    const memoryStats = calculateMemoryStats(performanceData.value.memoryUsage);
    
    return {
      monitoringDuration: totalTime,
      renderPerformance: renderStats,
      interactionPerformance: interactionStats,
      memoryUsage: memoryStats,
      errors: performanceData.value.errors.length,
      warnings: performanceData.value.warnings.length,
      recommendations: generateRecommendations(renderStats, interactionStats, memoryStats)
    };
  };

  /**
   * 计算统计数据
   */
  const calculateStats = (data) => {
    if (data.length === 0) return { count: 0, avg: 0, min: 0, max: 0, p95: 0 };
    
    const durations = data.map(item => item.duration);
    const sorted = durations.sort((a, b) => a - b);
    
    return {
      count: data.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      p95: sorted[Math.floor(sorted.length * 0.95)]
    };
  };

  /**
   * 计算内存统计数据
   */
  const calculateMemoryStats = (data) => {
    if (data.length === 0) return { avgUsage: 0, maxUsage: 0, avgPercentage: 0 };
    
    const usages = data.map(item => item.used);
    const percentages = data.map(item => item.percentage);
    
    return {
      avgUsage: usages.reduce((a, b) => a + b, 0) / usages.length,
      maxUsage: Math.max(...usages),
      avgPercentage: percentages.reduce((a, b) => a + b, 0) / percentages.length
    };
  };

  /**
   * 生成优化建议
   */
  const generateRecommendations = (renderStats, interactionStats, memoryStats) => {
    const recommendations = [];
    
    if (renderStats.avg > 16) {
      recommendations.push('考虑使用虚拟滚动优化大量数据渲染');
    }
    
    if (interactionStats.avg > 100) {
      recommendations.push('检查事件处理函数性能，考虑使用防抖/节流');
    }
    
    if (memoryStats.avgPercentage > 70) {
      recommendations.push('检查内存泄漏，及时清理事件监听器和定时器');
    }
    
    if (performanceData.value.errors.length > 0) {
      recommendations.push('修复代码中的错误，提高应用稳定性');
    }
    
    return recommendations;
  };

  /**
   * 清理监控数据
   */
  const clearData = () => {
    performanceData.value = {
      renderTimes: [],
      interactionTimes: [],
      memoryUsage: [],
      errors: [],
      warnings: []
    };
  };

  // 自动启动监控
  onMounted(() => {
    startMonitoring();
  });

  // 组件卸载时停止监控
  onUnmounted(() => {
    stopMonitoring();
  });

  return {
    // 监控控制
    startMonitoring,
    stopMonitoring,
    isMonitoring,
    
    // 数据记录
    recordError,
    recordWarning,
    
    // 性能数据
    performanceData,
    getPerformanceReport,
    
    // 工具方法
    clearData
  };
}
