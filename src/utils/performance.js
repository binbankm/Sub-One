// 性能优化工具
import { ref, computed, watch, nextTick } from 'vue';

/**
 * 虚拟滚动工具类
 */
export class VirtualScroll {
  constructor(options = {}) {
    this.containerHeight = options.containerHeight || 400;
    this.itemHeight = options.itemHeight || 50;
    this.overscan = options.overscan || 5;
    this.items = ref([]);
    this.scrollTop = ref(0);
  }

  /**
   * 计算可见范围
   */
  getVisibleRange() {
    const start = Math.floor(this.scrollTop.value / this.itemHeight);
    const end = Math.min(
      start + Math.ceil(this.containerHeight / this.itemHeight),
      this.items.value.length
    );
    
    return {
      start: Math.max(0, start - this.overscan),
      end: Math.min(this.items.value.length, end + this.overscan)
    };
  }

  /**
   * 获取可见项目
   */
  getVisibleItems() {
    const { start, end } = this.getVisibleRange();
    return this.items.value.slice(start, end).map((item, index) => ({
      ...item,
      index: start + index,
      top: (start + index) * this.itemHeight
    }));
  }

  /**
   * 更新滚动位置
   */
  updateScrollTop(scrollTop) {
    this.scrollTop.value = scrollTop;
  }

  /**
   * 设置项目列表
   */
  setItems(items) {
    this.items.value = items;
  }
}

/**
 * 防抖Hook
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间
 * @returns {Function} 防抖后的函数
 */
export function useDebounce(fn, delay = 300) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流Hook
 * @param {Function} fn - 要节流的函数
 * @param {number} delay - 延迟时间
 * @returns {Function} 节流后的函数
 */
export function useThrottle(fn, delay = 300) {
  let lastCall = 0;
  
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * 懒加载Hook
 * @param {Function} loader - 加载函数
 * @param {Object} options - 选项
 * @returns {Object} 懒加载状态和方法
 */
export function useLazyLoad(loader, options = {}) {
  const {
    immediate = false,
    retryCount = 3,
    retryDelay = 1000
  } = options;

  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const retryCountRef = ref(0);

  const execute = async () => {
    if (loading.value) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      const result = await loader();
      data.value = result;
      retryCountRef.value = 0;
    } catch (err) {
      error.value = err;
      
      if (retryCountRef.value < retryCount) {
        retryCountRef.value++;
        setTimeout(() => {
          execute();
        }, retryDelay);
      }
    } finally {
      loading.value = false;
    }
  };

  if (immediate) {
    execute();
  }

  return {
    data,
    loading,
    error,
    execute,
    retry: execute
  };
}

/**
 * 缓存Hook
 * @param {Function} fn - 要缓存的函数
 * @param {Object} options - 选项
 * @returns {Object} 缓存状态和方法
 */
export function useCache(fn, options = {}) {
  const {
    maxSize = 100,
    ttl = 5 * 60 * 1000, // 5分钟
    keyGenerator = (...args) => JSON.stringify(args)
  } = options;

  const cache = ref(new Map());
  const timestamps = ref(new Map());

  const get = (...args) => {
    const key = keyGenerator(...args);
    const timestamp = timestamps.value.get(key);
    
    if (timestamp && Date.now() - timestamp > ttl) {
      cache.value.delete(key);
      timestamps.value.delete(key);
      return null;
    }
    
    return cache.value.get(key);
  };

  const set = (key, value) => {
    // 清理过期缓存
    if (cache.value.size >= maxSize) {
      const oldestKey = cache.value.keys().next().value;
      cache.value.delete(oldestKey);
      timestamps.value.delete(oldestKey);
    }
    
    cache.value.set(key, value);
    timestamps.value.set(key, Date.now());
  };

  const clear = () => {
    cache.value.clear();
    timestamps.value.clear();
  };

  const cachedFn = (...args) => {
    const key = keyGenerator(...args);
    const cached = get(key);
    
    if (cached !== null) {
      return Promise.resolve(cached);
    }
    
    return fn(...args).then(result => {
      set(key, result);
      return result;
    });
  };

  return {
    cache: cache.value,
    get,
    set,
    clear,
    cachedFn
  };
}

/**
 * 批量更新Hook
 * @param {Function} updateFn - 更新函数
 * @param {number} delay - 延迟时间
 * @returns {Object} 批量更新状态和方法
 */
