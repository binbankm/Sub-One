<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
    currentPage: number;
    totalPages: number;
}>();

defineEmits<{
    (e: 'change-page', page: number): void;
}>();

const { t } = useI18n();

</script>

<template>
    <div
        v-if="totalPages > 1"
        class="mt-8 flex items-center justify-center gap-2 text-sm sm:gap-3"
    >
        <button
            type="button"
            :disabled="currentPage === 1"
            class="btn-modern-enhanced btn-secondary px-3 py-1.5 text-xs sm:text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            :aria-label="t('common.ui.pagination.prev')"
            @click="$emit('change-page', currentPage - 1)"
        >
            &laquo;<span class="ml-1 hidden xs:inline">{{ t('common.ui.pagination.prev') }}</span>
        </button>

        <span
            class="min-w-20 text-center text-xs font-medium whitespace-nowrap text-gray-600 sm:text-sm dark:text-gray-400"
        >
            {{ t('common.ui.pagination.page', { current: currentPage, total: totalPages }) }}
        </span>

        <button
            type="button"
            :disabled="currentPage === totalPages"
            class="btn-modern-enhanced btn-secondary px-3 py-1.5 text-xs sm:text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            :aria-label="t('common.ui.pagination.next')"
            @click="$emit('change-page', currentPage + 1)"
        >
            <span class="mr-1 hidden xs:inline">{{ t('common.ui.pagination.next') }}</span>&raquo;
        </button>
    </div>
</template>
