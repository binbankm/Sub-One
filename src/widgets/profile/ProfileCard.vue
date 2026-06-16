<!--
  订阅组卡片组件 - 显示订阅组信息
  支持启用/禁用、编辑、删除、复制链接、查看节点等功能
-->

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Profile, Subscription } from '@/common/types/index';

const props = withDefaults(
    defineProps<{
        profile: Profile;
        allSubscriptions?: Subscription[];
        isBatchMode?: boolean;
        isSelected?: boolean;
    }>(),
    {
        allSubscriptions: () => [],
        isBatchMode: false,
        isSelected: false
    }
);

const emit = defineEmits<{
    (e: 'delete'): void;
    (e: 'change', profile: Profile): void;
    (e: 'edit'): void;
    (e: 'copy-link'): void;
    (e: 'showNodes'): void;
    (e: 'toggleSelect'): void;
}>();

/** 计算总节点数（手动节点 + 已启用订阅的节点） */
const totalNodeCount = computed(() => {
    const manualNodeCount = props.profile.manualNodes?.length ?? 0;

    const subscriptionNodeCount =
        (props.profile.subscriptions as string[])?.reduce((total, subId) => {
            const subscription = props.allSubscriptions.find(
                (sub: Subscription) => sub.id === subId
            );
            if (subscription && subscription.enabled) {
                return total + (subscription.nodeCount || 0);
            }
            return total;
        }, 0) ?? 0;

    return manualNodeCount + subscriptionNodeCount;
});

const { t } = useI18n();
</script>

<template>
    <div
        class="card-glass group relative flex min-h-35 flex-col overflow-hidden rounded-card p-4 hover:scale-[1.02]"
        :class="{
            'opacity-50': !profile.enabled,
            'ring-2 ring-secondary-600 dark:ring-secondary-400': isBatchMode && isSelected,
            'cursor-pointer': isBatchMode
        }"
        @click="isBatchMode ? emit('toggleSelect') : null"
    >
        <div class="relative z-10 flex items-start justify-between gap-3">
            <!-- 批量模式复选框 -->
            <div v-if="isBatchMode" class="shrink-0" @click.stop>
                <label class="relative inline-flex cursor-pointer items-center">
                    <input
                        type="checkbox"
                        :checked="isSelected"
                        class="h-5 w-5 cursor-pointer rounded border-gray-300 bg-gray-100 text-secondary-600 dark:border-white/10 dark:bg-white/10"
                        @change="emit('toggleSelect')"
                    />
                </label>
            </div>

            <!-- 订阅组信息 -->
            <div class="min-w-0 flex-1">
                <div class="mb-2 flex items-center gap-2">
                    <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-element bg-linear-to-br from-secondary-500 to-pink-600"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                        </svg>
                    </div>
                    <p
                        class="truncate text-lg font-bold text-gray-800 dark:text-gray-100"
                        :title="profile.name"
                    >
                        {{ profile.name }}
                    </p>
                </div>
                <p class="text-sm leading-relaxed wrap-break-word text-gray-700 dark:text-gray-300">
                    {{ t('widgets.profile.card.contains', { subCount: profile.subscriptions?.length ?? 0, nodeCount: totalNodeCount }) }}
                </p>
            </div>

            <!-- 操作按钮 -->
            <div
                class="flex shrink-0 items-center gap-1 opacity-100 transition-all duration-300 lg:opacity-0 lg:group-hover:opacity-100"
            >
                <button
                    class="rounded-element p-1.5 text-gray-500 transition-all duration-200 hover:bg-primary-500/10 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400"
                    :title="t('widgets.profile.card.edit')"
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
                    class="rounded-element p-1.5 text-gray-500 transition-all duration-200 hover:bg-danger-500/10 hover:text-danger-500 dark:text-gray-300"
                    :title="t('widgets.profile.card.delete')"
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

        <div class="grow"></div>

        <!-- 底部操作区 -->
        <div
            class="mt-4 flex items-center justify-between border-t border-gray-300 pt-3 dark:border-white/10"
        >
            <!-- 启用/禁用开关 -->
            <label class="relative inline-flex cursor-pointer items-center">
                <input
                    type="checkbox"
                    :checked="profile.enabled"
                    class="peer sr-only"
                    @change="
                        $emit('change', {
                            ...profile,
                            enabled: ($event.target as HTMLInputElement).checked
                        })
                    "
                />
                <div
                    class="peer h-6 w-11 rounded-full bg-gray-200 from-primary-500 to-secondary-600 peer-checked:bg-linear-to-r peer-focus:outline-none after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:border-white dark:border-white/10 dark:bg-white/10"
                ></div>
                <span
                    class="ml-3 text-xs font-medium whitespace-nowrap text-gray-600 dark:text-gray-300"
                    >{{ profile.enabled ? t('widgets.profile.card.enabled') : t('widgets.profile.card.disabled') }}</span
                >
            </label>

            <!-- 操作按钮组 -->
            <div class="flex shrink-0 items-center gap-2">
                <button
                    class="flex items-center gap-1.5 rounded-element border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-gray-600 transition-all duration-200 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-primary-800 dark:hover:bg-primary-900/30 dark:hover:text-primary-400"
                    :title="t('widgets.profile.card.showNodes')"
                    @click.stop="emit('showNodes')"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-3 w-3 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                    </svg>
                    <span>{{ t('widgets.profile.card.nodesBtn') }}</span>
                </button>
                <button
                    class="flex items-center gap-1.5 rounded-element border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-gray-600 transition-all duration-200 hover:border-secondary-200 hover:bg-secondary-50 hover:text-secondary-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-secondary-800 dark:hover:bg-secondary-900/30 dark:hover:text-secondary-400"
                    @click.stop="emit('copy-link')"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-3 w-3 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                    </svg>
                    <span>{{ t('widgets.profile.card.linkBtn') }}</span>
                </button>
            </div>
        </div>
    </div>
</template>
