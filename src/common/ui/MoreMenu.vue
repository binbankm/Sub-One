<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

interface MenuItem {
    key: string;
    label: string;
    danger?: boolean;
    dividerBefore?: boolean;
}

const props = withDefaults(
    defineProps<{
        items: MenuItem[];
        widthClass?: string;
    }>(),
    {
        widthClass: 'w-40'
    }
);

const emit = defineEmits<{
    (e: 'select', key: string): void;
}>();

const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const toggleMenu = () => {
    isOpen.value = !isOpen.value;
};

const closeMenu = () => {
    isOpen.value = false;
};

const selectItem = (key: string) => {
    emit('select', key);
    closeMenu();
};

const handleClickOutside = (event: Event) => {
    const target = event.target as globalThis.Node;
    if (isOpen.value && rootRef.value && !rootRef.value.contains(target)) {
        closeMenu();
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
    <div ref="rootRef" class="relative">
        <button
            class="hover-lift rounded-button p-2 transition-colors hover:bg-gray-200 sm:p-4 dark:hover:bg-white/10"
            @click="toggleMenu"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-gray-600 sm:h-6 sm:w-6 dark:text-gray-300"
                viewBox="0 0 20 20"
                fill="currentColor"
            >
                <path
                    d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"
                />
            </svg>
        </button>

        <Transition name="slide-fade-sm">
            <div
                v-if="isOpen"
                class="absolute right-0 z-50 mt-2 p-1 overflow-hidden rounded-button border border-gray-200/80 bg-white/80 backdrop-blur-xl shadow-modal ring-1 ring-black/5 dark:border-white/10 dark:bg-gray-900/80 dark:ring-white/10"
                :class="widthClass"
            >
                <template v-for="item in props.items" :key="item.key">
                    <div
                        v-if="item.dividerBefore"
                        class="mx-1 my-1 border-t border-gray-200/80 dark:border-white/10"
                    ></div>
                    <button
                        class="w-full rounded-element px-4 py-2.5 text-left text-[0.9375rem] font-medium transition-all duration-200"
                        :class="
                            item.danger
                                ? 'text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:text-danger-400 dark:hover:bg-danger-500/15 dark:hover:text-danger-300'
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white'
                        "
                        @click="selectItem(item.key)"
                    >
                        {{ item.label }}
                    </button>
                </template>
            </div>
        </Transition>
    </div>
</template>
