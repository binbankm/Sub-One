<!--
  ==================== 节点过滤规则编辑器 ====================
  
  功能说明：
  - 可视化编辑节点过滤规则
  - 支持协议、地区、关键词三种过滤维度
  - 排除模式（黑名单）和保留模式（白名单）
  - 可视化模式和手动编辑模式切换
  
  规则格式：
  - 排除: proto:ss,vmess 或 (HK|TW)
  - 保留: keep:proto:ss 或 keep:(HK|TW)
  
  ==================================================
-->

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';

import Modal from '../ui/BaseModal.vue';

// ==================== Props 和 Emit ====================

const props = withDefaults(
    defineProps<{
        /** 绑定的过滤规则字符串 */
        modelValue?: string;
    }>(),
    {
        modelValue: ''
    }
);

const emit = defineEmits<{
    /** 更新过滤规则 */
    (e: 'update:modelValue', value: string): void;
}>();

// ==================== 预定义数据 ====================

/** 支持的协议列表 */
const protocols = [
    { label: 'Shadowsocks', value: 'ss', icon: '🔒' },
    { label: 'SSR', value: 'ssr', icon: '✈️' },
    { label: 'VMess', value: 'vmess', icon: '🔷' },
    { label: 'VLESS', value: 'vless', icon: '🚀' },
    { label: 'Trojan', value: 'trojan', icon: '🛡️' },
    { label: 'Hysteria2', value: 'hysteria2', icon: '☄️' },
    { label: 'Hysteria', value: 'hysteria', icon: '🌩️' },
    { label: 'Tuic', value: 'tuic', icon: '' },
    { label: 'AnyTLS', value: 'anytls', icon: '🎭' },
    { label: 'Socks5', value: 'socks5', icon: '🔌' },
    { label: 'HTTP', value: 'http', icon: '🌐' },
    { label: 'WireGuard', value: 'wg|wireguard', icon: '🚇' },
    { label: 'Snell', value: 'snell', icon: '🐌' },
    { label: 'Reality', value: 'reality', icon: '🕶️' }
];

