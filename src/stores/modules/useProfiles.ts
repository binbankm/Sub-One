import { ref } from 'vue';
import type { Profile } from '../../types/index';
import { generateShortId, generateUUID } from '../../utils/helpers';

export function useProfiles(
    saveData: (reason: string, showToast?: boolean) => Promise<boolean>,
    showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
) {
    const profiles = ref<Profile[]>([]);

    async function addProfile(profile: Profile): Promise<boolean> {
        const newProfile = { ...profile };
        if (!newProfile.id) {
            newProfile.id = generateUUID();
        }

        if (!newProfile.customId?.trim()) {
            newProfile.customId = generateShortId(8);
        }

        if (profiles.value.some((p) => p.customId === newProfile.customId)) {
            showToast('⚠️ 自定义ID已存在，请修改', 'error');
            return false;
        }

        profiles.value.unshift(newProfile);
        return await saveData('新增订阅组');
    }

    async function updateProfile(profile: Profile): Promise<boolean> {
        const idx = profiles.value.findIndex((p) => p.id === profile.id);
        if (idx === -1) return false;

        if (profile.customId !== profiles.value[idx].customId) {
            if (!profile.customId?.trim()) {
                showToast('⚠️ 自定义ID不能为空', 'error');
                return false;
            }
            if (profiles.value.some((p) => p.id !== profile.id && p.customId === profile.customId)) {
                showToast('⚠️ 自定义ID已存在', 'error');
                return false;
            }
        }

        profiles.value[idx] = { ...profile };
        return await saveData('更新订阅组');
    }

    async function deleteProfile(id: string) {
        profiles.value = profiles.value.filter((p) => p.id !== id);
        await saveData('删除订阅组');
    }

    async function deleteAllProfiles() {
        profiles.value = [];
        await saveData('清空订阅组');
    }

    async function batchDeleteProfiles(ids: string[]) {
        const idSet = new Set(ids);
        profiles.value = profiles.value.filter((p) => !idSet.has(p.id));
        await saveData('批量删除订阅组');
    }

    async function toggleProfile(id: string, enabled: boolean) {
        const p = profiles.value.find((p) => p.id === id);
        if (p) {
            p.enabled = enabled;
            await saveData('切换订阅组状态', false);
        }
    }

    function removeIdFromProfiles(id: string, type: 'subscriptions' | 'manualNodes') {
        profiles.value.forEach((p) => {
            if (type === 'subscriptions' && p.subscriptions) {
                p.subscriptions = p.subscriptions.filter((sid: string) => sid !== id);
            } else if (type === 'manualNodes' && p.manualNodes) {
                p.manualNodes = p.manualNodes.filter((nid: string) => nid !== id);
            }
        });
    }

    function clearProfilesField(type: 'subscriptions' | 'manualNodes') {
        profiles.value.forEach((p) => {
            if (type === 'subscriptions') p.subscriptions = [];
            if (type === 'manualNodes') p.manualNodes = [];
        });
    }

    return {
        profiles,
        addProfile,
        updateProfile,
        deleteProfile,
        deleteAllProfiles,
        batchDeleteProfiles,
        toggleProfile,
        removeIdFromProfiles,
        clearProfilesField
    };
}
