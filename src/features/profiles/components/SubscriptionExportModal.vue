<script setup lang="ts">
import { useToastStore } from '../../../stores/toast';
import type { AppConfig, Profile } from '../../../types/index';
import { copyToClipboard } from '../../../utils/utils';

const props = defineProps<{
    show: boolean;
    profile: Profile;
    config: AppConfig;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
}>();

const { showToast } = useToastStore();

const close = () => {
    emit('update:show', false);
};

// 格式定义列表
const exportOptions = [
    {
        name: '通用订阅',
        format: 'base64',
        icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
    },
    { name: 'Clash', format: 'clash', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { name: 'Mihomo', format: 'mihomo', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    {
        name: 'Stash',
        format: 'stash',
        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    },
    {
        name: 'Surge',
        format: 'surge',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    },
    {
        name: 'Surfboard',
        format: 'surfboard',
        icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01'
    },
    {
        name: 'Loon',
        format: 'loon',
        icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'
    },
    { name: 'Shadowrocket', format: 'shadowrocket', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
    {
        name: 'Quantumult X',
        format: 'quanx',
        icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z'
    },
    {
        name: 'Sing-Box',
        format: 'singbox',
        icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'
    },
    { name: 'V2Ray', format: 'v2ray', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
    {
        name: 'URI',
        format: 'uri',
        icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
    }
];

/** 生成链接逻辑 */
const generateUrl = (format: string) => {
    const baseUrl = window.location.origin;
    const token =
        props.config.profileToken &&
        props.config.profileToken !== 'auto' &&
        props.config.profileToken.trim()
            ? props.config.profileToken
            : '';

    if (!token) return '';

    const id = props.profile.customId || props.profile.id;
    const url = `${baseUrl}/${token}/${id}`;

    if (format === 'base64') return url;
    return `${url}?target=${format}`;
};

const handleCopy = async (option: (typeof exportOptions)[0]) => {
    const url = generateUrl(option.format);
    if (!url) {
        showToast('⚠️ 该订阅组未配置分享 Token，无法导出', 'error');
        return;
    }

    const success = await copyToClipboard(url);
    if (success) {
        showToast(`📋 已复制 ${option.name} 订阅链接`, 'success');
    } else {
        showToast('❌ 复制失败', 'error');
    }
};
</script>

<template>
    <Transition name="fade">
        <div
            v-if="show"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            @click.self="emit('update:show', false)"
        >
            <!-- Backdrop -->
            <div
                class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                @click="emit('update:show', false)"
            ></div>

            <!-- Modal Card -->
            <div
                class="relative flex max-h-[85vh] w-full max-w-sm origin-center scale-100 transform flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-900/5 transition-all dark:bg-gray-800 dark:ring-white/10"
            >
                <!-- Header -->
                <div
                    class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5 dark:border-gray-700 dark:bg-gray-800"
                >
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white">导出订阅</h3>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {{ profile.name }}
                        </p>
                    </div>
                    <button
                        class="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        @click="close"
                    >
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <!-- List View -->
                <div class="scrollbar-thin overflow-y-auto p-2">
                    <div class="px-4 py-2">
                        <div
                            class="mb-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 dark:border-amber-900/30 dark:bg-amber-900/20"
                        >
                            <p class="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                                请确保已在设置中配置了
                                <strong>订阅组分享 Token</strong>，否则链接无法访问。
                            </p>
                        </div>
                    </div>

                    <div
                        v-for="option in exportOptions"
                        :key="option.name"
                        class="group mx-2 mb-1 flex cursor-default items-center justify-between rounded-xl border border-transparent px-4 py-3 transition-all duration-200 hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-700/50"
                    >
                        <!-- Left: Icon & Name -->
                        <div class="flex items-center gap-4">
                            <div
                                class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-500 ring-1 ring-gray-900/5 transition-all duration-200 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm dark:bg-gray-700 dark:text-gray-400 dark:ring-white/5 dark:group-hover:bg-gray-600 dark:group-hover:text-indigo-400"
                            >
                                <svg
                                    class="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        :d="option.icon"
                                    />
                                </svg>
                            </div>
                            <div class="flex flex-col">
                                <span
                                    class="text-sm font-bold text-gray-700 transition-colors group-hover:text-gray-900 dark:text-gray-200 dark:group-hover:text-white"
                                    >{{ option.name }}</span
                                >
                            </div>
                        </div>

                        <!-- Right: Actions -->
                        <div class="flex items-center gap-1">
                            <!-- Copy Button -->
                            <button
                                class="rounded-lg p-2.5 text-gray-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
                                title="复制链接"
                                @click="handleCopy(option)"
                            >
                                <svg
                                    class="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div
                    class="border-t border-gray-100 bg-gray-50 p-4 text-center dark:border-gray-800 dark:bg-gray-900/50"
                >
                    <button
                        class="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        @click="emit('update:show', false)"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