/** 常用地区列表（支持多种别名） */
const regions = [
    {
        label: '香港',
        value: 'HK|Hong Kong|HongKong|Hong K|HKG|Hong-Kong|香港|深港|沪港|呼港',
        flag: '🇭🇰'
    },
    {
        label: '台湾',
        value: 'TW|Taiwan|Tai Wan|Tai-Wan|TWN|Taipei|Taichung|Kaohsiung|Hualien|Yilian|台湾|台灣|台北|台中|高雄|新北|彰化|花莲',
        flag: '🇹🇼'
    },
    { label: '新加坡', value: 'SG|Singapore|Singpore|SGP|Singapura|新加坡|狮城|新国', flag: '🇸🇬' },
    {
        label: '日本',
        value: 'JP|Japan|Nippon|JAPAN|Tokyo|Osaka|Saitama|Nagoya|Fukuoka|Kyoto|Hokkaido|日本|东京|大阪|埼玉|爱知|福冈|北海道',
        flag: '🇯🇵'
    },
    {
        label: '美国',
        value: 'US|USA|United States|America|Los Angeles|San Jose|Santa Clara|New York|Chicago|Dallas|Miami|Seattle|Portland|Phoenix|Las Vegas|Atlanta|Houston|San Francisco|California|Ashburn|美国|美國|洛杉矶|圣何塞|纽约|芝加哥|西雅图|达拉斯|迈阿密|凤凰城|亚特兰大|硅谷',
        flag: '🇺🇸'
    },
    {
        label: '韩国',
        value: 'KR|Korea|South Korea|KOR|Seoul|Incheon|Busan|Daegu|Gyeonggi|韩国|韓國|首尔|仁川|釜山|京畿道',
        flag: '🇰🇷'
    },
    {
        label: '中国',
        value: 'CN|China|PRC|Shanghai|Beijing|Shenzhen|Guangzhou|Hangzhou|Jiangsu|Anhui|Sichuan|中国|回国|内地|江苏|北京|上海|广州|深圳|杭州|成都|安徽|四川',
        flag: '🇨🇳'
    },
    {
        label: '英国',
        value: 'GB|UK|United Kingdom|Britain|Great Britain|London|Manchester|Southampton|英国|伦敦|曼彻斯特',
        flag: '🇬🇧'
    },
    {
        label: '德国',
        value: 'DE|Germany|Deutschland|Frankfurt|Berlin|Munich|Nuremberg|Dusseldorf|德国|法兰克福|柏林|慕尼黑|纽伦堡',
        flag: '🇩🇪'
    },
    {
        label: '法国',
        value: 'FR|France|Paris|Marseille|Roubaix|Strasbourg|法国|巴黎|马赛',
        flag: '🇫🇷'
    },
    {
        label: '荷兰',
        value: 'NL|Netherlands|Holland|Amsterdam|Rotterdam|The Hague|荷兰|阿姆斯特丹|鹿特丹',
        flag: '🇳🇱'
    },
    {
        label: '澳洲',
        value: 'AU|Australia|Sydney|Melbourne|Brisbane|Perth|Adelaide|澳洲|澳大利亚|悉尼|墨尔本',
        flag: '🇦🇺'
    },
    {
        label: '加拿大',
        value: 'CA|Canada|Toronto|Vancouver|Montreal|Ottawa|加拿大|多伦多|温哥华|蒙特利尔',
        flag: '🇨🇦'
    },
    {
        label: '印度',
        value: 'IN|India|Mumbai|New Delhi|Bangalore|Chennai|印度|孟买|新德里',
        flag: '🇮🇳'
    },
    {
        label: '俄罗斯',
        value: 'RU|Russia|Moscow|Saint Petersburg|Novosibirsk|俄罗斯|莫斯科|圣彼得堡',
        flag: '🇷🇺'
    },
    // 新增地区
    { label: '土耳其', value: 'TR|Turkey|Istanbul|Ankara|土耳其|伊斯坦布尔|安卡拉', flag: '🇹🇷' },
    { label: '阿根廷', value: 'AR|Argentina|Buenos Aires|阿根廷|布宜诺斯艾利斯', flag: '🇦🇷' },
    { label: '泰国', value: 'TH|Thailand|Bangkok|Phuket|Chiang Mai|泰国|曼谷|普吉岛', flag: '🇹🇭' },
    { label: '越南', value: 'VN|Vietnam|Ho Chi Minh|Hanoi|Danang|越南|胡志明|河内', flag: '🇻🇳' },
    { label: '菲律宾', value: 'PH|Philippines|Manila|Cebu|菲律宾|马尼拉|宿务', flag: '🇵🇭' },
    {
        label: '马来西亚',
        value: 'MY|Malaysia|Kuala Lumpur|Penang|Johor|马来西亚|吉隆坡|槟城',
        flag: '🇲🇾'
    },
    { label: '意大利', value: 'IT|Italy|Milan|Rome|Florence|意大利|米兰|罗马', flag: '🇮🇹' },
    { label: '瑞士', value: 'CH|Switzerland|Zurich|Geneva|Bern|瑞士|苏黎世|日内瓦', flag: '🇨🇭' },
    { label: '瑞典', value: 'SE|Sweden|Stockholm|瑞典|斯德哥尔摩', flag: '🇸🇪' },
    { label: '阿联酋', value: 'AE|UAE|Dubai|Abu Dhabi|迪拜|阿联酋|阿布扎比', flag: '🇦🇪' },
    { label: '巴西', value: 'BR|Brazil|Sao Paulo|Rio|巴西|圣保罗|里约', flag: '🇧🇷' }
];

