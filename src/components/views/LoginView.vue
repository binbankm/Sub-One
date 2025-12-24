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
  /** 登录函数 - 接收密码并返回 Promise */
  login: (password: string) => Promise<any>
}>();

// ==================== 响应式状态 ====================

/** 密码输入值 */
const password = ref('');

/** 登录加载状态 */
const isLoading = ref(false);

/** 错误消息 */
const error = ref('');

// ==================== 登录处理 ====================

/**
 * 处理登录提交
 * 
 * 说明：
 * - 验证密码不为空
 * - 调用父组件传入的 login 函数
 * - 处理登录错误并显示提示
 */
const handleSubmit = async () => {
  // 验证密码不为空
  if (!password.value.trim()) {
    error.value = '请输入密码';
    return;
  }

  // 清空之前的错误信息
  error.value = '';
  // 设置加载状态
  isLoading.value = true;

  try {
    // 调用登录函数
    await props.login(password.value);
  } catch (err: any) {
    // 捕获并显示错误信息
    error.value = err.message || '登录失败，请重试';
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
  <div class="login-wrapper">
    
    <!-- ==================== 动画背景元素 ==================== -->
    <!-- 背景光球 - 增加视觉趣味性 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- 光球 1 - 左上角蓝紫色 -->
      <div class="login-orb login-orb-1"></div>
      <!-- 光球 2 - 右下角紫粉色 -->
      <div class="login-orb login-orb-2"></div>
      <!-- 光球 3 - 中心青色 -->
      <div class="login-orb login-orb-3"></div>
    </div>

    <!-- ==================== 登录卡片 ==================== -->
    <div class="login-card">
      
      <!-- Logo 区域 -->
      <div class="text-center mb-8 animate-fade-in-down">
        <!-- Logo 图标容器 -->
        <div class="logo-container">
          <div class="logo-gradient">
            <!-- 闪电图标 SVG -->
            <svg xmlns="http://www.w3.org/2000/svg" class="logo-icon" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <!-- 标题 - 渐变动画文字 -->
        <h1 class="login-title">
          <span class="gradient-text-animated">Sub-One</span> Manager
        </h1>

        <!-- 副标题 -->
        <p class="login-subtitle">
          现代化订阅管理平台
        </p>
      </div>

      <!-- ==================== 登录表单 ==================== -->
      <div class="login-form animate-fade-in-up">
        <div class="form-group">
          
          <!-- 表单标签 - 带锁图标 -->
          <label for="password" class="form-label">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>管理员密码</span>
          </label>

          <!-- 输入框包装器 -->
          <div class="input-wrapper">
            <!-- 密码输入框 -->
            <input 
              id="password" 
              v-model="password" 
              type="password" 
              class="form-input" 
              :class="{ 'input-error': error }"
              placeholder="请输入您的密码" 
              autocomplete="current-password" 
              :disabled="isLoading" 
              @keypress="handleKeyPress" 
            />

            <!-- 输入框右侧图标 - 根据状态显示不同图标 -->
            <div class="input-icon">
              <!-- 空密码时显示钥匙图标 -->
              <svg v-if="!password" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>

              <!-- 有密码时显示勾选图标 -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-indigo-500" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <!-- 错误消息 - 带抖动动画 -->
          <transition name="shake">
            <p v-if="error" class="error-message">
              <!-- 警告图标 -->
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ error }}
            </p>
          </transition>
        </div>

        <!-- ==================== 提交按钮 ==================== -->
        <button 
          type="button" 
          class="login-button" 
          :disabled="isLoading || !password" 
          @click="handleSubmit"
        >
          <!-- 正常状态 - 显示登录图标和文字 -->
          <span v-if="!isLoading" class="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            立即登录
          </span>

          <!-- 加载状态 - 显示加载动画 -->
          <span v-else class="flex items-center justify-center gap-2">
            <div class="spinner"></div>
            登录中...
          </span>
        </button>

        <!-- ==================== 页脚信息 ==================== -->
        <div class="login-footer">
          <!-- 安全徽章 -->
          <div class="security-badge">
            <!-- 盾牌图标 -->
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>安全加密传输</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 登录页面容器 ==================== */
.login-wrapper {
  min-height: 100vh; /* 占满整个视口 */
  display: flex;
  align-items: center; /* 垂直居中 */
  justify-content: center; /* 水平居中 */
  padding: 1.5rem;
  position: relative;
}

