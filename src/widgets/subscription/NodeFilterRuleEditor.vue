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
import { computed, onMounted, ref, watch } from 'vue';

import Modal from '@/common/ui/BaseModal.vue';
import { useI18n } from 'vue-i18n';

// ==================== Props 和 Emit ====================

const props = withDefaults(
    defineProps<{
        /** 绑定的过滤规则字符串 */
        modelValue?: string;
        /** 占位提示符 */
        placeholder?: string;
    }>(),
    {
        modelValue: '',
        placeholder: undefined
    }
);

const emit = defineEmits<{
    /** 更新过滤规则 */
    (e: 'update:modelValue', value: string): void;
}>();

const { t } = useI18n();

// ==================== 预定义数据 ====================

/** 支持的协议列表 */
const protocols = [
    { label: 'Shadowsocks', value: 'ss' },
    { label: 'SSR', value: 'ssr' },
    { label: 'VMess', value: 'vmess' },
    { label: 'VLESS', value: 'vless' },
    { label: 'Trojan', value: 'trojan' },
    { label: 'Hysteria2', value: 'hysteria2' },
    { label: 'Hysteria', value: 'hysteria' },
    { label: 'Tuic', value: 'tuic' },
    { label: 'AnyTLS', value: 'anytls' },
    { label: 'Socks5', value: 'socks5' },
    { label: 'HTTP', value: 'http' },
    { label: 'WireGuard', value: 'wireguard' },
    { label: 'Snell', value: 'snell' },
    { label: 'NaiveProxy', value: 'naive' },
    { label: 'Reality', value: 'reality' }
];

