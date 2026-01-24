module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:vue/vue3-recommended',
        'prettier'
    ],
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    plugins: ['@typescript-eslint', 'vue'],
    rules: {
        // 强制执行 Vue 组件中的标签顺序
        'vue/component-tags-order': [
            'error',
            {
                order: ['script', 'template', 'style']
            }
        ],
        // 强制执行宏代码的顺序 (script setup 中)
        'vue/define-macros-order': [
            'error',
            {
                order: ['defineProps', 'defineEmits']
            }
        ],
        // 强制执行统一的属性顺序
        'vue/attributes-order': [
            'error',
            {
                order: [
                    'DEFINITION',
                    'LIST_RENDERING',
                    'CONDITIONALS',
                    'RENDER_MODIFIERS',
                    'GLOBAL',
                    ['UNIQUE', 'SLOT'],
                    'TWO_WAY_BINDING',
                    'OTHER_DIRECTIVES',
                    'OTHER_ATTR',
                    'EVENTS',
                    'CONTENT'
                ],
                alphabetical: false
            }
        ],
        // 强制执行组件选项的顺序 (虽然 setup 用的多，但也支持 Options API 排序)
        'vue/order-in-components': [
            'error',
            {
                order: [
                    'el',
                    'name',
                    'key',
                    'parent',
                    'functional',
                    ['delimiters', 'comments'],
                    ['components', 'directives', 'filters'],
                    'extends',
                    'mixins',
                    ['provide', 'inject'],
                    'ROUTER_GUARDS',
                    'layout',
                    'middleware',
                    'validate',
                    'scrollToTop',
                    'transition',
                    'loading',
                    'inheritAttrs',
                    'model',
                    ['props', 'propsData'],
                    'emits',
                    'setup',
                    'asyncData',
                    'data',
                    'fetch',
                    'head',
                    'computed',
                    'watch',
                    'watchQuery',
                    'LIFECYCLE_HOOKS',
                    'methods',
                    ['template', 'render'],
                    'renderError'
                ]
            }
        ],
        // 关闭不必要的规则以配合 Prettier
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'vue/multi-word-component-names': 'off'
    }
};
