<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useI18n } from 'vue-i18n';

import { storeToRefs } from 'pinia';

import { useProfileManagement } from '@/entities/profile/model/useProfileManagement';
import { useBatchSelection } from '@/common/hooks/useBatchSelection';
import { usePagination } from '@/common/hooks/usePagination';
import { useTabActionTrigger } from '@/common/hooks/useTabActionTrigger';
import type { Profile } from '@/common/types/index';
import BatchActionToolbar from '@/common/ui/BatchActionToolbar.vue';
import ConfirmModal from '@/common/ui/ConfirmModal.vue';
import EmptyState from '@/common/ui/EmptyState.vue';
import MoreMenu from '@/common/ui/MoreMenu.vue';
import Pagination from '@/common/ui/Pagination.vue';

import { useDataStore } from '@/stores/useAppStore';

import ProfileCard from '@/widgets/profile/ProfileCard.vue';

const props = defineProps<{
    tabAction?: { action: string } | null;
}>();

const emit = defineEmits<{
    (e: 'show-nodes', profile: Profile): void;
    (e: 'action-handled'): void;
}>();

// Async components
const ProfileModal = defineAsyncComponent(() => import('@/widgets/profile/ProfileModal.vue'));
const SubscriptionExportModal = defineAsyncComponent(
    () => import('@/widgets/profile/SubscriptionExportModal.vue')
);

// Stores
const dataStore = useDataStore();
const { profiles, subscriptions, manualNodes, config } = storeToRefs(dataStore);
const { t } = useI18n();

const {
    currentPage,
    totalPages,
    paginatedItems: paginatedProfiles,
    changePage,
    resetPage
} = usePagination<Profile>(
    computed(() => profiles.value),
    9
);

// Profile Management Hooks
const {
    showProfileModal,
    isNewProfile,
    editingProfile,
    showExportModal,
    exportingProfile,
    showDeleteSingleProfileModal,
    showDeleteAllProfilesModal,
    handleAddProfile,
    handleEditProfile,
    handleSaveProfile: baseHandleSaveProfile,
    handleDeleteProfile,
    handleConfirmDeleteSingleProfile,
    handleDeleteAllProfiles,
    handleToggleProfile,
    handleCopyLink
} = useProfileManagement();

// Wrapper for saving profile to reset page on creation
const handleSaveProfile = (profileData: Profile) => {
    baseHandleSaveProfile(profileData, () => resetPage());
};

const profilesMoreMenuItems = computed(() => [
    { key: 'batch-delete', label: t('views.profiles.menus.batchDelete') },
    { key: 'clear-all', label: t('views.profiles.menus.clearAll'), danger: true, dividerBefore: true }
]);

// Batch Select
const {
    isBatchDeleteMode,
    selectedCount,
    toggleBatchDeleteMode,
    isSelected,
    toggleSelection,
    selectAll,
    deselectAll,
    invertSelection,
    getSelectedIds
} = useBatchSelection(paginatedProfiles);

const handleBatchDelete = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    await dataStore.batchDeleteProfiles(ids);
    toggleBatchDeleteMode(); // Exit batch mode
    deselectAll();
};

const handleToggleBatchDeleteMode = () => {
    toggleBatchDeleteMode();
};

const deleteSelected = async () => {
    if (selectedCount.value === 0) return;
    const idsToDelete = getSelectedIds();
    await handleBatchDelete(idsToDelete);
};

const handleProfilesMoreMenuSelect = (key: string) => {
    if (key === 'batch-delete') {
        handleToggleBatchDeleteMode();
    }

    if (key === 'clear-all') {
        showDeleteAllProfilesModal.value = true;
    }
};

useTabActionTrigger(
    computed(() => props.tabAction),
    'add',
    () => {
        handleAddProfile();
        emit('action-handled');
    }
);
</script>

<template>
    <div class="w-full">
        <div class="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex-1"></div>
            <div class="ml-auto flex flex-wrap items-center gap-2">
                <div class="flex flex-wrap items-center gap-2">
                    <button
                        class="btn-modern-enhanced btn-add transform px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:px-5 sm:py-2.5 sm:text-sm"
                        @click="handleAddProfile"
                    >
                        {{ t('views.profiles.addBtn') }}
                    </button>
                    <MoreMenu
                        :items="profilesMoreMenuItems"
                        width-class="w-36"
                        @select="handleProfilesMoreMenuSelect"
                    />
                </div>
            </div>
        </div>

        <BatchActionToolbar
            :visible="isBatchDeleteMode"
            :selected-count="selectedCount"
            accent="secondary"
            @select-all="selectAll"
            @invert-selection="invertSelection"
            @deselect-all="deselectAll"
            @delete-selected="deleteSelected"
            @cancel="handleToggleBatchDeleteMode"
        />

        <div
            v-if="profiles.length > 0"
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8"
        >
            <ProfileCard
                v-for="profile in paginatedProfiles"
                :key="profile.id"
                :profile="profile"
                :all-subscriptions="subscriptions"
                :is-batch-mode="isBatchDeleteMode"
                :is-selected="isSelected(profile.id)"
                @edit="handleEditProfile(profile.id)"
                @delete="handleDeleteProfile(profile.id)"
                @change="handleToggleProfile"
                @copy-link="handleCopyLink(profile.id)"
                @show-nodes="$emit('show-nodes', profile)"
                @toggle-select="toggleSelection(profile.id)"
            />
        </div>
        <Pagination
            :current-page="currentPage"
            :total-pages="totalPages"
            @change-page="changePage"
        />
        <EmptyState
            v-if="profiles.length === 0"
            :title="t('views.profiles.emptyTitle')"
            :description="t('views.profiles.emptyDesc')"
            bg-gradient-class="bg-linear-to-br from-secondary-500/20 to-pink-500/20"
            icon-color-class="text-secondary-500"
        >
            <template #icon>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-12 w-12 text-secondary-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                </svg>
            </template>
        </EmptyState>

        <!-- Modals -->
        <ProfileModal
            v-if="showProfileModal"
            v-model:show="showProfileModal"
            :profile="editingProfile"
            :is-new="isNewProfile"
            :all-subscriptions="subscriptions"
            :all-manual-nodes="manualNodes"
            size="2xl"
            @save="handleSaveProfile"
        />

        <ConfirmModal
            v-model:show="showDeleteSingleProfileModal"
            :title="t('views.profiles.deleteModal.title')"
            :message="t('views.profiles.deleteModal.desc')"
            type="danger"
            @confirm="handleConfirmDeleteSingleProfile"
        />

        <ConfirmModal
            v-model:show="showDeleteAllProfilesModal"
            :title="t('views.profiles.clearAllModal.title')"
            :message="t('views.profiles.clearAllModal.desc')"
            type="danger"
            @confirm="handleDeleteAllProfiles"
        />

        <!-- Export Modal -->
        <SubscriptionExportModal
            v-if="showExportModal && exportingProfile"
            v-model:show="showExportModal"
            :profile="exportingProfile"
            :config="config"
        />
    </div>
</template>
