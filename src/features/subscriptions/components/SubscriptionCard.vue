<!--
  订阅卡片组件 - 显示订阅源信息
  功能：启用/禁用、编辑、删除、更新、流量显示、延迟测试、批量选择
-->

<script setup lang="ts">
import { computed, ref } from 'vue';

import { useToastStore } from '../../../stores/toast';
import type { Subscription } from '../../../types/index';
import { testLatency } from '../../../utils/api';
import { formatBytes, formatExpiry, getTrafficColorClass } from '../../../utils/format';
import { copyToClipboard } from '../../../utils/utils';

const props = defineProps<{
    sub: Subscription;
    isBatchMode?: boolean;
    isSelected?: boolean;
}>();

const emit = defineEmits<{
    (e: 'delete'): void;
    (e: 'change'): void;
    (e: 'update'): void;
    (e: 'edit'): void;
    (e: 'showNodes'): void;
    (e: 'toggleSelect'): void;
}>();

const toastStore = useToastStore();

/** 复制URL */
const copyUrl = async () => {
    if (!props.sub.url) return;
    const success = await copyToClipboard(props.sub.url);
    if (success) {
        toastStore.showToast('📋 链接已复制到剪贴板', 'success');
    } else {
        toastStore.showToast('❌ 复制失败', 'error');
    }
};

const showUrl = ref(false);
const toggleUrlVisibility = () => {
    showUrl.value = !showUrl.value;
};

/** 鼠标事件处理（支持拖拽排序） */
const mouseDownTime = ref(0);
const mouseDownPosition = ref({ x: 0, y: 0 });
const hasDragged = ref(false);

const handleMouseDown = (event: MouseEvent) => {
    mouseDownTime.value = Date.now();
    mouseDownPosition.value = { x: event.clientX, y: event.clientY };
    hasDragged.value = false;

    const handleMouseMove = (e: MouseEvent) => {
        const deltaX = Math.abs(e.clientX - mouseDownPosition.value.x);
        const deltaY = Math.abs(e.clientY - mouseDownPosition.value.y);
        if (deltaX > 5 || deltaY > 5) hasDragged.value = true;
    };

    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
};

/** 流量信息 */
const trafficInfo = computed(() => {
    const info = props.sub.userInfo;
    if (
        !info ||
        info.total === undefined ||
        info.download === undefined ||
        info.upload === undefined
    )
        return null;
    const total = info.total;
    const used = info.download + info.upload;
    const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    return {
        used: formatBytes(used),
        total: formatBytes(total),
        percentage: percentage
    };
});

/** 过期信息 */
const expiryInfo = computed(() => formatExpiry(props.sub.userInfo?.expire));

/** 流量颜色 */
const trafficColorClass = computed(() => {
    if (!trafficInfo.value) return '';
    return getTrafficColorClass(trafficInfo.value.percentage);
});

/** 延迟测试 */
const isTestingLatency = ref(false);
const latencyResult = ref<{ available: boolean } | null>(null);

const handleTestLatency = async () => {
    if (isTestingLatency.value || !props.sub.url) return;
    isTestingLatency.value = true;
    latencyResult.value = null;

    const result = await testLatency(props.sub.url);

    if (result.success) {
        latencyResult.value = { available: true };
    } else {
        latencyResult.value = { available: false };
    }

    isTestingLatency.value = false;

    setTimeout(() => {
        latencyResult.value = null;
    }, 5000);
};
</script>

