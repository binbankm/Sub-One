<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();

const delegatedProps = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { class: _, ...delegated } = props;
    return delegated;
});
</script>

<template>
    <div
        v-bind="delegatedProps"
        :class="cn('rounded-xl border bg-card text-card-foreground shadow', props.class)"
    >
        <slot />
    </div>
</template>
