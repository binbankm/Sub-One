<!--
  ==================== 节点重命名规则编辑器 ====================
  
  功能说明：
  - 节点批量正则替换/重命名规则编辑
  - 支持按行配置：匹配内容@替换内容（无@表示直接删除）
  - 支持常用规则预设一键插入（去广告、去倍率、国家代码规范等）
  - 支持实时测试预览输入框，即时验证重命名效果
  
  ==================================================
-->

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = withDefaults(
    defineProps<{
        /** 绑定的重命名规则文本 */
        modelValue?: string;
        placeholder?: string;
    }>(),
    {
        modelValue: '',
        placeholder: ''
    }
);

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
}>();

const { t } = useI18n();

// 实时测试样例
const testInput = ref('[VIP专线] 香港 01 - 1.5x | 官网: abc.com');
const showTester = ref(false);
const showHelp = ref(false);

const localRules = computed({
    get: () => props.modelValue || '',
    set: (val: string) => emit('update:modelValue', val)
});

// 计算实时测试结果
const testOutput = computed(() => {
    if (!testInput.value) return '';
    if (!localRules.value.trim()) return testInput.value;

    const lines = localRules.value.split(/\r?\n/);
    let result = testInput.value;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || line.startsWith('//')) continue;

        const atIndex = line.indexOf('@');
        let pattern = '';
        let replacement = '';
        if (atIndex !== -1) {
            pattern = line.substring(0, atIndex).trim();
            replacement = line.substring(atIndex + 1);
        } else {
            pattern = line;
            replacement = '';
        }

        if (!pattern) continue;

        try {
            const regex = new RegExp(pattern, 'gi');
            result = result.replace(regex, replacement);
        } catch {
            result = result.split(pattern).join(replacement);
        }
    }

    result = result.trim();
    return result || (testInput.value ? t('widgets.subscription.renameEditor.emptyFallback') : '');
});

// 预设规则
const presets = [
    {
        label: '去标签符号',
        tooltip: '去除 [专线] 等方括号标签',
        rule: '\\[[^\\]]*\\]@'
    },
    {
        label: '去倍率后缀',
        tooltip: '去除 1.5x, 2.0x 等倍率',
        rule: '\\s*(0\\.\\d+|[1-9]\\d*(\\.\\d+)?)x@'
    },
    {
        label: '常见国家统一',
        tooltip: '统一香港、日本、美国、新加坡、台湾等命名',
        rule: '香港|Hong Kong@HK\n日本|Japan@JP\n美国|United States@US\n新加坡|Singapore@SG\n台湾|Taiwan@TW'
    },
    {
        label: '去除网址/广告',
        tooltip: '去除带官网、网址的常见广告词',
        rule: '(官网|防失联|群组|发布页)[^\\s]*@'
    }
];

const insertPreset = (ruleStr: string) => {
    const current = localRules.value.trim();
    if (!current) {
        localRules.value = ruleStr;
    } else {
        localRules.value = current + '\n' + ruleStr;
    }
};

const clearRules = () => {
    localRules.value = '';
};
</script>

