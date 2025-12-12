<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import Modal from '../modals/BaseModal.vue';

const props = withDefaults(defineProps<{
    modelValue?: string;
}>(), {
    modelValue: ''
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
}>();

// 预定义数据
const protocols = [
    { label: 'Shadowsocks', value: 'ss', icon: '🔒' },
    { label: 'VMess', value: 'vmess', icon: '⚡' },
    { label: 'VLESS', value: 'vless', icon: '🚀' },
    { label: 'Trojan', value: 'trojan', icon: '🛡️' },
    { label: 'Hysteria2', value: 'hysteria2', icon: '⚡' },
    { label: 'Tuic', value: 'tuic', icon: '🚀' },
    { label: 'Socks5', value: 'socks5', icon: '🔌' },
    { label: 'WireGuard', value: 'wg|wireguard', icon: '🔐' },
    { label: 'Reality', value: 'reality', icon: '🌐' }
];

const regions = [
    { label: '香港', value: 'HK|Hong Kong|HongKong|香港|Hong K', flag: '🇭🇰' },
    { label: '台湾', value: 'TW|Taiwan|Tai Wan|台湾|臺灣|台北|Taipei', flag: '🇹🇼' },
    { label: '新加坡', value: 'SG|Singapore|Singpore|新加坡|狮城|SGP', flag: '🇸🇬' },
    { label: '日本', value: 'JP|Japan|日本|东京|Tokyo|Osaka|大阪', flag: '🇯🇵' },
    { label: '美国', value: 'US|United States|America|USA|美国|美國|洛杉矶|Los Angeles|San Jose|New York', flag: '🇺🇸' },
    { label: '韩国', value: 'KR|Korea|South Korea|韩国|韓國|首尔|Seoul', flag: '🇰🇷' },
    { label: '中国', value: 'CN|China|中国|回国|内地|江苏|北京|上海|广州|深圳|杭州', flag: '🇨🇳' },
    { label: '英国', value: 'GB|UK|United Kingdom|Britain|英国|伦敦|London', flag: '🇬🇧' },
    { label: '德国', value: 'DE|Germany|Deutschland|德国|法兰克福|Frankfurt', flag: '🇩🇪' },
    { label: '澳洲', value: 'AU|Australia|澳洲|澳大利亚|悉尼|Sydney', flag: '🇦🇺' },
    { label: '加拿大', value: 'CA|Canada|加拿大|多伦多|Toronto|Vancouver', flag: '🇨🇦' },
    { label: '印度', value: 'IN|India|印度|孟买|Mumbai', flag: '🇮🇳' },
    { label: '俄罗斯', value: 'RU|Russia|俄罗斯|莫斯科|Moscow', flag: '🇷🇺' },
    { label: '法国', value: 'FR|France|法国|巴黎|Paris', flag: '🇫🇷' },
    { label: '荷兰', value: 'NL|Netherlands|Holland|荷兰|阿姆斯特丹', flag: '🇳🇱' }
];

const commonKeywords = [
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
    { value: '游戏', color: 'pink' },
    { value: '流媒体', color: 'violet' },
    { value: '解锁', color: 'rose' },
    { value: '过期', color: 'gray' },
    { value: '官网', color: 'slate' },
    { value: '剩余流量', color: 'zinc' },
    { value: '到期', color: 'neutral' },
    { value: '重置', color: 'stone' },
    { value: '测试', color: 'warmGray' }
];

// 状态
const mode = ref<'exclude' | 'keep'>('exclude');
const selectedProtocols = ref<string[]>([]);
const selectedRegions = ref<string[]>([]);
const customKeywords = ref<string[]>([]);
const newKeyword = ref('');
const isManualMode = ref(false);

// 计算统计信息
const ruleCount = computed(() => {
    let count = 0;
    if (selectedProtocols.value.length > 0) count++;
    if (selectedRegions.value.length > 0) count++;
    if (customKeywords.value.length > 0) count++;
    return count;
});

// 解析逻辑
const parseValue = (val: string) => {
    if (!val) return;

    const lines = val.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    const hasKeep = lines.some(l => l.startsWith('keep:'));
    mode.value = hasKeep ? 'keep' : 'exclude';

    const cleanLines = lines.map(l => l.replace(/^keep:/, ''));

    let foundProtocols: string[] = [];
    let foundRegions: string[] = [];
    let foundKeywords: string[] = [];

    cleanLines.forEach(line => {
        if (line.startsWith('proto:')) {
            const protos = line.replace('proto:', '').split(',');
            foundProtocols.push(...protos);
        } else {
            let matchedRegion = false;
            for (const r of regions) {
                if (line === `(${r.value})` || line === r.value) {
                    foundRegions.push(r.value);
                    matchedRegion = true;
                    break;
                }
            }

            if (!matchedRegion) {
                const cleanKey = line.replace(/^\(/, '').replace(/\)$/, '');
                const keys = cleanKey.split('|');
                foundKeywords.push(...keys);
            }
        }
    });

    selectedProtocols.value = [...new Set(foundProtocols)];
    selectedRegions.value = [...new Set(foundRegions)];
    customKeywords.value = [...new Set(foundKeywords)];
};

// 生成规则字符串
const generateString = () => {
    if (isManualMode.value) return props.modelValue;

    const lines: string[] = [];
    const prefix = mode.value === 'keep' ? 'keep:' : '';

    if (selectedProtocols.value.length > 0) {
        lines.push(`${prefix}proto:${selectedProtocols.value.join(',')}`);
    }

    if (selectedRegions.value.length > 0) {
        const regionPattern = selectedRegions.value.join('|');
        lines.push(`${prefix}(${regionPattern})`);
    }

    if (customKeywords.value.length > 0) {
        const keywordPattern = customKeywords.value.join('|');
        lines.push(`${prefix}(${keywordPattern})`);
    }

    return lines.join('\n');
};

// 监听状态变化
watch([mode, selectedProtocols, selectedRegions, customKeywords], () => {
    if (!isManualMode.value) {
        emit('update:modelValue', generateString());
    }
}, { deep: true });

// 初始化
onMounted(() => {
    if (props.modelValue) {
        parseValue(props.modelValue);
    }
});

// 操作方法
const addKeyword = () => {
    const trimmed = newKeyword.value.trim();
    if (trimmed && !customKeywords.value.includes(trimmed)) {
        customKeywords.value.push(trimmed);
        newKeyword.value = '';
    }
};

const removeKeyword = (k: string) => {
    customKeywords.value = customKeywords.value.filter(item => item !== k);
};

const toggleRegion = (rValue: string) => {
    const index = selectedRegions.value.indexOf(rValue);
    if (index === -1) {
        selectedRegions.value.push(rValue);
    } else {
        selectedRegions.value.splice(index, 1);
    }
};

const toggleProtocol = (pValue: string) => {
    const index = selectedProtocols.value.indexOf(pValue);
    if (index === -1) {
        selectedProtocols.value.push(pValue);
    } else {
        selectedProtocols.value.splice(index, 1);
    }
};

const toggleKeyword = (k: string) => {
    if (customKeywords.value.includes(k)) {
        removeKeyword(k);
    } else {
        customKeywords.value.push(k);
    }
};

// 确认清空对话框状态
const showClearConfirm = ref(false);

const clearAll = () => {
    showClearConfirm.value = true;
};

const confirmClear = () => {
    selectedProtocols.value = [];
    selectedRegions.value = [];
    customKeywords.value = [];
    showClearConfirm.value = false;
};
</script>

<template>
    <div
        class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-5 shadow-lg">

        <!-- 顶部：模式切换和统计 -->
        <div class="flex items-center justify-between">
            <div
                class="flex bg-white dark:bg-gray-800 rounded-xl p-1.5 shadow-sm border border-gray-200 dark:border-gray-700">
                <button @click="mode = 'exclude'"
                    class="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2"
                    :class="mode === 'exclude'
                        ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md transform scale-105'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
                    <span>🚫</span>
                    <span>排除模式</span>
                    <span v-if="mode === 'exclude'" class="text-xs opacity-75">(黑名单)</span>
                </button>
                <button @click="mode = 'keep'"
                    class="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2"
                    :class="mode === 'keep'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md transform scale-105'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'">
                    <span>✅</span>
                    <span>保留模式</span>
                    <span v-if="mode === 'keep'" class="text-xs opacity-75">(白名单)</span>
                </button>
            </div>

            <div class="flex items-center gap-3">
                <span v-if="ruleCount > 0"
                    class="text-xs px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">
                    {{ ruleCount }} 条规则
                </span>
                <button @click="clearAll"
                    class="text-xs px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 font-medium">
                    🗑️ 清空
                </button>
            </div>
        </div>

        <!-- 协议选择 -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <label class="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span class="w-1 h-5 bg-indigo-500 rounded-full"></span>
                    协议类型
                </label>
                <span v-if="selectedProtocols.length > 0" class="text-xs text-gray-400">
                    已选 {{ selectedProtocols.length }} 个
                </span>
            </div>
            <div class="flex flex-wrap gap-2">
                <button v-for="p in protocols" :key="p.value" @click="toggleProtocol(p.value)"
                    class="group px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all duration-300 transform hover:scale-105"
                    :class="selectedProtocols.includes(p.value)
                        ? 'bg-gradient-to-r from-indigo-500 to-blue-600 border-indigo-300 dark:border-indigo-700 text-white shadow-lg shadow-indigo-500/50'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md'">
                    <span class="mr-1">{{ p.icon }}</span>
                    {{ p.label }}
                </button>
            </div>
        </div>

        <!-- 地区选择 -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <label class="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span class="w-1 h-5 bg-emerald-500 rounded-full"></span>
                    常用地区
                </label>
                <span v-if="selectedRegions.length > 0" class="text-xs text-gray-400">
                    已选 {{ selectedRegions.length }} 个
                </span>
            </div>
            <div class="flex flex-wrap gap-2">
                <button v-for="r in regions" :key="r.value" @click="toggleRegion(r.value)"
                    class="group px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all duration-300 transform hover:scale-105"
                    :class="selectedRegions.includes(r.value)
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 border-emerald-300 dark:border-emerald-700 text-white shadow-lg shadow-emerald-500/50'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md'">
                    <span class="mr-1.5">{{ r.flag }}</span>
                    {{ r.label }}
                </button>
            </div>
        </div>

        <!-- 关键词 -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <label class="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span class="w-1 h-5 bg-amber-500 rounded-full"></span>
                    关键词过滤
                </label>
                <span v-if="customKeywords.length > 0" class="text-xs text-gray-400">
                    已选 {{ customKeywords.length }} 个
                </span>
            </div>

            <!-- 常用词快捷选择 -->
            <div class="flex flex-wrap gap-2">
                <button v-for="k in commonKeywords" :key="k.value" @click="toggleKeyword(k.value)"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-dashed transition-all duration-200 transform hover:scale-105"
                    :class="customKeywords.includes(k.value)
                        ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300 shadow-sm'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-500'">
                    {{ k.value }}
                </button>
            </div>

            <!-- 自定义输入 -->
            <div class="flex gap-2">
                <input v-model="newKeyword" @keyup.enter="addKeyword" type="text" placeholder="✍️ 输入关键词后回车添加..."
                    class="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all">
                <button @click="addKeyword"
                    class="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    ➕ 添加
                </button>
            </div>

            <!-- 已选关键词标签 -->
            <div v-if="customKeywords.length > 0"
                class="flex flex-wrap gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <span v-for="k in customKeywords" :key="k"
                    class="group inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:border-red-400 dark:hover:border-red-500 transition-all">
                    <span>{{ k }}</span>
                    <button @click="removeKeyword(k)"
                        class="ml-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 font-bold text-lg leading-none transition-colors">
                        ×
                    </button>
                </span>
            </div>
        </div>

        <!-- 预览/手动编辑 -->
        <div class="pt-4 border-t-2 border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-3">
                <label class="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span class="w-1 h-5 bg-purple-500 rounded-full"></span>
                    {{ isManualMode ? '手动编辑' : '规则预览' }}
                </label>
                <button @click="isManualMode = !isManualMode"
                    class="text-xs px-4 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded-lg font-medium transition-all transform hover:scale-105">
                    {{ isManualMode ? '📊 可视化模式' : '⌨️ 手动编辑' }}
                </button>
            </div>
            <textarea :value="modelValue"
                @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
                :readonly="!isManualMode" rows="4" :placeholder="isManualMode ? '在此手动编辑过滤规则...' : '规则将自动生成在这里'"
                class="w-full px-4 py-3 bg-gray-900 dark:bg-black border-2 border-gray-300 dark:border-gray-700 rounded-xl text-sm font-mono text-green-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                :class="{ 'opacity-60 cursor-not-allowed': !isManualMode, 'focus:border-purple-500': isManualMode }"></textarea>

            <p v-if="!modelValue && !isManualMode" class="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
                💡 提示：选择上方的选项来创建过滤规则
            </p>
        </div>

    </div>

    <!-- 确认清空对话框 -->
    <Modal v-model:show="showClearConfirm" @confirm="confirmClear">
        <template #title>
            <div class="flex items-center gap-3">
                <div
                    class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                    确认清空规则
                </h3>
            </div>
        </template>
        <template #body>
            <div class="space-y-3">
                <p class="text-base text-gray-700 dark:text-gray-300">
                    确定要清空所有过滤规则吗？
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    此操作将清除所有已选的协议、地区和关键词。
                </p>
            </div>
        </template>
    </Modal>
</template>
