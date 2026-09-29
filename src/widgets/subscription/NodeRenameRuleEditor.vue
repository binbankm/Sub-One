<!--
  ==================== 节点重命名规则编辑器 ====================
  
  功能说明：
  - 节点批量正则替换/重命名规则编辑
  - 支持按行配置：匹配内容@替换内容（无@表示直接删除）
  - 支持常用规则预设一键插入（去广告、去倍率、国家代码规范、序号补零、国旗补齐等）
  - 支持实时从订阅链接/已存订阅/手动节点一键拉取真实节点进行测试
  - 自动清理连续多余空格，并智能标记被完全删除的无效/广告节点
  
  ==================================================
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDataStore } from '@/stores/useAppStore';

const props = withDefaults(
    defineProps<{
        /** 绑定的重命名规则文本 */
        modelValue?: string;
        placeholder?: string;
        /** 可选：外部传入的节点样本 */
        sampleNodes?: string[];
        /** 可选：当前编辑的订阅 URL，用于直接拉取真实节点 */
        subscriptionUrl?: string;
    }>(),
    {
        modelValue: '',
        placeholder: '',
        sampleNodes: () => [],
        subscriptionUrl: ''
    }
);

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
}>();

const { t } = useI18n();
const dataStore = useDataStore();

// 实时测试控制
const showTester = ref(false);
const showHelp = ref(false);
const testMode = ref<'custom' | 'samples'>('samples');

// 自定义单行测试输入
const customTestInput = ref('[VIP专线] 香港 01 - 1.5x | 官网: abc.com');

// 默认预设的抽样节点列表（当没有真实节点时保底展示）
const defaultSampleNodes = [
    '[VIP专线] 香港 01 - 1.5x | 官网: abc.com',
    '🇯🇵 日本 Tokyo BGP 2 [2.0倍率]',
    '🇺🇸 美国-洛杉矶 05 (高速中继)',
    '官网: fly666.com (点击防失联公告)'
];

// 真实节点抓取状态
const isFetching = ref(false);
const fetchError = ref('');
const fetchedNodes = ref<string[]>([]);
const nodeCache = ref<Record<string, string[]>>({});

// 可选的数据来源列表
const availableSources = computed(() => {
    const list: Array<{ id: string; label: string; url?: string; isManual?: boolean; isDemo?: boolean }> = [];

    // 1. 如果传入了当前订阅 URL，置顶显示
    if (props.subscriptionUrl) {
        list.push({
            id: 'current-sub',
            label: `🎯 ${t('widgets.subscription.renameEditor.sourceCurrentSub')}`,
            url: props.subscriptionUrl
        });
    }

    // 2. 从 dataStore 获取所有已保存的订阅
    if (dataStore.subscriptions && dataStore.subscriptions.length > 0) {
        dataStore.subscriptions.forEach((sub) => {
            if (sub.url && sub.url !== props.subscriptionUrl) {
                list.push({
                    id: `sub-${sub.id}`,
                    label: `📡 ${sub.name || '未命名'} (${sub.nodeCount || 0} 节点)`,
                    url: sub.url
                });
            }
        });
    }

    // 3. 手动节点
    if (dataStore.manualNodes && dataStore.manualNodes.length > 0) {
        list.push({
            id: 'manual',
            label: `📝 ${t('widgets.subscription.renameEditor.sourceManual')} (${dataStore.manualNodes.length} 个)`,
            isManual: true
        });
    }

    // 4. 示例样本
    list.push({
        id: 'demo',
        label: `💡 ${t('widgets.subscription.renameEditor.sourceDemo')}`,
        isDemo: true
    });

    return list;
});

// 当前选中的来源 ID
const selectedSourceId = ref<string>('');

// 初始化选中的来源
const initSelectedSource = () => {
    if (props.subscriptionUrl) {
        selectedSourceId.value = 'current-sub';
    } else if (availableSources.value.length > 0) {
        selectedSourceId.value = availableSources.value[0].id;
    } else {
        selectedSourceId.value = 'demo';
    }
};

initSelectedSource();

