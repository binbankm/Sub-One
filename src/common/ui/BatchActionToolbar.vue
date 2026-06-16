<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = withDefaults(
    defineProps<{
        visible: boolean;
        selectedCount: number;
        accent?: 'primary' | 'secondary' | 'emerald';
        deleteLabel?: string;
    }>(),
    {
        accent: 'primary'
    }
);

const emit = defineEmits<{
    (e: 'select-all'): void;
    (e: 'invert-selection'): void;
    (e: 'deselect-all'): void;
    (e: 'delete-selected'): void;
    (e: 'cancel'): void;
}>();

const styleMap = {
    primary: {
        wrapper:
            'border-primary-200 from-primary-50 to-secondary-50 dark:border-primary-800 dark:from-primary-900/20 dark:to-secondary-900/20',
        text: 'text-primary-700 dark:text-primary-300',
        badge: 'bg-primary-600'
    },
    secondary: {
        wrapper:
            'border-secondary-200 from-secondary-50 to-pink-50 dark:border-secondary-800 dark:from-secondary-900/20 dark:to-pink-900/20',
        text: 'text-secondary-700 dark:text-secondary-300',
        badge: 'bg-secondary-600'
    },
    emerald: {
        wrapper:
            'border-success-200 from-success-50 to-success-50 dark:border-success-800 dark:from-success-900/20 dark:to-success-900/20',
        text: 'text-success-700 dark:text-success-300',
        badge: 'bg-success-600'
    }
} as const;

const accentStyles = computed(() => styleMap[props.accent]);
</script>

<template>
    <Transition name="slide-fade">
        <div
            v-if="visible"
            class="mb-6 rounded-button border-2 bg-linear-to-r p-4 shadow-elevated"
            :class="accentStyles.wrapper"
        >
            <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div
                    class="flex items-center gap-2 text-sm font-semibold"
                    :class="accentStyles.text"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path
                            fill-rule="evenodd"
                            d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                            clip-rule="evenodd"
                        />
                    </svg>
                    {{ t('common.ui.batch.batchMode') }}
                    <span
                        v-if="selectedCount > 0"
                        class="ml-2 rounded-full px-3 py-1 text-xs font-bold text-white shadow-elevated-sm"
                        :class="accentStyles.badge"
                    >
                        {{ t('common.ui.batch.selectedCount', { count: selectedCount }) }}
                    </span>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <button
                        class="btn-modern-enhanced btn-secondary transform px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:px-4 sm:py-2 sm:text-sm"
                        @click="emit('select-all')"
                    >
                        {{ t('common.ui.batch.selectAll') }}
                    </button>
                    <button
                        class="btn-modern-enhanced btn-secondary transform px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:px-4 sm:py-2 sm:text-sm"
                        @click="emit('invert-selection')"
                    >
                        {{ t('common.ui.batch.invertSelection') }}
                    </button>
                    <button
                        class="btn-modern-enhanced btn-secondary transform px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:px-4 sm:py-2 sm:text-sm"
                        @click="emit('deselect-all')"
                    >
                        {{ t('common.ui.batch.clearSelection') }}
                    </button>
                    <button
                        :disabled="selectedCount === 0"
                        class="btn-modern-enhanced btn-danger flex transform items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
                        @click="emit('delete-selected')"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        {{ deleteLabel || t('common.ui.batch.deleteSelected') }} ({{ selectedCount }})
                    </button>
                    <button
                        class="btn-modern-enhanced btn-cancel transform px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:px-4 sm:py-2 sm:text-sm"
                        @click="emit('cancel')"
                    >
                        {{ t('common.ui.batch.cancel') }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>
