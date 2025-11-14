
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchInitialData, login as apiLogin } from '../lib/api.js';

// 会话状态类型枚举
const SESSION_STATES = {
  LOADING: 'loading',
  LOGGED_IN: 'loggedIn',
  LOGGED_OUT: 'loggedOut',
  ERROR: 'error'
};

export const useSessionStore = defineStore('session', () => {
  // 状态定义
  const sessionState = ref(SESSION_STATES.LOADING);
  const initialData = ref(null);
  const errorMessage = ref('');
  
  // 计算属性 - 提供便捷的状态检查
  const isLoading = computed(() => sessionState.value === SESSION_STATES.LOADING);
  const isLoggedIn = computed(() => sessionState.value === SESSION_STATES.LOGGED_IN);
  const isLoggedOut = computed(() => sessionState.value === SESSION_STATES.LOGGED_OUT);
  const hasError = computed(() => sessionState.value === SESSION_STATES.ERROR);
  
  // 重置错误状态
  const resetError = () => {
    errorMessage.value = '';
    if (sessionState.value === SESSION_STATES.ERROR) {
      sessionState.value = SESSION_STATES.LOGGED_OUT;
    }
  };
  
  // 检查会话状态
  async function checkSession() {
    try {
      resetError(); // 清除之前的错误状态
      sessionState.value = SESSION_STATES.LOADING;
      
      const data = await fetchInitialData();
      
      if (data) {
        initialData.value = data;
        sessionState.value = SESSION_STATES.LOGGED_IN;
        return { success: true, data };
      } else {
        initialData.value = null;
        sessionState.value = SESSION_STATES.LOGGED_OUT;
        return { success: false, message: '未找到会话数据' };
      }
    } catch (error) {
      console.error('会话检查失败:', error);
      errorMessage.value = error.message || '会话验证失败';
      sessionState.value = SESSION_STATES.ERROR;
      initialData.value = null;
      return { success: false, message: error.message, error };
    }
  }
  
  // 登录处理
  async function login(password) {
    // 输入验证
    if (!password || typeof password !== 'string' || !password.trim()) {
      const error = new Error('密码不能为空');
      errorMessage.value = error.message;
      throw error;
    }
    
    try {
      resetError();
      sessionState.value = SESSION_STATES.LOADING;
      
      const response = await apiLogin(password);
      
      if (response.ok) {
        return await handleLoginSuccess();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || errorData.error || '登录失败');
        errorMessage.value = error.message;
        sessionState.value = SESSION_STATES.LOGGED_OUT;
        throw error;
      }
    } catch (error) {
      console.error('登录失败:', error);
      errorMessage.value = error.message || '登录请求失败';
      sessionState.value = SESSION_STATES.LOGGED_OUT;
      throw error;
    }
  }
  
  // 处理登录成功
  async function handleLoginSuccess() {
    sessionState.value = SESSION_STATES.LOADING;
    return await checkSession();
  }
  
  // 登出处理
  async function logout() {
    // 清理状态，确保一致性
    sessionState.value = SESSION_STATES.LOGGED_OUT;
    initialData.value = null;
    errorMessage.value = '';
    console.log('用户已登出');
  }
  
  // 刷新会话数据
  async function refreshSession() {
    if (isLoggedIn.value) {
      return await checkSession();
    }
    return { success: false, message: '用户未登录' };
  }
  
  return {
    // 状态
    sessionState,
    initialData,
    errorMessage,
    
    // 计算属性
    isLoading,
    isLoggedIn,
    isLoggedOut,
    hasError,
    
    // 方法
    checkSession,
    login,
    logout,
    refreshSession,
    resetError
  };
});
