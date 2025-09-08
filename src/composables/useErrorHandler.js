/**
 * useErrorHandler.js
 * 错误处理composable
 * 提供统一的错误处理和用户反馈
 */
import { ref } from 'vue'
import { useToastStore } from '../stores/toast.js'

export function useErrorHandler() {
  const { showToast } = useToastStore()
  const errors = ref([])

  // 处理API错误
  const handleApiError = (error, context = '') => {
    console.error(`API Error ${context}:`, error)

    let message = '操作失败，请稍后重试'

    if (error.response) {
      // 服务器响应错误
      const status = error.response.status
      switch (status) {
        case 400:
          message = '请求参数错误'
          break
        case 401:
          message = '未授权，请重新登录'
          break
        case 403:
          message = '权限不足'
          break
        case 404:
          message = '资源不存在'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = `请求失败 (${status})`
      }
    } else if (error.request) {
      // 网络错误
      message = '网络连接失败，请检查网络'
    } else {
      // 其他错误
      message = error.message || '未知错误'
    }

    showToast(message, 'error')
    addError({ message, context, timestamp: new Date() })
  }

  // 处理验证错误
  const handleValidationError = (errors, context = '') => {
    const errorMessages = Object.values(errors).flat()
    const message = errorMessages.join(', ')

    showToast(message, 'error')
    addError({ message, context, timestamp: new Date() })
  }

  // 处理通用错误
  const handleError = (error, context = '') => {
    console.error(`Error ${context}:`, error)

    const message = error.message || '操作失败'
    showToast(message, 'error')
    addError({ message, context, timestamp: new Date() })
  }

  // 添加错误到列表
  const addError = error => {
    errors.value.unshift({
      id: Date.now(),
      ...error
    })

    // 限制错误列表长度
    if (errors.value.length > 50) {
      errors.value = errors.value.slice(0, 50)
    }
  }

  // 清除错误
  const clearError = id => {
    const index = errors.value.findIndex(error => error.id === id)
    if (index > -1) {
      errors.value.splice(index, 1)
    }
  }

  // 清除所有错误
  const clearAllErrors = () => {
    errors.value = []
  }

  // 重试函数
  const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
    let lastError

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error

        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
        }
      }
    }

    throw lastError
  }

  return {
    errors,
    handleApiError,
    handleValidationError,
    handleError,
    addError,
    clearError,
    clearAllErrors,
    withRetry
  }
}
