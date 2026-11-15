<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
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

// Search state
const searchQuery = ref('');

const filteredProfiles = computed(() => {
    if (!searchQuery.value.trim()) return profiles.value;
    const q = searchQuery.value.toLowerCase().trim();
    return profiles.value.filter(
        (p: Profile) =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.customId && p.customId.toLowerCase().includes(q))
    );
});

const {
    currentPage,
    totalPages,
    paginatedItems: paginatedProfiles,
    changePage,
    resetPage
} = usePagination<Profile>(filteredProfiles, 9);

watch(searchQuery, () => {
    resetPage();
});

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
    <div class="w-full space-y-6">
        <!-- 顶部工具栏：搜索与操作按钮 -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="relative w-full sm:w-64">
                <input
                    v-model="searchQuery"
                    type="text"
                    :placeholder="t('views.profiles.searchPlaceholder')"
                    :aria-label="t('views.profiles.searchPlaceholder')"
                    class="search-input-unified w-full text-sm"
                />
                <svg
                    class="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
                <button
                    v-if="searchQuery"
                    type="button"
                    class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    @click="searchQuery = ''"
                >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <div class="flex items-center gap-2">
                <button
                    class="btn-modern-enhanced btn-add px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm"
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

        <!-- 订阅组网格区域 -->
        <div v-if="profiles.length > 0">
            <!-- 搜索无结果状态 -->
            <div
                v-if="filteredProfiles.length === 0"
                class="card-glass flex flex-col items-center justify-center rounded-xl border border-gray-200 p-12 text-center dark:border-white/10"
            >
                <div
                    class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10"
                >
                    <svg
                        class="h-6 w-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
                <h3 class="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                    {{ t('views.profiles.noMatchingProfiles') }}
                </h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {{ t('views.profiles.noMatchingHint') }}
                </p>
                <button
                    type="button"
                    class="btn-modern-enhanced btn-secondary mt-4 px-4 py-1.5 text-xs font-medium"
                    @click="searchQuery = ''"
                >
                    {{ t('views.profiles.clearSearch') }}
                </button>
            </div>

            <!-- 订阅组卡片网格 -->
            <div
                v-else
                class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-6"
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
                v-if="totalPages > 1"
                :current-page="currentPage"
                :total-pages="totalPages"
                @change-page="changePage"
            />
        </div>

        <!-- 初始空状态 -->
        <EmptyState
            v-else
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
