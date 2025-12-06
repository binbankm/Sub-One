<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Modal from './BaseModal.vue';
import type { Profile, Subscription, Node } from '../../types';

const props = withDefaults(defineProps<{
  show: boolean;
  profile?: Profile | null;
  isNew?: boolean;
  allSubscriptions?: Subscription[];
  allManualNodes?: Node[];
}>(), {
  isNew: false,
  allSubscriptions: () => [],
  allManualNodes: () => []
});

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'save', profile: Profile): void;
}>();

const localProfile = ref<Profile>({
  id: '',
  name: '',
  enabled: true,
  subscriptions: [],
  manualNodes: [],
  customId: '',
  expiresAt: ''
});
const subscriptionSearchTerm = ref('');
const nodeSearchTerm = ref('');

// 国家/地区代码到旗帜和中文名称的映射
const countryCodeMap: Record<string, string[]> = {
  'hk': ['🇭🇰', '香港'],
  'tw': ['🇹🇼', '台湾', '臺灣'],
  'sg': ['🇸🇬', '新加坡', '狮城'],
  'jp': ['🇯🇵', '日本'],
  'us': ['🇺🇸', '美国', '美國'],
  'kr': ['🇰🇷', '韩国', '韓國'],
  'gb': ['🇬🇧', '英国', '英國'],
  'de': ['🇩🇪', '德国', '德國'],
  'fr': ['🇫🇷', '法国', '法國'],
  'ca': ['🇨🇦', '加拿大'],
  'au': ['🇦🇺', '澳大利亚', '澳洲', '澳大利亞'],
  'cn': ['🇨🇳', '中国', '大陸', '内地'],
  'my': ['🇲🇾', '马来西亚', '馬來西亞'],
  'th': ['🇹🇭', '泰国', '泰國'],
  'vn': ['🇻🇳', '越南'],
  'ph': ['🇵🇭', '菲律宾', '菲律賓'],
  'id': ['🇮🇩', '印度尼西亚', '印尼'],
  'in': ['🇮🇳', '印度'],
  'pk': ['🇵🇰', '巴基斯坦'],
  'bd': ['🇧🇩', '孟加拉国', '孟加拉國'],
  'ae': ['🇦🇪', '阿联酋', '阿聯酋'],
  'sa': ['🇸🇦', '沙特阿拉伯'],
  'tr': ['🇹🇷', '土耳其'],
  'ru': ['🇷🇺', '俄罗斯', '俄羅斯'],
  'br': ['🇧🇷', '巴西'],
  'mx': ['🇲🇽', '墨西哥'],
  'ar': ['🇦🇷', '阿根廷'],
  'cl': ['🇨🇱', '智利'],
  'za': ['🇿🇦', '南非'],
  'eg': ['🇪🇬', '埃及'],
  'ng': ['🇳🇬', '尼日利亚', '尼日利亞'],
  'ke': ['🇰🇪', '肯尼亚', '肯尼亞'],
  'il': ['🇮🇱', '以色列'],
  'ir': ['🇮🇷', '伊朗'],
  'iq': ['🇮🇶', '伊拉克'],
  'ua': ['🇺🇦', '乌克兰', '烏克蘭'],
  'pl': ['🇵🇱', '波兰', '波蘭'],
  'cz': ['🇨🇿', '捷克'],
  'hu': ['🇭🇺', '匈牙利'],
  'ro': ['🇷🇴', '罗马尼亚', '羅馬尼亞'],
  'gr': ['🇬🇷', '希腊', '希臘'],
  'pt': ['🇵🇹', '葡萄牙'],
  'es': ['🇪🇸', '西班牙'],
  'it': ['🇮🇹', '意大利'],
  'nl': ['🇳🇱', '荷兰', '荷蘭'],
  'be': ['🇧🇪', '比利时', '比利時'],
  'se': ['🇸🇪', '瑞典'],
  'no': ['🇳🇴', '挪威'],
  'dk': ['🇩🇰', '丹麦', '丹麥'],
  'fi': ['🇫🇮', '芬兰', '芬蘭'],
  'ch': ['🇨🇭', '瑞士'],
  'at': ['🇦🇹', '奥地利', '奧地利'],
  'ie': ['🇮🇪', '爱尔兰', '愛爾蘭'],
  'nz': ['🇳🇿', '新西兰', '紐西蘭'],
};

