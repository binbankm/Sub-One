<!--
  ==================== 登录视图组件 ====================
  
  功能说明：
  - 用户登录界面
  - 密码输入和验证
  - 登录状态管理和错误提示
  - 优雅的动画效果和视觉设计
  
  Props：
  - login (Function): 登录函数，接收密码参数
  
  特色功能：
  - 动态背景光球动画
  - 输入状态实时反馈
  - 错误信息抖动提示
  - 登录按钮加载动画
  - 完整的键盘事件支持（回车登录）
  
  ==================================================
-->

<script setup lang="ts">
// ==================== 导入依赖 ====================
import { ref } from 'vue';

// ==================== Props 定义 ====================

/**
 * 组件属性定义
 */
const props = defineProps<{
  /** 登录函数 - 接收用户名和密码并返回 Promise */
  login: (username: string, password: string) => Promise<any>,
  /** 是否为初始化设置模式 */
  isSetup?: boolean
}>();

// ==================== 响应式状态 ====================

/** 用户名输入值 */
const username = ref('');

/** 密码输入值 */
const password = ref('');

/** 确认密码输入值（仅设置模式） */
const confirmPassword = ref('');

/** 登录加载状态 */
const isLoading = ref(false);

/** 错误消息 */
const error = ref('');

// ==================== 登录处理 ====================

/**
 * 处理登录提交
 * 
 * 说明：
 * - 验证用户名和密码不为空
 * - 调用父组件传入的 login 函数
 * - 处理登录错误并显示提示
 */
const handleSubmit = async () => {
  // 验证用户名不为空
  if (!username.value.trim()) {
    error.value = '请输入用户名';
    return;
  }

  // 验证密码不为空
  if (!password.value.trim()) {
    error.value = '请输入密码';
    return;
  }

  // 如果是设置模式，验证确认密码
  if (props.isSetup) {
    if (!confirmPassword.value.trim()) {
      error.value = '请确认密码';
      return;
    }
    if (password.value !== confirmPassword.value) {
      error.value = '两次输入的密码不一致';
      return;
    }
    if (password.value.length < 6) {
      error.value = '密码长度至少为6位';
      return;
    }
  }

  // 清空之前的错误信息
  error.value = '';
  // 设置加载状态
  isLoading.value = true;

  try {
    // 调用登录函数
    await props.login(username.value, password.value);
  } catch (err: unknown) {
    // 捕获并显示错误信息
    const msg = err instanceof Error ? err.message : String(err);
    error.value = msg || '登录失败，请重试';
  } finally {
    // 无论成功失败都重置加载状态
    isLoading.value = false;
  }
};

/**
 * 处理键盘事件
 * 
 * 说明：
 * - 按下回车键时执行登录
 * - 提升用户体验
 * 
 * @param {KeyboardEvent} e - 键盘事件对象
 */
const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSubmit();
  }
};
</script>

