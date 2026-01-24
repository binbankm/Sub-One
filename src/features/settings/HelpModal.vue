<!--
  ==================== 帮助文档模态框 ====================
  
  功能说明：
  - 展示应用的完整帮助文档
  - 提供快速开始指南
  - 介绍各项功能特性
  - 常见问题解答（FAQ）
  - 使用技巧和最佳实践
  
  内容结构：
  - 快速开始：三步上手指南
  - 功能说明：订阅管理、订阅组、手动节点、链接生成
  - 常见问题：常见操作的问答
  - 使用技巧：高效管理和性能优化建议
  - 联系支持：获取帮助的途径
  
  ==================================================
-->

<script setup lang="ts">
import Modal from '../../components/ui/BaseModal.vue';

// ==================== Props 和 Emit ====================

defineProps<{
    /** 显示状态 */
    show: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
}>();
</script>

<template>
    <Modal
        :show="show"
        @update:show="emit('update:show', $event)"
        @confirm="emit('update:show', false)"
        size="6xl"
    >
        <template #title>
            <div class="flex items-center gap-3">
                <div
                    class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
                <h3 class="gradient-text text-lg font-bold">帮助文档</h3>
            </div>
        </template>

        <template #body>
            <div class="space-y-8">
                <!-- 快速开始 -->
                <section>
                    <h4
                        class="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5 text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                        快速开始
                    </h4>
                    <div class="space-y-3 rounded-xl bg-gray-50/60 p-4 dark:bg-gray-800/75">
                        <div class="flex items-start gap-3">
                            <div
                                class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white"
                            >
                                1
                            </div>
                            <div>
                                <h5 class="font-medium text-gray-900 dark:text-white">添加订阅</h5>
                                <p class="text-sm text-gray-600 dark:text-gray-300">
                                    点击"新增"按钮，输入订阅链接，系统会自动解析节点信息
                                </p>
                            </div>
                        </div>
                        <div class="flex items-start gap-3">
                            <div
                                class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white"
                            >
                                2
                            </div>
                            <div>
                                <h5 class="font-medium text-gray-900 dark:text-white">生成链接</h5>
                                <p class="text-sm text-gray-600 dark:text-gray-300">
                                    在下面面板选择格式，点击"复制"获取订阅链接
                                </p>
                            </div>
                        </div>
                        <div class="flex items-start gap-3">
                            <div
                                class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white"
                            >
                                3
                            </div>
                            <div>
                                <h5 class="font-medium text-gray-900 dark:text-white">
                                    配置客户端
                                </h5>
                                <p class="text-sm text-gray-600 dark:text-gray-300">
                                    将复制的链接导入到您的代理客户端中
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 功能说明 -->
                <section>
                    <h4
                        class="mb-6 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5 text-green-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        功能说明
                    </h4>
                    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
                        <div
                            class="shadow-modern-enhanced hover:shadow-modern-enhanced-dark hover-lift rounded-2xl border border-gray-300 bg-white p-6 transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div
                                class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-6 w-6 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                                    />
                                </svg>
                            </div>
                            <h5 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                                订阅管理
                            </h5>
                            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500"
                                    ></span>
                                    <span>支持多种订阅格式</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500"
                                    ></span>
                                    <span>自动解析节点信息</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500"
                                    ></span>
                                    <span>流量使用监控</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500"
                                    ></span>
                                    <span>批量更新功能</span>
                                </li>
                            </ul>
                        </div>
                        <div
                            class="shadow-modern-enhanced hover:shadow-modern-enhanced-dark hover-lift rounded-2xl border border-gray-300 bg-white p-6 transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div
                                class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-6 w-6 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                    />
                                </svg>
                            </div>
                            <h5 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                                订阅组
                            </h5>
                            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500"
                                    ></span>
                                    <span>组合多个订阅</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500"
                                    ></span>
                                    <span>自定义筛选规则</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500"
                                    ></span>
                                    <span>统一管理分享</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500"
                                    ></span>
                                    <span>支持排除节点</span>
                                </li>
                            </ul>
                        </div>
                        <div
                            class="shadow-modern-enhanced hover:shadow-modern-enhanced-dark hover-lift rounded-2xl border border-gray-300 bg-white p-6 transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div
                                class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-6 w-6 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4"
                                    />
                                </svg>
                            </div>
                            <h5 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                                手动节点
                            </h5>
                            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500"
                                    ></span>
                                    <span>批量导入功能</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500"
                                    ></span>
                                    <span>智能去重排序</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500"
                                    ></span>
                                    <span>多种协议支持</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500"
                                    ></span>
                                    <span>搜索筛选功能</span>
                                </li>
                            </ul>
                        </div>
                        <div
                            class="shadow-modern-enhanced hover:shadow-modern-enhanced-dark hover-lift rounded-2xl border border-gray-300 bg-white p-6 transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div
                                class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-6 w-6 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                    />
                                </svg>
                            </div>
                            <h5 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                                链接生成
                            </h5>
                            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500"
                                    ></span>
                                    <span>多种客户端格式</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500"
                                    ></span>
                                    <span>自适应格式选择</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500"
                                    ></span>
                                    <span>Token管理</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <span
                                        class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500"
                                    ></span>
                                    <span>一键复制功能</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <!-- 常见问题 -->
                <section>
                    <h4
                        class="mb-6 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5 text-yellow-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        常见问题
                    </h4>
                    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div
                            class="shadow-modern-enhanced hover:shadow-modern-enhanced-dark hover-lift rounded-2xl border border-gray-300 bg-white p-6 transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div class="mb-3 flex items-start gap-3">
                                <div
                                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600"
                                >
                                    <span class="text-sm font-bold text-white">Q</span>
                                </div>
                                <h5 class="text-lg font-semibold text-gray-900 dark:text-white">
                                    如何添加订阅？
                                </h5>
                            </div>
                            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                点击"新增"按钮，输入订阅链接（http/https格式），系统会自动解析节点信息。支持多种订阅格式，包括Clash、Surge等。
                            </p>
                        </div>
                        <div
                            class="shadow-modern-enhanced hover:shadow-modern-enhanced-dark hover-lift rounded-2xl border border-gray-300 bg-white p-6 transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div class="mb-3 flex items-start gap-3">
                                <div
                                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600"
                                >
                                    <span class="text-sm font-bold text-white">Q</span>
                                </div>
                                <h5 class="text-lg font-semibold text-gray-900 dark:text-white">
                                    如何生成订阅链接？
                                </h5>
                            </div>
                            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                在下面生成订阅链接面板选择订阅内容（默认或订阅组），选择输出格式，点击"复制"即可获取订阅链接。
                            </p>
                        </div>
                        <div
                            class="shadow-modern-enhanced hover:shadow-modern-enhanced-dark hover-lift rounded-2xl border border-gray-300 bg-white p-6 transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div class="mb-3 flex items-start gap-3">
                                <div
                                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600"
                                >
                                    <span class="text-sm font-bold text-white">Q</span>
                                </div>
                                <h5 class="text-lg font-semibold text-gray-900 dark:text-white">
                                    支持哪些客户端格式？
                                </h5>
                            </div>
                            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                支持Clash、Surge、Loon、Sing-Box、Base64等多种格式，系统会根据客户端自动选择最佳格式。
                            </p>
                        </div>
                        <div
                            class="shadow-modern-enhanced hover:shadow-modern-enhanced-dark hover-lift rounded-2xl border border-gray-300 bg-white p-6 transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div class="mb-3 flex items-start gap-3">
                                <div
                                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600"
                                >
                                    <span class="text-sm font-bold text-white">Q</span>
                                </div>
                                <h5 class="text-lg font-semibold text-gray-900 dark:text-white">
                                    如何配置Token？
                                </h5>
                            </div>
                            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                在设置中配置固定的"订阅Token"，建议使用固定Token以确保链接稳定性。
                            </p>
                        </div>
                        <div
                            class="shadow-modern-enhanced hover:shadow-modern-enhanced-dark hover-lift rounded-2xl border border-gray-300 bg-white p-6 transition-all duration-300 dark:border-gray-700 dark:bg-gray-800 lg:col-span-2"
                        >
                            <div class="mb-3 flex items-start gap-3">
                                <div
                                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600"
                                >
                                    <span class="text-sm font-bold text-white">Q</span>
                                </div>
                                <h5 class="text-lg font-semibold text-gray-900 dark:text-white">
                                    如何批量导入节点？
                                </h5>
                            </div>
                            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                在手动节点管理页面，点击"批量导入"按钮，粘贴节点链接（每行一个），系统会自动解析并导入。
                            </p>
                        </div>
                    </div>
                </section>

                <!-- 使用技巧 -->
                <section>
                    <h4
                        class="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5 text-purple-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                        </svg>
                        使用技巧
                    </h4>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div
                            class="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20"
                        >
                            <h5 class="mb-2 font-semibold text-blue-900 dark:text-blue-100">
                                💡 高效管理
                            </h5>
                            <ul class="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                                <li>• 使用订阅组统一管理</li>
                                <li>• 定期更新订阅信息</li>
                                <li>• 合理使用排除规则</li>
                            </ul>
                        </div>
                        <div
                            class="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 dark:border-green-800 dark:from-green-900/20 dark:to-emerald-900/20"
                        >
                            <h5 class="mb-2 font-semibold text-green-900 dark:text-green-100">
                                🚀 性能优化
                            </h5>
                            <ul class="space-y-1 text-sm text-green-700 dark:text-green-300">
                                <li>• 定期清理失效节点</li>
                                <li>• 使用智能排序功能</li>
                                <li>• 合理配置Token</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <!-- 联系支持 -->
                <section>
                    <h4
                        class="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5 text-red-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                        联系支持
                    </h4>
                    <div class="rounded-xl bg-gray-50/60 p-4 dark:bg-gray-800/75">
                        <p class="mb-2 text-sm text-gray-600 dark:text-gray-300">
                            如果您在使用过程中遇到问题，可以：
                        </p>
                        <ul class="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                            <li>• 查看项目文档和README</li>
                            <li>• 提交Issue到GitHub仓库</li>
                            <li>• 重新启动操作引导</li>
                        </ul>
                    </div>
                </section>
            </div>
        </template>
    </Modal>
</template>
