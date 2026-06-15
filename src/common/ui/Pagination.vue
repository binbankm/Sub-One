<script setup lang="ts">
defineProps<{
    currentPage: number;
    totalPages: number;
}>();

defineEmits<{
    (e: 'change-page', page: number): void;
}>();
</script>

<template>
    <div
        v-if="totalPages > 1"
        class="mt-10 flex items-center justify-center gap-2 text-base font-medium sm:gap-4"
    >
        <button
            :disabled="currentPage === 1"
            class="hover-lift flex min-w-17.5 items-center justify-center rounded-element border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-50 sm:min-w-25 sm:rounded-button sm:px-6 sm:py-3 sm:text-base dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            @click="$emit('change-page', currentPage - 1)"
        >
            &laquo;<span class="xs:inline ml-1 hidden">上一页</span>
        </button>

        <span
            class="min-w-20 text-center text-xs font-medium whitespace-nowrap text-gray-700 sm:min-w-25 sm:text-sm dark:text-gray-300"
        >
            第{{ currentPage }}/{{ totalPages }}页
        </span>

        <button
            :disabled="currentPage === totalPages"
            class="hover-lift flex min-w-17.5 items-center justify-center rounded-element border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-50 sm:min-w-25 sm:rounded-button sm:px-6 sm:py-3 sm:text-base dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            @click="$emit('change-page', currentPage + 1)"
        >
            <span class="xs:inline mr-1 hidden">下一页</span>&raquo;
        </button>
    </div>
</template>
