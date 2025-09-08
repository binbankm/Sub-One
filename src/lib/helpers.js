/**
 * 辅助工具函数库
 * 提供通用的辅助功能
 */

import { REGION_KEYWORDS, REGION_ORDER, REGEX } from './constants.js';

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 深拷贝对象
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * 生成唯一ID
 * @param {string} prefix - ID前缀
 * @returns {string} 唯一ID
 */
export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时间
 * @param {Date|string|number} date - 日期
 * @param {string} format - 格式字符串
 * @returns {string} 格式化后的时间
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 验证URL格式
 * @param {string} url - 要验证的URL
 * @returns {boolean} 是否为有效URL
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证节点链接格式
 * @param {string} url - 要验证的节点链接
 * @returns {boolean} 是否为有效节点链接
 */
export function isValidNodeUrl(url) {
  return REGEX.NODE_PROTOCOL.test(url);
}

/**
 * 验证HTTP/HTTPS链接格式
 * @param {string} url - 要验证的链接
 * @returns {boolean} 是否为有效HTTP/HTTPS链接
 */
export function isValidHttpUrl(url) {
  return REGEX.HTTP_URL.test(url);
}

/**
 * 获取地区代码
 * @param {string} name - 节点名称
 * @returns {string} 地区代码
 */
export function getRegionCode(name) {
  if (!name) return 'ZZ';
  
  const lowerName = name.toLowerCase();
  
  for (const [code, keywords] of Object.entries(REGION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (keyword.test(lowerName)) {
        return code;
      }
    }
  }
  
  return 'ZZ';
}

/**
 * 按地区排序节点
 * @param {Array} nodes - 节点数组
 * @returns {Array} 排序后的节点数组
 */
export function sortNodesByRegion(nodes) {
  return nodes.sort((a, b) => {
    const regionA = getRegionCode(a.name);
    const regionB = getRegionCode(b.name);
    
    const indexA = REGION_ORDER.indexOf(regionA);
    const indexB = REGION_ORDER.indexOf(regionB);
    
    const effectiveIndexA = indexA === -1 ? Infinity : indexA;
    const effectiveIndexB = indexB === -1 ? Infinity : indexB;
    
    if (effectiveIndexA !== effectiveIndexB) {
      return effectiveIndexA - effectiveIndexB;
    }
    
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}

/**
 * 数组去重
 * @param {Array} array - 要去重的数组
 * @param {string} key - 用于去重的键名
 * @returns {Array} 去重后的数组
 */
export function uniqueArray(array, key) {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * 分页计算
 * @param {Array} items - 要分页的数组
 * @param {number} currentPage - 当前页码
 * @param {number} itemsPerPage - 每页项目数
 * @returns {Object} 分页信息
 */
export function paginate(items, currentPage, itemsPerPage) {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);
  
  return {
    items: paginatedItems,
    totalItems,
    totalPages,
    currentPage,
    itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
}

/**
 * 本地存储工具
 */
export const storage = {
  /**
   * 设置本地存储
   * @param {string} key - 键名
   * @param {any} value - 值
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  /**
   * 获取本地存储
   * @param {string} key - 键名
   * @param {any} defaultValue - 默认值
   * @returns {any} 存储的值或默认值
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  },

  /**
   * 删除本地存储
   * @param {string} key - 键名
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  },

  /**
   * 清空本地存储
   */
  clear() {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
};