const filteredSubscriptions = computed(() => {
  // 基础过滤：保留已启用的，或者虽然已禁用但当前已被选中的
  let candidates = props.allSubscriptions.filter(sub => {
    const isEnabled = sub.enabled;
    const isSelected = localProfile.value.subscriptions && localProfile.value.subscriptions.includes(sub.id);
    return isEnabled || isSelected;
  });

  if (!subscriptionSearchTerm.value) {
    return candidates;
  }
  const lowerCaseSearchTerm = subscriptionSearchTerm.value.toLowerCase();
  const alternativeTerms = countryCodeMap[lowerCaseSearchTerm] || [];

  return candidates.filter(sub => {
    const subNameLower = sub.name ? sub.name.toLowerCase() : '';

    if (subNameLower.includes(lowerCaseSearchTerm)) {
      return true;
    }

    for (const altTerm of alternativeTerms) {
      if (subNameLower.includes(altTerm.toLowerCase())) {
        return true;
      }
    }
    return false;
  });
});

const filteredManualNodes = computed(() => {
  if (!nodeSearchTerm.value) {
    return props.allManualNodes;
  }
  const lowerCaseSearchTerm = nodeSearchTerm.value.toLowerCase();
  const alternativeTerms = countryCodeMap[lowerCaseSearchTerm] || [];

  return props.allManualNodes.filter(node => {
    const nodeNameLower = node.name ? node.name.toLowerCase() : '';

    if (nodeNameLower.includes(lowerCaseSearchTerm)) {
      return true;
    }

    for (const altTerm of alternativeTerms) {
      if (nodeNameLower.includes(altTerm.toLowerCase())) {
        return true;
      }
    }
    return false;
  });
});

watch(() => props.profile, (newProfile) => {
  if (newProfile) {
    const profileCopy = JSON.parse(JSON.stringify(newProfile));
    // Format date for input[type=date]
    if (profileCopy.expiresAt) {
      try {
        profileCopy.expiresAt = new Date(profileCopy.expiresAt).toISOString().split('T')[0];
      } catch (e) {
        console.error("Error parsing expiresAt date:", e);
        profileCopy.expiresAt = '';
      }
    }
    localProfile.value = profileCopy;
  } else {
    localProfile.value = { id: '', name: '', enabled: true, subscriptions: [], manualNodes: [], customId: '', expiresAt: '' };
  }
}, { deep: true, immediate: true });

const handleConfirm = () => {
  const profileToSave = JSON.parse(JSON.stringify(localProfile.value));
  if (profileToSave.expiresAt) {
    try {
      // Set time to the end of the selected day in local time, then convert to ISO string
      const date = new Date(profileToSave.expiresAt);
      date.setHours(23, 59, 59, 999);
      profileToSave.expiresAt = date.toISOString();
    } catch (e) {
      console.error("Error processing expiresAt date:", e);
      // Decide how to handle error: save as is, or clear it
      profileToSave.expiresAt = '';
    }
  }
  emit('save', profileToSave);
};

const toggleSelection = (listName: 'subscriptions' | 'manualNodes', id: string) => {
  const list = localProfile.value[listName];
  const index = list.indexOf(id);
  if (index > -1) {
    list.splice(index, 1);
  } else {
    list.push(id);
  }
};

const handleSelectAll = (listName: 'subscriptions' | 'manualNodes', sourceArray: { id: string }[]) => {
  const currentSelection = new Set(localProfile.value[listName]);
  sourceArray.forEach(item => currentSelection.add(item.id));
  localProfile.value[listName] = Array.from(currentSelection);
};

const handleDeselectAll = (listName: 'subscriptions' | 'manualNodes', sourceArray: { id: string }[]) => {
  const sourceIds = sourceArray.map(item => item.id);
  localProfile.value[listName] = localProfile.value[listName].filter(id => !sourceIds.includes(id));
};

</script>

