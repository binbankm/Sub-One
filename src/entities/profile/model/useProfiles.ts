import { ref } from 'vue';

import type { Profile } from '@/common/types/index';
import { generateShortId, generateUUID } from '@/common/utils/utils';
import i18n from '@/i18n';

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

        if (profiles.value.some((p: Profile) => p.customId === newProfile.customId)) {
            showToast(i18n.global.t('entities.profile.actions.customIdExists'), 'error');
            return false;
        }

        profiles.value.unshift(newProfile);
        return await saveData(i18n.global.t('entities.profile.actions.add'));
    }

    async function updateProfile(profile: Profile): Promise<boolean> {
        const idx = profiles.value.findIndex((p: Profile) => p.id === profile.id);
        if (idx === -1) return false;

        if (profile.customId !== profiles.value[idx].customId) {
            if (!profile.customId?.trim()) {
                showToast(i18n.global.t('entities.profile.actions.customIdEmpty'), 'error');
                return false;
            }
            if (
                profiles.value.some(
                    (p: Profile) => p.id !== profile.id && p.customId === profile.customId
                )
            ) {
                showToast(i18n.global.t('entities.profile.actions.customIdExists2'), 'error');
                return false;
            }
        }

        profiles.value[idx] = { ...profile };
        return await saveData(i18n.global.t('entities.profile.actions.update'));
    }

    async function deleteProfile(id: string) {
        profiles.value = profiles.value.filter((p: Profile) => p.id !== id);
        await saveData(i18n.global.t('entities.profile.actions.delete'));
    }

    async function deleteAllProfiles() {
        profiles.value = [];
        await saveData(i18n.global.t('entities.profile.actions.clear'));
    }

    async function batchDeleteProfiles(ids: string[]) {
        const idSet = new Set(ids);
        profiles.value = profiles.value.filter((p: Profile) => !idSet.has(p.id));
        await saveData(i18n.global.t('entities.profile.actions.batchDelete'));
    }

    async function toggleProfile(id: string, enabled: boolean) {
        const p = profiles.value.find((p: Profile) => p.id === id);
        if (p) {
            p.enabled = enabled;
            await saveData(i18n.global.t('entities.profile.actions.toggleStatus'), false);
        }
    }

    function removeIdFromProfiles(id: string, type: 'subscriptions' | 'manualNodes') {
        profiles.value.forEach((p: Profile) => {
            if (type === 'subscriptions' && p.subscriptions) {
                p.subscriptions = p.subscriptions.filter((sid: string) => sid !== id);
            } else if (type === 'manualNodes' && p.manualNodes) {
                p.manualNodes = p.manualNodes.filter((nid: string) => nid !== id);
            }
        });
    }

    function clearProfilesField(type: 'subscriptions' | 'manualNodes') {
        profiles.value.forEach((p: Profile) => {
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
