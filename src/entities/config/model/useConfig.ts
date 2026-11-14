import { ref } from 'vue';

import type { AppConfig } from '@/common/types/index';
import { defaultSettings } from '@shared';

export function useConfig() {
    const config = ref<AppConfig>({ ...defaultSettings });

    const isInitialized = ref(false);
    const isLoading = ref(false);
    const hasUnsavedChanges = ref(false);

    function updateConfig(newConfig: Partial<AppConfig>) {
        config.value = { ...config.value, ...newConfig };
    }

    return {
        config,
        isInitialized,
        isLoading,
        hasUnsavedChanges,
        updateConfig
    };
}
