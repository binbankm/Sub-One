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
import { computed, ref } from 'vue';
import { useSessionStore } from '@/stores/useSessionStore';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

/**
 * 组件属性定义 (保留接口兼容性，但优先使用 Store)
 */
const props = defineProps<{
    /** 登录函数 - 可选，不传则使用 Store 中的函数 */
    login?: (username: string, password: string) => Promise<any>;
    /** 是否为初始化设置模式 - 可选，不传则使用 Store 中的状态 */
    isSetup?: boolean;
}>();

const sessionStore = useSessionStore();
const router = useRouter();

// 优先使用 Store 中的状态
const actualIsSetup = computed(() => {
    // 只有当 props.isSetup 显式为 true 时才使用，否则使用 store 状态
    const result = props.isSetup === true || sessionStore.sessionState === 'needsSetup';
    console.log('[LoginView] actualIsSetup:', result, 'sessionState:', sessionStore.sessionState, 'props.isSetup:', props.isSetup);
    return result;
});
const actualLoginFunc = computed(() =>
    props.login ?? (actualIsSetup.value ? sessionStore.initializeSystem : sessionStore.login)
);

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

const { t } = useI18n();

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
        error.value = t('views.login.errors.emptyUsername');
        return;
    }

    // 验证密码不为空
    if (!password.value.trim()) {
        error.value = t('views.login.errors.emptyPassword');
        return;
    }

    // 如果是设置模式，验证确认密码
    if (actualIsSetup.value) {
        if (!confirmPassword.value.trim()) {
            error.value = t('views.login.errors.emptyConfirmPassword');
            return;
        }
        if (password.value !== confirmPassword.value) {
            error.value = t('views.login.errors.passwordMismatch');
            return;
        }
        if (password.value.length < 6) {
            error.value = t('views.login.errors.passwordTooShort');
            return;
        }
    }

    // 清空之前的错误信息
    error.value = '';
    // 设置加载状态
    isLoading.value = true;

    try {
        // 调用登录函数
        await actualLoginFunc.value(username.value, password.value);
        // 成功后由路由跳转
        router.push({ name: 'dashboard' });
    } catch (err: unknown) {
        // 捕获并显示错误信息
        const msg = err instanceof Error ? err.message : String(err);
        error.value = msg || t('views.login.errors.loginFailed');
    } finally {
        // 无论成功失败都重置加载状态
        isLoading.value = false;
    }
};
</script>

