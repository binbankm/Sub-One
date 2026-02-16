<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import { type BadgeVariants, badgeVariants } from '.';
import { cn } from '@/lib/utils';

const props = withDefaults(
    defineProps<{
        variant?: BadgeVariants['variant'];
        class?: HTMLAttributes['class'];
    }>(),
    {
        variant: 'default'
    }
);
</script>

<template>
    <div :class="cn(badgeVariants({ variant }), props.class)">
        <slot />
    </div>
</template>
