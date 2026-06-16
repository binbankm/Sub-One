import { computed, ref } from 'vue';

import type { Profile } from '@/common/types/index';

import { useDataStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useNotificationStore';

export function useProfileManagement() {
    const dataStore = useDataStore();
    const toastStore = useToastStore();

    // Config and data references
    const config = computed(() => dataStore.config);
    const profiles = computed(() => dataStore.profiles);

    // Modal States
    const showProfileModal = ref(false);
    const isNewProfile = ref(false);
    const editingProfile = ref<Profile | null>(null);

    // Export Modal States
    const showExportModal = ref(false);
    const exportingProfile = ref<Profile | null>(null);

    // Delete Modal States
    const showDeleteSingleProfileModal = ref(false);
    const showDeleteAllProfilesModal = ref(false);
    const deletingItemId = ref<string | null>(null);

    const handleAddProfile = () => {
        if (!config.value.profileToken?.trim()) {
            toastStore.showToast('请先在"设置"中配置"订阅组分享Token"', 'error');
            return;
        }
        isNewProfile.value = true;
        editingProfile.value = {
            id: '',
            name: '',
            enabled: true,
            subscriptions: [],
            manualNodes: [],
            customId: '',
            type: 'base64'
        };
        showProfileModal.value = true;
    };

    const handleEditProfile = (profileId: string) => {
        const profile = profiles.value.find((p: Profile) => p.id === profileId);
        if (profile) {
            isNewProfile.value = false;
            editingProfile.value = JSON.parse(JSON.stringify(profile));
            showProfileModal.value = true;
        }
    };

    const handleSaveProfile = async (profileData: Profile, onSuccess?: () => void) => {
        if (!profileData?.name) {
            toastStore.showToast('订阅组名称不能为空', 'error');
            return;
        }

        const success = await (isNewProfile.value
            ? dataStore.addProfile(profileData)
            : dataStore.updateProfile(profileData));

        if (success) {
            showProfileModal.value = false;
            if (isNewProfile.value && onSuccess) {
                onSuccess();
            }
        }
    };

    const handleDeleteProfile = (profileId: string) => {
        deletingItemId.value = profileId;
        showDeleteSingleProfileModal.value = true;
    };

    const handleConfirmDeleteSingleProfile = async () => {
        if (!deletingItemId.value) return;
        await dataStore.deleteProfile(deletingItemId.value);
        showDeleteSingleProfileModal.value = false;
    };

    const handleDeleteAllProfiles = async () => {
        await dataStore.deleteAllProfiles();
        showDeleteAllProfilesModal.value = false;
    };

    const handleToggleProfile = async (profile: Profile) => {
        await dataStore.toggleProfile(profile.id, profile.enabled);
    };

    const handleCopyLink = (id: string) => {
        const profile = profiles.value.find((p: Profile) => p.id === id);
        if (!profile) return;

        exportingProfile.value = profile;
        showExportModal.value = true;
    };

    return {
        // States
        showProfileModal,
        isNewProfile,
        editingProfile,
        showExportModal,
        exportingProfile,
        showDeleteSingleProfileModal,
        showDeleteAllProfilesModal,

        // Handlers
        handleAddProfile,
        handleEditProfile,
        handleSaveProfile,
        handleDeleteProfile,
        handleConfirmDeleteSingleProfile,
        handleDeleteAllProfiles,
        handleToggleProfile,
        handleCopyLink
    };
}
