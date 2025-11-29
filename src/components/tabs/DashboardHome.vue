<script setup>
defineProps({
  subscriptions: { type: Array, required: true },
  activeSubscriptions: { type: Number, required: true },
  totalNodeCount: { type: Number, required: true },
  activeNodeCount: { type: Number, required: true },
  profiles: { type: Array, required: true },
  activeProfiles: { type: Number, required: true },
  manualNodes: { type: Array, required: true },
  activeManualNodes: { type: Number, required: true },
  isUpdatingAllSubs: { type: Boolean, default: false }
});

defineEmits([
  'add-subscription',
  'update-all-subscriptions',
  'add-node',
  'add-profile'
]);
</script>

<template>
  <div class="space-y-6 lg:space-y-8">
    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 min-[350px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      <!-- 总订阅数 -->
      <div class="bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/90 dark:to-gray-800/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
        <div class="flex items-center justify-between mb-4">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">总订阅数</p>
            <h3 class="text-2xl font-bold text-gray-900 dark:text-white">{{ subscriptions.length }}</h3>
          </div>
          <div class="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
        <div class="text-xs text-green-500 dark:text-green-400 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
          <span class="truncate">{{ activeSubscriptions }} 个活跃</span>
        </div>
      </div>
      
      <!-- 总节点数 -->
      <div class="bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/90 dark:to-gray-800/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
        <div class="flex items-center justify-between mb-4">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">总节点数</p>
            <h3 class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalNodeCount }}</h3>
          </div>
          <div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          </div>
        </div>
        <div class="text-xs text-green-500 dark:text-green-400 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
          <span class="truncate">{{ activeNodeCount }} 个可用</span>
        </div>
      </div>
      
      <!-- 订阅组数量 -->
      <div class="bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/90 dark:to-gray-800/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
        <div class="flex items-center justify-between mb-4">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">订阅组数量</p>
            <h3 class="text-2xl font-bold text-gray-900 dark:text-white">{{ profiles.length }}</h3>
          </div>
          <div class="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <div class="text-xs text-green-500 dark:text-green-400 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
          <span class="truncate">{{ activeProfiles }} 个启用</span>
        </div>
      </div>
      
      <!-- 手动节点数 -->
      <div class="bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/90 dark:to-gray-800/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
        <div class="flex items-center justify-between mb-4">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">手动节点数</p>
            <h3 class="text-2xl font-bold text-gray-900 dark:text-white">{{ manualNodes.length }}</h3>
          </div>
          <div class="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
        <div class="text-xs text-green-500 dark:text-green-400 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
          <span class="truncate">{{ activeManualNodes }} 个启用</span>
        </div>
      </div>
    </div>
    
    <!-- 订阅状态图表 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <!-- 订阅状态分布 -->
      <div class="lg:col-span-2 bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/90 dark:to-gray-800/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">订阅状态分布</h3>
        </div>
        <div class="space-y-4">
          <!-- 启用订阅 -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-gray-600 dark:text-gray-300">启用的订阅</span>
              <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ activeSubscriptions }} / {{ subscriptions.length }}</span>
            </div>
            <div class="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-2.5">
              <div class="bg-gradient-to-r from-green-500 to-emerald-600 h-2.5 rounded-full" :style="{ width: subscriptions.length > 0 ? `${(activeSubscriptions / subscriptions.length) * 100}%` : '0%' }"></div>
            </div>
          </div>
          
          <!-- 节点可用性 -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-gray-600 dark:text-gray-300">节点可用性</span>
              <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ activeNodeCount }} / {{ totalNodeCount }}</span>
            </div>
            <div class="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-2.5">
              <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full" :style="{ width: totalNodeCount > 0 ? `${(activeNodeCount / totalNodeCount) * 100}%` : '0%' }"></div>
            </div>
          </div>
          
          <!-- 订阅组状态 -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-gray-600 dark:text-gray-300">启用的订阅组</span>
              <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ activeProfiles }} / {{ profiles.length }}</span>
            </div>
            <div class="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-2.5">
              <div class="bg-gradient-to-r from-purple-500 to-pink-600 h-2.5 rounded-full" :style="{ width: profiles.length > 0 ? `${(activeProfiles / profiles.length) * 100}%` : '0%' }"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 快速操作 -->
      <div class="bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/90 dark:to-gray-800/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">快速操作</h3>
        <div class="space-y-4">
          <button @click="$emit('add-subscription')" class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            添加订阅
          </button>
          
          <button @click="$emit('update-all-subscriptions')" :disabled="isUpdatingAllSubs" class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed">
            <svg v-if="!isUpdatingAllSubs" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <svg v-else class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            更新所有订阅
          </button>
          
          <button @click="$emit('add-node')" class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            添加手动节点
          </button>
          
          <button @click="$emit('add-profile')" class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            创建订阅组
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