/* ==================== 动画背景光球 ==================== */

/* 光球基础样式 */
.login-orb {
  position: absolute;
  border-radius: 50%; /* 圆形 */
  filter: blur(80px); /* 强模糊效果 */
  opacity: 0.3; /* 半透明 */
  pointer-events: none; /* 不响应鼠标事件 */
}

/* 光球 1 - 左上角蓝紫色 */
.login-orb-1 {
  top: 10%;
  left: 10%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, hsl(243, 75%, 59%) 0%, transparent 70%);
  animation: float 15s ease-in-out infinite; /* 浮动动画 */
}

/* 光球 2 - 右下角紫粉色（反向动画） */
.login-orb-2 {
  bottom: 10%;
  right: 10%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, hsl(280, 72%, 54%) 0%, transparent 70%);
  animation: float 20s ease-in-out infinite reverse;
}

/* 光球 3 - 中心青色 */
.login-orb-3 {
  top: 50%;
  left: 50%;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, hsl(189, 94%, 43%) 0%, transparent 70%);
  animation: float 12s ease-in-out infinite;
  transform: translate(-50%, -50%); /* 居中 */
}

/* 浮动动画关键帧 */
@keyframes float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  33% {
    transform: translate(30px, -30px) scale(1.1); /* 右上移动并放大 */
  }

  66% {
    transform: translate(-20px, 20px) scale(0.9); /* 左下移动并缩小 */
  }
}

/* ==================== 登录卡片 ==================== */

.login-card {
  position: relative;
  width: 100%;
  max-width: 450px; /* 最大宽度限制 */
  padding: 3rem;
  background: rgb(255, 255, 255); /* 白色背景 */
  backdrop-filter: blur(40px); /* 毛玻璃效果 */
  -webkit-backdrop-filter: blur(40px);
  border-radius: 2rem; /* 大圆角 */
  border: 1px solid rgba(255, 255, 255, 0.3);
  /* 多层阴影效果 */
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  animation: scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); /* 缩放进入动画 */
  isolation: isolate; /* 创建新的层叠上下文 */
}

/* 暗黑模式下的登录卡片 */
html.dark .login-card {
  background: rgb(15, 23, 42); /* 深色背景 */
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* ==================== Logo 样式 ==================== */

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

/* Logo 渐变背景 */
.logo-gradient {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, hsl(243, 75%, 59%) 0%, hsl(280, 72%, 54%) 100%);
  border-radius: 1.5rem;
  box-shadow:
    0 20px 25px -5px rgba(99, 102, 241, 0.4),
    0 8px 10px -6px rgba(99, 102, 241, 0.3);
  animation: bounce 2s ease-in-out infinite; /* 跳动动画 */
}

/* Logo 图标 */
.logo-icon {
  width: 40px;
  height: 40px;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2)); /* 投影 */
}

/* ==================== 文字样式 ==================== */

/* 登录标题 */
.login-title {
  font-size: 2rem;
  font-weight: 800;
  color: hsl(243, 47%, 24%);
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em; /* 字距收紧 */
}

/* 暗黑模式下的标题 */
html.dark .login-title {
  color: hsl(243, 100%, 97%);
}

/* 副标题 */
.login-subtitle {
  font-size: 0.875rem;
  color: hsl(243, 20%, 50%);
  font-weight: 500;
}

/* 暗黑模式下的副标题 */
html.dark .login-subtitle {
  color: hsl(243, 30%, 70%);
}

/* ==================== 表单样式 ==================== */

.login-form {
  margin-top: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

/* 表单标签 - 带图标 */
.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(243, 47%, 30%);
  margin-bottom: 0.5rem;
}

html.dark .form-label {
  color: hsl(243, 100%, 90%);
}

/* 输入框包装器 */
.input-wrapper {
  position: relative;
}

/* 输入框右侧图标 */
.input-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none; /* 不响应点击 */
  transition: all 0.3s ease;
}

/* 错误状态的输入框 */
.input-error {
  border-color: hsl(0, 84%, 60%) !important;
  animation: shake 0.5s ease; /* 抖动动画 */
}

/* 抖动动画关键帧 */
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }

  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-5px);
  }

  20%,
  40%,
  60%,
  80% {
    transform: translateX(5px);
  }
}

