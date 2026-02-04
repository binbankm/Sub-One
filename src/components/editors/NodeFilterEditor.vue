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
    <!-- 编辑器容器 -->
    <div
        class="space-y-5 rounded-2xl border border-gray-300 bg-linear-to-br from-gray-50 to-gray-100 p-5 shadow-lg dark:border-gray-700 dark:from-gray-900 dark:to-gray-800"
    >
        <!-- 顶部：模式切换和统计 -->
        <div class="flex items-center justify-between">
            <!-- 模式切换按钮组 -->
            <div
                class="flex rounded-xl border border-gray-300 bg-white p-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
                <!-- 排除模式 (黑名单) -->
                <button
                    class="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-300"
                    :class="
                        activeTab === 'exclude'
                            ? 'scale-105 transform bg-linear-to-r from-red-500 to-rose-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    "
                    @click="activeTab = 'exclude'"
                >
                    <span>🚫</span>
                    <span>排除规则</span>
                    <span v-if="activeTab === 'exclude'" class="text-xs opacity-75">(Block)</span>
                </button>
                <!-- 保留模式 (白名单) -->
                <button
                    class="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-300"
                    :class="
                        activeTab === 'keep'
                            ? 'scale-105 transform bg-linear-to-r from-green-500 to-emerald-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    "
                    @click="activeTab = 'keep'"
                >
                    <span>✅</span>
                    <span>保留规则</span>
                    <span v-if="activeTab === 'keep'" class="text-xs opacity-75">(Allow)</span>
                </button>
            </div>

            <!-- 统计和清空按钮 -->
            <div class="flex items-center gap-3">
                <span
                    v-if="ruleCount > 0"
                    class="rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                >
                    {{ ruleCount }} 条规则
                </span>
                <button
                    class="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-all duration-200 hover:bg-red-50 hover:text-red-500 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    @click="clearAll"
                >
                    🗑️ 清空
                </button>
            </div>
        </div>

        <!-- 协议选择 -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <label
                    class="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300"
                >
                    <span class="h-5 w-1 rounded-full bg-indigo-500"></span>
                    协议类型
                </label>
                <span v-if="selectedProtocols.length > 0" class="text-xs text-gray-400">
                    已选 {{ selectedProtocols.length }} 个
                </span>
            </div>
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="p in protocols"
                    :key="p.value"
                    class="group transform rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105"
                    :class="
                        selectedProtocols.includes(p.value)
                            ? 'border-indigo-300 bg-linear-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/50 dark:border-indigo-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-indigo-600'
                    "
                    @click="toggleProtocol(p.value)"
                >
                    <span class="mr-1">{{ p.icon }}</span>
                    {{ p.label }}
                </button>
            </div>
        </div>

        <!-- 地区选择 -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <label
                    class="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300"
                >
                    <span class="h-5 w-1 rounded-full bg-emerald-500"></span>
                    常用地区
                </label>
                <span v-if="selectedRegions.length > 0" class="text-xs text-gray-400">
                    已选 {{ selectedRegions.length }} 个
                </span>
            </div>
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="r in regions"
                    :key="r.value"
                    class="group transform rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105"
                    :class="
                        selectedRegions.includes(r.value)
                            ? 'border-emerald-300 bg-linear-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/50 dark:border-emerald-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-emerald-600'
                    "
                    @click="toggleRegion(r.value)"
                >
                    <span class="mr-1.5">{{ r.flag }}</span>
                    {{ r.label }}
                </button>
            </div>
        </div>

        <!-- 关键词过滤 -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <label
                    class="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300"
                >
                    <span class="h-5 w-1 rounded-full bg-amber-500"></span>
                    关键词过滤
                </label>
                <span v-if="customKeywords.length > 0" class="text-xs text-gray-400">
                    已选 {{ customKeywords.length }} 个
                </span>
            </div>

            <!-- 常用词快捷选择 -->
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="k in commonKeywords"
                    :key="k.value"
                    class="transform rounded-lg border-2 border-dashed px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105"
                    :class="
                        customKeywords.includes(k.value)
                            ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'border-gray-300 bg-white text-gray-600 hover:border-amber-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-amber-500'
                    "
                    @click="toggleKeyword(k.value)"
                >
                    {{ k.value }}
                </button>
            </div>

            <!-- 自定义输入 -->
            <div class="flex gap-2">
                <input
                    v-model="newKeyword"
                    type="text"
                    placeholder="✍️ 输入关键词后回车添加..."
                    class="flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-sm transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-800"
                    @keyup.enter="addKeyword"
                />
                <button
                    class="transform rounded-xl bg-linear-to-r from-amber-500 to-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-amber-600 hover:to-orange-700 hover:shadow-xl"
                    @click="addKeyword"
                >
                    ➕ 添加
                </button>
            </div>

            <!-- 已选关键词标签 -->
            <div
                v-if="customKeywords.length > 0"
                class="flex flex-wrap gap-2 rounded-xl border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
            >
                <span
                    v-for="k in customKeywords"
                    :key="k"
                    class="group inline-flex items-center rounded-lg border border-gray-300 bg-linear-to-r from-gray-100 to-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:border-red-400 dark:border-gray-600 dark:from-gray-700 dark:to-gray-600 dark:text-gray-200 dark:hover:border-red-500"
                >
                    <span>{{ k }}</span>
                    <button
                        class="ml-2 text-lg font-bold leading-none text-gray-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
                        @click="removeKeyword(k)"
                    >
                        ×
                    </button>
                </span>
            </div>
        </div>

        <!-- 预览/手动编辑 -->
        <div class="border-t-2 border-gray-300 pt-4 dark:border-gray-700">
            <div class="mb-3 flex items-center justify-between">
                <label
                    class="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300"
                >
                    <span class="h-5 w-1 rounded-full bg-purple-500"></span>
                    {{ isManualMode ? '手动编辑' : '规则预览' }}
                </label>
                <button
                    class="transform rounded-lg bg-indigo-100 px-4 py-1.5 text-xs font-medium text-indigo-600 transition-all hover:scale-105 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-800/50 mr-2"
                    @click="showPreview = true"
                >
                    👁️ 规则解读
                </button>
                <button
                    class="transform rounded-lg bg-purple-100 px-4 py-1.5 text-xs font-medium text-purple-600 transition-all hover:scale-105 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-800/50"
                    @click="isManualMode = !isManualMode"
                >
                    {{ isManualMode ? '📊 可视化模式' : '⌨️ 手动编辑' }}
                </button>
            </div>
            <textarea
                :value="modelValue"
                :readonly="!isManualMode"
                rows="4"
                :placeholder="isManualMode ? '在此手动编辑过滤规则...' : '规则将自动生成在这里'"
                class="w-full rounded-xl border-2 border-gray-300 bg-gray-900 px-4 py-3 font-mono text-sm text-green-400 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-black"
                :class="{
                    'cursor-not-allowed opacity-60': !isManualMode,
                    'focus:border-purple-500': isManualMode
                }"
                @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
            ></textarea>

            <p
                v-if="!modelValue && !isManualMode"
                class="mt-2 text-center text-xs text-gray-400 dark:text-gray-500"
            >
                💡 提示：选择上方的选项来创建过滤规则
            </p>
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