/** 常用地区列表（支持多种别名） */
const regions = computed(() => [
    {
        label: t('widgets.subscription.filterEditor.regions.hk'),
        value: 'HK|Hong Kong|HongKong|Hong K|HKG|Hong-Kong|香港|深港|沪港|呼港',
        flag: '🇭🇰'
    },
    {
        label: t('widgets.subscription.filterEditor.regions.tw'),
        value: 'TW|Taiwan|Tai Wan|Tai-Wan|TWN|Taipei|Taichung|Kaohsiung|Hualien|Yilian|台湾|台灣|台北|台中|高雄|新北|彰化|花莲',
        flag: '🇹🇼'
    },
    { label: t('widgets.subscription.filterEditor.regions.sg'), value: 'SG|Singapore|Singpore|SGP|Singapura|新加坡|狮城|新国', flag: '🇸🇬' },
    {
        label: t('widgets.subscription.filterEditor.regions.jp'),
        value: 'JP|Japan|Nippon|JAPAN|Tokyo|Osaka|Saitama|Nagoya|Fukuoka|Kyoto|Hokkaido|日本|东京|大阪|埼玉|爱知|福冈|北海道',
        flag: '🇯🇵'
    },
    {
        label: t('widgets.subscription.filterEditor.regions.us'),
        value: 'US|USA|United States|America|Los Angeles|San Jose|Santa Clara|New York|Chicago|Dallas|Miami|Seattle|Portland|Phoenix|Las Vegas|Atlanta|Houston|San Francisco|California|Ashburn|美国|美國|洛杉矶|圣何塞|纽约|芝加哥|西雅图|达拉斯|迈阿密|凤凰城|亚特兰大|硅谷',
        flag: '🇺🇸'
    },
    {
        label: t('widgets.subscription.filterEditor.regions.kr'),
        value: 'KR|Korea|South Korea|KOR|Seoul|Incheon|Busan|Daegu|Gyeonggi|韩国|韓國|首尔|仁川|釜山|京畿道',
        flag: '🇰🇷'
    },
    {
        label: t('widgets.subscription.filterEditor.regions.cn'),
        value: 'CN|China|PRC|Shanghai|Beijing|Shenzhen|Guangzhou|Hangzhou|Jiangsu|Anhui|Sichuan|中国|回国|内地|江苏|北京|上海|广州|深圳|杭州|成都|安徽|四川',
        flag: '🇨🇳'
    },
    {
        label: t('widgets.subscription.filterEditor.regions.gb'),
        value: 'GB|UK|United Kingdom|Britain|Great Britain|London|Manchester|Southampton|英国|伦敦|曼彻斯特',
        flag: '🇬🇧'
    },
    {
        label: t('widgets.subscription.filterEditor.regions.de'),
        value: 'DE|Germany|Deutschland|Frankfurt|Berlin|Munich|Nuremberg|Dusseldorf|德国|法兰克福|柏林|慕尼黑|纽伦堡',
        flag: '🇩🇪'
    },
    {
        label: t('widgets.subscription.filterEditor.regions.fr'),
        value: 'FR|France|Paris|Marseille|Roubaix|Strasbourg|法国|巴黎|马赛',
        flag: '🇫🇷'
    },
    {
        label: t('widgets.subscription.filterEditor.regions.nl'),
        value: 'NL|Netherlands|Holland|Amsterdam|Rotterdam|The Hague|荷兰|阿姆斯特丹|鹿特丹',
        flag: '🇳🇱'
    },
    {
        label: t('widgets.subscription.filterEditor.regions.au'),
        value: 'AU|Australia|Sydney|Melbourne|Brisbane|Perth|Adelaide|澳洲|澳大利亚|悉尼|墨尔本',
        flag: '🇦🇺'
    },
    {
        label: t('widgets.subscription.filterEditor.regions.ca'),
        value: 'CA|Canada|Toronto|Vancouver|Montreal|Ottawa|加拿大|多伦多|温哥华|蒙特利尔',
        flag: '🇨🇦'
    },
    {
        label: t('widgets.subscription.filterEditor.regions.in'),
        value: 'IN|India|Mumbai|New Delhi|Bangalore|Chennai|印度|孟买|新德里',
        flag: '🇮🇳'
    },
    {
        label: t('widgets.subscription.filterEditor.regions.ru'),
        value: 'RU|Russia|Moscow|Saint Petersburg|Novosibirsk|俄罗斯|莫斯科|圣彼得堡',
        flag: '🇷🇺'
    },
    // 新增地区
    { label: t('widgets.subscription.filterEditor.regions.tr'), value: 'TR|Turkey|Istanbul|Ankara|土耳其|伊斯坦布尔|安卡拉', flag: '🇹🇷' },
    { label: t('widgets.subscription.filterEditor.regions.ar'), value: 'AR|Argentina|Buenos Aires|阿根廷|布宜诺斯艾利斯', flag: '🇦🇷' },
    { label: t('widgets.subscription.filterEditor.regions.th'), value: 'TH|Thailand|Bangkok|Phuket|Chiang Mai|泰国|曼谷|普吉岛', flag: '🇹🇭' },
    { label: t('widgets.subscription.filterEditor.regions.vn'), value: 'VN|Vietnam|Ho Chi Minh|Hanoi|Danang|越南|胡志明|河内', flag: '🇻🇳' },
    { label: t('widgets.subscription.filterEditor.regions.ph'), value: 'PH|Philippines|Manila|Cebu|菲律宾|马尼拉|宿务', flag: '🇵🇭' },
    {
        label: t('widgets.subscription.filterEditor.regions.my'),
        value: 'MY|Malaysia|Kuala Lumpur|Penang|Johor|马来西亚|吉隆坡|槟城',
        flag: '🇲🇾'
    },
    { label: t('widgets.subscription.filterEditor.regions.it'), value: 'IT|Italy|Milan|Rome|Florence|意大利|米兰|罗马', flag: '🇮🇹' },
    { label: t('widgets.subscription.filterEditor.regions.ch'), value: 'CH|Switzerland|Zurich|Geneva|Bern|瑞士|苏黎世|日内瓦', flag: '🇨🇭' },
    { label: t('widgets.subscription.filterEditor.regions.se'), value: 'SE|Sweden|Stockholm|瑞典|斯德哥尔摩', flag: '🇸🇪' },
    { label: t('widgets.subscription.filterEditor.regions.ae'), value: 'AE|UAE|Dubai|Abu Dhabi|迪拜|阿联酋|阿布扎比', flag: '🇦🇪' },
    { label: t('widgets.subscription.filterEditor.regions.br'), value: 'BR|Brazil|Sao Paulo|Rio|巴西|圣保罗|里约', flag: '🇧🇷' }
]);