/* ==================== 错误消息 ==================== */

.error-message {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: hsl(0, 84%, 50%);
  background: hsl(0, 84%, 97%);
  border-left: 3px solid hsl(0, 84%, 60%); /* 左侧强调边框 */
  border-radius: 0.5rem;
  animation: fadeInDown 0.3s ease;
}

html.dark .error-message {
  background: hsla(0, 84%, 30%, 0.2);
  color: hsl(0, 84%, 70%);
}

/* ==================== 登录按钮 ==================== */

.login-button {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, hsl(243, 75%, 59%) 0%, hsl(280, 72%, 54%) 100%);
  border: none;
  border-radius: 1rem;
  cursor: pointer;
  box-shadow:
    0 10px 15px -3px rgba(99, 102, 241, 0.4),
    0 4px 6px -4px rgba(99, 102, 241, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

/* 按钮光泽效果 */
.login-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

/* 悬停时的光泽扫过效果 */
.login-button:hover::before {
  transform: translateX(100%);
}

/* 按钮悬停效果 */
.login-button:not(:disabled):hover {
  transform: translateY(-2px) scale(1.02); /* 上移并放大 */
  box-shadow:
    0 20px 25px -5px rgba(99, 102, 241, 0.5),
    0 8px 10px -6px rgba(99, 102, 241, 0.4);
}

/* 按钮按下效果 */
.login-button:not(:disabled):active {
  transform: translateY(0) scale(0.98); /* 缩小 */
}

/* 禁用状态的按钮 */
.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ==================== 页脚 ==================== */

.login-footer {
  margin-top: 1.5rem;
  text-align: center;
}

/* 安全徽章 */
.security-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: hsl(142, 71%, 35%);
  background: hsla(142, 71%, 95%, 0.8);
  border-radius: 9999px; /* 完全圆角 */
  border: 1px solid hsl(142, 71%, 85%);
}

html.dark .security-badge {
  color: hsl(142, 71%, 70%);
  background: hsla(142, 71%, 20%, 0.3);
  border-color: hsl(142, 71%, 30%);
}

/* ==================== 响应式设计 ==================== */

@media (max-width: 640px) {
  .login-card {
    padding: 2rem 1.5rem; /* 减小内边距 */
  }

  .login-title {
    font-size: 1.75rem; /* 缩小标题 */
  }

  .logo-gradient {
    width: 70px;
    height: 70px;
  }

  .logo-icon {
    width: 35px;
    height: 35px;
  }
}

/* ==================== 表单输入框 ==================== */

.form-input {
  width: 100%;
  padding: 0.875rem 3rem 0.875rem 1rem; /* 右侧留出图标空间 */
  font-size: 0.9375rem;
  color: hsl(243, 47%, 24%);
  background: hsl(243, 20%, 98%);
  border: 2px solid hsl(243, 20%, 90%);
  border-radius: 0.75rem;
  transition: all 0.3s ease;
  outline: none;
}

html.dark .form-input {
  color: hsl(243, 100%, 97%);
  background: hsl(243, 15%, 15%);
  border-color: hsl(243, 15%, 25%);
}

/* 输入框聚焦状态 */
.form-input:focus {
  border-color: hsl(243, 75%, 59%);
  background: white;
  box-shadow: 0 0 0 4px hsla(243, 75%, 59%, 0.1); /* 聚焦光晕 */
}

html.dark .form-input:focus {
  border-color: hsl(243, 75%, 59%);
  background: hsl(243, 15%, 18%);
}

/* 占位符样式 */
.form-input::placeholder {
  color: hsl(243, 20%, 60%);
}

html.dark .form-input::placeholder {
  color: hsl(243, 20%, 50%);
}

/* ==================== 加载动画 ==================== */

/* 小尺寸 Spinner（按钮内使用） */
.spinner-small {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 旋转动画 */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ==================== 过渡效果 ==================== */

/* 抖动过渡进入 */
.shake-enter-active {
  animation: shake 0.5s ease;
}

/* 抖动过渡离开 */
.shake-leave-active {
  animation: fadeOut 0.3s ease;
}

/* 淡出动画 */
@keyframes fadeOut {
  to {
    opacity: 0;
  }
}

/* 注：渐变文字动画、缩放进入、淡入等动画在全局 design-system.css 中定义 */
</style>