// 拉取/加载指定来源的真实节点
const loadSourceNodes = async (force: boolean = false) => {
    fetchError.value = '';

    const source = availableSources.value.find((s) => s.id === selectedSourceId.value);
    if (!source || source.isDemo) {
        fetchedNodes.value = defaultSampleNodes;
        return;
    }

    if (source.isManual) {
        const nodes = (dataStore.manualNodes || []).map((n: any) => n.name).filter(Boolean);
        fetchedNodes.value = nodes.length > 0 ? nodes : defaultSampleNodes;
        return;
    }

    const targetUrl = source.url || props.subscriptionUrl;
    if (!targetUrl) {
        fetchedNodes.value = defaultSampleNodes;
        return;
    }

    if (!force && nodeCache.value[targetUrl] && nodeCache.value[targetUrl].length > 0) {
        fetchedNodes.value = nodeCache.value[targetUrl];
        return;
    }

    isFetching.value = true;
    try {
        const response = await fetch('/api/node_count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: targetUrl,
                returnNodes: true
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as any;
        const names: string[] = (data.nodes || [])
            .map((n: any) => n.name)
            .filter((name: any) => typeof name === 'string' && name.trim().length > 0);

        if (names.length > 0) {
            nodeCache.value[targetUrl] = names;
            fetchedNodes.value = names;
        } else {
            fetchError.value = '未从该订阅解析到有效节点';
            fetchedNodes.value = defaultSampleNodes;
        }
    } catch (err: any) {
        fetchError.value = err?.message || '网络请求失败';
        if (fetchedNodes.value.length === 0) {
            fetchedNodes.value = defaultSampleNodes;
        }
    } finally {
        isFetching.value = false;
    }
};

// 监听展开测试器或切换来源
watch(showTester, (shown) => {
    if (shown && testMode.value === 'samples' && fetchedNodes.value.length === 0) {
        loadSourceNodes();
    }
});

watch(selectedSourceId, () => {
    if (showTester.value && testMode.value === 'samples') {
        loadSourceNodes();
    }
});

watch(
    () => props.subscriptionUrl,
    (newUrl) => {
        if (newUrl) {
            selectedSourceId.value = 'current-sub';
            if (showTester.value && testMode.value === 'samples') {
                loadSourceNodes(true);
            }
        }
    }
);

const activeSamples = computed(() => {
    if (fetchedNodes.value.length > 0) {
        return fetchedNodes.value.slice(0, 15);
    }
    if (props.sampleNodes && props.sampleNodes.length > 0) {
        return props.sampleNodes.slice(0, 15);
    }
    return defaultSampleNodes;
});

const isRealNodesActive = computed(() => {
    const source = availableSources.value.find((s) => s.id === selectedSourceId.value);
    return source && !source.isDemo && fetchedNodes.value.length > 0 && fetchedNodes.value !== defaultSampleNodes;
});

const localRules = computed({
    get: () => props.modelValue || '',
    set: (val: string) => emit('update:modelValue', val)
});

/**
 * 核心测试替换函数（与后端 handleRenaming 算法保持严格一致）
 */
const applyRulesToName = (rawName: string): { result: string; isDropped: boolean } => {
    if (!rawName) return { result: '', isDropped: false };
    if (!localRules.value.trim()) return { result: rawName, isDropped: false };

    const lines = localRules.value.split(/\r?\n/);
    let current = rawName;

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
            current = current.replace(regex, replacement);
        } catch {
            current = current.split(pattern).join(replacement);
        }
    }

    // 智能清理连续空格与首尾空格
    current = current.replace(/\s+/g, ' ').trim();

    if (!current) {
        return { result: '', isDropped: true };
    }
    return { result: current, isDropped: false };
};

// 计算自定义输入的实时测试结果
const customTestResult = computed(() => applyRulesToName(customTestInput.value));

// 计算抽样列表的实时测试结果
const sampleTestResults = computed(() => {
    return activeSamples.value.map((sample) => {
        const res = applyRulesToName(sample);
        return {
            original: sample,
            modified: res.result,
            isDropped: res.isDropped,
            isChanged: res.result !== sample || res.isDropped
        };
    });
});

