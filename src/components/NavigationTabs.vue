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
            'bg-white/70 dark:bg-gray-800/80 rounded-3xl p-6 border shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer backdrop-blur-xl',
            activeTab === module.id 
              ? `${module.activeBorderColor} ${module.activeShadowColor} scale-105 shadow-glow` 
              : 'border-gray-300/60 dark:border-gray-700/40 hover:bg-white/80 dark:hover:bg-gray-800/90 hover:scale-105 hover:shadow-2xl'
          ]"
        >
          <div class="flex items-center gap-4">
            <div :class="['w-14 h-14 bg-gradient-to-br rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden', module.color]">
              <!-- 光效装饰 -->
              <div class="absolute inset-0 bg-white/20 rounded-3xl"></div>
                              <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  :class="['h-7 w-7 transition-colors duration-500 drop-shadow-lg', activeTab === module.id ? module.activeIconColor : 'text-gray-700 dark:text-white']" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  stroke-width="2"
                >
                <path stroke-linecap="round" stroke-linejoin="round" :d="module.icon" />
              </svg>
            </div>
            <div>
              <p class="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2 drop-shadow-sm">{{ module.name }}</p>
              <div class="flex items-center gap-3">
                <div :class="['w-4 h-4 rounded-full shadow-lg', module.dotColor]"></div>
                <span class="text-3xl font-black text-gray-900 dark:text-white drop-shadow-lg">{{ module.count }}</span>
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
  position: relative;
  z-index: 20;
}

/* 激活状态边框样式 */
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

/* 激活状态阴影效果 - 美化升级版 */
.shadow-blue-500\/20 {
  box-shadow: 0 0 30px rgba(59, 130, 246, 0.3), 0 0 60px rgba(59, 130, 246, 0.15), 0 8px 32px rgba(59, 130, 246, 0.1);
}

.shadow-purple-500\/20 {
  box-shadow: 0 0 30px rgba(168, 85, 247, 0.3), 0 0 60px rgba(168, 85, 247, 0.15), 0 8px 32px rgba(168, 85, 247, 0.1);
}

.shadow-orange-500\/20 {
  box-shadow: 0 0 30px rgba(249, 115, 22, 0.3), 0 0 60px rgba(249, 115, 22, 0.15), 0 8px 32px rgba(249, 115, 22, 0.1);
}

.shadow-green-500\/20 {
  box-shadow: 0 0 30px rgba(34, 197, 94, 0.3), 0 0 60px rgba(34, 197, 94, 0.15), 0 8px 32px rgba(34, 197, 94, 0.1);
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
