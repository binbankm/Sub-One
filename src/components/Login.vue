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
    <div class="card-modern p-12 relative overflow-hidden backdrop-blur-xl">
      <!-- 装饰性背景元素 - 美化升级版 -->
      <div class="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-400/30 to-purple-400/20 rounded-full -translate-y-20 translate-x-20 animate-pulse"></div>
      <div class="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-pink-400/30 to-red-400/20 rounded-full translate-y-16 -translate-x-16 animate-pulse" style="animation-delay: -2s;"></div>
      <div class="absolute top-1/2 left-0 w-24 h-24 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full -translate-y-12 -translate-x-12 animate-pulse" style="animation-delay: -4s;"></div>
      
      <div class="relative z-10">
        <div class="flex flex-col items-center">
          <!-- 现代化Logo - 美化升级版 -->
          <div class="relative mb-8">
            <div class="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-2xl relative overflow-hidden">
              <!-- 光效装饰 -->
              <div class="absolute inset-0 bg-white/20 rounded-3xl"></div>
              <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
              
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-white drop-shadow-lg relative z-10">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="absolute -top-3 -right-3 w-7 h-7 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white animate-pulse shadow-xl"></div>
            <div class="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 animate-ping"></div>
          </div>
          
          <h1 class="text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 drop-shadow-lg">Sub-One</h1>
          <p class="text-xl text-gray-700 dark:text-gray-200 font-semibold mb-2 drop-shadow-sm">Manager</p>
          <p class="text-base text-gray-500 dark:text-gray-400 font-medium">请输入管理员密码</p>
        </div>

        <form @submit.prevent="submitLogin" class="mt-10 space-y-8">
          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <svg class="h-6 w-6 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              class="input-modern w-full pl-14 pr-6 py-5 text-lg placeholder-gray-400 dark:placeholder-gray-500 focus:placeholder-gray-300 dark:focus:placeholder-gray-400 transition-all duration-300 text-center font-medium" 
              placeholder="请输入密码"
              :class="{ 'text-left': password, 'text-center': !password }"
            >
            <!-- 添加焦点时的装饰效果 - 美化升级版 -->
            <div class="absolute inset-0 rounded-2xl border-2 border-transparent group-focus-within:border-indigo-500/50 group-focus-within:shadow-lg group-focus-within:shadow-indigo-500/25 transition-all duration-300 pointer-events-none"></div>
          </div>
          
          <div v-if="error" class="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 rounded-2xl py-4 px-6 border border-red-200 dark:border-red-800 shadow-lg backdrop-blur-sm">
            {{ error }}
          </div>
          
          <div>
            <button 
              type="submit" 
              :disabled="isLoading"
              class="btn-modern w-full flex justify-center items-center py-5 text-lg font-bold disabled:opacity-75 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <!-- 背景光效 -->
              <div class="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div v-if="isLoading" class="loading-spinner w-6 h-6 mr-3"></div>
              <span class="relative z-10">{{ isLoading ? '登录中...' : '授权访问' }}</span>
            </button>
          </div>
        </form>
        
        <!-- 底部装饰 - 美化升级版 -->
        <div class="mt-10 text-center">
          <div class="flex items-center justify-center space-x-4 mb-3">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style="animation-delay: -0.5s;"></div>
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style="animation-delay: -1s;"></div>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">
            安全访问 · 数据保护 · 隐私优先
          </p>
        </div>
      </div>
    </div>
  </div>
</template>