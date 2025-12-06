<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  login: (password: string) => Promise<any>
}>();

const password = ref('');
const isLoading = ref(false);
const error = ref('');

const handleSubmit = async () => {
  if (!password.value.trim()) {
    error.value = '请输入密码';
    return;
  }

  error.value = '';
  isLoading.value = true;

  try {
    await props.login(password.value);
  } catch (err: any) {
    error.value = err.message || '登录失败，请重试';
  } finally {
    isLoading.value = false;
  }
};

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSubmit();
  }
};
</script>

<template>
  <div class="login-wrapper">
    <!-- Animated Background Elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="login-orb login-orb-1"></div>
      <div class="login-orb login-orb-2"></div>
      <div class="login-orb login-orb-3"></div>
    </div>

    <!-- Login Card -->
    <div class="login-card">
      <!-- Logo Section -->
      <div class="text-center mb-8 animate-fade-in-down">
        <div class="logo-container">
          <div class="logo-gradient">
            <svg xmlns="http://www.w3.org/2000/svg" class="logo-icon" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <h1 class="login-title">
          <span class="gradient-text-animated">Sub-One</span> Manager
        </h1>

        <p class="login-subtitle">
          现代化订阅管理平台
        </p>
      </div>

      <!-- Login Form -->
      <div class="login-form animate-fade-in-up">
        <div class="form-group">
          <label for="password" class="form-label">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>管理员密码</span>
          </label>

          <div class="input-wrapper">
            <input id="password" v-model="password" type="password" class="form-input" :class="{ 'input-error': error }"
              placeholder="请输入您的密码" autocomplete="current-password" :disabled="isLoading" @keypress="handleKeyPress" />

            <!-- Input Icon -->
            <div class="input-icon">
              <svg v-if="!password" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>

              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-indigo-500" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <!-- Error Message -->
          <transition name="shake">
            <p v-if="error" class="error-message">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ error }}
            </p>
          </transition>
        </div>

        <!-- Submit Button -->
        <button type="button" class="login-button" :disabled="isLoading || !password" @click="handleSubmit">
          <span v-if="!isLoading" class="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            立即登录
          </span>

          <span v-else class="flex items-center justify-center gap-2">
            <div class="spinner"></div>
            登录中...
          </span>
        </button>

        <!-- Additional Info -->
        <div class="login-footer">
          <div class="security-badge">
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
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
}

/* Animated Orbs */
.login-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
  pointer-events: none;
}

.login-orb-1 {
  top: 10%;
  left: 10%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, hsl(243, 75%, 59%) 0%, transparent 70%);
  animation: float 15s ease-in-out infinite;
}

.login-orb-2 {
  bottom: 10%;
  right: 10%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, hsl(280, 72%, 54%) 0%, transparent 70%);
  animation: float 20s ease-in-out infinite reverse;
}

.login-orb-3 {
  top: 50%;
  left: 50%;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, hsl(189, 94%, 43%) 0%, transparent 70%);
  animation: float 12s ease-in-out infinite;
  transform: translate(-50%, -50%);
}

@keyframes float {

  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  33% {
    transform: translate(30px, -30px) scale(1.1);
  }

  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

/* Login Card */
.login-card {
  position: relative;
  width: 100%;
  max-width: 450px;
  padding: 3rem;
  background: rgb(255, 255, 255);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-radius: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  animation: scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  isolation: isolate;
}

html.dark .login-card {
  background: rgb(15, 23, 42);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Logo */
.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

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
  animation: bounce 2s ease-in-out infinite;
}

.logo-icon {
  width: 40px;
  height: 40px;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

/* Typography */
.login-title {
  font-size: 2rem;
  font-weight: 800;
  color: hsl(243, 47%, 24%);
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

html.dark .login-title {
  color: hsl(243, 100%, 97%);
}

.login-subtitle {
  font-size: 0.875rem;
  color: hsl(243, 20%, 50%);
  font-weight: 500;
}

html.dark .login-subtitle {
  color: hsl(243, 30%, 70%);
}

/* Form */
.login-form {
  margin-top: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

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

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  transition: all 0.3s ease;
}

.input-error {
  border-color: hsl(0, 84%, 60%) !important;
  animation: shake 0.5s ease;
}

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

/* Error Message */
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
  border-left: 3px solid hsl(0, 84%, 60%);
  border-radius: 0.5rem;
  animation: fadeInDown 0.3s ease;
}

html.dark .error-message {
  background: hsla(0, 84%, 30%, 0.2);
  color: hsl(0, 84%, 70%);
}

/* Login Button */
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

.login-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.login-button:hover::before {
  transform: translateX(100%);
}

.login-button:not(:disabled):hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow:
    0 20px 25px -5px rgba(99, 102, 241, 0.5),
    0 8px 10px -6px rgba(99, 102, 241, 0.4);
}

.login-button:not(:disabled):active {
  transform: translateY(0) scale(0.98);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Footer */
.login-footer {
  margin-top: 1.5rem;
  text-align: center;
}

.security-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: hsl(142, 71%, 35%);
  background: hsla(142, 71%, 95%, 0.8);
  border-radius: 9999px;
  border: 1px solid hsl(142, 71%, 85%);
}

html.dark .security-badge {
  color: hsl(142, 71%, 70%);
  background: hsla(142, 71%, 20%, 0.3);
  border-color: hsl(142, 71%, 30%);
}

/* Responsive */
@media (max-width: 640px) {
  .login-card {
    padding: 2rem 1.5rem;
  }

  .login-title {
    font-size: 1.75rem;
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

/* Form Input */
.form-input {
  width: 100%;
  padding: 0.875rem 3rem 0.875rem 1rem;
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

.form-input:focus {
  border-color: hsl(243, 75%, 59%);
  background: white;
  box-shadow: 0 0 0 4px hsla(243, 75%, 59%, 0.1);
}

html.dark .form-input:focus {
  border-color: hsl(243, 75%, 59%);
  background: hsl(243, 15%, 18%);
}

.form-input::placeholder {
  color: hsl(243, 20%, 60%);
}

html.dark .form-input::placeholder {
  color: hsl(243, 20%, 50%);
}

/* Gradient Text */
.gradient-text-animated {
  background: linear-gradient(90deg,
      hsl(243, 75%, 59%) 0%,
      hsl(280, 72%, 54%) 50%,
      hsl(189, 94%, 43%) 100%);
  background-size: 200% auto;
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  animation: gradientShift 3s ease infinite;
}

@keyframes gradientShift {

  0%,
  100% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }
}

/* Animations */
@keyframes scaleIn {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fadeInDown {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}

.animate-fade-in-down {
  animation: fadeInDown 0.6s ease-out;
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out 0.2s backwards;
}

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Transition Effects */
.shake-enter-active {
  animation: shake 0.5s ease;
}

.shake-leave-active {
  animation: fadeOut 0.3s ease;
}

@keyframes fadeOut {
  to {
    opacity: 0;
  }
}
</style>