/** 常用关键词快捷选择 */
const commonKeywords = [
    // 线路属性
    { value: '高倍率', color: 'red' },
    { value: '低倍率', color: 'green' },
    { value: '中转', color: 'indigo' },
    { value: '直连', color: 'blue' },
    { value: '专线', color: 'purple' },
    { value: 'BGP', color: 'cyan' },
    { value: 'IPLC', color: 'amber' },
    { value: 'IEPL', color: 'orange' },
    { value: 'IPv6', color: 'teal' },
    { value: 'UDP', color: 'lime' },
    // 状态/类型
    { value: '家宽', color: 'rose' },
    { value: '原生', color: 'emerald' },
    { value: '测试', color: 'warmGray' },
    { value: '维护', color: 'stone' },
    { value: '过期', color: 'gray' },
    { value: '剩余流量', color: 'zinc' },
    { value: '官网', color: 'slate' },
    // 流媒体/服务
    { value: 'NF', color: 'red' },
    { value: 'Netflix', color: 'red' },
    { value: 'Disney', color: 'blue' },
    { value: 'Dis+', color: 'sky' },
    { value: 'ChatGPT', color: 'emerald' },
    { value: 'OpenAI', color: 'teal' },
    { value: 'YouTube', color: 'red' },
    { value: 'Emby', color: 'violet' },
    { value: 'TikTok', color: 'black' },
    { value: 'TVB', color: 'green' }
];

// ==================== 响应式状态 ====================

/** 当前激活的标签页 */
const activeTab = ref<'exclude' | 'keep'>('exclude');

/** 排除规则数据 (黑名单) */
const excludeRules = reactive({
    protocols: [] as string[],
    regions: [] as string[],
    keywords: [] as string[]
});

/** 保留规则数据 (白名单) */
const keepRules = reactive({
    protocols: [] as string[],
    regions: [] as string[],
    keywords: [] as string[]
});

/** 新关键词输入 */
const newKeyword = ref('');

/** 是否手动编辑模式 */
const isManualMode = ref(false);

/** 是否显示规则解读弹窗 */
const showPreview = ref(false);

/** 清空确认对话框 */
const showClearConfirm = ref(false);

// ==================== 计算属性 ====================

/** 当前操作的协议列表 (代理) */
const selectedProtocols = computed({
    get: () => activeTab.value === 'exclude' ? excludeRules.protocols : keepRules.protocols,
    set: (val) => {
        if (activeTab.value === 'exclude') excludeRules.protocols = val;
        else keepRules.protocols = val;
    }
});

/** 当前操作的地区列表 (代理) */
const selectedRegions = computed({
    get: () => activeTab.value === 'exclude' ? excludeRules.regions : keepRules.regions,
    set: (val) => {
        if (activeTab.value === 'exclude') excludeRules.regions = val;
        else keepRules.regions = val;
    }
});

/** 当前操作的关键词列表 (代理) */
const customKeywords = computed({
    get: () => activeTab.value === 'exclude' ? excludeRules.keywords : keepRules.keywords,
    set: (val) => {
        if (activeTab.value === 'exclude') excludeRules.keywords = val;
        else keepRules.keywords = val;
    }
});

/** 规则总数统计 */
const ruleCount = computed(() => {
    const countSet = (s: typeof excludeRules) => 
        (s.protocols.length > 0 ? 1 : 0) + 
        (s.regions.length > 0 ? 1 : 0) + 
        (s.keywords.length > 0 ? 1 : 0);
    return countSet(excludeRules) + countSet(keepRules);
});

// ==================== 解析和生成逻辑 ====================

/** 解析单行规则到目标集合 */
const parseLineToRule = (lineContent: string, target: typeof excludeRules) => {
    if (lineContent.startsWith('proto:')) {
        lineContent.replace('proto:', '')
            .split(',')
            .forEach((p) => {
                const trimmed = p.trim();
                if (trimmed && !target.protocols.includes(trimmed)) target.protocols.push(trimmed);
            });
    } else {
        const cleanStr = lineContent.replace(/^\(/, '').replace(/\)$/, '');
        const parts = cleanStr.split('|').map(p => p.trim()).filter(p => p);

        // 识别地区
        regions.forEach((r) => {
            const regionAliases = r.value.split('|');
            if (regionAliases.some(alias => parts.includes(alias))) {
                if (!target.regions.includes(r.value)) target.regions.push(r.value);
            }
        });

        // 识别关键词 (排除已识别为地区的片段)
        parts.forEach((part) => {
            const isPartofAnyRegion = regions.some((r) => 
                r.value.split('|').includes(part)
            );
            if (!isPartofAnyRegion) {
                if (!target.keywords.includes(part)) target.keywords.push(part);
            }
        });
    }
}