<template>
    <div
        class="space-y-4 rounded-button border border-gray-300 bg-linear-to-br from-gray-50 to-gray-100 p-4 shadow-elevated dark:border-white/10 dark:from-black/50 dark:to-black/30"
    >
        <!-- 顶部操作栏与预设插入 -->
        <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {{ t('widgets.subscription.renameEditor.quickPresets') }}:
                </span>
                <button
                    v-for="(preset, idx) in presets"
                    :key="idx"
                    type="button"
                    :title="preset.tooltip"
                    class="rounded-element border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-elevated-sm transition-all hover:border-primary-500 hover:text-primary-600 dark:border-white/10 dark:bg-white/10 dark:text-gray-200 dark:hover:border-primary-400 dark:hover:text-primary-400"
                    @click="insertPreset(preset.rule)"
                >
                    + {{ preset.label }}
                </button>
            </div>

            <div class="flex items-center gap-2">
                <button
                    type="button"
                    class="text-xs font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    @click="showTester = !showTester"
                >
                    {{ showTester ? t('widgets.subscription.renameEditor.hideTester') : t('widgets.subscription.renameEditor.showTester') }}
                </button>
                <span class="text-gray-300 dark:text-gray-600">|</span>
                <button
                    type="button"
                    class="text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    @click="showHelp = !showHelp"
                >
                    {{ showHelp ? t('widgets.subscription.renameEditor.hideHelp') : t('widgets.subscription.renameEditor.showHelp') }}
                </button>
                <button
                    v-if="localRules"
                    type="button"
                    class="text-xs font-medium text-danger-500 transition-colors hover:text-danger-600"
                    @click="clearRules"
                >
                    {{ t('widgets.subscription.renameEditor.clear') }}
                </button>
            </div>
        </div>

        <!-- 帮助说明折叠面板 -->
        <Transition name="slide-fade">
            <div
                v-if="showHelp"
                class="rounded-element border border-info-200 bg-info-50 p-3 text-xs text-info-800 dark:border-info-800/40 dark:bg-info-900/20 dark:text-info-300"
            >
                <p class="font-semibold mb-1">{{ t('widgets.subscription.renameEditor.syntaxTitle') }}</p>
                <ul class="list-inside list-disc space-y-0.5 opacity-90">
                    <li>{{ t('widgets.subscription.renameEditor.syntax1') }}</li>
                    <li>{{ t('widgets.subscription.renameEditor.syntax2') }}</li>
                    <li>{{ t('widgets.subscription.renameEditor.syntax3') }}</li>
                    <li>{{ t('widgets.subscription.renameEditor.syntax4') }}</li>
                </ul>
            </div>
        </Transition>

        <!-- 规则文本输入区域 -->
        <div class="relative">
            <textarea
                v-model="localRules"
                rows="4"
                :placeholder="placeholder || t('widgets.subscription.renameEditor.defaultPlaceholder')"
                class="w-full resize-y rounded-element border border-gray-300 bg-white p-3 font-mono text-xs text-gray-800 shadow-inner focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
            ></textarea>
        </div>

        <!-- 实时测试与预览工具 -->
        <Transition name="slide-fade">
            <div
                v-if="showTester"
                class="rounded-element border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-800/40 dark:bg-primary-950/20"
            >
                <div class="mb-2 flex items-center justify-between">
                    <span class="text-xs font-semibold text-primary-900 dark:text-primary-300">
                        🧪 {{ t('widgets.subscription.renameEditor.testerTitle') }}
                    </span>
                    <span class="text-[10px] text-gray-500 dark:text-gray-400">
                        {{ t('widgets.subscription.renameEditor.testerDesc') }}
                    </span>
                </div>
                <div class="space-y-2">
                    <div>
                        <label class="mb-1 block text-[11px] text-gray-600 dark:text-gray-400">
                            {{ t('widgets.subscription.renameEditor.sampleInput') }}:
                        </label>
                        <input
                            v-model="testInput"
                            type="text"
                            class="input-modern w-full font-mono text-xs py-1.5"
                            placeholder="输入要测试的原节点名"
                        />
                    </div>
                    <div class="rounded-element bg-white/80 p-2.5 dark:bg-white/10">
                        <div class="flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            <span>{{ t('widgets.subscription.renameEditor.sampleOutput') }}:</span>
                            <span v-if="testInput && testOutput !== testInput" class="text-success-600 dark:text-success-400 text-[10px]">
                                ✨ {{ t('widgets.subscription.renameEditor.modified') }}
                            </span>
                        </div>
                        <div
                            class="mt-1 font-mono text-xs font-bold break-all"
                            :class="testOutput !== testInput ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'"
                        >
                            {{ testOutput || t('widgets.subscription.renameEditor.noResult') }}
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: all 0.2s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
