<!--
  仪表盘首页 - 显示系统概览和快捷操作
  - 励志语录轮播
  - 订阅源、节点、订阅组统计
  - 快捷添加按钮
  - Bento Grid 布局
-->

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Subscription, Profile, Node } from '../../types/index';
import NodeChart from '../../components/charts/NodeChart.vue';

defineProps<{
  subscriptions: Subscription[];
  activeSubscriptions: number;
  totalNodeCount: number;
  activeNodeCount: number;
  profiles: Profile[];
  activeProfiles: number;
  manualNodes: Node[];
  activeManualNodes: number;
  isUpdatingAllSubs: boolean;
}>();

defineEmits<{
  (e: 'add-subscription'): void;
  (e: 'update-all-subscriptions'): void;
  (e: 'add-node'): void;
  (e: 'add-profile'): void;
}>();

/** 励志语录数据库 */
const quotes = [
  { text: "成功不是终点，失败也不是终结，唯有勇气才是永恒。", author: "温斯顿·丘吉尔", category: "励志" },
  { text: "代码如诗，每一行都是对完美的追求。", author: "极客箴言", category: "技术" },
  { text: "今天的努力，是为了明天更好的自己。", author: "佚名", category: "励志" },
  { text: "优秀的程序员不是写代码最多的，而是删代码最多的。", author: "编程智慧", category: "技术" },
  { text: "保持简单，保持优雅，保持高效。", author: "设计哲学", category: "技术" },
  { text: "每一次调试，都是与bug的一场较量。", author: "程序员日常", category: "幽默" },
  { text: "不要害怕重构，害怕的应该是技术债。", author: "代码整洁之道", category: "技术" },
  { text: "真正的智慧不在于知道所有答案，而在于提出正确的问题。", author: "苏格拉底", category: "励志" },
  { text: "让代码自己说话，注释只是辅助。", author: "Clean Code", category: "技术" },
  { text: "bug不会因为你忽视它而消失，只会在生产环境中惊艳亮相。", author: "墨菲定律", category: "幽默" },
  { text: "持续学习，永不止步。今天比昨天更强大。", author: "成长心态", category: "励志" },
  { text: "好的架构不是设计出来的，而是演化出来的。", author: "架构之道", category: "技术" },
  { text: "测试不是负担，而是对代码的信心保障。", author: "TDD实践", category: "技术" },
  { text: "编程不仅是科学，更是艺术。", author: "Donald Knuth", category: "技术" },
  { text: "越简单的方案，越容易维护。", author: "KISS原则", category: "技术" }
];

const currentQuote = ref(quotes[0]);
const isRefreshing = ref(false);

/** 获取随机语录（避免重复） */
const getRandomQuote = () => {
  let newQuote;
  do {
    newQuote = quotes[Math.floor(Math.random() * quotes.length)];
  } while (newQuote === currentQuote.value && quotes.length > 1);
  return newQuote;
};

/** 刷新语录 */
const refreshQuote = () => {
  isRefreshing.value = true;
  setTimeout(() => {
    currentQuote.value = getRandomQuote();
    isRefreshing.value = false;
  }, 300);
};

onMounted(() => {
  currentQuote.value = getRandomQuote();
});
</script>

