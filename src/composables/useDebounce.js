import { ref, onUnmounted } from 'vue';

/**
 * 防抖 Hook
 * @param {Function} fn 需要防抖的函数
 * @param {number} delay 延迟时间（毫秒）
 * @returns {Object} 包含防抖函数和取消方法的对象
 */
export function useDebounce(fn, delay = 300) {
  const timeoutId = ref(null);
  
  const debouncedFn = (...args) => {
    clearTimeout(timeoutId.value);
    timeoutId.value = setTimeout(() => {
      fn(...args);
    }, delay);
  };
  
  const cancel = () => {
    if (timeoutId.value) {
      clearTimeout(timeoutId.value);
      timeoutId.value = null;
    }
  };
  
  // 组件卸载时清理定时器
  onUnmounted(() => {
    cancel();
  });
  
  return {
    debouncedFn,
    cancel
  };
}

/**
 * 节流 Hook
 * @param {Function} fn 需要节流的函数
 * @param {number} delay 延迟时间（毫秒）
 * @returns {Object} 包含节流函数和取消方法的对象
 */
export function useThrottle(fn, delay = 300) {
  const lastExecTime = ref(0);
  const timeoutId = ref(null);
  
  const throttledFn = (...args) => {
    const now = Date.now();
    
    if (now - lastExecTime.value >= delay) {
      fn(...args);
      lastExecTime.value = now;
    } else {
      // 如果距离上次执行时间不足，则延迟执行
      clearTimeout(timeoutId.value);
      timeoutId.value = setTimeout(() => {
        fn(...args);
        lastExecTime.value = Date.now();
      }, delay - (now - lastExecTime.value));
    }
  };
  
  const cancel = () => {
    if (timeoutId.value) {
      clearTimeout(timeoutId.value);
      timeoutId.value = null;
    }
  };
  
  // 组件卸载时清理定时器
  onUnmounted(() => {
    cancel();
  });
  
  return {
    throttledFn,
    cancel
  };
}