/** 常用关键词快捷选择 */
const commonKeywords = computed(() => [
    // 线路属性
    { label: t('widgets.subscription.filterEditor.keywords.highMultiplier'), value: '高倍率', color: 'red' },
    { label: t('widgets.subscription.filterEditor.keywords.lowMultiplier'), value: '低倍率', color: 'green' },
    { label: t('widgets.subscription.filterEditor.keywords.transit'), value: '中转', color: 'primary' },
    { label: t('widgets.subscription.filterEditor.keywords.direct'), value: '直连', color: 'blue' },
    { label: t('widgets.subscription.filterEditor.keywords.dedicated'), value: '专线', color: 'secondary' },
    { label: t('widgets.subscription.filterEditor.keywords.bgp'), value: 'BGP', color: 'cyan' },
    { label: t('widgets.subscription.filterEditor.keywords.iplc'), value: 'IPLC', color: 'amber' },
    { label: t('widgets.subscription.filterEditor.keywords.iepl'), value: 'IEPL', color: 'orange' },
    { label: t('widgets.subscription.filterEditor.keywords.ipv6'), value: 'IPv6', color: 'teal' },
    { label: t('widgets.subscription.filterEditor.keywords.udp'), value: 'UDP', color: 'lime' },
    // 状态/类型
    { label: t('widgets.subscription.filterEditor.keywords.homeBroadband'), value: '家宽', color: 'rose' },
    { label: t('widgets.subscription.filterEditor.keywords.native'), value: '原生', color: 'emerald' },
    { label: t('widgets.subscription.filterEditor.keywords.test'), value: '测试', color: 'warmGray' },
    { label: t('widgets.subscription.filterEditor.keywords.maintenance'), value: '维护', color: 'stone' },
    { label: t('widgets.subscription.filterEditor.keywords.expired'), value: '过期', color: 'gray' },
    { label: t('widgets.subscription.filterEditor.keywords.remainingTraffic'), value: '剩余流量', color: 'zinc' },
    { label: t('widgets.subscription.filterEditor.keywords.official'), value: '官网', color: 'slate' },
    // 流媒体/服务
    { label: t('widgets.subscription.filterEditor.keywords.nf'), value: 'NF', color: 'red' },
    { label: t('widgets.subscription.filterEditor.keywords.netflix'), value: 'Netflix', color: 'red' },
    { label: t('widgets.subscription.filterEditor.keywords.disney'), value: 'Disney', color: 'blue' },
    { label: t('widgets.subscription.filterEditor.keywords.disPlus'), value: 'Dis+', color: 'sky' },
    { label: t('widgets.subscription.filterEditor.keywords.chatgpt'), value: 'ChatGPT', color: 'emerald' },
    { label: t('widgets.subscription.filterEditor.keywords.openai'), value: 'OpenAI', color: 'teal' },
    { label: t('widgets.subscription.filterEditor.keywords.youtube'), value: 'YouTube', color: 'red' },
    { label: t('widgets.subscription.filterEditor.keywords.emby'), value: 'Emby', color: 'violet' },
    { label: t('widgets.subscription.filterEditor.keywords.tiktok'), value: 'TikTok', color: 'black' },
    { label: t('widgets.subscription.filterEditor.keywords.tvb'), value: 'TVB', color: 'green' }
]);

// ==================== 响应式状态 ====================

/** 过滤模式：exclude(排除/黑名单) 或 keep(保留/白名单) */
const mode = ref<'exclude' | 'keep'>('exclude');

/** 已选协议列表 */
const selectedProtocols = ref<string[]>([]);

/** 已选地区列表 */
const selectedRegions = ref<string[]>([]);

/** 自定义关键词列表 */
const customKeywords = ref<string[]>([]);

/** 新关键词输入 */
const newKeyword = ref('');