<template>
  <div class="space-y-6">

    <!-- 励志语录卡片 -->
    <div
      class="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-gradient-to-br from-pink-400/20 via-purple-400/20 to-indigo-400/20 border border-white/20 p-6 shadow-lg hover:shadow-xl transition-all duration-500 group">

      <!-- 背景装饰 -->
      <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50"></div>
      <div
        class="absolute top-0 right-0 w-64 h-64 bg-pink-300/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700">
      </div>
      <div
        class="absolute bottom-0 left-0 w-48 h-48 bg-purple-300/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-700">
      </div>

      <div class="relative z-10">
        <!-- 标题栏 -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400/30 to-purple-400/30 backdrop-blur-md flex items-center justify-center border border-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-purple-600 dark:text-purple-300" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 class="text-gray-800 dark:text-white font-bold text-base">每日一言</h3>
              <p class="text-gray-500 dark:text-gray-400 text-xs">Daily Inspiration</p>
            </div>
          </div>

          <!-- 分类标签和刷新按钮 -->
          <div class="flex items-center gap-2">
            <span :class="{
              'bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 border-yellow-400/30': currentQuote.category === '励志',
              'bg-blue-400/20 text-blue-700 dark:text-blue-300 border-blue-400/30': currentQuote.category === '技术',
              'bg-green-400/20 text-green-700 dark:text-green-300 border-green-400/30': currentQuote.category === '幽默'
            }" class="px-2.5 py-1 rounded-lg text-xs font-medium backdrop-blur-md border transition-all duration-300">
              {{ currentQuote.category }}
            </span>

            <button @click="refreshQuote" :disabled="isRefreshing"
              class="w-8 h-8 rounded-lg bg-white/30 dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/20 hover:scale-110 active:scale-95 transition-all duration-300 disabled:opacity-50 border border-white/20"
              title="换一条">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transition-transform duration-500"
                :class="{ 'rotate-180': isRefreshing }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 语录内容 -->
        <div :key="currentQuote.text" class="quote-content animate-fadeIn">
          <blockquote class="my-3">
            <p class="text-gray-800 dark:text-white text-lg md:text-xl font-semibold leading-relaxed mb-2">
              "{{ currentQuote.text }}"
            </p>
            <footer class="flex items-center gap-2">
              <div class="h-px flex-1 bg-gray-300/30 dark:bg-white/10"></div>
              <cite class="text-gray-600 dark:text-gray-400 text-xs not-italic font-medium">
                {{ currentQuote.author }}
              </cite>
              <div class="h-px flex-1 bg-gray-300/30 dark:bg-white/10"></div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>

    <!-- Bento Grid 布局 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">

      <!-- 核心统计图表 (占2列) -->
      <div
        class="md:col-span-2 backdrop-blur-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group min-h-[300px] flex flex-col">
        <!-- 背景装饰 -->
        <div class="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-1000"></div>
        
        <div class="flex items-center justify-between mb-6 relative z-10">
          <div>
            <h3 class="text-gray-900 dark:text-white font-bold text-lg">节点概览</h3>
            <p class="text-gray-500 dark:text-gray-400 text-xs">Node Distribution & Status</p>
          </div>
          <div class="flex gap-4">
            <div class="text-right">
              <div class="text-[10px] uppercase tracking-wider font-bold text-gray-400">活跃率</div>
              <div class="text-lg font-black text-indigo-600 dark:text-indigo-400">
                {{ totalNodeCount > 0 ? Math.round((activeNodeCount / totalNodeCount) * 100) : 0 }}%
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 flex flex-col sm:flex-row gap-6 items-center relative z-10">
          <!-- 图表区域 -->
          <div class="w-full sm:w-1/2 h-[220px]">
            <NodeChart 
              :subscribed-nodes="totalNodeCount - manualNodes.length"
              :manual-nodes="manualNodes.length"
              :active-nodes="activeNodeCount"
              :total-nodes="totalNodeCount"
            />
          </div>
          
          <!-- 详细指标 -->
          <div class="w-full sm:w-1/2 grid grid-cols-2 gap-4">
            <div class="p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/5 shadow-sm">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">活跃订阅</div>
              <div class="text-xl font-bold text-gray-900 dark:text-white">{{ activeSubscriptions }}</div>
            </div>
            <div class="p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/5 shadow-sm">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">活跃节点</div>
              <div class="text-xl font-bold text-emerald-500">{{ activeNodeCount }}</div>
            </div>
            <div class="p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/5 shadow-sm">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">订阅组</div>
              <div class="text-xl font-bold text-purple-500">{{ profiles.length }}</div>
            </div>
            <div class="p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/5 shadow-sm">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">手动节点</div>
              <div class="text-xl font-bold text-orange-500">{{ manualNodes.length }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 智能更新卡片 -->
      <div class="flex flex-col gap-4 lg:gap-6">
        <button @click="$emit('update-all-subscriptions')" :disabled="isUpdatingAllSubs"
          class="relative flex-1 overflow-hidden rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group text-left p-6 flex flex-col justify-between">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div class="relative z-10">
            <div class="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg v-if="!isUpdatingAllSubs" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg v-else class="animate-spin w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-1">{{ isUpdatingAllSubs ? '正在更新...' : '立即更新' }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ isUpdatingAllSubs ? '正在同步最新节点信息' : '同步所有订阅源的节点信息' }}</p>
          </div>
        </button>

        <!-- 订阅组指示 -->
        <div class="relative flex-1 rounded-3xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 border border-purple-500/10 p-6 shadow-md">
           <div class="flex justify-between items-start mb-2">
             <div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
               <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
               </svg>
             </div>
             <span class="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold">{{ activeProfiles }} Active</span>
           </div>
           <div class="text-2xl font-black text-gray-900 dark:text-white">{{ profiles.length }} <span class="text-sm font-normal text-gray-500">订阅组</span></div>
           <!-- 迷你进度条 -->
           <div class="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5 mt-4 overflow-hidden">
             <div class="bg-purple-500 h-full rounded-full transition-all duration-1000" :style="{ width: profiles.length > 0 ? `${(activeProfiles / profiles.length) * 100}%` : '0%' }"></div>
           </div>
        </div>
      </div>

      <!-- 快捷操作按钮 (3个) -->
      <button @click="$emit('add-subscription')"
        class="group flex items-center gap-4 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-gray-700/50 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 min-h-[120px]">
        <div class="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div class="text-left">
          <p class="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">添加订阅</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">支持 HTTP/HTTPS</p>
        </div>
      </button>

      <button @click="$emit('add-node')"
        class="group flex items-center gap-4 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-gray-700/50 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 min-h-[120px]">
        <div class="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div class="text-left">
          <p class="font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">添加节点</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">支持多种协议</p>
        </div>
      </button>

      <button @click="$emit('add-profile')"
        class="group flex items-center gap-4 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-gray-700/50 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-300 min-h-[120px]">
        <div class="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div class="text-left">
          <p class="font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">创建订阅组</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">组合订阅和节点</p>
        </div>
      </button>

    </div>

  </div>
</template>

<style scoped>
/* 语录淡入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-out;
}

.quote-content:hover {
  transform: scale(1.01);
  transition: transform 0.3s ease;
}


</style>
