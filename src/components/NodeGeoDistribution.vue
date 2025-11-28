<script setup>
import { computed } from 'vue';

const props = defineProps({
  subscriptions: {
    type: Array,
    default: () => []
  },
  manualNodes: {
    type: Array,
    default: () => []
  }
});

// 国家/地区配置（不使用emoji，使用国家代码和颜色）
const countryConfig = {
  '香港': { code: 'HK', name: '香港', color: 'from-red-500 to-orange-500', keywords: ['香港', 'HK', 'Hong Kong', '港'] },
  '日本': { code: 'JP', name: '日本', color: 'from-pink-500 to-rose-500', keywords: ['日本', 'JP', 'Japan', '东京', 'Tokyo', '大阪', 'Osaka'] },
  '新加坡': { code: 'SG', name: '新加坡', color: 'from-red-500 to-pink-500', keywords: ['新加坡', 'SG', 'Singapore', '狮城'] },
  '美国': { code: 'US', name: '美国', color: 'from-blue-500 to-cyan-500', keywords: ['美国', 'US', 'USA', 'America', '洛杉矶', 'LA', '西雅图', 'Seattle'] },
  '台湾': { code: 'TW', name: '台湾', color: 'from-blue-500 to-indigo-500', keywords: ['台湾', 'TW', 'Taiwan', '台北', 'Taipei'] },
  '韩国': { code: 'KR', name: '韩国', color: 'from-blue-400 to-cyan-400', keywords: ['韩国', 'KR', 'Korea', '首尔', 'Seoul'] },
  '英国': { code: 'GB', name: '英国', color: 'from-blue-600 to-indigo-600', keywords: ['英国', 'UK', 'Britain', '伦敦', 'London'] },
  '德国': { code: 'DE', name: '德国', color: 'from-gray-700 to-red-600', keywords: ['德国', 'DE', 'Germany', '法兰克福', 'Frankfurt'] },
  '加拿大': { code: 'CA', name: '加拿大', color: 'from-red-600 to-red-500', keywords: ['加拿大', 'CA', 'Canada'] },
  '澳大利亚': { code: 'AU', name: '澳大利亚', color: 'from-blue-500 to-green-500', keywords: ['澳大利亚', 'AU', 'Australia', '悉尼', 'Sydney'] },
  '俄罗斯': { code: 'RU', name: '俄罗斯', color: 'from-blue-600 to-red-600', keywords: ['俄罗斯', 'RU', 'Russia', '莫斯科', 'Moscow'] },
  '印度': { code: 'IN', name: '印度', color: 'from-orange-500 to-green-500', keywords: ['印度', 'IN', 'India'] },
  '泰国': { code: 'TH', name: '泰国', color: 'from-red-500 to-blue-500', keywords: ['泰国', 'TH', 'Thailand', '曼谷', 'Bangkok'] },
  '越南': { code: 'VN', name: '越南', color: 'from-red-600 to-yellow-500', keywords: ['越南', 'VN', 'Vietnam'] },
  '菲律宾': { code: 'PH', name: '菲律宾', color: 'from-blue-500 to-red-500', keywords: ['菲律宾', 'PH', 'Philippines'] },
  '马来西亚': { code: 'MY', name: '马来西亚', color: 'from-blue-600 to-yellow-500', keywords: ['马来西亚', 'MY', 'Malaysia'] },
  '法国': { code: 'FR', name: '法国', color: 'from-blue-600 to-red-600', keywords: ['法国', 'FR', 'France', '巴黎', 'Paris'] },
  '荷兰': { code: 'NL', name: '荷兰', color: 'from-red-500 to-orange-500', keywords: ['荷兰', 'NL', 'Netherlands', '阿姆斯特丹'] },
  '阿联酋': { code: 'AE', name: '阿联酋', color: 'from-green-600 to-red-600', keywords: ['阿联酋', 'AE', 'UAE', '迪拜', 'Dubai'] },
  '巴西': { code: 'BR', name: '巴西', color: 'from-green-500 to-yellow-400', keywords: ['巴西', 'BR', 'Brazil'] },
  '阿根廷': { code: 'AR', name: '阿根廷', color: 'from-blue-400 to-yellow-300', keywords: ['阿根廷', 'AR', 'Argentina'] },
  '南非': { code: 'ZA', name: '南非', color: 'from-green-600 to-yellow-500', keywords: ['南非', 'ZA', 'South Africa'] },
  '其他': { code: '??', name: '其他', color: 'from-gray-500 to-gray-600', keywords: [] }
};

// 识别节点所属国家/地区
const identifyCountry = (name) => {
  if (!name) return countryConfig['其他'];
  
  for (const [, config] of Object.entries(countryConfig)) {
    if (config.name === '其他') continue;
    for (const keyword of config.keywords) {
      if (name.toLowerCase().includes(keyword.toLowerCase())) {
        return config;
      }
    }
  }
  return countryConfig['其他'];
};

// 计算地理分布数据
const geoDistribution = computed(() => {
  const distribution = {};
  
  // 统计各订阅的节点
  props.subscriptions.forEach(sub => {
    if (!sub.nodes || !Array.isArray(sub.nodes)) return;
    
    sub.nodes.forEach(node => {
      const country = identifyCountry(node.name || node.remarks || '');
      const key = country.name;
      if (!distribution[key]) {
        distribution[key] = { ...country, count: 0 };
      }
      distribution[key].count++;
    });
  });
  
  // 统计手动节点
  props.manualNodes.forEach(node => {
    const country = identifyCountry(node.name || node.remarks || '');
    const key = country.name;
    if (!distribution[key]) {
      distribution[key] = { ...country, count: 0 };
    }
    distribution[key].count++;
  });
  
  // 转换为数组并排序
  return Object.values(distribution)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12); // 只显示前12个
});

// 计算总节点数
const totalNodes = computed(() => {
  return geoDistribution.value.reduce((sum, item) => sum + item.count, 0);
});

// 计算百分比
const getPercentage = (count) => {
  if (totalNodes.value === 0) return 0;
  return ((count / totalNodes.value) * 100).toFixed(1);
};
</script>

<template>
  <div class="bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/90 dark:to-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">节点地理分布</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ totalNodes }} 个节点分布在 {{ geoDistribution.length }} 个地区</p>
        </div>
      </div>
    </div>
    
    <div v-if="geoDistribution.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <div 
        v-for="(item, index) in geoDistribution" 
        :key="item.name"
        class="group relative overflow-hidden rounded-xl p-4 bg-white/60 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/30 hover:scale-105 transition-all duration-300 cursor-pointer"
      >
        <!-- 背景渐变 -->
        <div class="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" :class="`bg-gradient-to-br ${item.color}`"></div>
        
        <div class="relative z-10">
          <div class="flex items-center justify-between mb-2">
            <span class="px-2 py-1 rounded-lg bg-gradient-to-r text-white font-bold text-xs shadow-md" :class="item.color">
              {{ item.code }}
            </span>
            <span class="text-xl font-bold text-gray-900 dark:text-white">{{ item.count }}</span>
          </div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            {{ item.name }}
          </div>
          
          <!-- 进度条 -->
          <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
            <div 
              class="h-1.5 rounded-full transition-all duration-500" 
              :class="`bg-gradient-to-r ${item.color}`"
              :style="{ width: getPercentage(item.count) + '%' }"
            ></div>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
            {{ getPercentage(item.count) }}%
          </div>
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-gray-500 dark:text-gray-400">暂无节点数据</p>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 20px 5px rgba(59, 130, 246, 0.2);
  }
}

.group:hover {
  animation: pulse-glow 2s ease-in-out infinite;
}
</style>
