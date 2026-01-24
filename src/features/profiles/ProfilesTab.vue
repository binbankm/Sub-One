<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue';

import { storeToRefs } from 'pinia';

import ConfirmModal from '../../components/ui/ConfirmModal.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import Pagination from '../../components/ui/Pagination.vue';
import { useBatchSelection } from '../../composables/useBatchSelection';
import { useDataStore } from '../../stores/data';
import { useToastStore } from '../../stores/toast';
import type { Profile } from '../../types/index';
import ProfileCard from './components/ProfileCard.vue';

// Async components
const ProfileModal = defineAsyncComponent(() => import('./components/ProfileModal.vue'));

const props = defineProps<{
    tabAction?: { action: string } | null;
}>();

const emit = defineEmits<{
    (e: 'show-nodes', profile: Profile): void;
    (e: 'action-handled'): void;
}>();

// Utils
const { showToast } = useToastStore();
const dataStore = useDataStore();
const { profiles, subscriptions, manualNodes, config } = storeToRefs(dataStore);

// Pagination
const itemsPerPage = 9;
const currentPage = ref(1);

const totalPages = computed(() => Math.ceil(profiles.value.length / itemsPerPage) || 1);

const paginatedProfiles = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return profiles.value.slice(start, start + itemsPerPage);
});

const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
    }
};

// State
const showProfilesMoreMenu = ref(false);
const profilesMoreMenuRef = ref<HTMLElement | null>(null);

// Modal States
const showProfileModal = ref(false);
const isNewProfile = ref(false);
const editingProfile = ref<Profile | null>(null);

// Export Modal
const SubscriptionExportModal = defineAsyncComponent(
    () => import('./components/SubscriptionExportModal.vue')
);
const showExportModal = ref(false);
const exportingProfile = ref<Profile | null>(null);

const showDeleteSingleProfileModal = ref(false);
const showDeleteAllProfilesModal = ref(false);
const deletingItemId = ref<string | null>(null);

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

// Watch for Cross-Tab Actions
watch(
    () => props.tabAction,
    (val) => {
        if (val && val.action === 'add') {
            handleAddProfile();
            emit('action-handled');
        }
    },
    { immediate: true }
);

// Handlers

const handleAddProfile = () => {
    if (!config.value.profileToken?.trim()) {
        return showToast('请先在"设置"中配置"订阅组分享Token"', 'error');
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
    const profile = profiles.value.find((p) => p.id === profileId);
    if (profile) {
        isNewProfile.value = false;
        editingProfile.value = JSON.parse(JSON.stringify(profile));
        showProfileModal.value = true;
    }
};

const handleSaveProfile = async (profileData: Profile) => {
    if (!profileData?.name) return showToast('订阅组名称不能为空', 'error');

    const success = await (isNewProfile.value
        ? dataStore.addProfile(profileData)
        : dataStore.updateProfile(profileData));

    if (success) {
        await dataStore.saveData('订阅组');
        showProfileModal.value = false;
        if (isNewProfile.value) {
            currentPage.value = 1; // 优化：新增后跳转到第一页
        }
    }
};

const handleDeleteProfile = (profileId: string) => {
    deletingItemId.value = profileId;
    showDeleteSingleProfileModal.value = true;
};

const handleConfirmDeleteSingleProfile = async () => {
    if (!deletingItemId.value) return;
    dataStore.deleteProfile(deletingItemId.value);
    await dataStore.saveData('订阅组删除');
    showDeleteSingleProfileModal.value = false;
};

const handleDeleteAllProfiles = async () => {
    dataStore.deleteAllProfiles();
    await dataStore.saveData('订阅组清空');
    showDeleteAllProfilesModal.value = false;
};

const handleBatchDelete = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    dataStore.batchDeleteProfiles(ids);
    await dataStore.saveData(`批量删除 ${ids.length} 个订阅组`);
    toggleBatchDeleteMode(); // Exit batch mode
    deselectAll();
};

const handleToggleProfile = async (profile: Profile) => {
    dataStore.toggleProfile(profile.id, profile.enabled);
    await dataStore.saveData(`${profile.name || '订阅组'} 状态`);
};

const handleCopyLink = (id: string) => {
    const profile = profiles.value.find((p) => p.id === id);
    if (!profile) return;

    exportingProfile.value = profile;
    showExportModal.value = true;
};

// UI Handlers
const handleToggleBatchDeleteMode = () => {
    toggleBatchDeleteMode();
    showProfilesMoreMenu.value = false;
};

const deleteSelected = () => {
    if (selectedCount.value === 0) return;
    const idsToDelete = getSelectedIds();
    handleBatchDelete(idsToDelete);
};

const handleClickOutside = (event: Event) => {
    if (
        showProfilesMoreMenu.value &&
        profilesMoreMenuRef.value &&
        !profilesMoreMenuRef.value.contains(event.target as globalThis.Node)
    ) {
        showProfilesMoreMenu.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});
onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
    <div class="w-full">
        <div class="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex-1"></div>
            <div class="ml-auto flex flex-wrap items-center gap-2">
                <div class="flex flex-wrap items-center gap-2">
                    <button
                        @click="handleAddProfile"
                        class="btn-modern-enhanced btn-add transform px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:px-5 sm:py-2.5 sm:text-sm"
                    >
                        新增
                    </button>
                    <div class="relative" ref="profilesMoreMenuRef">
                        <button
                            @click="showProfilesMoreMenu = !showProfilesMoreMenu"
                            class="hover-lift rounded-2xl p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 sm:p-4"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-5 w-5 text-gray-600 dark:text-gray-300 sm:h-6 sm:w-6"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z"
                                />
                            </svg>
                        </button>
                        <Transition name="slide-fade-sm">
                            <div
                                v-if="showProfilesMoreMenu"
                                class="absolute right-0 z-50 mt-2 w-36 rounded-2xl border border-gray-300 bg-white shadow-2xl ring-2 ring-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:ring-gray-700"
                            >
                                <button
                                    @click="handleToggleBatchDeleteMode"
                                    class="w-full px-5 py-3 text-left text-base text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
                                >
                                    批量删除
                                </button>
                                <div
                                    class="my-1 border-t border-gray-300 dark:border-gray-700"
                                ></div>
                                <button
                                    @click="
                                        showDeleteAllProfilesModal = true;
                                        showProfilesMoreMenu = false;
                                    "
                                    class="w-full px-5 py-3 text-left text-base text-red-500 transition-colors hover:text-red-600 dark:hover:text-red-400"
                                >
                                    清空所有
                                </button>
                            </div>
                        </Transition>
                    </div>
                </div>
            </div>
        </div>

        <!-- 批量操作工具栏 -->
        <Transition name="slide-fade">
            <div
                v-if="isBatchDeleteMode"
                class="mb-6 rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4 shadow-lg dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20"
            >
                <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <div
                        class="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path
                                fill-rule="evenodd"
                                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        批量删除模式
                        <span
                            v-if="selectedCount > 0"
                            class="ml-2 rounded-full bg-purple-600 px-3 py-1 text-xs font-bold text-white shadow-md"
                        >
                            已选 {{ selectedCount }}
                        </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button
                            @click="selectAll"
                            class="btn-modern-enhanced btn-secondary transform px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:px-4 sm:py-2 sm:text-sm"
                        >
                            全选
                        </button>
                        <button
                            @click="invertSelection"
                            class="btn-modern-enhanced btn-secondary transform px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:px-4 sm:py-2 sm:text-sm"
                        >
                            反选
                        </button>
                        <button
                            @click="deselectAll"
                            class="btn-modern-enhanced btn-secondary transform px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:px-4 sm:py-2 sm:text-sm"
                        >
                            清空选择
                        </button>
                        <button
                            @click="deleteSelected"
                            :disabled="selectedCount === 0"
                            class="btn-modern-enhanced btn-danger flex transform items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                            删除选中 ({{ selectedCount }})
                        </button>
                        <button
                            @click="handleToggleBatchDeleteMode"
                            class="btn-modern-enhanced btn-cancel transform px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 sm:px-4 sm:py-2 sm:text-sm"
                        >
                            取消
                        </button>
                    </div>
                </div>
            </div>
        </Transition>

        <div
            v-if="profiles.length > 0"
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8"
        >
            <ProfileCard
                v-for="profile in paginatedProfiles"
                :key="profile.id"
                :profile="profile"
                :all-subscriptions="subscriptions"
                :isBatchMode="isBatchDeleteMode"
                :isSelected="isSelected(profile.id)"
                @edit="handleEditProfile(profile.id)"
                @delete="handleDeleteProfile(profile.id)"
                @change="handleToggleProfile"
                @copy-link="handleCopyLink(profile.id)"
                @showNodes="$emit('show-nodes', profile)"
                @toggleSelect="toggleSelection(profile.id)"
            />
        </div>
        <Pagination
            :current-page="currentPage"
            :total-pages="totalPages"
            @change-page="changePage"
        />
        <EmptyState
            v-if="profiles.length === 0"
            title="没有订阅组"
            description="创建一个订阅组来组合你的节点吧！"
            bg-gradient-class="bg-gradient-to-br from-purple-500/20 to-pink-500/20"
            icon-color-class="text-purple-500"
        >
            <template #icon>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-12 w-12 text-purple-500"
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
            @save="handleSaveProfile"
            size="2xl"
        />

        <ConfirmModal
            v-model:show="showDeleteSingleProfileModal"
            @confirm="handleConfirmDeleteSingleProfile"
            title="确认删除订阅组"
            message="您确定要删除此订阅组吗？此操作不可逆。"
            type="danger"
        />

        <ConfirmModal
            v-model:show="showDeleteAllProfilesModal"
            @confirm="handleDeleteAllProfiles"
            title="确认清空订阅组"
            message="您确定要删除所有<strong>订阅组</strong>吗？此操作不可逆。"
            type="danger"
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
