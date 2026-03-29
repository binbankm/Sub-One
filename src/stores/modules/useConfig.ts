import { ref } from 'vue';
import type { AppConfig } from '../../types/index';

export function useConfig() {
    const config = ref<AppConfig>({
        mytoken: 'auto',
        profileToken: '',
        FileName: 'Sub-One',
        udp: false,
        skipCertVerify: false,
        prependSubName: false,
        dedupe: false,
        NotifyThresholdDays: 3,
        NotifyThresholdPercent: 90
    });

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