<template>
  <Modal :show="show" @update:show="emit('update:show', $event)" @confirm="handleConfirm" size="2xl">
    <template #title>
      <h3 class="text-xl font-bold text-gray-800 dark:text-white">
        {{ isNew ? '新增订阅组' : '编辑订阅组' }}
      </h3>
    </template>
    <template #body>
      <div v-if="localProfile" class="space-y-6">
        <!-- 表单区域 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 订阅组名称 -->
          <div>
            <label for="profile-name" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              订阅组名称
            </label>
            <input type="text" id="profile-name" v-model="localProfile.name" placeholder="例如：家庭共享"
              class="input-modern-enhanced">
          </div>

          <!-- 自定义 ID -->
          <div>
            <label for="profile-custom-id" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              自定义 ID (可选)
            </label>
            <input type="text" id="profile-custom-id" v-model="localProfile.customId"
              placeholder="如: home, game (限字母、数字、-、_)" class="input-modern-enhanced">
            <p class="text-xs text-gray-400 mt-1.5">设置后，订阅链接会更短，如 /token/home</p>
          </div>

          <!-- 自定义后端 -->
          <div>
            <label for="profile-subconverter" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              自定义后端 (可选)
            </label>
            <input type="text" id="profile-subconverter" v-model="localProfile.subConverter" placeholder="留空则使用全局设置"
              class="input-modern-enhanced">
            <p class="text-xs text-gray-400 mt-1.5">为此订阅组指定一个独立的 SubConverter 后端地址。</p>
          </div>

          <!-- 自定义配置 -->
          <div>
            <label for="profile-subconfig" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              自定义远程配置 (可选)
            </label>
            <input type="text" id="profile-subconfig" v-model="localProfile.subConfig" placeholder="留空则使用全局设置"
              class="input-modern-enhanced">
            <p class="text-xs text-gray-400 mt-1.5">为此订阅组指定一个独立的 Subconverter 配置文件。</p>
          </div>

          <!-- 到期时间 -->
          <div class="md:col-span-1">
            <label for="profile-expires-at" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              到期时间 (可选)
            </label>
            <div class="relative">
              <input type="date" id="profile-expires-at" v-model="localProfile.expiresAt" class="input-modern-enhanced">
              <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-1.5">设置此订阅组的到期时间，到期后将返回默认节点。</p>
          </div>
        </div>

        <!-- 选择区域 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <!-- 选择订阅 -->
          <div class="flex flex-col h-80">
            <div class="flex justify-between items-center mb-3">
              <h4 class="text-sm font-bold text-gray-700 dark:text-gray-300">选择订阅</h4>
              <div class="space-x-3 text-sm">
                <button @click="handleSelectAll('subscriptions', filteredSubscriptions)"
                  class="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">全选</button>
                <button @click="handleDeselectAll('subscriptions', filteredSubscriptions)"
                  class="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">全不选</button>
              </div>
            </div>

            <div class="relative mb-3">
              <input type="text" v-model="subscriptionSearchTerm" placeholder="搜索订阅..." class="search-input-unified" />
              <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div
              class="flex-1 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-2 custom-scrollbar">
              <div v-if="filteredSubscriptions.length > 0" class="space-y-1">
                <div v-for="sub in filteredSubscriptions" :key="sub.id">
                  <label
                    class="flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 group relative overflow-hidden"
                    :class="localProfile.subscriptions?.includes(sub.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'">
                    <div v-if="localProfile.subscriptions?.includes(sub.id)"
                      class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                    <input type="checkbox" :checked="localProfile.subscriptions?.includes(sub.id)"
                      @change="toggleSelection('subscriptions', sub.id)"
                      class="h-5 w-5 rounded border-gray-300 text-indigo-600 transition-colors mr-3" />
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-200 truncate select-none">
                      {{ sub.name || '未命名订阅' }}
                      <span v-if="!sub.enabled" class="text-xs text-red-500 ml-1">(已禁用)</span>
                    </span>
                  </label>
                </div>
              </div>
              <div v-else class="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                没有找到订阅
              </div>
            </div>
          </div>

          <!-- 选择手动节点 -->
          <div class="flex flex-col h-80">
            <div class="flex justify-between items-center mb-3">
              <h4 class="text-sm font-bold text-gray-700 dark:text-gray-300">选择手动节点</h4>
              <div class="space-x-3 text-sm">
                <button @click="handleSelectAll('manualNodes', filteredManualNodes)"
                  class="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">全选</button>
                <button @click="handleDeselectAll('manualNodes', filteredManualNodes)"
                  class="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">全不选</button>
              </div>
            </div>

            <div class="relative mb-3">
              <input type="text" v-model="nodeSearchTerm" placeholder="搜索节点..." class="search-input-unified" />
              <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div
              class="flex-1 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-2 custom-scrollbar">
              <div v-if="filteredManualNodes.length > 0" class="space-y-1">
                <div v-for="node in filteredManualNodes" :key="node.id">
                  <label
                    class="flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 group relative overflow-hidden"
                    :class="localProfile.manualNodes?.includes(node.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'">
                    <div v-if="localProfile.manualNodes?.includes(node.id)"
                      class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                    <input type="checkbox" :checked="localProfile.manualNodes?.includes(node.id)"
                      @change="toggleSelection('manualNodes', node.id)"
                      class="h-5 w-5 rounded border-gray-300 text-indigo-600 transition-colors mr-3" />
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-200 truncate select-none">{{ node.name
                      || '未命名节点' }}</span>
                  </label>
                </div>
              </div>
              <div v-else class="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                没有找到节点
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 20px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}
</style>
