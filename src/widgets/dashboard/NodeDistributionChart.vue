<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { PieChart } from 'echarts/charts';
import type { PieSeriesOption } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import type { LegendComponentOption, TooltipComponentOption } from 'echarts/components';
import { type ComposeOption, type EChartsType, graphic, init, use } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

import { useThemeStore } from '@/stores/useThemeStore';

const props = defineProps<{
    subscribedNodes: number;
    manualNodes: number;
    activeNodes: number;
    totalNodes: number;
}>();

use([PieChart, TooltipComponent, LegendComponent, SVGRenderer]);

const chartRef = ref<HTMLElement | null>(null);
const chartInstance = shallowRef<EChartsType | null>(null);
const themeStore = useThemeStore();
const { t } = useI18n();

type NodeChartOption = ComposeOption<
    PieSeriesOption | TooltipComponentOption | LegendComponentOption
>;

const initChart = () => {
    if (!chartRef.value) return;

    if (chartInstance.value) {
        chartInstance.value.dispose();
    }

    chartInstance.value = init(chartRef.value, themeStore.isDarkMode ? 'dark' : undefined, {
        renderer: 'svg'
    });

    const option = getOption();
    chartInstance.value.setOption(option);
};

const getOption = (): NodeChartOption => {
    const isDark = themeStore.isDarkMode;
    // Get colors from CSS variables or use tailwind defaults that match the theme
    const textColor = isDark ? '#94a3b8' : '#64748b'; // Tailwind slate-400 : slate-500
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-500').trim() || 'hsl(243, 75%, 59%)';
    const primaryColorLight = getComputedStyle(document.documentElement).getPropertyValue('--color-secondary-500').trim() || 'hsl(280, 72%, 54%)';
    const warningColor = getComputedStyle(document.documentElement).getPropertyValue('--color-warning-500').trim() || 'hsl(38, 92%, 50%)';
    const warningColorLight = getComputedStyle(document.documentElement).getPropertyValue('--color-warning-400').trim() || 'hsl(43, 74%, 56%)';

    return {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            textStyle: { color: isDark ? '#f1f5f9' : '#0f172a' },
            padding: [10, 14],
            borderRadius: 12,
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.1)'
        },
        legend: {
            bottom: '5%',
            left: 'center',
            itemWidth: 10,
            itemHeight: 10,
            textStyle: { color: textColor, fontSize: 12 },
            itemGap: 20
        },
        series: [
            {
                name: t('widgets.dashboard.chart.nodeDistribution'),
                type: 'pie',
                radius: ['55%', '75%'],
                center: ['50%', '42%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 8,
                    borderColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: false
                    },
                    scale: true,
                    itemStyle: {
                        shadowBlur: 15,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.2)'
                    }
                },
                labelLine: {
                    show: false
                },
                data: [
                    {
                        value: props.subscribedNodes,
                        name: t('widgets.dashboard.chart.subscriptionNodes'),
                        itemStyle: {
                            color: new graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: primaryColor },
                                { offset: 1, color: primaryColorLight }
                            ])
                        }
                    },
                    {
                        value: props.manualNodes,
                        name: t('widgets.dashboard.chart.manualNodes'),
                        itemStyle: {
                            color: new graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: warningColor },
                                { offset: 1, color: warningColorLight }
                            ])
                        }
                    }
                ]
            }
        ]
    };
};

const handleResize = () => {
    chartInstance.value?.resize();
};

onMounted(() => {
    initChart();
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    chartInstance.value?.dispose();
});

watch(
    [() => props.subscribedNodes, () => props.manualNodes],
    () => {
        chartInstance.value?.setOption(getOption());
    },
    { deep: true }
);

watch(
    () => themeStore.isDarkMode,
    () => {
        initChart();
    }
);
</script>

<template>
    <div class="relative flex h-full w-full flex-col">
        <div ref="chartRef" class="min-h-45 flex-1"></div>
        <!-- 中心指示器 -->
        <div
            class="pointer-events-none absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
        >
            <div class="text-2xl leading-none font-black text-gray-900 dark:text-white">
                {{ totalNodes }}
            </div>
            <div
                class="mt-1 text-[10px] font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400"
            >
                Total
            </div>
        </div>
    </div>
</template>