/** 是否手动编辑模式 */
const isManualMode = ref(false);

/** 清空确认对话框 */
const showClearConfirm = ref(false);

// ==================== 计算属性 ====================

/** 规则总数统计 */
const ruleCount = computed(() => {
    let count = 0;
    if (selectedProtocols.value.length > 0) count++;
    if (selectedRegions.value.length > 0) count++;
    if (customKeywords.value.length > 0) count++;
    return count;
});

// ==================== 解析和生成逻辑 ====================

/**
 * 解析规则字符串
 * 将规则字符串解析为可视化选项
 */
const parseValue = (val: string) => {
    if (!val) {
        selectedProtocols.value = [];
        selectedRegions.value = [];
        customKeywords.value = [];
        return;
    }

    const lines = val
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);
    if (lines.length === 0) return;

    // 检测模式
    const hasKeep = lines.some((l) => l.startsWith('keep:'));
    mode.value = hasKeep ? 'keep' : 'exclude';

    // 移除 keep: 前缀
    const cleanLines = lines.map((l) => l.replace(/^keep:/, ''));

    const foundProtocols = new Set<string>();
    const foundRegions = new Set<string>();
    const foundKeywords = new Set<string>();

    cleanLines.forEach((line) => {
        if (line.startsWith('proto:')) {
            line.replace('proto:', '')
                .split(',')
                .forEach((p: string) => {
                    const trimmed = p.trim();
                    if (trimmed === 'wg' || trimmed === 'wireguard' || trimmed === 'wg|wireguard') {
                        foundProtocols.add('wireguard');
                    } else {
                        foundProtocols.add(trimmed);
                    }
                });
        } else {
            const cleanStr = line.replace(/^\(/, '').replace(/\)$/, '');
            // 这里的 parts 是正则中的各个分支
            const parts = cleanStr
                .split('|')
                .map((p) => p.trim())
                .filter((p) => p);

            // 识别地区：如果 parts 中包含了该地区的任何一个别名
            regions.value.forEach((r) => {
                const regionAliases = r.value.split('|');
                if (regionAliases.some((alias) => parts.includes(alias))) {
                    foundRegions.add(r.value);
                }
            });

            // 识别关键词：从 parts 中提取那些不属于任何已定义地区的片段
            parts.forEach((part) => {
                const isPartofAnyRegion = regions.value.some((r) => r.value.split('|').includes(part));
                if (!isPartofAnyRegion) {
                    foundKeywords.add(part);
                }
            });
        }
    });

    selectedProtocols.value = Array.from(foundProtocols);
    selectedRegions.value = Array.from(foundRegions);
    customKeywords.value = Array.from(foundKeywords);
};

/**
 * 生成规则字符串
 * 将可视化选项转换为规则字符串
 */
const generateString = () => {
    if (isManualMode.value) return props.modelValue;

    const lines: string[] = [];
    const prefix = mode.value === 'keep' ? 'keep:' : '';

    // 协议规则
    if (selectedProtocols.value.length > 0) {
        lines.push(`${prefix}proto:${selectedProtocols.value.join(',')}`);
    }

    // 地区规则
    if (selectedRegions.value.length > 0) {
        const regionPattern = selectedRegions.value.join('|');
        lines.push(`${prefix}(${regionPattern})`);
    }

    // 关键词规则
    if (customKeywords.value.length > 0) {
        const keywordPattern = customKeywords.value.join('|');
        lines.push(`${prefix}(${keywordPattern})`);
    }

    return lines.join('\n');
};

// ==================== 监听器 ====================

/** 监听状态变化，自动生成规则 */
watch(
    [mode, selectedProtocols, selectedRegions, customKeywords],
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
    customKeywords.value = customKeywords.value.filter((item) => item !== k);
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
    selectedProtocols.value = [];
    selectedRegions.value = [];
    customKeywords.value = [];
    showClearConfirm.value = false;
};
</script>

