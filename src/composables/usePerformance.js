/**
 * usePerformance.js
 * 性能监控composable
 * 提供性能监控和优化功能
 */
import { ref, onMounted, onUnmounted } from 'vue'

export function usePerformance() {
  const performanceMetrics = ref({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0
  })

  const startTime = ref(0)
  const renderStartTime = ref(0)

  // 开始性能监控
  const startMonitoring = () => {
    startTime.value = performance.now()
  }

  // 开始渲染监控
  const startRenderMonitoring = () => {
    renderStartTime.value = performance.now()
  }

  // 结束渲染监控
  const endRenderMonitoring = () => {
    if (renderStartTime.value > 0) {
      performanceMetrics.value.renderTime = performance.now() - renderStartTime.value
    }
  }

  // 获取内存使用情况
  const getMemoryUsage = () => {
    if (performance.memory) {
      performanceMetrics.value.memoryUsage = {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      }
    }
  }

  // 计算加载时间
  const calculateLoadTime = () => {
    if (startTime.value > 0) {
      performanceMetrics.value.loadTime = performance.now() - startTime.value
    }
  }

  // 防抖函数
  const debounce = (func, wait) => {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // 节流函数
  const throttle = (func, limit) => {
    let inThrottle
    return function () {
      const args = arguments
      const context = this
      if (!inThrottle) {
        func.apply(context, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }

  // 懒加载图片
  const lazyLoadImage = (img, src) => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          img.src = src
          observer.unobserve(img)
        }
      })
    })
    observer.observe(img)
  }

  onMounted(() => {
    startMonitoring()
    getMemoryUsage()
  })

  onUnmounted(() => {
    calculateLoadTime()
  })

  return {
    performanceMetrics,
    startMonitoring,
    startRenderMonitoring,
    endRenderMonitoring,
    getMemoryUsage,
    debounce,
    throttle,
    lazyLoadImage
  }
}
