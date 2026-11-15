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

/** 解析订阅组包含的实际订阅对象 */
const includedSubscriptions = computed(() => {
    const subIds = props.profile.subscriptions || [];
    return subIds
        .map((subId) => props.allSubscriptions.find((s) => s.id === subId))
        .filter((s): s is Subscription => Boolean(s));
});

const { t } = useI18n();
</script>

<template>
    <div
        class="card-glass group relative flex flex-col justify-between overflow-hidden rounded-card border border-gray-200 p-5 transition-all duration-300 hover:border-gray-300 hover:shadow-card dark:border-white/10 dark:hover:border-white/20"
        :class="{
            'opacity-60': !profile.enabled,
            'ring-2 ring-secondary-500 ring-offset-2 dark:ring-offset-black/80':
                isBatchMode && isSelected,
            'cursor-pointer': isBatchMode
        }"
        @click="isBatchMode ? emit('toggleSelect') : null"
    >
        <div class="relative z-10 flex flex-col space-y-4">
            <!-- 顶部：选择框、图标、名称与操作按钮 -->
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    <!-- 批量选择框 -->
                    <div v-if="isBatchMode" class="shrink-0" @click.stop>
                        <label
                            :for="`profile-select-${profile.id}`"
                            class="relative inline-flex cursor-pointer items-center"
                        >
                            <input
                                :id="`profile-select-${profile.id}`"
                                name="profileSelect"
                                type="checkbox"
                                :checked="isSelected"
                                class="h-4 w-4 cursor-pointer rounded border-gray-300 text-secondary-600 focus:ring-secondary-500 dark:border-white/10 dark:bg-white/10"
                                :aria-label="t('widgets.profile.card.selectProfile')"
                                @change="emit('toggleSelect')"
                            />
                        </label>
                    </div>

                    <!-- 订阅组图标 -->
                    <div
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-500/10 text-secondary-600 dark:bg-secondary-500/20 dark:text-secondary-400"
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
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                        </svg>
                    </div>

                    <!-- 订阅组名称 & ID -->
                    <div class="min-w-0 flex-1">
                        <h4
                            class="truncate text-base font-bold text-gray-900 dark:text-white"
                            :title="profile.name"
                        >
                            {{ profile.name }}
                        </h4>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <span
                                v-if="profile.customId"
                                class="inline-flex items-center rounded px-1.5 py-0.2 text-[11px] font-mono font-medium bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                            >
                                #{{ profile.customId }}
                            </span>
                            <span
                                class="inline-flex items-center rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider bg-secondary-50 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300"
                            >
                                {{ profile.type || 'base64' }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- 操作按钮 -->
                <div
                    class="flex shrink-0 items-center gap-1 transition-opacity duration-200"
                    :class="isBatchMode ? 'opacity-100' : 'opacity-100 lg:opacity-70 lg:group-hover:opacity-100'"
                    @click.stop
                >
                    <button
                        type="button"
                        class="rounded-md p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/40 dark:hover:text-primary-400"
                        :title="t('widgets.profile.card.edit')"
                        :aria-label="t('widgets.profile.card.edit')"
                        @click="emit('edit')"
                    >
                        <svg
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
                        type="button"
                        class="rounded-md p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/40 dark:hover:text-rose-400"
                        :title="t('widgets.profile.card.delete')"
                        :aria-label="t('widgets.profile.card.delete')"
                        @click="emit('delete')"
                    >
                        <svg
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

            <!-- 数据概览 -->
            <div
                class="flex items-center gap-4 rounded-lg bg-gray-50/75 p-2.5 text-xs text-gray-600 dark:bg-white/3 dark:text-gray-300"
            >
                <div class="flex items-center gap-1.5">
                    <span class="text-gray-400">{{ t('widgets.profile.card.subsCount') }}</span>
                    <span class="font-semibold text-gray-900 dark:text-white">{{
                        profile.subscriptions?.length ?? 0
                    }}</span>
                </div>
                <div class="h-3 w-px bg-gray-200 dark:bg-white/10"></div>
                <div class="flex items-center gap-1.5">
                    <span class="text-gray-400">{{ t('widgets.profile.card.nodesTotal') }}</span>
                    <span
                        class="font-semibold text-primary-600 dark:text-primary-400 font-mono"
                        >{{ totalNodeCount }}</span
                    >
                </div>
            </div>

            <!-- 包含的订阅源标签预览 -->
            <div class="flex flex-col space-y-1.5">
                <div class="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    {{ t('widgets.profile.card.sourcesAndNodes') }}
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                    <span
                        v-for="sub in includedSubscriptions.slice(0, 3)"
                        :key="sub.id"
                        class="inline-flex items-center gap-1.5 rounded-md bg-secondary-50/80 px-2 py-0.5 text-xs font-medium text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300"
                    >
                        <span
                            class="h-1.5 w-1.5 rounded-full"
                            :class="sub.enabled ? 'bg-secondary-500' : 'bg-gray-400'"
                        ></span>
                        <span class="truncate max-w-27.5" :title="sub.name">{{
                            sub.name
                        }}</span>
                    </span>
                    <span
                        v-if="includedSubscriptions.length > 3"
                        class="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-white/10 dark:text-gray-400"
                    >
                        +{{ includedSubscriptions.length - 3 }}
                    </span>
                    <span
                        v-if="profile.manualNodes && profile.manualNodes.length > 0"
                        class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    >
                        <span>{{ t('widgets.profile.card.manualCount', { count: profile.manualNodes.length }) }}</span>
                    </span>
                    <span
                        v-if="
                            includedSubscriptions.length === 0 &&
                            (!profile.manualNodes || profile.manualNodes.length === 0)
                        "
                        class="text-xs text-gray-400 italic"
                    >
                        {{ t('widgets.profile.card.noSources') }}
                    </span>
                </div>
            </div>
        </div>

        <!-- 底部操作区 -->
        <div
            class="mt-4 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-white/10"
        >
            <!-- 启用/停用开关 -->
            <div class="flex items-center gap-2">
                <label
                    :for="`profile-enabled-${profile.id}`"
                    class="relative inline-flex cursor-pointer items-center"
                >
                    <input
                        :id="`profile-enabled-${profile.id}`"
                        name="profileEnabled"
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
                        class="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-secondary-600 peer-checked:after:translate-x-4 peer-checked:after:border-white dark:bg-white/10 dark:after:border-gray-600 dark:peer-checked:bg-secondary-500"
                    ></div>
                </label>
                <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {{
                        profile.enabled
                            ? t('widgets.profile.card.enabled')
                            : t('widgets.profile.card.disabled')
                    }}
                </span>
            </div>

            <!-- 操作按钮组 -->
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    class="btn-modern-enhanced btn-secondary flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                    :title="t('widgets.profile.card.showNodes')"
                    @click.stop="emit('showNodes')"
                >
                    <svg
                        class="h-3.5 w-3.5"
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
                    type="button"
                    class="btn-modern-enhanced btn-primary flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                    :title="t('widgets.profile.card.linkBtn')"
                    :aria-label="t('widgets.profile.card.linkBtn')"
                    @click.stop="emit('copy-link')"
                >
                    <svg
                        class="h-3.5 w-3.5"
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