<template>
    <!-- 编辑器容器 -->
    <div
        class="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-white/5"
    >
        <!-- 顶部：模式切换和统计 -->
        <div class="flex items-center justify-between gap-3">
            <!-- 模式切换按钮组 -->
            <div
                class="flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/5"
            >
                <!-- 排除模式 (黑名单) -->
                <button
                    class="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all"
                    :class="
                        mode === 'exclude'
                            ? 'bg-danger-600 text-white shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    "
                    @click="mode = 'exclude'"
                >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    <span>{{ t('widgets.subscription.filterEditor.excludeMode') }}</span>
                    <span v-if="mode === 'exclude'" class="text-[10px] opacity-80">({{ t('widgets.subscription.filterEditor.blacklist') }})</span>
                </button>
                <!-- 保留模式 (白名单) -->
                <button
                    class="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all"
                    :class="
                        mode === 'keep'
                            ? 'bg-success-600 text-white shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    "
                    @click="mode = 'keep'"
                >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>{{ t('widgets.subscription.filterEditor.keepMode') }}</span>
                    <span v-if="mode === 'keep'" class="text-[10px] opacity-80">({{ t('widgets.subscription.filterEditor.whitelist') }})</span>
                </button>
            </div>

            <!-- 统计和清空按钮 -->
            <div class="flex items-center gap-2.5">
                <span
                    v-if="ruleCount > 0"
                    class="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-300"
                >
                    {{ t('widgets.subscription.filterEditor.rulesCount', { count: ruleCount }) }}
                </span>
                <button
                    class="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:text-gray-400 dark:hover:bg-danger-950/30 dark:hover:text-danger-400"
                    @click="clearAll"
                >
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    <span>{{ t('widgets.subscription.filterEditor.clear') }}</span>
                </button>
            </div>
        </div>

        <!-- 协议选择 -->
        <div class="space-y-2.5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <span class="h-3 w-1 rounded-full bg-primary-500"></span>
                    {{ t('widgets.subscription.filterEditor.protocolType') }}
                </div>
                <span v-if="selectedProtocols.length > 0" class="text-xs text-gray-400">
                    {{ t('widgets.subscription.filterEditor.selected') }} {{ selectedProtocols.length }} {{ t('widgets.subscription.filterEditor.count') }}
                </span>
            </div>
            <div class="flex flex-wrap gap-1.5">
                <button
                    v-for="p in protocols"
                    :key="p.value"
                    class="rounded-md border px-2.5 py-1 text-xs font-medium transition-all"
                    :class="
                        selectedProtocols.includes(p.value)
                            ? 'border-primary-500 bg-primary-600 text-white shadow-2xs dark:border-primary-500 dark:bg-primary-600'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                    "
                    @click="toggleProtocol(p.value)"
                >
                    {{ p.label }}
                </button>
            </div>
        </div>

        <!-- 地区选择 -->
        <div class="space-y-2.5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <span class="h-3 w-1 rounded-full bg-emerald-500"></span>
                    {{ t('widgets.subscription.filterEditor.commonRegions') }}
                </div>
                <span v-if="selectedRegions.length > 0" class="text-xs text-gray-400">
                    {{ t('widgets.subscription.filterEditor.selected') }} {{ selectedRegions.length }} {{ t('widgets.subscription.filterEditor.count') }}
                </span>
            </div>
            <div class="flex flex-wrap gap-1.5">
                <button
                    v-for="r in regions"
                    :key="r.value"
                    class="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all"
                    :class="
                        selectedRegions.includes(r.value)
                            ? 'border-emerald-500 bg-emerald-600 text-white shadow-2xs dark:border-emerald-500 dark:bg-emerald-600'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                    "
                    @click="toggleRegion(r.value)"
                >
                    <span>{{ r.flag }}</span>
                    <span>{{ r.label }}</span>
                </button>
            </div>
        </div>

        <!-- 关键词过滤 -->
        <div class="space-y-2.5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <span class="h-3 w-1 rounded-full bg-amber-500"></span>
                    {{ t('widgets.subscription.filterEditor.keywordFilter') }}
                </div>
                <span v-if="customKeywords.length > 0" class="text-xs text-gray-400">
                    {{ t('widgets.subscription.filterEditor.selected') }} {{ customKeywords.length }} {{ t('widgets.subscription.filterEditor.count') }}
                </span>
            </div>

            <!-- 常用词快捷选择 -->
            <div class="flex flex-wrap gap-1.5">
                <button
                    v-for="k in commonKeywords"
                    :key="k.value"
                    class="rounded-md border px-2 py-1 text-xs font-medium transition-all"
                    :class="
                        customKeywords.includes(k.value)
                            ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
                    "
                    @click="toggleKeyword(k.value)"
                >
                    {{ k.label || k.value }}
                </button>
            </div>

            <!-- 自定义输入 -->
            <div class="flex gap-2">
                <input
                    id="filterKeywordInput"
                    v-model="newKeyword"
                    name="filterKeywordInput"
                    type="text"
                    :placeholder="t('widgets.subscription.filterEditor.keywordPlaceholder')"
                    class="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    @keyup.enter="addKeyword"
                />
                <button
                    class="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                    @click="addKeyword"
                >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>{{ t('widgets.subscription.filterEditor.addBtn') }}</span>
                </button>
            </div>

            <!-- 已选关键词标签 -->
            <div
                v-if="customKeywords.length > 0"
                class="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 dark:border-white/10 dark:bg-white/5"
            >
                <span
                    v-for="k in customKeywords"
                    :key="k"
                    class="group inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 dark:border-white/10 dark:bg-white/10 dark:text-gray-200"
                >
                    <span>{{ k }}</span>
                    <button
                        class="text-gray-400 hover:text-danger-500 dark:hover:text-danger-400 transition-colors"
                        @click="removeKeyword(k)"
                    >
                        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </span>
            </div>
        </div>

        <!-- 预览/手动编辑 -->
        <div class="border-t border-gray-200 pt-3 dark:border-white/10">
            <div class="mb-2 flex items-center justify-between">
                <label
                    for="filterRuleTextarea"
                    class="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                    <span class="h-3 w-1 rounded-full bg-primary-500"></span>
                    {{ isManualMode ? t('widgets.subscription.filterEditor.manualEdit') : t('widgets.subscription.filterEditor.rulePreview') }}
                </label>
                <button
                    class="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                    @click="isManualMode = !isManualMode"
                >
                    {{ isManualMode ? t('widgets.subscription.filterEditor.visualMode') : t('widgets.subscription.filterEditor.manualMode') }}
                </button>
            </div>
            <textarea
                id="filterRuleTextarea"
                name="filterRuleTextarea"
                :value="modelValue"
                :readonly="!isManualMode"
                rows="3"
                :placeholder="placeholder || (isManualMode ? t('widgets.subscription.filterEditor.manualPlaceholder') : t('widgets.subscription.filterEditor.autoPlaceholder'))"
                class="w-full rounded-md border border-gray-200 bg-gray-900 px-3 py-2 font-mono text-xs text-emerald-400 transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-white/10 dark:bg-black/60"
                :class="{
                    'cursor-not-allowed opacity-75': !isManualMode
                }"
                @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
            ></textarea>

            <p
                v-if="!modelValue && !isManualMode"
                class="mt-1.5 text-center text-xs text-gray-400 dark:text-gray-500"
            >
                {{ t('widgets.subscription.filterEditor.hint') }}
            </p>
        </div>
    </div>

    <!-- 确认清空对话框 -->
    <Modal v-model:show="showClearConfirm" @confirm="confirmClear">
        <template #title>
            <div class="flex items-center gap-3">
                <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900/30"
                >
                    <svg
                        class="h-5 w-5 text-warning-600 dark:text-warning-400"
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
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('widgets.subscription.filterEditor.clearTitle') }}</h3>
            </div>
        </template>
        <template #body>
            <div class="space-y-3">
                <p class="text-base text-gray-700 dark:text-gray-300">{{ t('widgets.subscription.filterEditor.clearMsg1') }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('widgets.subscription.filterEditor.clearMsg2') }}
                </p>
            </div>
        </template>
    </Modal>
</template>