<template>
    <div
        class="card-glass group relative flex h-full min-h-70 flex-col overflow-hidden rounded-2xl hover:scale-[1.02] sm:min-h-60"
        :class="{
            'opacity-50': !sub.enabled,
            'ring-2 ring-indigo-500/50': sub.isNew,
            'ring-2 ring-indigo-600 dark:ring-indigo-400': isBatchMode && isSelected,
            'cursor-pointer': isBatchMode
        }"
        @mousedown="handleMouseDown"
        @click="isBatchMode ? emit('toggleSelect') : null"
    >
        <div class="relative z-10 flex flex-1 flex-col p-5">
            <!-- 头部 -->
            <div class="mb-4 flex items-start justify-between gap-3 sm:mb-6">
                <div v-if="isBatchMode" class="shrink-0 pt-1" @click.stop>
                    <label class="relative inline-flex cursor-pointer items-center">
                        <input
                            type="checkbox"
                            :checked="isSelected"
                            class="h-5 w-5 cursor-pointer rounded border-gray-300 bg-gray-100 text-indigo-600 dark:border-gray-600 dark:bg-gray-700"
                            @change="emit('toggleSelect')"
                        />
                    </label>
                </div>

                <div class="w-full truncate">
                    <div class="flex items-center gap-3">
                        <div
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg transition-all duration-300 group-hover:shadow-xl"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-5 w-5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                            </svg>
                        </div>
                        <div class="min-w-0 flex-1">
                            <p
                                class="truncate text-lg font-bold text-gray-800 transition-colors duration-300 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400"
                                :title="sub.name || '未命名订阅'"
                            >
                                {{ sub.name || '未命名订阅' }}
                            </p>
                            <div
                                v-if="sub.exclude && sub.exclude.trim()"
                                class="mt-1.5 flex w-fit animate-pulse-slow items-center gap-1.5 rounded-lg border border-orange-300/50 bg-linear-to-r from-orange-500/15 to-amber-500/15 px-2.5 py-1 dark:border-orange-500/30 dark:from-orange-500/20 dark:to-amber-500/20"
                                :title="`已启用规则过滤: ${sub.exclude}`"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-orange-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                                    />
                                </svg>
                                <span
                                    class="text-[10px] font-bold tracking-wide text-orange-700 dark:text-orange-300"
                                    >规则过滤</span
                                >
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    class="flex shrink-0 items-center gap-1 opacity-100 transition-all duration-300 lg:opacity-0 lg:group-hover:opacity-100"
                >
                    <button
                        class="hover-lift rounded-xl p-2.5 text-gray-500 transition-all duration-200 hover:bg-indigo-500/10 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
                        title="编辑"
                        @click.stop="emit('edit')"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"
                            />
                        </svg>
                    </button>
                    <button
                        class="hover-lift rounded-xl p-2.5 text-gray-500 transition-all duration-200 hover:bg-red-500/10 hover:text-red-500 dark:text-gray-300"
                        title="删除"
                        @click.stop="emit('delete')"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- URL区域 -->
            <div class="flex grow flex-col justify-start space-y-3 sm:space-y-4">
                <div class="relative">
                    <label class="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300"
                        >订阅链接</label
                    >
                    <input
                        type="text"
                        :value="showUrl ? sub.url : '••••••••••••••••••••••••••••••••••••••••'"
                        readonly
                        class="w-full rounded-xl border border-gray-300 bg-gray-50/60 px-3 py-2 font-mono text-sm text-gray-500 transition-all duration-300 dark:border-gray-700 dark:bg-gray-900/75 dark:text-gray-400 sm:px-4 sm:py-3"
                        :class="{ 'select-none': !showUrl }"
                    />
                    <div class="mt-2 flex items-center gap-2 sm:mt-3">
                        <button
                            class="hover-lift flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:bg-orange-500/20 hover:text-orange-600 dark:text-gray-300 dark:hover:text-orange-400 sm:gap-2 sm:px-4 sm:py-2"
                            :title="showUrl ? '隐藏链接' : '显示链接'"
                            @click.stop="toggleUrlVisibility"
                        >
                            <svg
                                v-if="showUrl"
                                class="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                                />
                            </svg>
                            <svg
                                v-else
                                class="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                            </svg>
                            {{ showUrl ? '隐藏' : '显示' }}
                        </button>
                        <button
                            v-if="showUrl"
                            class="hover-lift flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:bg-yellow-500/20 hover:text-yellow-600 dark:text-gray-300 dark:hover:text-yellow-400 sm:gap-2 sm:px-4 sm:py-2"
                            title="复制链接"
                            @click.stop="copyUrl"
                        >
                            <svg
                                class="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                            </svg>
                            复制
                        </button>
                    </div>
                </div>

                <!-- 流量信息 -->
                <div
                    v-if="trafficInfo"
                    class="mt-2 rounded-xl border border-gray-300 bg-gray-50/80 p-3 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-800/50"
                >
                    <div class="mb-2 flex items-end justify-between">
                        <span
                            class="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-3 w-3"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                            流量使用
                        </span>
                        <div class="text-right">
                            <span class="text-sm font-bold text-gray-800 dark:text-gray-200">{{
                                trafficInfo.used
                            }}</span>
                            <span class="mx-1 text-xs text-gray-400">/</span>
                            <span class="text-xs text-gray-500">{{ trafficInfo.total }}</span>
                        </div>
                    </div>
                    <div
                        class="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                    >
                        <div
                            class="absolute left-0 top-0 h-full rounded-full shadow-sm transition-all duration-700 ease-out"
                            :class="trafficColorClass"
                            :style="{ width: trafficInfo.percentage + '%' }"
                        >
                            <div
                                class="absolute inset-0 animate-shimmer bg-white/20"
                            ></div>
                        </div>
                    </div>
                    <div class="mt-2 flex items-center justify-between">
                        <span class="text-[10px] font-medium text-gray-400"
                            >已用 {{ trafficInfo.percentage.toFixed(1) }}%</span
                        >
                        <span
                            v-if="expiryInfo"
                            class="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] shadow-sm dark:border-gray-600 dark:bg-gray-700"
                            :class="expiryInfo.style"
                            >{{ expiryInfo.daysRemaining }}</span
                        >
                    </div>
                </div>
            </div>

            <!-- 底部控制 -->
            <div
                class="mt-4 flex items-center justify-between border-t border-gray-300 pt-3 dark:border-gray-700/50"
                @click.stop
            >
                <div class="flex items-center gap-3">
                    <label class="group/toggle relative inline-flex cursor-pointer items-center">
                        <input
                            type="checkbox"
                            :checked="sub.enabled"
                            class="peer sr-only"
                            @change="emit('change')"
                        />
                        <div
                            class="peer h-6 w-10 rounded-full bg-gray-200 transition-all duration-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] group-hover/toggle:shadow-md peer-checked:bg-indigo-500 peer-checked:after:translate-x-4 peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                        ></div>
                    </label>
                    <span class="text-xs font-medium text-gray-600 dark:text-gray-300">{{
                        sub.enabled ? '已启用' : '已禁用'
                    }}</span>
                </div>

                <div class="flex items-center gap-2">
                    <button
                        :disabled="isTestingLatency"
                        class="rounded-lg p-2 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                        :class="{
                            'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30':
                                !latencyResult,
                            'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30':
                                latencyResult && latencyResult.available,
                            'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30':
                                latencyResult && !latencyResult.available
                        }"
                        :title="
                            isTestingLatency
                                ? '测试中...'
                                : latencyResult
                                  ? latencyResult.available
                                      ? '可用'
                                      : '不可用'
                                  : '测试连接'
                        "
                        @click.stop="handleTestLatency"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            :class="{ 'animate-pulse': isTestingLatency }"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2.5"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </button>

                    <button
                        class="group/btn flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
                        @click.stop="emit('showNodes')"
                    >
                        <span
                            class="h-1.5 w-1.5 rounded-full"
                            :class="(sub.nodeCount || 0) > 0 ? 'bg-green-500' : 'bg-gray-300'"
                        ></span>
                        {{ sub.nodeCount }} 节点
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="-ml-1 h-3 w-3 opacity-0 transition-all duration-200 group-hover/btn:opacity-100"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </button>

                    <button
                        :disabled="sub.isUpdating"
                        class="rounded-lg p-1.5 text-gray-600 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
                        :title="sub.isUpdating ? '更新中...' : '更新订阅'"
                        @click.stop="emit('update')"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            :class="{ 'animate-spin text-indigo-500': sub.isUpdating }"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                                clip-rule="evenodd"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
