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
            class="hover-lift flex min-w-17.5 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 sm:min-w-25 sm:rounded-2xl sm:px-6 sm:py-3 sm:text-base"
            @click="$emit('change-page', currentPage - 1)"
        >
            &laquo;<span class="xs:inline ml-1 hidden">上一页</span>
        </button>

        <span
            class="min-w-20 whitespace-nowrap text-center text-xs font-medium text-gray-700 dark:text-gray-300 sm:min-w-25 sm:text-sm"
        >
            第{{ currentPage }}/{{ totalPages }}页
        </span>

        <button
            :disabled="currentPage === totalPages"
            class="hover-lift flex min-w-17.5 items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 sm:min-w-25 sm:rounded-2xl sm:px-6 sm:py-3 sm:text-base"
            @click="$emit('change-page', currentPage + 1)"
        >
            <span class="xs:inline mr-1 hidden">下一页</span>&raquo;
        </button>
    </div>
</template>
