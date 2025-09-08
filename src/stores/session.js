/**
 * 会话状态管理Store
 * 管理用户登录状态、会话数据和认证相关功能
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchInitialData, login as apiLogin } from '../lib/api.js'

export const useSessionStore = defineStore('session', () => {
  // === 状态定义 ===
  const sessionState = ref('loading') // loading, loggedIn, loggedOut
  const initialData = ref(null)
  const loginAttempts = ref(0)
  const lastLoginTime = ref(null)

  // === 计算属性 ===
  const isLoggedIn = computed(() => sessionState.value === 'loggedIn')
  const isLoading = computed(() => sessionState.value === 'loading')
  const isLoggedOut = computed(() => sessionState.value === 'loggedOut')

  const hasData = computed(() => {
    return (
      initialData.value &&
      (initialData.value.subs?.length > 0 || initialData.value.profiles?.length > 0)
    )
  })

  // === 会话检查 ===
  async function checkSession() {
    try {
      sessionState.value = 'loading'
      const data = await fetchInitialData()

      if (data) {
        initialData.value = data
        sessionState.value = 'loggedIn'
        lastLoginTime.value = new Date().toISOString()
      } else {
        sessionState.value = 'loggedOut'
        initialData.value = null
      }
    } catch (error) {
      console.error('Session check failed:', error)
      sessionState.value = 'loggedOut'
      initialData.value = null
    }
  }

  // === 登录功能 ===
  async function login(password) {
    try {
      if (!password || password.trim() === '') {
        throw new Error('密码不能为空')
      }

      const response = await apiLogin(password)

      if (response.ok) {
        loginAttempts.value = 0
        await handleLoginSuccess()
      } else {
        loginAttempts.value++
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || errorData.error || '登录失败'
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  async function handleLoginSuccess() {
    sessionState.value = 'loading'
    await checkSession()
  }

  // === 登出功能 ===
  async function logout() {
    try {
      sessionState.value = 'loggedOut'
      initialData.value = null
      loginAttempts.value = 0
      lastLoginTime.value = null

      // 清除本地存储的敏感数据
      localStorage.removeItem('sessionToken')
      sessionStorage.clear()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // === 数据刷新 ===
  async function refreshData() {
    if (isLoggedIn.value) {
      await checkSession()
    }
  }

  // === 会话验证 ===
  function validateSession() {
    if (isLoggedIn.value && lastLoginTime.value) {
      const loginTime = new Date(lastLoginTime.value)
      const now = new Date()
      const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60)

      // 如果超过24小时未活动，自动登出
      if (hoursSinceLogin > 24) {
        logout()
        return false
      }
    }
    return true
  }

  // === 初始化方法 ===
  function initializeSession() {
    // 检查是否有保存的会话
    const savedToken = localStorage.getItem('sessionToken')
    if (savedToken) {
      checkSession()
    } else {
      sessionState.value = 'loggedOut'
    }
  }

  return {
    // 状态
    sessionState,
    initialData,
    loginAttempts,
    lastLoginTime,

    // 计算属性
    isLoggedIn,
    isLoading,
    isLoggedOut,
    hasData,

    // 方法
    checkSession,
    login,
    logout,
    refreshData,
    validateSession,
    initializeSession
  }
})
