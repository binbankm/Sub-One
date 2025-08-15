import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchWallpaper, saveWallpaper, deleteWallpaper } from '../lib/api.js';

export const useThemeStore = defineStore('theme', () => {
  // 主题状态：'light' | 'dark'
  const theme = ref('light');
  
  // 当前实际应用的主题
  const currentTheme = ref('light');
  
  // 壁纸背景管理
  const wallpaper = ref(null);
  const wallpaperOpacity = ref(1.0); // 默认透明度100%
  const showWallpaper = ref(false);
  const isSyncing = ref(false); // 同步状态
  
  // 初始化主题
  async function initTheme() {
    // 从localStorage获取保存的主题
    const savedTheme = localStorage.getItem('sub-one-theme');
    if (savedTheme) {
      theme.value = savedTheme;
    }
    
    // 尝试从云端获取壁纸设置
    try {
      const response = await fetchWallpaper();
      if (response.success && response.data) {
        // 使用云端数据
        wallpaper.value = response.data.data;
        wallpaperOpacity.value = response.data.opacity || 1.0;
        showWallpaper.value = response.data.show || false;
        
        // 同步到本地存储作为备份
        saveWallpaperSettingsToLocal();
      } else {
        // 如果云端没有数据，尝试从本地获取
        try {
          const savedWallpaper = localStorage.getItem('sub-one-wallpaper');
          if (savedWallpaper) {
            const wallpaperData = JSON.parse(savedWallpaper);
            wallpaper.value = wallpaperData.data;
            wallpaperOpacity.value = wallpaperData.opacity || 1.0;
            showWallpaper.value = wallpaperData.show || false;
            
            // 同步到云端
            await saveWallpaperSettingsToCloud();
          }
        } catch (e) {
          console.error('Failed to parse local wallpaper data:', e);
          localStorage.removeItem('sub-one-wallpaper');
        }
      }
    } catch (error) {
      console.error('Failed to fetch wallpaper from cloud, falling back to local storage:', error);
      // 如果云端获取失败，回退到本地存储
      try {
        const savedWallpaper = localStorage.getItem('sub-one-wallpaper');
        if (savedWallpaper) {
          const wallpaperData = JSON.parse(savedWallpaper);
          wallpaper.value = wallpaperData.data;
          wallpaperOpacity.value = wallpaperData.opacity || 1.0;
          showWallpaper.value = wallpaperData.show || false;
        }
      } catch (e) {
        console.error('Failed to parse local wallpaper data:', e);
        localStorage.removeItem('sub-one-wallpaper');
      }
    }
    
    // 应用主题
    applyTheme();
  }
  
  // 切换主题
  function toggleTheme() {
    // 简单地在明亮和暗黑之间切换
    theme.value = theme.value === 'light' ? 'dark' : 'light';
    
    // 保存到localStorage
    localStorage.setItem('sub-one-theme', theme.value);
    
    // 应用主题
    applyTheme();
  }
  
  // 设置特定主题
  function setTheme(newTheme) {
    theme.value = newTheme;
    localStorage.setItem('sub-one-theme', newTheme);
    applyTheme();
  }
  
  // 应用主题到DOM
  function applyTheme() {
    const html = document.documentElement;
    
    // 直接应用用户选择的主题
    currentTheme.value = theme.value;
    
    if (theme.value === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
  
  // 图片压缩函数 - 简化版本
  function compressImage(file, maxWidth = 1280, maxHeight = 720, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // 计算压缩后的尺寸，使用更小的尺寸
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // 绘制压缩后的图片
          ctx.drawImage(img, 0, 0, width, height);
          
          // 转换为blob，使用更低的JPEG质量
          canvas.toBlob(resolve, 'image/jpeg', quality);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = reject;
      
      // 使用FileReader来加载图片
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  
  // 检查存储空间
  function checkStorageQuota(dataSize) {
    try {
      // 估算当前localStorage使用量
      let currentUsage = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          currentUsage += localStorage[key].length;
        }
      }
      
      // 检查是否有足够空间（预留一些空间）
      const availableSpace = 5 * 1024 * 1024; // 5MB
      const requiredSpace = currentUsage + dataSize;
      
      if (requiredSpace > availableSpace) {
        console.warn('Storage quota exceeded, clearing old data');
        // 清除一些旧数据
        clearOldStorageData();
        return true;
      }
      
      return true;
    } catch (e) {
      console.error('Storage quota check failed:', e);
      return false;
    }
  }
  
  // 清除旧的存储数据
  function clearOldStorageData() {
    try {
      // 清除壁纸数据
      localStorage.removeItem('sub-one-wallpaper');
      console.log('Cleared old wallpaper data');
    } catch (e) {
      console.error('Failed to clear old data:', e);
    }
  }
  
  // 壁纸背景管理函数
  
  // 上传壁纸
  async function uploadWallpaper(file) {
    try {
      // 压缩图片
      const compressedBlob = await compressImage(file);
      
      // 转换为base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
      });
      
      reader.readAsDataURL(compressedBlob);
      const base64Data = await base64Promise;
      
      // 检查存储空间
      if (!checkStorageQuota(base64Data.length)) {
        throw new Error('存储空间不足，无法保存壁纸');
      }
      
      wallpaper.value = base64Data;
      showWallpaper.value = true;
      
      // 保存到本地和云端
      await saveWallpaperSettings();
      
    } catch (error) {
      console.error('Upload wallpaper failed:', error);
      throw error;
    }
  }
  
  // 删除壁纸
  async function removeWallpaper() {
    wallpaper.value = null;
    showWallpaper.value = false;
    
    // 保存设置到本地和云端
    await saveWallpaperSettings();
    
    // 从云端删除壁纸数据
    try {
      const response = await deleteWallpaper();
      if (response.success) {
        console.log('Wallpaper deleted from cloud successfully');
      } else {
        console.error('Failed to delete wallpaper from cloud:', response.message);
      }
    } catch (error) {
      console.error('Failed to delete wallpaper from cloud:', error);
    }
  }
  
  // 切换壁纸显示
  async function toggleWallpaper() {
    showWallpaper.value = !showWallpaper.value;
    await saveWallpaperSettings();
  }
  
  // 设置壁纸透明度
  async function setWallpaperOpacity(opacity) {
    wallpaperOpacity.value = opacity;
    await saveWallpaperSettings();
  }
  
  // 保存壁纸设置到本地存储
  function saveWallpaperSettingsToLocal() {
    try {
      const wallpaperData = {
        data: wallpaper.value,
        opacity: wallpaperOpacity.value,
        show: showWallpaper.value
      };
      
      // 检查存储空间
      const dataSize = JSON.stringify(wallpaperData).length;
      if (!checkStorageQuota(dataSize)) {
        console.warn('Cannot save wallpaper settings due to storage quota');
        return;
      }
      
      localStorage.setItem('sub-one-wallpaper', JSON.stringify(wallpaperData));
    } catch (error) {
      console.error('Failed to save wallpaper settings to local storage:', error);
      // 如果保存失败，尝试清除旧数据
      if (error.name === 'QuotaExceededError') {
        clearOldStorageData();
        // 重试保存
        try {
          const wallpaperData = {
            data: wallpaper.value,
            opacity: wallpaperOpacity.value,
            show: showWallpaper.value
          };
          localStorage.setItem('sub-one-wallpaper', JSON.stringify(wallpaperData));
        } catch (retryError) {
          console.error('Retry save to local storage failed:', retryError);
        }
      }
    }
  }

  // 保存壁纸设置到云端
  async function saveWallpaperSettingsToCloud() {
    try {
      isSyncing.value = true;
      
      const wallpaperData = {
        data: wallpaper.value,
        opacity: wallpaperOpacity.value,
        show: showWallpaper.value
      };
      
      const response = await saveWallpaper(wallpaperData);
      if (response.success) {
        console.log('Wallpaper settings saved to cloud successfully');
      } else {
        console.error('Failed to save wallpaper settings to cloud:', response.message);
      }
    } catch (error) {
      console.error('Failed to save wallpaper settings to cloud:', error);
    } finally {
      isSyncing.value = false;
    }
  }

  // 保存壁纸设置（同时保存到本地和云端）
  async function saveWallpaperSettings() {
    // 先保存到本地
    saveWallpaperSettingsToLocal();
    
    // 再保存到云端
    await saveWallpaperSettingsToCloud();
  }

  // 手动同步壁纸设置到云端
  async function syncWallpaperToCloud() {
    try {
      isSyncing.value = true;
      
      const wallpaperData = {
        data: wallpaper.value,
        opacity: wallpaperOpacity.value,
        show: showWallpaper.value
      };
      
      const response = await saveWallpaper(wallpaperData);
      if (response.success) {
        console.log('Wallpaper settings synced to cloud successfully');
        return { success: true, message: '壁纸设置已同步到云端' };
      } else {
        console.error('Failed to sync wallpaper settings to cloud:', response.message);
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Failed to sync wallpaper settings to cloud:', error);
      return { success: false, message: `同步失败: ${error.message}` };
    } finally {
      isSyncing.value = false;
    }
  }
  
  // 获取主题图标
  function getThemeIcon() {
    if (theme.value === 'light') {
      return 'moon'; // 当前是明亮模式，显示月亮图标（表示可以切换到暗黑模式）
    } else {
      return 'sun'; // 当前是暗黑模式，显示太阳图标（表示可以切换到明亮模式）
    }
  }
  
  // 获取主题名称
  function getThemeName() {
    if (theme.value === 'light') {
      return '明亮模式';
    } else {
      return '暗黑模式';
    }
  }
  
  // 获取下一个主题名称（用于提示）
  function getNextThemeName() {
    if (theme.value === 'light') {
      return '点击切换到暗黑模式';
    } else {
      return '点击切换到明亮模式';
    }
  }
  
  return {
    theme,
    currentTheme,
    wallpaper,
    wallpaperOpacity,
    showWallpaper,
    isSyncing,
    initTheme,
    toggleTheme,
    setTheme,
    uploadWallpaper,
    removeWallpaper,
    toggleWallpaper,
    setWallpaperOpacity,
    saveWallpaperSettings,
    syncWallpaperToCloud,
    compressImage,
    getThemeIcon,
    getThemeName,
    getNextThemeName
  };
}); 