<template>
    <!-- 登录页面容器 -->
    <div class="relative flex min-h-screen items-center justify-center overflow-hidden p-3 sm:p-6">
        <!-- ==================== 登录卡片 ==================== -->
        <div
            class="animate-scale-in relative isolate mx-auto w-full max-w-full rounded-button border border-white/30 bg-white p-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-xl transition-all duration-300 sm:max-w-105 sm:rounded-card sm:p-10 dark:border-white/10 dark:bg-black/80 dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)]"
        >
            <!-- Logo 区域 -->
            <div class="animate-fade-in-down mb-4 text-center sm:mb-6">
                <!-- Logo 图标容器 -->
                <div class="mb-3 flex justify-center sm:mb-5">
                    <div
                        class="from-primary-500 to-secondary-500 shadow-glow-primary flex h-14 w-14 animate-bounce items-center justify-center rounded-button bg-linear-to-br sm:h-16 sm:w-16"
                    >
                        <!-- 闪电图标 SVG -->
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-7 w-7 text-white drop-shadow-elevated-sm sm:h-8 sm:w-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </div>
                </div>

                <!-- 标题 - 渐变动画文字 -->
                <h1
                    class="mb-1 text-2xl font-extrabold tracking-tight text-gray-900 sm:mb-2 sm:text-3xl dark:text-gray-50"
                >
                    <span class="gradient-text-animated">Sub-One</span> Manager
                </h1>

                <!-- 副标题 -->
                <p
                    class="text-xs font-medium tracking-wide text-gray-600 sm:text-sm dark:text-gray-400"
                >
                    {{ actualIsSetup ? t('views.login.setupSubtitle') : t('views.login.subtitle') }}
                </p>
            </div>

            <!-- ==================== 登录表单 ==================== -->
            <form class="animate-fade-in-up mt-4 sm:mt-6" @submit.prevent="handleSubmit">
                <!-- 用户名输入 -->
                <div class="mb-3 sm:mb-4">
                    <label
                        for="username"
                        class="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-800 sm:mb-2.5 sm:text-base dark:text-gray-100"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4 text-gray-500 sm:h-5 sm:w-5 dark:text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                        </svg>
                        <span>{{ t('views.login.username') }}</span>
                    </label>

                    <div class="group relative">
                        <input
                            id="username"
                            v-model="username"
                            type="text"
                            class="form-input-login bg-gray-50/50 py-2.5 text-sm transition-colors focus:bg-white sm:py-3 sm:text-base dark:bg-white/5 dark:focus:bg-white/10"
                            :class="{ 'input-error': error && !username }"
                            :placeholder="t('views.login.placeholders.username')"
                            autocomplete="username"
                            :disabled="isLoading"
                            @keydown.enter="handleSubmit"
                        />

                        <div
                            class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 transition-all duration-300 sm:right-4"
                        >
                            <svg
                                v-if="!username"
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-500 sm:h-5 sm:w-5 dark:group-hover:text-gray-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>

                            <svg
                                v-else
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4 text-primary-500 sm:h-5 sm:w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- 密码输入 -->
                <div class="mb-3 sm:mb-4">
                    <label
                        for="password"
                        class="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-800 sm:mb-2.5 sm:text-base dark:text-gray-100"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4 text-gray-500 sm:h-5 sm:w-5 dark:text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                        <span>{{ t('views.login.password') }}</span>
                    </label>

                    <div class="group relative">
                        <input
                            id="password"
                            v-model="password"
                            type="password"
                            class="form-input-login bg-gray-50/50 py-2.5 text-sm transition-colors focus:bg-white sm:py-3 sm:text-base dark:bg-white/5 dark:focus:bg-white/10"
                            :class="{ 'input-error': error }"
                            :placeholder="t('views.login.placeholders.password')"
                            autocomplete="current-password"
                            :disabled="isLoading"
                            @keydown.enter="handleSubmit"
                        />

                        <!-- 输入框右侧图标 - 根据状态显示不同图标 -->
                        <div
                            class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 transition-all duration-300 sm:right-4"
                        >
                            <!-- 空密码时显示钥匙图标 -->
                            <svg
                                v-if="!password"
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-500 sm:h-5 sm:w-5 dark:group-hover:text-gray-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                                />
                            </svg>

                            <!-- 有密码时显示勾选图标 -->
                            <svg
                                v-else
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4 text-primary-500 sm:h-5 sm:w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                    </div>

                    <!-- 错误消息 - 带抖动动画 -->
                    <transition name="shake">
                        <p
                            v-if="error"
                            class="animate-fade-in-down mt-1.5 flex items-center gap-1.5 rounded-element border-l-4 border-danger-600 bg-danger-50 px-2.5 py-1.5 text-xs font-medium text-danger-600 sm:mt-2.5 sm:px-3 sm:py-2 sm:text-sm dark:bg-danger-900/20 dark:text-danger-400"
                        >
                            <!-- 警告图标 -->
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            {{ error }}
                        </p>
                    </transition>
                </div>

                <!-- 确认密码输入（仅设置模式） -->
                <div v-if="actualIsSetup" class="mb-3 sm:mb-4">
                    <label
                        for="confirmPassword"
                        class="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-800 sm:mb-2.5 sm:text-base dark:text-gray-100"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4 text-gray-500 sm:h-5 sm:w-5 dark:text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12l2 2 4-4m5.818-4.818A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                        </svg>
                        <span>{{ t('views.login.confirmPassword') }}</span>
                    </label>

                    <div class="group relative">
                        <input
                            id="confirmPassword"
                            v-model="confirmPassword"
                            type="password"
                            class="form-input-login bg-gray-50/50 py-2.5 text-sm transition-colors focus:bg-white sm:py-3 sm:text-base dark:bg-white/5 dark:focus:bg-white/10"
                            :class="{ 'input-error': error }"
                            :placeholder="t('views.login.placeholders.confirmPassword')"
                            autocomplete="new-password"
                            :disabled="isLoading"
                            @keydown.enter="handleSubmit"
                        />

                        <div
                            class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 transition-all duration-300 sm:right-4"
                        >
                            <svg
                                v-if="!confirmPassword"
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-500 sm:h-5 sm:w-5 dark:group-hover:text-gray-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>

                            <svg
                                v-else-if="password === confirmPassword && confirmPassword"
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4 text-success-500 sm:h-5 sm:w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>

                            <svg
                                v-else
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4 text-danger-500 sm:h-5 sm:w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- ==================== 提交按钮 ==================== -->
                <button
                    type="submit"
                    class="login-button hover:shadow-glow-primary py-3 text-sm hover:scale-[1.01] sm:py-3.5 sm:text-base"
                    :disabled="isLoading"
                >
                    <!-- 正常状态 - 显示登录图标和文字 -->
                    <span v-if="!isLoading" class="flex items-center justify-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4 sm:h-5 sm:w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                :d="
                                    actualIsSetup
                                        ? 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
                                        : 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1'
                                "
                            />
                        </svg>
                        {{ actualIsSetup ? t('views.login.createAdmin') : t('views.login.loginBtn') }}
                    </span>

                    <!-- 加载状态 - 显示加载动画 -->
                    <span v-else class="flex items-center justify-center gap-2">
                        <div class="spinner h-4 w-4 border-2 sm:h-5 sm:w-5"></div>
                        {{ actualIsSetup ? t('views.login.creating') : t('views.login.loggingIn') }}
                    </span>
                </button>

                <!-- ==================== 页脚信息 ==================== -->
                <div class="mt-4 text-center sm:mt-6">
                    <!-- 安全徽章 -->
                    <div
                        class="inline-flex cursor-default items-center gap-1.5 rounded-full border border-success-300 bg-success-50/80 px-3 py-1.5 text-[0.6875rem] font-semibold text-success-700 transition-colors hover:bg-success-100 sm:px-4 sm:py-2 sm:text-xs dark:border-success-700 dark:bg-success-900/30 dark:text-success-400 dark:hover:bg-success-900/40"
                    >
                        <!-- 盾牌图标 -->
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-3.5 w-3.5 sm:h-4 sm:w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                        </svg>
                        <span>{{ t('views.login.secureTransport') }}</span>
                    </div>
                </div>
            </form>
        </div>
    </div>
</template>
