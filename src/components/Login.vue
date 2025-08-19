<script setup>
import { ref } from 'vue';

const emit = defineEmits(['success']);
const password = ref('');
const isLoading = ref(false);
const error = ref('');

const props = defineProps({
  login: Function,
});

const submitLogin = async () => {
  if (!password.value) {
    error.value = '请输入密码';
    return;
  }
  isLoading.value = true;
  error.value = '';
  try {
    await props.login(password.value);
    // 成功后不再需要 emit，因为父组件会处理状态变更
  } catch (err) {
    error.value = err.message || '发生未知错误';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="w-full max-w-md animate-fade-in-up">
    <div class="card-modern p-10 relative overflow-hidden">
      <!-- 装饰性背景元素 -->
      <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full -translate-y-16 translate-x-16"></div>
      <div class="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-400/20 to-red-400/20 rounded-full translate-y-12 -translate-x-12"></div>
      
      <div class="relative z-10">
        <div class="flex flex-col items-center">
          <!-- 现代化Logo -->
          <div class="relative mb-6">
            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full border-2 border-white animate-pulse shadow-lg"></div>
          </div>
          
          <h1 class="text-3xl font-bold gradient-text mb-2">Sub-One</h1>
          <p class="text-lg text-gray-600 dark:text-gray-300 font-medium mb-1">Manager</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">请输入管理员密码</p>
        </div>

        <form @submit.prevent="submitLogin" class="mt-8 space-y-6">
          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <svg class="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input 
              v-model="password"
              id="password" 
              name="password" 
              type="password" 
              autocomplete="current-password" 
              required 
              class="input-modern w-full pl-4 pr-4 py-4 text-lg placeholder-gray-400 dark:placeholder-gray-500 focus:placeholder-gray-300 dark:focus:placeholder-gray-400 transition-colors duration-200 text-center" 
              placeholder="请输入密码"
              :class="{ 'text-left': password, 'text-center': !password }"
            >
            <!-- 添加焦点时的装饰效果 -->
            <div class="absolute inset-0 rounded-xl border-2 border-transparent group-focus-within:border-indigo-500/50 transition-colors duration-200 pointer-events-none"></div>
          </div>
          
          <div v-if="error" class="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 rounded-xl py-3 px-4 border border-red-200 dark:border-red-800">
            {{ error }}
          </div>
          
          <div>
            <button 
              type="submit" 
              :disabled="isLoading"
              class="btn-modern w-full flex justify-center items-center py-4 text-lg font-semibold disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <div v-if="isLoading" class="loading-spinner w-5 h-5 mr-3"></div>
              <span>{{ isLoading ? '登录中...' : '授权访问' }}</span>
            </button>
          </div>
        </form>
        
        <!-- 底部装饰 -->
        <div class="mt-8 text-center">
          <p class="text-xs text-gray-400 dark:text-gray-500">
            安全访问 · 数据保护 · 隐私优先
          </p>
        </div>
      </div>
    </div>
  </div>
</template>