<template>
  <!-- 登录页面容器 -->
  <div class="min-h-screen flex items-center justify-center p-3 sm:p-6 relative overflow-hidden">
    
    <!-- ==================== 登录卡片 ==================== -->
    <div class="relative w-full max-w-full p-4 sm:max-w-[420px] sm:p-10 bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-white/30 dark:border-white/10 animate-scale-in isolate
      shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.6)]
      dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)]
      backdrop-blur-xl mx-auto transition-all duration-300">
    
      <!-- Logo 区域 -->
      <div class="text-center mb-4 sm:mb-6 animate-fade-in-down">
        <!-- Logo 图标容器 -->
        <div class="flex justify-center mb-3 sm:mb-5">
          <div class="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl shadow-glow-primary animate-bounce">
            <!-- 闪电图标 SVG -->
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <!-- 标题 - 渐变动画文字 -->
        <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-50 mb-1 sm:mb-2 tracking-tight">
          <span class="gradient-text-animated">Sub-One</span> Manager
        </h1>

        <!-- 副标题 -->
        <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium tracking-wide">
          {{ isSetup ? '首次使用，请创建管理员账号' : '现代化订阅管理平台' }}
        </p>
      </div>

      <!-- ==================== 登录表单 ==================== -->
      <form class="mt-4 sm:mt-6 animate-fade-in-up" @submit.prevent="handleSubmit">
        <!-- 用户名输入 -->
        <div class="mb-3 sm:mb-4">
          <label for="username" class="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1.5 sm:mb-2.5 sm:text-base">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>用户名</span>
          </label>

          <div class="relative group">
            <input 
              id="username" 
              v-model="username" 
              type="text" 
              class="form-input-login py-2.5 text-sm sm:text-base sm:py-3 bg-gray-50/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 transition-colors" 
              :class="{ 'input-error': error && !username }"
              placeholder="请输入您的用户名" 
              autocomplete="username" 
              :disabled="isLoading" 
              @keypress="handleKeyPress" 
            />

            <div class="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300">
              <svg v-if="!username" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>

              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 密码输入 -->
        <div class="mb-3 sm:mb-4">
          <label for="password" class="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1.5 sm:mb-2.5 sm:text-base">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>密码</span>
          </label>

          <div class="relative group">
            <input 
              id="password" 
              v-model="password" 
              type="password" 
              class="form-input-login py-2.5 text-sm sm:text-base sm:py-3 bg-gray-50/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 transition-colors" 
              :class="{ 'input-error': error }"
              placeholder="请输入您的密码" 
              autocomplete="current-password" 
              :disabled="isLoading" 
              @keypress="handleKeyPress" 
            />

            <!-- 输入框右侧图标 - 根据状态显示不同图标 -->
            <div class="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300">
              <!-- 空密码时显示钥匙图标 -->
              <svg v-if="!password" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>

              <!-- 有密码时显示勾选图标 -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <!-- 错误消息 - 带抖动动画 -->
          <transition name="shake">
            <p v-if="error" class="flex items-center gap-1.5 mt-1.5 sm:mt-2.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 rounded-lg animate-fade-in-down">
              <!-- 警告图标 -->
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ error }}
            </p>
          </transition>
        </div>

        <!-- 确认密码输入（仅设置模式） -->
        <div v-if="isSetup" class="mb-3 sm:mb-4">
          <label for="confirmPassword" class="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1.5 sm:mb-2.5 sm:text-base">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.818-4.818A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>确认密码</span>
          </label>

          <div class="relative group">
            <input 
              id="confirmPassword" 
              v-model="confirmPassword" 
              type="password" 
              class="form-input-login py-2.5 text-sm sm:text-base sm:py-3 bg-gray-50/50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 transition-colors" 
              :class="{ 'input-error': error }"
              placeholder="请再次输入密码" 
              autocomplete="new-password" 
              :disabled="isLoading" 
              @keypress="handleKeyPress" 
            />

            <div class="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300">
              <svg v-if="!confirmPassword" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>

              <svg v-else-if="password === confirmPassword && confirmPassword" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>

              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>

        <!-- ==================== 提交按钮 ==================== -->
        <button 
          type="submit" 
          class="login-button py-3 text-sm sm:text-base sm:py-3.5 hover:shadow-glow-primary hover:scale-[1.01]" 
          :disabled="isLoading || !username || !password || (isSetup && !confirmPassword)" 
        >
          <!-- 正常状态 - 显示登录图标和文字 -->
          <span v-if="!isLoading" class="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="isSetup ? 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' : 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1'" />
            </svg>
            {{ isSetup ? '创建管理员账号' : '立即登录' }}
          </span>

          <!-- 加载状态 - 显示加载动画 -->
          <span v-else class="flex items-center justify-center gap-2">
            <div class="spinner w-4 h-4 sm:w-5 sm:h-5 border-2"></div>
            {{ isSetup ? '创建中...' : '登录中...' }}
          </span>
        </button>

        <!-- ==================== 页脚信息 ==================== -->
        <div class="mt-4 sm:mt-6 text-center">
          <!-- 安全徽章 -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.6875rem] font-semibold text-green-700 dark:text-green-400 bg-green-50/80 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-full sm:px-4 sm:py-2 sm:text-xs hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors cursor-default">
            <!-- 盾牌图标 -->
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>安全加密传输</span>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
