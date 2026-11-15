<script setup lang="ts">
defineProps<{
    title: string;
    description: string;
    iconColorClass?: string;
    bgGradientClass?: string;
}>();

defineSlots<{
    icon?: (props: Record<string, never>) => any;
    action?: (props: Record<string, never>) => any;
}>();
</script>

<template>
    <div
        class="rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-500 dark:border-white/10"
    >
        <div
            class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            :class="bgGradientClass || 'bg-gray-100 dark:bg-white/5'"
        >
            <slot name="icon">
                <!-- Default Icon if none provided -->
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-8 w-8"
                    :class="iconColorClass || 'text-gray-400'"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                </svg>
            </slot>
        </div>
        <h3 class="mb-2 text-lg font-bold text-gray-900 lg:text-xl dark:text-white">{{ title }}</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
        <div class="mt-6">
            <slot name="action"></slot>
        </div>
    </div>
</template>