// 丰富多样的预设规则库
const presets = [
    {
        label: '剔除广告节点',
        tooltip: '匹配并完全剔除带官网、防失联、剩余/已用流量、到期、公告教程等非代理节点',
        rule: '.*(官网|地址|防失联|群组|发布页|剩余|已用|到期|总量|更新|教程|线路|禁止|\\.cc|\\.com|\\.net).*@'
    },
    {
        label: '去标签符号',
        tooltip: '去除 [专线] 等方括号标签',
        rule: '\\[[^\\]]*\\]@'
    },
    {
        label: '去倍率后缀',
        tooltip: '去除 1.5x, 2.0x, [2.0倍率] 等倍率字样',
        rule: '\\s*(\\[?\\s*(0\\.\\d+|[1-9]\\d*(\\.\\d+)?)(\\s*x|倍率)\\s*\\]?)@'
    },
    {
        label: '常见国家代码',
        tooltip: '将香港、日本、美国、新加坡、越南、瑞士、德国等统一为标准代码 HK, JP, US 等',
        rule: '香港|Hong Kong@HK\n日本|Japan@JP\n美国|United States@US\n新加坡|Singapore@SG\n台湾|Taiwan@TW\n韩国|Korea@KR\n越南@VN\n德国@DE\n瑞士@CH\n英国|United Kingdom@UK'
    },
    {
        label: '去协议杂项后缀',
        tooltip: '去除节点中如 -anytls, -hy2, -下载专用, -极速 等冗余技术后缀',
        rule: '-(下载专用|极速|直连|中继|BGP|IEPL|IPLC|anytls|hy2|vmess|vless|trojan|ss)@'
    },
    {
        label: '序号补零 (1->01)',
        tooltip: '将单数字序号规范为两位数对齐 (如 HK 1 -> HK 01)',
        rule: '\\b([A-Za-z]+)\\s*(\\d)\\b@$1 0$2'
    },
    {
        label: '去全部 Emoji',
        tooltip: '去除所有彩色 Emoji 表情符，避免客户端乱码或黑白方块',
        rule: '[\\uD83C-\\uDBFF\\uDC00-\\uDFFF\\u2600-\\u27BF]+@'
    },
    {
        label: '补齐国旗 Emoji',
        tooltip: '为标准国家代码补上国旗 (如 HK -> 🇭🇰 HK, US -> 🇺🇸 US)',
        rule: '\\bHK\\b@🇭🇰 HK\n\\bJP\\b@🇯🇵 JP\n\\bUS\\b@🇺🇸 US\n\\bSG\\b@🇸🇬 SG\n\\bTW\\b@🇹🇼 TW\n\\bKR\\b@🇰🇷 KR\n\\bVN\\b@🇻🇳 VN\n\\bDE\\b@🇩🇪 DE\n\\bCH\\b@🇨🇭 CH\n\\bUK\\b@🇬🇧 UK'
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
                    <li>系统会自动压缩连续的多余空格；若节点名字被全量清空，将作为广告公告节点自动丢弃。</li>
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
                class="rounded-element border border-primary-200 bg-primary-50/50 p-3.5 dark:border-primary-800/40 dark:bg-primary-950/20"
            >
                <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-primary-900 dark:text-primary-300">
                            🧪 {{ t('widgets.subscription.renameEditor.testerTitle') }}
                        </span>
                        <!-- 模式切换：抽样预览 / 自定义输入 -->
                        <div class="flex rounded border border-primary-200 bg-white/70 p-0.5 text-[11px] dark:border-white/10 dark:bg-white/5">
                            <button
                                type="button"
                                class="rounded px-2 py-0.5 transition-all"
                                :class="testMode === 'samples' ? 'bg-primary-600 text-white font-medium shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-primary-600'"
                                @click="testMode = 'samples'"
                            >
                                {{ isRealNodesActive ? '真实节点测试' : '节点抽样测试' }}
                            </button>
                            <button
                                type="button"
                                class="rounded px-2 py-0.5 transition-all"
                                :class="testMode === 'custom' ? 'bg-primary-600 text-white font-medium shadow-xs' : 'text-gray-600 dark:text-gray-400 hover:text-primary-600'"
                                @click="testMode = 'custom'"
                            >
                                自定义单条输入
                            </button>
                        </div>
                    </div>
                    <span class="text-[10px] text-gray-500 dark:text-gray-400">
                        {{ t('widgets.subscription.renameEditor.testerDesc') }}
                    </span>
                </div>

                <!-- 模式 A：抽样节点列表实时预览 -->
                <div v-if="testMode === 'samples'" class="space-y-2">
                    <!-- 真实节点来源选择与刷新工具条 -->
                    <div class="flex flex-wrap items-center justify-between gap-2 rounded border border-primary-100 bg-white/70 p-2 text-xs backdrop-blur-xs dark:border-white/5 dark:bg-white/5">
                        <div class="flex items-center gap-1.5 flex-1 min-w-50">
                            <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {{ t('widgets.subscription.renameEditor.sourceSelect') }}:
                            </span>
                            <select
                                v-model="selectedSourceId"
                                class="input-modern text-xs py-1 px-2 flex-1 max-w-xs"
                            >
                                <option
                                    v-for="source in availableSources"
                                    :key="source.id"
                                    :value="source.id"
                                >
                                    {{ source.label }}
                                </option>
                            </select>
                        </div>

                        <div class="flex items-center gap-2">
                            <span v-if="isRealNodesActive" class="text-[10px] text-success-600 dark:text-success-400 font-medium">
                                {{ t('widgets.subscription.renameEditor.realNodeCount', { count: fetchedNodes.length }) }}
                            </span>
                            <span v-if="fetchError" class="text-[10px] text-danger-500 font-medium">
                                ⚠️ {{ fetchError }}
                            </span>
                            <button
                                type="button"
                                :disabled="isFetching"
                                class="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-medium text-gray-700 shadow-xs border border-gray-300 transition-all hover:border-primary-500 hover:text-primary-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-gray-200"
                                @click="loadSourceNodes(true)"
                            >
                                <span :class="{ 'animate-spin': isFetching }">🔄</span>
                                <span>{{ isFetching ? t('widgets.subscription.renameEditor.fetching') : t('widgets.subscription.renameEditor.fetchRealNodes') }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- 节点列表 -->
                    <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        <div
                            v-for="(item, idx) in sampleTestResults"
                            :key="idx"
                            class="rounded border border-gray-200/80 bg-white/90 p-2 text-xs transition-colors dark:border-white/5 dark:bg-white/5"
                        >
                            <div class="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 mb-1">
                                <span class="truncate max-w-[70%] font-mono" :title="item.original">{{ item.original }}</span>
                                <span v-if="item.isDropped" class="rounded bg-danger-100 px-1.5 py-0.2 text-[10px] font-bold text-danger-600 dark:bg-danger-900/40 dark:text-danger-300">
                                    🚫 已自动剔除 (广告/空名)
                                </span>
                                <span v-else-if="item.isChanged" class="rounded bg-success-100 px-1.5 py-0.2 text-[10px] font-bold text-success-600 dark:bg-success-900/40 dark:text-success-300">
                                    ✨ 已重命名
                                </span>
                                <span v-else class="text-[10px] opacity-75">未匹配(保持原样)</span>
                            </div>
                            <div v-if="!item.isDropped" class="font-mono font-bold text-xs" :class="item.isChanged ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'">
                                ↳ {{ item.modified }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 模式 B：自定义单行输入测试 -->
                <div v-else class="space-y-2">
                    <div>
                        <label class="mb-1 block text-[11px] text-gray-600 dark:text-gray-400">
                            {{ t('widgets.subscription.renameEditor.sampleInput') }}:
                        </label>
                        <input
                            v-model="customTestInput"
                            type="text"
                            class="input-modern w-full font-mono text-xs py-1.5"
                            placeholder="输入要测试的原节点名"
                        />
                    </div>
                    <div class="rounded-element bg-white/80 p-2.5 dark:bg-white/10">
                        <div class="flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            <span>{{ t('widgets.subscription.renameEditor.sampleOutput') }}:</span>
                            <span v-if="customTestResult.isDropped" class="rounded bg-danger-100 px-1.5 py-0.2 text-[10px] font-bold text-danger-600 dark:bg-danger-900/40 dark:text-danger-300">
                                🚫 节点全量清空 (将被自动丢弃)
                            </span>
                            <span v-else-if="customTestInput && customTestResult.result !== customTestInput" class="text-success-600 dark:text-success-400 text-[10px]">
                                ✨ {{ t('widgets.subscription.renameEditor.modified') }}
                            </span>
                        </div>
                        <div
                            class="mt-1 font-mono text-xs font-bold break-all"
                            :class="customTestResult.isDropped ? 'text-danger-500' : (customTestResult.result !== customTestInput ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300')"
                        >
                            {{ customTestResult.isDropped ? '(节点被完全删除，不输出到订阅)' : (customTestResult.result || t('widgets.subscription.renameEditor.noResult')) }}
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
