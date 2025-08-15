<!-- NavigationTabs.vue - 导航标签页组件 -->

<script setup>
import { computed } from 'vue';

// 接收当前激活的标签页和切换事件
const props = defineProps({
  modelValue: {
    type: String,
    default: 'subscriptions'
  },
  // 添加统计数据props
  subscriptionsCount: {
    type: Number,
    default: 0
  },
  profilesCount: {
    type: Number,
    default: 0
  },
  manualNodesCount: {
    type: Number,
    default: 0
  },
  generatorCount: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['update:modelValue']);

// 标签页状态管理
const activeTab = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// 功能模块配置
const modules = [
  {
    id: 'subscriptions',
    name: '订阅管理',
    description: '管理机场订阅',
    icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
    color: 'from-blue-500 to-indigo-600',
    dotColor: 'bg-blue-500',
    count: computed(() => props.subscriptionsCount),
    activeIconColor: 'text-blue-400',
    activeBorderColor: 'border-blue-400',
    activeShadowColor: 'shadow-blue-500/20'
  },
  {
    id: 'profiles',
    name: '订阅组',
    description: '组合管理节点',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    color: 'from-purple-500 to-pink-600',
    dotColor: 'bg-purple-500',
    count: computed(() => props.profilesCount),
    activeIconColor: 'text-purple-400',
    activeBorderColor: 'border-purple-400',
    activeShadowColor: 'shadow-purple-500/20'
  },
  {
    id: 'generator',
    name: '生成订阅链接',
    description: '生成各种格式链接',
    icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    color: 'from-orange-500 to-red-600',
    dotColor: 'bg-orange-500',
    count: computed(() => props.generatorCount),
    activeIconColor: 'text-orange-400',
    activeBorderColor: 'border-orange-400',
    activeShadowColor: 'shadow-orange-500/20'
  },
  {
    id: 'nodes',
    name: '手动节点',
    description: '管理单个节点链接',
    icon: 'M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4',
    color: 'from-green-500 to-emerald-600',
    dotColor: 'bg-green-500',
    count: computed(() => props.manualNodesCount),
    activeIconColor: 'text-green-400',
    activeBorderColor: 'border-green-400',
    activeShadowColor: 'shadow-green-500/20'
  }
];

// 切换标签页
const switchTab = (tabId) => {
  activeTab.value = tabId;
};


</script>

<template>
  <div class="navigation-tabs-container">
    <!-- 四个功能模块统计框 -->
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div 
          v-for="module in modules" 
          :key="module.id"
          @click="switchTab(module.id)"
          :class="[
            'bg-white/60 dark:bg-gray-800/75 rounded-2xl p-6 border shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer',
            activeTab === module.id 
              ? `${module.activeBorderColor} ${module.activeShadowColor} scale-105` 
              : 'border-gray-300/50 dark:border-gray-700/30 hover:bg-white/70 dark:hover:bg-gray-800/85 hover:scale-105'
          ]"
        >
          <div class="flex items-center gap-4">
            <div :class="['w-12 h-12 bg-gradient-to-br rounded-2xl flex items-center justify-center shadow-lg', module.color]">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                :class="['h-6 w-6 transition-colors duration-300', activeTab === module.id ? module.activeIconColor : 'text-gray-700 dark:text-white']" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" :d="module.icon" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ module.name }}</p>
              <div class="flex items-center gap-2">
                <div :class="['w-3 h-3 rounded-full', module.dotColor]"></div>
                <span class="text-2xl font-bold text-gray-800 dark:text-white">{{ module.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.navigation-tabs-container {
  /* 移除sticky定位，让组件正常流动 */
  position: relative;
  z-index: 20;
}

/* 深色主题优化 */
.bg-gray-800 {
  background-color: rgb(31, 41, 55);
}

.bg-gray-700 {
  background-color: rgb(55, 65, 81);
}

.bg-gray-700\/80 {
  background-color: rgba(55, 65, 81, 0.8);
}

.bg-gray-700\/90 {
  background-color: rgba(55, 65, 81, 0.9);
}

.border-gray-700 {
  border-color: rgb(55, 65, 81);
}

.border-gray-600\/50 {
  border-color: rgba(75, 85, 99, 0.5);
}

.text-gray-300 {
  color: rgb(209, 213, 219);
}

.text-gray-400 {
  color: rgb(156, 163, 175);
}

.text-white {
  color: rgb(255, 255, 255);
}

.ring-blue-500\/50 {
  --tw-ring-color: rgba(59, 130, 246, 0.5);
}

/* 渐变背景 */
.bg-gradient-to-br {
  background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
}

.from-blue-500 {
  --tw-gradient-from: #3b82f6;
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(59, 130, 246, 0));
}

.to-indigo-600 {
  --tw-gradient-to: #4f46e5;
}

.from-purple-500 {
  --tw-gradient-from: #a855f7;
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(168, 85, 247, 0));
}

