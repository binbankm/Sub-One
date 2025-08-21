import { ref, computed } from 'vue';

/**
 * 加载状态管理 Hook
 * @param {Object} options 配置选项
 * @returns {Object} 加载状态管理对象
 */
export function useLoadingState(options = {}) {
  const {
    initialStates = {},
    showLoadingDelay = 200, // 延迟显示加载状态，避免闪烁
    hideLoadingDelay = 100   // 延迟隐藏加载状态，确保最小显示时间
  } = options;

  // 加载状态映射
  const loadingStates = ref(new Map(Object.entries(initialStates)));
  
  // 延迟显示定时器映射
  const showTimers = ref(new Map());
  
  // 延迟隐藏定时器映射
  const hideTimers = ref(new Map());

  /**
   * 设置加载状态
   * @param {string} key 状态键名
   * @param {boolean} isLoading 是否加载中
   * @param {Object} options 选项
   */
  const setLoading = (key, isLoading, options = {}) => {
    const { 
      delay = isLoading ? showLoadingDelay : hideLoadingDelay,
      immediate = false 
    } = options;

    // 清除之前的定时器
    clearTimers(key);

    if (immediate) {
      loadingStates.value.set(key, isLoading);
      return;
    }

    if (isLoading) {
      // 延迟显示加载状态
      const timer = setTimeout(() => {
        loadingStates.value.set(key, true);
        showTimers.value.delete(key);
      }, delay);
      showTimers.value.set(key, timer);
    } else {
      // 延迟隐藏加载状态
      const timer = setTimeout(() => {
        loadingStates.value.set(key, false);
        hideTimers.value.delete(key);
      }, delay);
      hideTimers.value.set(key, timer);
    }
  };

  /**
   * 获取加载状态
   * @param {string} key 状态键名
   * @returns {boolean} 是否加载中
   */
  const getLoading = (key) => {
    return loadingStates.value.get(key) || false;
  };

  /**
   * 批量设置加载状态
   * @param {Object} states 状态对象
   * @param {Object} options 选项
   */
  const setMultipleLoading = (states, options = {}) => {
    Object.entries(states).forEach(([key, isLoading]) => {
      setLoading(key, isLoading, options);
    });
  };

  /**
   * 设置所有状态为加载中
   * @param {Object} options 选项
   */
  const setAllLoading = (options = {}) => {
    const keys = Array.from(loadingStates.value.keys());
    setMultipleLoading(
      Object.fromEntries(keys.map(key => [key, true])),
      options
    );
  };

  /**
   * 设置所有状态为非加载中
   * @param {Object} options 选项
   */
  const setAllNotLoading = (options = {}) => {
    const keys = Array.from(loadingStates.value.keys());
    setMultipleLoading(
      Object.fromEntries(keys.map(key => [key, false])),
      options
    );
  };

  /**
   * 清除定时器
   * @param {string} key 状态键名
   */
  const clearTimers = (key) => {
    if (showTimers.value.has(key)) {
      clearTimeout(showTimers.value.get(key));
      showTimers.value.delete(key);
    }
    if (hideTimers.value.has(key)) {
      clearTimeout(hideTimers.value.get(key));
      hideTimers.value.delete(key);
    }
  };

  /**
   * 清除所有定时器
   */
  const clearAllTimers = () => {
    showTimers.value.forEach(timer => clearTimeout(timer));
    hideTimers.value.forEach(timer => clearTimeout(timer));
    showTimers.value.clear();
    hideTimers.value.clear();
  };

  /**
   * 检查是否有任何状态正在加载
   */
  const hasAnyLoading = computed(() => {
    return Array.from(loadingStates.value.values()).some(Boolean);
  });

  /**
   * 获取所有加载状态
   */
  const getAllLoadingStates = computed(() => {
    return Object.fromEntries(loadingStates.value);
  });

  /**
   * 获取正在加载的状态键名列表
   */
  const getLoadingKeys = computed(() => {
    return Array.from(loadingStates.value.entries())
      .filter(([_, isLoading]) => isLoading)
      .map(([key]) => key);
  });

  /**
   * 异步包装器，自动管理加载状态
   * @param {string} key 状态键名
   * @param {Function} asyncFn 异步函数
   * @param {Object} options 选项
   */
  const withLoading = async (key, asyncFn, options = {}) => {
    try {
      setLoading(key, true, options);
      const result = await asyncFn();
      return result;
    } finally {
      setLoading(key, false, options);
    }
  };

  /**
   * 批量异步包装器
   * @param {Object} tasks 任务对象
   * @param {Object} options 选项
   */
  const withMultipleLoading = async (tasks, options = {}) => {
    try {
      setMultipleLoading(tasks, { ...options, immediate: true });
      const results = {};
      
      for (const [key, task] of Object.entries(tasks)) {
        if (typeof task === 'function') {
          results[key] = await task();
        }
      }
      
      return results;
    } finally {
      setMultipleLoading(
        Object.fromEntries(Object.keys(tasks).map(key => [key, false])),
        { ...options, immediate: true }
      );
    }
  };

  return {
    // 状态管理
    loadingStates,
    setLoading,
    getLoading,
    setMultipleLoading,
    setAllLoading,
    setAllNotLoading,
    
    // 计算属性
    hasAnyLoading,
    getAllLoadingStates,
    getLoadingKeys,
    
    // 异步包装器
    withLoading,
    withMultipleLoading,
    
    // 清理方法
    clearTimers,
    clearAllTimers
  };
}
