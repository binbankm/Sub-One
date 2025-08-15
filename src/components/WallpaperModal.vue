<template>
  <Modal 
    :show="show" 
    @update:show="emit('update:show', $event)" 
    size="4xl"
    :show-confirm="true"
    :show-cancel="true"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  >
    <template #title>
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-gray-800 dark:text-white">壁纸背景管理</h3>
      </div>
    </template>
    
    <template #body>
      <div class="space-y-6">
        <!-- 当前壁纸预览 -->
        <div v-if="currentWallpaper" class="space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">预览壁纸</h4>
            <div class="flex items-center space-x-2">
              <!-- 同步状态指示器 -->
              <div class="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <div class="flex items-center space-x-1">
                  <svg v-if="!themeStore.isSyncing" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{{ themeStore.isSyncing ? '同步中...' : '云端同步' }}</span>
                </div>
                <!-- 手动同步按钮 -->
                <button 
                  @click="handleManualSync"
                  :disabled="themeStore.isSyncing"
                  class="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  手动同步
                </button>
              </div>
              <button 
                @click="clearCurrentWallpaper"
                class="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
              >
                清除
              </button>
            </div>
          </div>
          
          <!-- 壁纸预览 -->
          <div class="relative group">
            <img 
              :src="currentWallpaper" 
              alt="壁纸预览" 
              class="w-full h-64 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg"
            />
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-xl flex items-center justify-center">
              <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </div>
          
          <!-- 透明度调节 -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">透明度</label>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ Math.round(currentWallpaperOpacity * 100) }}%</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="1" 
              step="0.1" 
              :value="currentWallpaperOpacity"
              @input="(e) => setCurrentWallpaperOpacity(parseFloat(e.target.value))"
              class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb dark:bg-gray-700"
            />
            <div class="flex justify-between text-xs text-gray-400">
              <span>10%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <!-- 上传新壁纸 -->
        <div class="space-y-4">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">上传新壁纸</h4>
          
          <!-- 拖拽上传区域 -->
          <div 
            @drop="handleDrop"
            @dragover.prevent
            @dragenter.prevent
            class="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors duration-200"
            :class="{ 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20': isDragOver }"
          >
            <input 
              ref="fileInput"
              type="file" 
              accept="image/*" 
              @change="handleFileSelect" 
              class="hidden"
            />
            
            <div class="space-y-3">
              <div class="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  拖拽图片到此处或
                  <button 
                    @click="$refs.fileInput.click()"
                    class="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                  >
                    点击选择
                  </button>
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  支持 JPG、PNG、GIF 等格式，图片大小不限制
                </p>
              </div>
            </div>
          </div>
          
          <!-- 上传提示 -->
          <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>• 上传的图片将自动调整大小以适应屏幕</p>
            <p>• 建议使用高质量图片以获得最佳效果</p>
            <p class="text-green-600 dark:text-green-400 font-medium">• 壁纸设置将自动同步到云端，支持多设备同步</p>
            <p class="text-indigo-600 dark:text-indigo-400 font-medium">• 选择图片后点击"确认"按钮应用壁纸</p>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Modal from './Modal.vue';
import { useThemeStore } from '../stores/theme.js';
import { useToastStore } from '../stores/toast.js';

const props = defineProps({
  show: Boolean
});

const emit = defineEmits(['update:show']);

const themeStore = useThemeStore();
const toastStore = useToastStore();

const fileInput = ref(null);
const isDragOver = ref(false);

// 当前选择的壁纸（未确认）
const currentWallpaper = ref(null);
const currentWallpaperOpacity = ref(1.0);

// 初始化时加载当前壁纸设置
onMounted(() => {
  if (themeStore.wallpaper) {
    currentWallpaper.value = themeStore.wallpaper;
    currentWallpaperOpacity.value = themeStore.wallpaperOpacity;
  }
});

// 处理文件选择
const handleFileSelect = async (event) => {
  const file = event.target.files[0];
  if (file) {
    await processWallpaper(file);
  }
};

// 处理拖拽上传
const handleDrop = async (event) => {
  isDragOver.value = false;
  event.preventDefault();
  
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.type.startsWith('image/')) {
      await processWallpaper(file);
    } else {
      toastStore.showToast('请选择图片文件', 'error');
    }
  }
};

// 处理壁纸文件（不自动应用）
const processWallpaper = async (file) => {
  try {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toastStore.showToast('请选择有效的图片文件', 'error');
      return;
    }
    
    // 压缩并转换为base64
    const compressedBlob = await themeStore.compressImage(file);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      currentWallpaper.value = e.target.result;
      currentWallpaperOpacity.value = 1.0; // 重置透明度
      toastStore.showToast('壁纸已选择，请点击"确认"按钮应用', 'info');
    };
    
    reader.readAsDataURL(compressedBlob);
    
    // 清空文件输入
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  } catch (error) {
    console.error('处理壁纸失败:', error);
    toastStore.showToast('壁纸处理失败，请重试', 'error');
  }
};

// 设置当前壁纸透明度
const setCurrentWallpaperOpacity = async (opacity) => {
  currentWallpaperOpacity.value = opacity;
  
  // 如果当前有壁纸，实时同步透明度到云端
  if (currentWallpaper.value && themeStore.wallpaper === currentWallpaper.value) {
    try {
      await themeStore.setWallpaperOpacity(opacity);
    } catch (error) {
      console.error('同步透明度到云端失败:', error);
    }
  }
};

// 清除当前选择的壁纸
const clearCurrentWallpaper = () => {
  currentWallpaper.value = null;
  currentWallpaperOpacity.value = 1.0;
};

// 确认按钮处理
const handleConfirm = async () => {
  try {
    if (currentWallpaper.value) {
      // 应用壁纸
      themeStore.wallpaper = currentWallpaper.value;
      themeStore.wallpaperOpacity = currentWallpaperOpacity.value;
      themeStore.showWallpaper = true; // 确保壁纸显示
      await themeStore.saveWallpaperSettings();
      toastStore.showToast('壁纸应用成功！已同步到云端', 'success');
    } else {
      // 移除壁纸
      await themeStore.removeWallpaper();
      toastStore.showToast('已切换到默认背景，已同步到云端', 'success');
    }
    
    // 关闭模态框
    emit('update:show', false);
  } catch (error) {
    console.error('应用壁纸失败:', error);
    toastStore.showToast('应用壁纸失败，请重试', 'error');
  }
};

// 手动同步处理
const handleManualSync = async () => {
  try {
    const result = await themeStore.syncWallpaperToCloud();
    if (result.success) {
      toastStore.showToast(result.message, 'success');
    } else {
      toastStore.showToast(result.message, 'error');
    }
  } catch (error) {
    console.error('手动同步失败:', error);
    toastStore.showToast('手动同步失败，请重试', 'error');
  }
};

// 取消按钮处理
const handleCancel = () => {
  // 恢复原始设置
  if (themeStore.wallpaper) {
    currentWallpaper.value = themeStore.wallpaper;
    currentWallpaperOpacity.value = themeStore.wallpaperOpacity;
  } else {
    currentWallpaper.value = null;
    currentWallpaperOpacity.value = 1.0;
  }
  
  // 关闭模态框
  emit('update:show', false);
};
</script>

<style scoped>
/* 自定义滑块样式 */
.slider-thumb::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.slider-thumb::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 拖拽状态样式 */
.border-dashed {
  transition: all 0.2s ease;
}
</style>
