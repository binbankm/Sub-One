// 公共工具函数
import { REGEX_PATTERNS, PROTOCOLS } from '../constants/index.js';

/**
 * 获取协议类型
 * @param {string} url - 节点URL
 * @returns {string} 协议类型
 */
export function getProtocol(url) {
  try {
    if (!url) return 'unknown';
    const lowerUrl = url.toLowerCase();
    
    // 使用常量中的协议列表进行匹配
    for (const protocol of PROTOCOLS.SUPPORTED) {
      if (lowerUrl.startsWith(`${protocol}://`)) {
        return protocol;
      }
    }
    
    if (lowerUrl.startsWith('http')) return 'http';
  } catch { 
    return 'unknown';
  }
  return 'unknown';
}

/**
 * 获取协议显示名称
 * @param {string} protocol - 协议类型
 * @returns {string} 显示名称
 */
export function getProtocolDisplayName(protocol) {
  return PROTOCOLS.DISPLAY_NAMES[protocol] || protocol.toUpperCase();
}

/**
 * 验证URL格式
 * @param {string} url - 要验证的URL
 * @returns {boolean} 是否为有效URL
 */
export function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 清理自定义ID
 * @param {string} customId - 自定义ID
 * @returns {string} 清理后的ID
 */
export function cleanCustomId(customId) {
  if (!customId) return '';
  return customId.replace(REGEX_PATTERNS.CUSTOM_ID, '');
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
export function generateUniqueId() {
  return crypto.randomUUID();
}

/**
 * 深拷贝对象
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间
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
 * @param {number} delay - 延迟时间
 * @returns {Function} 节流后的函数
 */
export function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时间
 * @param {Date|string|number} date - 日期
 * @returns {string} 格式化后的时间
 */
export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 检查是否为移动设备
 * @returns {boolean} 是否为移动设备
 */
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否复制成功
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
}

/**
 * 下载文件
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME类型
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 安全的JSON解析
 * @param {string} jsonString - JSON字符串
 * @param {any} defaultValue - 默认值
 * @returns {any} 解析结果或默认值
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON解析失败:', error);
    return defaultValue;
  }
}

/**
 * 数组去重
 * @param {Array} array - 要去重的数组
 * @param {string|Function} key - 去重的键或函数
 * @returns {Array} 去重后的数组
 */
export function uniqueArray(array, key) {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * 分页计算
 * @param {Array} items - 项目数组
 * @param {number} currentPage - 当前页
 * @param {number} itemsPerPage - 每页项目数
 * @returns {Object} 分页信息
 */
export function paginate(items, currentPage, itemsPerPage) {
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedItems = items.slice(start, end);
  
  return {
    items: paginatedItems,
    totalPages,
    currentPage,
    itemsPerPage,
    totalItems: items.length,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
}