.to-pink-600 {
  --tw-gradient-to: #db2777;
}

.from-orange-500 {
  --tw-gradient-from: #f97316;
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(249, 115, 22, 0));
}

.to-red-600 {
  --tw-gradient-to: #dc2626;
}

.from-green-500 {
  --tw-gradient-from: #22c55e;
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(34, 197, 94, 0));
}

.to-emerald-600 {
  --tw-gradient-to: #059669;
}

/* 状态指示点颜色 */
.bg-blue-500 {
  background-color: rgb(59, 130, 246);
}

.bg-green-500 {
  background-color: rgb(34, 197, 94);
}

.bg-red-500 {
  background-color: rgb(239, 68, 68);
}

.bg-purple-500 {
  background-color: rgb(168, 85, 247);
}

/* 悬停和激活状态 */
.hover\:scale-105:hover {
  transform: scale(1.05);
}

.hover\:bg-gray-700\/90:hover {
  background-color: rgba(55, 65, 81, 0.9);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .grid-cols-1 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

@media (min-width: 640px) and (max-width: 1024px) {
  .sm\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* 半透明深色背景效果 */
.bg-gray-900\/70 {
  background-color: rgba(17, 24, 39, 0.7);
}

.bg-gray-800\/75 {
  background-color: rgba(31, 41, 55, 0.75);
}

.bg-gray-800\/80 {
  background-color: rgba(31, 41, 55, 0.8);
}

/* 边框样式 */
.border-gray-700\/30 {
  border-color: rgba(55, 65, 81, 0.3);
}

/* 阴影效果 */
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.shadow-xl {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.hover\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* 激活状态样式 */
.border-blue-400 {
  border-color: rgb(96, 165, 250);
  border-width: 2px;
}

.border-purple-400 {
  border-color: rgb(192, 132, 252);
  border-width: 2px;
}

.border-orange-400 {
  border-color: rgb(251, 146, 60);
  border-width: 2px;
}

.border-green-400 {
  border-color: rgb(74, 222, 128);
  border-width: 2px;
}

/* 激活状态阴影 */
.shadow-blue-500\/20 {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.2), 0 0 40px rgba(59, 130, 246, 0.1);
}

.shadow-purple-500\/20 {
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.2), 0 0 40px rgba(168, 85, 247, 0.1);
}

.shadow-orange-500\/20 {
  box-shadow: 0 0 20px rgba(249, 115, 22, 0.2), 0 0 40px rgba(249, 115, 22, 0.1);
}

.shadow-green-500\/20 {
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.2), 0 0 40px rgba(34, 197, 94, 0.1);
}

/* 激活状态文字颜色 */
.text-blue-400 {
  color: rgb(96, 165, 250);
}

.text-purple-400 {
  color: rgb(192, 132, 252);
}

.text-orange-400 {
  color: rgb(251, 146, 60);
}

.text-green-400 {
  color: rgb(74, 222, 128);
}
</style>