export function useBatchUpdate(updateFn, delay = 16) {
  const pending = ref(false);
  const queue = ref([]);
  let timeoutId = null;

  const flush = () => {
    if (queue.value.length === 0) return;
    
    const items = [...queue.value];
    queue.value = [];
    pending.value = false;
    
    updateFn(items);
  };

  const add = (item) => {
    queue.value.push(item);
    
    if (!pending.value) {
      pending.value = true;
      timeoutId = setTimeout(flush, delay);
    }
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    queue.value = [];
    pending.value = false;
  };

  return {
    add,
    flush,
    cancel,
    pending: pending.value
  };
}

/**
 * 内存使用监控
 * @returns {Object} 内存使用信息
 */
export function useMemoryMonitor() {
  const memoryInfo = ref({
    used: 0,
    total: 0,
    percentage: 0
  });

  const updateMemoryInfo = () => {
    if (performance.memory) {
      const memory = performance.memory;
      memoryInfo.value = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      };
    }
  };

  const startMonitoring = (interval = 5000) => {
    updateMemoryInfo();
    return setInterval(updateMemoryInfo, interval);
  };

  return {
    memoryInfo,
    updateMemoryInfo,
    startMonitoring
  };
}

/**
 * 性能指标收集
 * @returns {Object} 性能指标
 */
export function usePerformanceMetrics() {
  const metrics = ref({
    renderTime: 0,
    updateTime: 0,
    memoryUsage: 0,
    frameRate: 0
  });

  const startTime = ref(0);
  const frameCount = ref(0);
  const lastFrameTime = ref(0);

  const startRender = () => {
    startTime.value = performance.now();
  };

  const endRender = () => {
    if (startTime.value) {
      metrics.value.renderTime = performance.now() - startTime.value;
    }
  };

  const measureUpdate = (fn) => {
    const start = performance.now();
    const result = fn();
    metrics.value.updateTime = performance.now() - start;
    return result;
  };

  const updateFrameRate = () => {
    const now = performance.now();
    frameCount.value++;
    
    if (now - lastFrameTime.value >= 1000) {
      metrics.value.frameRate = Math.round((frameCount.value * 1000) / (now - lastFrameTime.value));
      frameCount.value = 0;
      lastFrameTime.value = now;
    }
    
    requestAnimationFrame(updateFrameRate);
  };

  const startFrameRateMonitoring = () => {
    lastFrameTime.value = performance.now();
    updateFrameRate();
  };

  return {
    metrics,
    startRender,
    endRender,
    measureUpdate,
    startFrameRateMonitoring
  };
}

/**
 * 组件懒加载
 * @param {Function} importFn - 导入函数
 * @returns {Object} 懒加载组件
 */
export function useLazyComponent(importFn) {
  const component = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const load = async () => {
    if (component.value || loading.value) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      const module = await importFn();
      component.value = module.default || module;
    } catch (err) {
      error.value = err;
      console.error('组件加载失败:', err);
    } finally {
      loading.value = false;
    }
  };

  return {
    component,
    loading,
    error,
    load
  };
}

/**
 * 优化的大列表渲染
 * @param {Array} items - 项目列表
 * @param {Object} options - 选项
 * @returns {Object} 优化后的列表数据
 */
export function useOptimizedList(items, options = {}) {
  const {
    pageSize = 50,
    virtualScroll = false,
    itemHeight = 50
  } = options;

  const currentPage = ref(1);
  const searchTerm = ref('');
  const sortBy = ref('');
  const sortOrder = ref('asc');

  // 过滤和排序
  const filteredItems = computed(() => {
    let result = [...items.value];
    
    if (searchTerm.value) {
      const term = searchTerm.value.toLowerCase();
      result = result.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(term)
        )
      );
    }
    
    if (sortBy.value) {
      result.sort((a, b) => {
        const aVal = a[sortBy.value];
        const bVal = b[sortBy.value];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder.value === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  });

  // 分页
  const paginatedItems = computed(() => {
    if (virtualScroll) {
      return filteredItems.value;
    }
    
    const start = (currentPage.value - 1) * pageSize;
    const end = start + pageSize;
    return filteredItems.value.slice(start, end);
  });

  const totalPages = computed(() => 
    Math.ceil(filteredItems.value.length / pageSize)
  );

  const setPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  };

  const setSearch = useDebounce((term) => {
    searchTerm.value = term;
    currentPage.value = 1;
  }, 300);

  const setSort = (by, order = 'asc') => {
    sortBy.value = by;
    sortOrder.value = order;
    currentPage.value = 1;
  };

  return {
    items: paginatedItems,
    currentPage,
    totalPages,
    searchTerm,
    sortBy,
    sortOrder,
    setPage,
    setSearch,
    setSort,
    filteredItems
  };
}
