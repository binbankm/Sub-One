// 错误处理工具
import { useToastStore } from '../stores/toast.js';

/**
 * 错误类型枚举
 */
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  PARSE: 'parse',
  UNKNOWN: 'unknown'
};

/**
 * 错误处理器类
 */
export class ErrorHandler {
  constructor() {
    this.toastStore = useToastStore();
  }

  /**
   * 处理错误
   * @param {Error|string} error - 错误对象或错误消息
   * @param {string} context - 错误上下文
   * @param {Object} options - 处理选项
   */
  handle(error, context = '', options = {}) {
    const {
      showToast = true,
      logError = true,
      fallbackMessage = '操作失败，请重试'
    } = options;

    const errorInfo = this.parseError(error);
    
    if (logError) {
      this.logError(errorInfo, context);
    }

    if (showToast) {
      this.showErrorToast(errorInfo, fallbackMessage);
    }

    return errorInfo;
  }

  /**
   * 解析错误信息
   * @param {Error|string} error - 错误对象或错误消息
   * @returns {Object} 解析后的错误信息
   */
  parseError(error) {
    if (typeof error === 'string') {
      return {
        type: ERROR_TYPES.UNKNOWN,
        message: error,
        originalError: null
      };
    }

    if (error instanceof Error) {
      // 网络错误
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          type: ERROR_TYPES.NETWORK,
          message: '网络连接失败，请检查网络设置',
          originalError: error
        };
      }

      // JSON解析错误
      if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
        return {
          type: ERROR_TYPES.PARSE,
          message: '数据格式错误，无法解析',
          originalError: error
        };
      }

      // 验证错误
      if (error.name === 'ValidationError') {
        return {
          type: ERROR_TYPES.VALIDATION,
          message: error.message,
          originalError: error
        };
      }

      return {
        type: ERROR_TYPES.UNKNOWN,
        message: error.message || '未知错误',
        originalError: error
      };
    }

    return {
      type: ERROR_TYPES.UNKNOWN,
      message: '未知错误',
      originalError: error
    };
  }

  /**
   * 记录错误日志
   * @param {Object} errorInfo - 错误信息
   * @param {string} context - 错误上下文
   */
  logError(errorInfo, context) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${context ? `[${context}] ` : ''}${errorInfo.type}: ${errorInfo.message}`;
    
    console.error(logMessage, errorInfo.originalError);
    
    // 在生产环境中，可以发送错误到日志服务
    if (import.meta.env.PROD) {
      this.sendErrorToLogService(errorInfo, context);
    }
  }

  /**
   * 显示错误提示
   * @param {Object} errorInfo - 错误信息
   * @param {string} fallbackMessage - 备用消息
   */
  showErrorToast(errorInfo, fallbackMessage) {
    const message = errorInfo.message || fallbackMessage;
    this.toastStore.showToast(message, 'error');
  }

  /**
   * 发送错误到日志服务（生产环境）
   * @param {Object} errorInfo - 错误信息
   * @param {string} context - 错误上下文
   */
  sendErrorToLogService(errorInfo, context) {
    // 这里可以集成第三方错误监控服务，如 Sentry
    // 示例：
    // if (window.Sentry) {
    //   window.Sentry.captureException(errorInfo.originalError, {
    //     tags: {
    //       context,
    //       errorType: errorInfo.type
    //     }
    //   });
    // }
  }
}

// 创建全局错误处理器实例
export const errorHandler = new ErrorHandler();

/**
 * 异步操作错误处理装饰器
 * @param {Function} fn - 要包装的异步函数
 * @param {string} context - 错误上下文
 * @param {Object} options - 处理选项
 * @returns {Function} 包装后的函数
 */
export function withErrorHandling(fn, context, options = {}) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      errorHandler.handle(error, context, options);
      throw error;
    }
  };
}

/**
 * 同步操作错误处理装饰器
 * @param {Function} fn - 要包装的同步函数
 * @param {string} context - 错误上下文
 * @param {Object} options - 处理选项
 * @returns {Function} 包装后的函数
 */
export function withSyncErrorHandling(fn, context, options = {}) {
  return function(...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      errorHandler.handle(error, context, options);
      throw error;
    }
  };
}

/**
 * 网络请求错误处理
 * @param {Response} response - 响应对象
 * @param {string} context - 错误上下文
 * @returns {Promise<any>} 处理后的响应
 */
export async function handleNetworkError(response, context = '网络请求') {
  if (!response.ok) {
    let errorMessage = `请求失败 (${response.status})`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // 如果无法解析错误响应，使用默认消息
    }
    
    const error = new Error(errorMessage);
    error.status = response.status;
    errorHandler.handle(error, context);
    throw error;
  }
  
  return response;
}

/**
 * 全局错误处理设置
 */
export function setupGlobalErrorHandling() {
  // 捕获未处理的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handle(event.reason, '未处理的Promise拒绝', {
      showToast: true,
      logError: true
    });
  });

  // 捕获未处理的JavaScript错误
  window.addEventListener('error', (event) => {
    errorHandler.handle(event.error, '未处理的JavaScript错误', {
      showToast: false, // 避免在全局错误时显示太多提示
      logError: true
    });
  });
}
