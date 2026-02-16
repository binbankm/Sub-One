<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue';
import { Primitive, type PrimitiveProps } from 'radix-vue';
import { type ButtonVariants, buttonVariants } from '.';
import { cn } from '@/lib/utils';

interface Props extends PrimitiveProps {
    variant?: ButtonVariants['variant'];
    size?: ButtonVariants['size'];
    class?: HTMLAttributes['class'];
}

const props = withDefaults(defineProps<Props>(), {
    as: 'button',
    variant: 'default',
    size: 'default'
});

const delegatedProps = computed(() => {
    const { class: _, variant, size, ...delegated } = props;
    return delegated;
});
</script>

<template>
    <Primitive
        :as="props.as"
        :as-child="asChild"
        :class="cn(buttonVariants({ variant, size }), props.class)"
        v-bind="delegatedProps"
    >
        <slot />
    </Primitive>
</template>
