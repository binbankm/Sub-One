<template>
  <div 
    ref="containerRef" 
    class="virtual-list-container"
    :style="{ height: `${height}px` }"
    @scroll="handleScroll"
  >
    <div 
      class="virtual-list-phantom"
      :style="{ height: `${totalHeight}px` }"
    ></div>
    <div 
      class="virtual-list-content"
      :style="{ transform: `translateY(${offsetY}px)` }"
    >
      <div 
        v-for="item in visibleItems" 
        :key="item.id || item._id || item.key || item"
        :style="{ height: `${itemHeight}px` }"
        class="virtual-list-item"
      >
        <slot :item="item" :index="getItemIndex(item)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  itemHeight: {
    type: Number,
    default: 60
  },
  height: {
    type: Number,
    default: 400
  },
  buffer: {
    type: Number,
    default: 5
  }
});

const containerRef = ref(null);
const scrollTop = ref(0);

// 计算总高度
const totalHeight = computed(() => props.items.length * props.itemHeight);

// 计算可见区域的起始和结束索引
const visibleRange = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight);
  const visibleCount = Math.ceil(props.height / props.itemHeight);
  const end = Math.min(start + visibleCount + props.buffer, props.items.length);
  const startIndex = Math.max(0, start - props.buffer);
  
  return { start: startIndex, end };
});

// 计算可见项目
const visibleItems = computed(() => {
  const { start, end } = visibleRange.value;
  return props.items.slice(start, end);
});

// 计算偏移量
const offsetY = computed(() => {
  const { start } = visibleRange.value;
  return start * props.itemHeight;
});

// 获取项目在原始数组中的索引
const getItemIndex = (item) => {
  const { start } = visibleRange.value;
  const localIndex = visibleItems.value.indexOf(item);
  return start + localIndex;
};

// 处理滚动事件
const handleScroll = (event) => {
  scrollTop.value = event.target.scrollTop;
};

// 滚动到指定索引
const scrollToIndex = (index) => {
  if (!containerRef.value) return;
  
  const targetScrollTop = index * props.itemHeight;
  containerRef.value.scrollTop = targetScrollTop;
};

// 滚动到顶部
const scrollToTop = () => {
  if (!containerRef.value) return;
  containerRef.value.scrollTop = 0;
};

// 滚动到底部
const scrollToBottom = () => {
  if (!containerRef.value) return;
  containerRef.value.scrollTop = totalHeight.value - props.height;
};

// 暴露方法给父组件
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom
});
</script>

<style scoped>
.virtual-list-container {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

.virtual-list-phantom {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: -1;
}

.virtual-list-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.virtual-list-item {
  width: 100%;
  box-sizing: border-box;
}
</style>