/**
 * 解析规则字符串
 */
const parseValue = (val: string) => {
    // Reset Data
    excludeRules.protocols = []; excludeRules.regions = []; excludeRules.keywords = [];
    keepRules.protocols = []; keepRules.regions = []; keepRules.keywords = [];

    if (!val) return;

    const lines = val
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);

    lines.forEach((line) => {
        if (line.startsWith('keep:')) {
            parseLineToRule(line.replace(/^keep:/, ''), keepRules);
        } else {
            parseLineToRule(line, excludeRules);
        }
    });

    // 如果有 Keep 规则，则不默认选中 keep tab，除非只有 keep 规则？
    // 保持 exclude 为默认即可，或者根据哪个有数据激活哪个
    if (lines.some(l => l.startsWith('keep:')) && !lines.some(l => !l.startsWith('keep:'))) {
        activeTab.value = 'keep';
    }
};

/** 生成单组规则字符串 */
const generateLines = (rules: typeof excludeRules, prefix: string) => {
    const lines: string[] = [];
    if (rules.protocols.length > 0) {
        lines.push(`${prefix}proto:${rules.protocols.join(',')}`);
    }
    if (rules.regions.length > 0) {
        const regionPattern = rules.regions.join('|');
        lines.push(`${prefix}(${regionPattern})`);
    }
    if (rules.keywords.length > 0) {
        const keywordPattern = rules.keywords.join('|');
        lines.push(`${prefix}(${keywordPattern})`);
    }
    return lines;
}

/**
 * 生成规则字符串
 */
const generateString = () => {
    if (isManualMode.value) return props.modelValue;

    const lines: string[] = [];

    // 黑名单规则
    lines.push(...generateLines(excludeRules, ''));

    // 白名单规则
    lines.push(...generateLines(keepRules, 'keep:'));

    return lines.join('\n');
};

// ==================== 监听器 ====================

/** 监听状态变化，自动生成规则 */
watch(
    [excludeRules, keepRules],
    () => {
        if (!isManualMode.value) {
            emit('update:modelValue', generateString());
        }
    },
    { deep: true }
);

/** 初始化时解析规则 */
onMounted(() => {
    if (props.modelValue) {
        parseValue(props.modelValue);
    }
});

/** 监听外部 props 变化 */
watch(
    () => props.modelValue,
    (newVal) => {
        // 只有当外部值与当前生成的字符串不一致时才解析，避免循环触发
        if (newVal !== generateString()) {
            parseValue(newVal || '');
        }
    }
);

// ==================== 操作方法 ====================

/** 添加自定义关键词 */
const addKeyword = () => {
    const trimmed = newKeyword.value.trim();
    if (trimmed && !customKeywords.value.includes(trimmed)) {
        customKeywords.value.push(trimmed);
        newKeyword.value = '';
    }
};

/** 移除关键词 */
const removeKeyword = (k: string) => {
    customKeywords.value.splice(customKeywords.value.indexOf(k), 1);
};

/** 切换地区选择 */
const toggleRegion = (rValue: string) => {
    const index = selectedRegions.value.indexOf(rValue);
    if (index === -1) {
        selectedRegions.value.push(rValue);
    } else {
        selectedRegions.value.splice(index, 1);
    }
};

/** 切换协议选择 */
const toggleProtocol = (pValue: string) => {
    const index = selectedProtocols.value.indexOf(pValue);
    if (index === -1) {
        selectedProtocols.value.push(pValue);
    } else {
        selectedProtocols.value.splice(index, 1);
    }
};

