/**
 * useDashboard.js
 * Dashboard组件的状态管理composable
 * 负责管理Dashboard的核心状态和业务逻辑
 */
import { ref, computed } from 'vue'
import { useToastStore } from '../stores/toast.js'
import { useUIStore } from '../stores/ui.js'

export function useDashboard() {
  const { showToast } = useToastStore()
  const uiStore = useUIStore()

  // 基础状态
  const isLoading = ref(true)
  const dirty = ref(false)
  const saveState = ref('idle')

  // 初始数据
  const initialSubs = ref([])
  const initialNodes = ref([])

  // 标记数据已修改
  const markDirty = () => {
    dirty.value = true
    saveState.value = 'idle'
  }

  // 保存状态管理
  const startSaving = () => {
    saveState.value = 'saving'
  }

  const finishSaving = (success = true) => {
    saveState.value = success ? 'saved' : 'error'
    if (success) {
      dirty.value = false
    }
  }

  // 计算属性
  const isSaving = computed(() => saveState.value === 'saving')
  const isSaved = computed(() => saveState.value === 'saved')
  const hasError = computed(() => saveState.value === 'error')

  return {
    // 状态
    isLoading,
    dirty,
    saveState,
    initialSubs,
    initialNodes,

    // 方法
    markDirty,
    startSaving,
    finishSaving,

    // 计算属性
    isSaving,
    isSaved,
    hasError
  }
}
