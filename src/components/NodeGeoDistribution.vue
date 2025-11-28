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

// 国家/地区关键词映射
const countryKeywords = {
  '🇭🇰 香港': ['香港', 'HK', 'Hong Kong', '港'],
  '🇯🇵 日本': ['日本', 'JP', 'Japan', '东京', 'Tokyo', '大阪', 'Osaka'],
  '🇸🇬 新加坡': ['新加坡', 'SG', 'Singapore', '狮城'],
  '🇺🇸 美国': ['美国', 'US', 'USA', 'America', '洛杉矶', 'LA', '西雅图', 'Seattle'],
  '🇹🇼 台湾': ['台湾', 'TW', 'Taiwan', '台北', 'Taipei'],
  '🇰🇷 韩国': ['韩国', 'KR', 'Korea', '首尔', 'Seoul'],
  '🇬🇧 英国': ['英国', 'UK', 'Britain', '伦敦', 'London'],
  '🇩🇪 德国': ['德国', 'DE', 'Germany', '法兰克福', 'Frankfurt'],
  '🇨🇦 加拿大': ['加拿大', 'CA', 'Canada'],
  '🇦🇺 澳大利亚': ['澳大利亚', 'AU', 'Australia', '悉尼', 'Sydney'],
  '🇷🇺 俄罗斯': ['俄罗斯', 'RU', 'Russia', '莫斯科', 'Moscow'],
  '🇮🇳 印度': ['印度', 'IN', 'India'],
  '🇹🇭 泰国': ['泰国', 'TH', 'Thailand', '曼谷', 'Bangkok'],
  '🇻🇳 越南': ['越南', 'VN', 'Vietnam'],
  '🇵🇭 菲律宾': ['菲律宾', 'PH', 'Philippines'],
  '🇲🇾 马来西亚': ['马来西亚', 'MY', 'Malaysia'],
  '🇫🇷 法国': ['法国', 'FR', 'France', '巴黎', 'Paris'],
  '🇳🇱 荷兰': ['荷兰', 'NL', 'Netherlands', '阿姆斯特丹'],
  '🇦🇪 阿联酋': ['阿联酋', 'AE', 'UAE', '迪拜', 'Dubai'],
  '🇧🇷 巴西': ['巴西', 'BR', 'Brazil'],
  '🇦🇷 阿根廷': ['阿根廷', 'AR', 'Argentina'],
  '🇿🇦 南非': ['南非', 'ZA', 'South Africa'],
  '🌍 其他': []
};

// 识别节点所属国家/地区
const identifyCountry = (name) => {
  if (!name) return '🌍 其他';
  
  for (const [country, keywords] of Object.entries(countryKeywords)) {
    if (country === '🌍 其他') continue;
    for (const keyword of keywords) {
      if (name.toLowerCase().includes(keyword.toLowerCase())) {
        return country;
      }
    }
  }
  return '🌍 其他';
};

// 计算地理分布数据
const geoDistribution = computed(() => {
  const distribution = {};
  
  // 统计各订阅的节点
  props.subscriptions.forEach(sub => {
    if (!sub.nodes || !Array.isArray(sub.nodes)) return;
    
    sub.nodes.forEach(node => {
      const country = identifyCountry(node.name || node.remarks || '');
      distribution[country] = (distribution[country] || 0) + 1;
    });
  });
  
  // 统计手动节点
  props.manualNodes.forEach(node => {
    const country = identifyCountry(node.name || node.remarks || '');
    distribution[country] = (distribution[country] || 0) + 1;
  });
  
  // 转换为数组并排序
  return Object.entries(distribution)
    .map(([country, count]) => ({ country, count }))
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

// 根据节点数量返回渐变色类
const getGradientClass = (index) => {
  const gradients = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-cyan-500 to-blue-500',
    'from-pink-500 to-rose-500',
    'from-emerald-500 to-teal-500',
    'from-yellow-500 to-orange-500',
    'from-violet-500 to-purple-500',
    'from-teal-500 to-cyan-500',
    'from-rose-500 to-pink-500'
  ];
  return gradients[index % gradients.length];
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
        :key="item.country"
        class="group relative overflow-hidden rounded-xl p-4 bg-white/60 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/30 hover:scale-105 transition-all duration-300 cursor-pointer"
      >
        <!-- 背景渐变 -->
        <div class="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" :class="`bg-gradient-to-br ${getGradientClass(index)}`"></div>
        
        <div class="relative z-10">
          <div class="flex items-center justify-between mb-2">
            <span class="text-2xl">{{ item.country.split(' ')[0] }}</span>
            <span class="text-xl font-bold text-gray-900 dark:text-white">{{ item.count }}</span>
          </div>
          <div class="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
            {{ item.country.split(' ')[1] || item.country }}
          </div>
          
          <!-- 进度条 -->
          <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
            <div 
              class="h-1.5 rounded-full transition-all duration-500" 
              :class="`bg-gradient-to-r ${getGradientClass(index)}`"
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