/** 切换关键词 */
const toggleKeyword = (k: string) => {
    if (customKeywords.value.includes(k)) {
        removeKeyword(k);
    } else {
        customKeywords.value.push(k);
    }
};

/** 显示清空确认对话框 */
const clearAll = () => {
    showClearConfirm.value = true;
};

/** 确认清空所有规则 */
const confirmClear = () => {
    excludeRules.protocols = [];
    excludeRules.regions = [];
    excludeRules.keywords = [];
    keepRules.protocols = [];
    keepRules.regions = [];
    keepRules.keywords = [];
    showClearConfirm.value = false;
};
</script>

<template>
    <!-- 编辑器容器: Glassmorphism + Premium Shadow -->
    <div
        class="space-y-6 rounded-3xl border border-white/20 bg-white/80 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-gray-900/60"
    >
        <!-- 顶部：优雅的分段控制器和操作栏 -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <!-- 分段控制器 (IOS Style) -->
            <div class="relative flex w-full rounded-2xl bg-gray-100 p-1.5 shadow-inner dark:bg-gray-800 sm:w-auto">
                <!-- 滑动背景 (可选实现，也可以简单的切换样式) -->
                
                <!-- 排除模式 (Block) -->
                <button
                    class="relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all duration-300 sm:w-40"
                    :class="
                        activeTab === 'exclude'
                            ? 'bg-white text-red-600 shadow-md ring-1 ring-black/5 dark:bg-gray-700 dark:text-red-400 dark:ring-white/10'
                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    "
                    @click="activeTab = 'exclude'"
                >
                    <span>🚫 排除规则</span>
                </button>
                
                <!-- 保留模式 (Allow) -->
                <button
                    class="relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all duration-300 sm:w-40"
                    :class="
                        activeTab === 'keep'
                            ? 'bg-white text-green-600 shadow-md ring-1 ring-black/5 dark:bg-gray-700 dark:text-green-400 dark:ring-white/10'
                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    "
                    @click="activeTab = 'keep'"
                >
                    <span>✅ 保留规则</span>
                </button>
            </div>

            <!-- 右侧工具栏 -->
            <div class="flex items-center justify-end gap-3">
                <span
                    v-if="ruleCount > 0"
                    class="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 ring-1 ring-indigo-500/10 dark:bg-indigo-900/20 dark:text-indigo-400"
                >
                    <span class="h-2 w-2 rounded-full bg-indigo-500"></span>
                    {{ ruleCount }} 条生效
                </span>
                
                <div class="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>

                <button
                    class="group flex items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    title="清空所有规则"
                    @click="clearAll"
                >
                    <span class="text-lg">🗑️</span>
                </button>
            </div>
        </div>

        <div class="h-px w-full bg-linear-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700"></div>

        <!-- 协议选择 -->
        <div class="space-y-4">
            <h4 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <span class="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                Protocol Type
            </h4>
            <div class="flex flex-wrap gap-2.5">
                <button
                    v-for="p in protocols"
                    :key="p.value"
                    class="group relative overflow-hidden rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-300 active:scale-95"
                    :class="
                        selectedProtocols.includes(p.value)
                            ? 'border-indigo-500/30 bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 dark:border-indigo-400/30 dark:bg-indigo-600'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    "
                    @click="toggleProtocol(p.value)"
                >
                    <span class="relative z-10 flex items-center gap-1.5">
                        <span class="opacity-80">{{ p.icon }}</span>
                        {{ p.label }}
                    </span>
                </button>
            </div>
        </div>

        <!-- 地区选择 -->
        <div class="space-y-4">
            <h4 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Region Filter
            </h4>
            <div class="flex flex-wrap gap-2.5">
                <button
                    v-for="r in regions"
                    :key="r.value"
                    class="group relative overflow-hidden rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-300 active:scale-95"
                    :class="
                        selectedRegions.includes(r.value)
                            ? 'border-emerald-500/30 bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 dark:border-emerald-400/30 dark:bg-emerald-600'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    "
                    @click="toggleRegion(r.value)"
                >
                    <span class="relative z-10 flex items-center gap-1.5">
                        <span class="text-lg leading-none">{{ r.flag }}</span>
                        {{ r.label }}
                    </span>
                </button>
            </div>
        </div>

        <!-- 关键词过滤 -->
        <div class="space-y-4">
            <h4 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                Keywords
            </h4>
            
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="k in commonKeywords"
                    :key="k.value"
                    class="group rounded-lg border border-dashed border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:border-amber-400 hover:text-amber-600 active:scale-95 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-amber-500 dark:hover:text-amber-400"
                    :class="{ 'bg-amber-50 border-amber-400! text-amber-700! dark:bg-amber-900/20 dark:text-amber-400!': customKeywords.includes(k.value) }"
                    @click="toggleKeyword(k.value)"
                >
                    {{ k.value }}
                </button>
            </div>

            <!-- 输入框和标签 -->
            <div class="flex flex-col gap-3 rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200 dark:bg-gray-800/50 dark:ring-gray-700 sm:flex-row sm:items-center">
                <div class="relative flex-1">
                     <span class="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400">🔍</span>
                     <input
                        v-model="newKeyword"
                        type="text"
                        placeholder="输入关键词 (回车添加)"
                        class="w-full rounded-xl border-none bg-white py-2.5 pl-9 pr-4 text-sm font-medium shadow-sm ring-1 ring-gray-200 transition-all focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:ring-gray-700 dark:focus:ring-amber-500"
                        @keyup.enter="addKeyword"
                    />
                </div>
                
                <button
                    class="shrink-0 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-gray-800 active:scale-95 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                    @click="addKeyword"
                >
                    添加
                </button>
            </div>

            <!-- 已选关键词列 -->
            <div v-if="customKeywords.length > 0" class="flex flex-wrap gap-2 pt-1">
                 <span
                    v-for="k in customKeywords"
                    :key="k"
                    class="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-900/30 dark:text-amber-300"
                >
                    {{ k }}
                    <button
                        class="ml-1 rounded-full p-0.5 text-amber-500 hover:bg-amber-200 hover:text-amber-800 dark:hover:bg-amber-800 dark:hover:text-amber-200"
                        @click="removeKeyword(k)"
                    >
                        <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
                    </button>
                </span>
            </div>
        </div>

        <div class="h-px w-full bg-linear-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700"></div>

        <!-- 底部：编辑/预览区域 -->
        <div>
            <div class="mb-3 flex items-center justify-between">
                <div class="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <button 
                        class="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                        @click="showPreview = true"
                    >
                        <span class="text-base">👁️</span> 
                        <span class="underline decoration-dashed decoration-gray-300 underline-offset-4">查看规则详情</span>
                    </button>
                </div>
                
                <button
                    class="group flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    @click="isManualMode = !isManualMode"
                >
                    <span>{{ isManualMode ? '📊 切换回可视化' : '⌨️ 手动编辑代码' }}</span>
                </button>
            </div>
            
            <div class="relative overflow-hidden rounded-2xl ring-1 ring-gray-200 dark:ring-gray-700">
                <textarea
                    :value="modelValue"
                    :readonly="!isManualMode"
                    rows="4"
                    :placeholder="isManualMode ? '在此手动编辑过滤规则...' : '规则将自动生成在这里'"
                    class="w-full resize-y bg-gray-50 px-4 py-3 font-mono text-sm leading-relaxed text-gray-800 outline-none transition-all focus:bg-white dark:bg-gray-900/50 dark:text-gray-200 dark:focus:bg-gray-900"
                    :class="{ 'cursor-default': !isManualMode }"
                    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
                ></textarea>
                
                <!-- 只读模式下的锁图标 -->
                <div 
                    v-if="!isManualMode" 
                    class="pointer-events-none absolute right-3 top-3 opacity-20"
                >
                    �
                </div>
            </div>
        </div>
    </div>

    <!-- 规则解读弹窗 -->
    <Modal v-model:show="showPreview">
        <template #title>
            <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <span class="text-xl">👁️</span>
                </div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">规则解读</h3>
            </div>
        </template>
        <template #body>
            <div class="space-y-6">
                <!-- 排除规则解读 -->
                <div v-if="excludeRules.protocols.length || excludeRules.regions.length || excludeRules.keywords.length">
                    <h4 class="mb-2 flex items-center gap-2 font-bold text-red-600 dark:text-red-400">
                        <span>🚫 排除 (Block)</span>
                        <span class="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900/30">黑名单</span>
                    </h4>
                    <div class="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/10">
                        <ul class="list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-gray-300">
                            <li v-if="excludeRules.protocols.length">
                                屏蔽 
                                <span class="font-bold">{{ excludeRules.protocols.join(', ') }}</span> 
                                协议
                            </li>
                            <li v-if="excludeRules.regions.length">
                                屏蔽 
                                <span class="font-bold">{{ regions.filter(r => excludeRules.regions.includes(r.value)).map(r => r.label).join(', ') }}</span> 
                                地区
                            </li>
                            <li v-if="excludeRules.keywords.length">
                                屏蔽包含 
                                <span class="font-bold">{{ excludeRules.keywords.join(', ') }}</span> 
                                的节点
                            </li>
                        </ul>
                    </div>
                </div>
                <div v-else class="text-center text-sm text-gray-400">
                    没有设置排除规则
                </div>

                <!-- 保留规则解读 -->
                <div v-if="keepRules.protocols.length || keepRules.regions.length || keepRules.keywords.length">
                    <h4 class="mb-2 flex items-center gap-2 font-bold text-green-600 dark:text-green-400">
                        <span>✅ 保留 (Allow)</span>
                        <span class="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600 dark:bg-green-900/30">白名单 (优先级高)</span>
                    </h4>
                    <div class="rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/10">
                        <p class="mb-2 text-xs text-gray-500">在排除后剩余的节点中，只保留匹配以下任一条件的节点：</p>
                        <ul class="list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-gray-300">
                            <li v-if="keepRules.protocols.length">
                                协议为 
                                <span class="font-bold">{{ keepRules.protocols.join(', ') }}</span>
                            </li>
                            <li v-if="keepRules.regions.length">
                                地区为 
                                <span class="font-bold">{{ regions.filter(r => keepRules.regions.includes(r.value)).map(r => r.label).join(', ') }}</span>
                            </li>
                            <li v-if="keepRules.keywords.length">
                                名称包含 
                                <span class="font-bold">{{ keepRules.keywords.join(', ') }}</span>
                            </li>
                        </ul>
                    </div>
                </div>
                 <div v-else class="text-center text-sm text-gray-400">
                    没有设置保留规则 (即保留所有未被排除的节点)
                </div>
                
                <div class="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    💡 提示：系统会先移除符合【排除规则】的节点，然后再从剩余节点中筛选出符合【保留规则】的节点。 如果未设置保留规则，则直接返回排除后的结果。
                </div>
            </div>
        </template>
        <template #footer>
            <button
                class="w-full rounded-xl bg-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-all hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                @click="showPreview = false"
            >
                关闭
            </button>
        </template>
    </Modal>

    <!-- 确认清空对话框 -->
    <Modal v-model:show="showClearConfirm" @confirm="confirmClear">
        <template #title>
            <div class="flex items-center gap-3">
                <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30"
                >
                    <svg
                        class="h-5 w-5 text-amber-600 dark:text-amber-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">确认清空规则</h3>
            </div>
        </template>
        <template #body>
            <div class="space-y-3">
                <p class="text-base text-gray-700 dark:text-gray-300">确定要清空所有过滤规则吗？</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    此操作将清除所有已选的协议、地区和关键词。
                </p>
            </div>
        </template>
    </Modal>
</template>
