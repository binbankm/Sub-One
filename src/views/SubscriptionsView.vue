<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { storeToRefs } from 'pinia';

import { useSubscriptionManagement } from '@/entities/subscription/model/useSubscriptionManagement';
import { useBatchSelection } from '@/common/hooks/useBatchSelection';
import { usePagination } from '@/common/hooks/usePagination';
import { useTabActionTrigger } from '@/common/hooks/useTabActionTrigger';
import type { Subscription } from '@/common/types/index';
import BatchActionToolbar from '@/common/ui/BatchActionToolbar.vue';
import ConfirmModal from '@/common/ui/ConfirmModal.vue';
import EmptyState from '@/common/ui/EmptyState.vue';
import MoreMenu from '@/common/ui/MoreMenu.vue';
import Pagination from '@/common/ui/Pagination.vue';
import draggable from 'vuedraggable';

import { useDataStore } from '@/stores/useAppStore';

import Card from '@/widgets/subscription/SubscriptionCard.vue';

const props = defineProps<{
    tabAction?: { action: string; payload?: any } | null;
}>();

const emit = defineEmits<{
    (e: 'show-nodes', sub: Subscription): void;
    (e: 'action-handled'): void;
}>();

// Async Modal
const SubscriptionModal = defineAsyncComponent(() => import('@/widgets/subscription/SubscriptionModal.vue'));

// Stores
const dataStore = useDataStore();
const { subscriptions } = storeToRefs(dataStore);
const { t } = useI18n();

const searchQuery = ref('');
const activeFilter = ref<'all' | 'enabled' | 'disabled' | 'warning'>('all');

const filteredSubscriptions = computed(() => {
    let result = subscriptions.value;

    if (searchQuery.value.trim()) {
        const query = searchQuery.value.trim().toLowerCase();
        result = result.filter(
            (s) =>
                s.name.toLowerCase().includes(query) ||
                (s.url && s.url.toLowerCase().includes(query))
        );
    }

    if (activeFilter.value === 'enabled') {
        result = result.filter((s) => s.enabled);
    } else if (activeFilter.value === 'disabled') {
        result = result.filter((s) => !s.enabled);
    } else if (activeFilter.value === 'warning') {
        const nowSec = Math.floor(Date.now() / 1000);
        result = result.filter((s) => {
            if (!s.userInfo) return false;
            const expire = s.userInfo.expire;
            const isExpiring = expire && expire > 0 && Math.ceil((expire - nowSec) / 86400) <= 7;
            const used = (s.userInfo.upload || 0) + (s.userInfo.download || 0);
            const total = s.userInfo.total || 0;
            const isHighTraffic = total > 0 && (used / total) >= 0.8;
            return isExpiring || isHighTraffic;
        });
    }

    return result;
});

// Hooks: Subscription Management
const {
    showSubModal,
    isNewSubscription,
    editingSubscription,
    showDeleteSingleSubModal,
    showDeleteAllSubsModal,
    isUpdatingAllSubs,
    isSortingSubs,
    hasUnsavedSortChanges,
    handleAddSubscription,
    handleEditSubscription,
    handleSaveSubscription,
    handleSubscriptionToggle,
    handleSubscriptionUpdate,
    handleUpdateAllSubscriptions,
    handleDeleteSubscriptionWithCleanup,
    handleConfirmDeleteSingleSub,
    handleDeleteAllSubscriptionsWithCleanup,
    handleBatchDeleteSubs,
    handleSortSave,
    handleToggleSort,
    handleDragEnd
} = useSubscriptionManagement();

const {
    currentPage,
    totalPages,
    paginatedItems: paginatedSubscriptions,
    changePage,
    resetPage
} = usePagination<Subscription>(filteredSubscriptions, 6, isSortingSubs);

const subsMoreMenuItems = computed(() => [
    { key: 'batch-delete', label: t('views.subscriptions.menus.batchDelete') },
    { key: 'clear-all', label: t('views.subscriptions.menus.clearAll'), danger: true, dividerBefore: true }
]);

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
} = useBatchSelection(paginatedSubscriptions);

const localSubscriptions = computed({
    get: () => subscriptions.value,
    set: (value) => {
        dataStore.subscriptions = value;
    }
});

// UI Event Handlers
const handleSaveSubWrapper = (sub: Subscription) => {
    handleSaveSubscription(sub, () => resetPage());
};

const handleToggleBatchDeleteMode = () => {
    toggleBatchDeleteMode();
};

const deleteSelected = async () => {
    if (selectedCount.value === 0) return;
    const idsToDelete = getSelectedIds();
    await handleBatchDeleteSubs(idsToDelete);
    toggleBatchDeleteMode(true);
};

const handleSubsMoreMenuSelect = (key: string) => {
    if (key === 'batch-delete') {
        handleToggleBatchDeleteMode();
    }
    if (key === 'clear-all') {
        showDeleteAllSubsModal.value = true;
    }
};

useTabActionTrigger(
    computed(() => props.tabAction),
    'add',
    () => {
        handleAddSubscription();
        emit('action-handled');
    }
);
</script>

<template>
    <div class="w-full space-y-5">
        <!-- 顶部操作与筛选栏 -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <!-- 搜索框与状态筛选 -->
            <div class="flex flex-1 flex-wrap items-center gap-2 sm:gap-3">
                <div class="relative w-full sm:w-60">
                    <input
                        v-model="searchQuery"
                        type="text"
                        :placeholder="t('views.subscriptions.searchPlaceholder')"
                        :aria-label="t('views.subscriptions.searchPlaceholder')"
                        class="search-input-unified"
                    />
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <button
                        v-if="searchQuery"
                        type="button"
                        class="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        :title="t('views.profiles.clearSearch')"
                        :aria-label="t('views.profiles.clearSearch')"
                        @click="searchQuery = ''"
                    >
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- 状态筛选 Pills -->
                <div class="flex items-center rounded-element bg-gray-100 p-0.5 dark:bg-white/5 text-xs font-medium">
                    <button
                        type="button"
                        class="rounded px-2.5 py-1 transition-all"
                        :class="activeFilter === 'all' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'"
                        @click="activeFilter = 'all'"
                    >
                        {{ t('views.subscriptions.filterAll', { count: subscriptions.length }) }}
                    </button>
                    <button
                        type="button"
                        class="rounded px-2.5 py-1 transition-all"
                        :class="activeFilter === 'enabled' ? 'bg-white dark:bg-white/10 text-primary-600 dark:text-primary-400 shadow-xs' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'"
                        @click="activeFilter = 'enabled'"
                    >
                        {{ t('views.subscriptions.filterOnline', { count: subscriptions.filter(s => s.enabled).length }) }}
                    </button>
                    <button
                        type="button"
                        class="rounded px-2.5 py-1 transition-all"
                        :class="activeFilter === 'warning' ? 'bg-white dark:bg-white/10 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'"
                        @click="activeFilter = 'warning'"
                    >
                        {{ t('views.subscriptions.filterWarning') }}
                    </button>
                </div>
            </div>

            <!-- 操作按钮组 -->
            <div class="flex flex-wrap items-center gap-2">
                <button
                    class="btn-modern-enhanced btn-add px-3.5 py-2 font-medium"
                    @click="handleAddSubscription"
                >
                    {{ t('views.subscriptions.addBtn') }}
                </button>

                <button
                    :disabled="isUpdatingAllSubs"
                    class="btn-modern-enhanced btn-secondary flex items-center gap-1.5 px-3 py-2 font-medium disabled:opacity-50"
                    @click="handleUpdateAllSubscriptions"
                >
                    <svg
                        v-if="isUpdatingAllSubs"
                        class="h-4 w-4 animate-spin text-primary-600"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                            fill="none"
                        ></circle>
                        <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    <span class="hidden sm:inline">{{
                        isUpdatingAllSubs ? t('views.subscriptions.updating') : t('views.subscriptions.updateAllBtn')
                    }}</span>
                    <span class="sm:hidden">{{ t('views.subscriptions.updateShortBtn') }}</span>
                </button>

                <button
                    v-if="isSortingSubs && hasUnsavedSortChanges"
                    class="btn-modern-enhanced btn-primary px-3 py-2 font-medium"
                    @click="handleSortSave"
                >
                    {{ t('views.subscriptions.saveSortBtn') }}
                </button>

                <button
                    :class="[
                        'btn-modern-enhanced btn-sort px-3 py-2 font-medium',
                        isSortingSubs ? 'sorting' : ''
                    ]"
                    @click="handleToggleSort"
                >
                    {{ isSortingSubs ? t('views.subscriptions.sorting') : t('views.subscriptions.manualSortBtn') }}
                </button>

                <MoreMenu
                    :items="subsMoreMenuItems"
                    width-class="w-40"
                    @select="handleSubsMoreMenuSelect"
                />
            </div>
        </div>

        <BatchActionToolbar
            :visible="isBatchDeleteMode"
            :selected-count="selectedCount"
            accent="primary"
            @select-all="selectAll"
            @invert-selection="invertSelection"
            @deselect-all="deselectAll"
            @delete-selected="deleteSelected"
            @cancel="handleToggleBatchDeleteMode"
        />

        <!-- 订阅卡片网格 -->
        <div v-if="subscriptions.length > 0">
            <draggable
                v-if="isSortingSubs"
                v-model="localSubscriptions"
                tag="div"
                class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8"
                :item-key="(item: Subscription) => item.id"
                animation="300"
                :delay="200"
                :delay-on-touch-only="true"
                @end="handleDragEnd"
            >
                <template #item="{ element: subscription }">
                    <div class="cursor-move">
                        <Card
                            :sub="subscription"
                            :is-batch-mode="isBatchDeleteMode"
                            :is-selected="isSelected(subscription.id)"
                            @delete="handleDeleteSubscriptionWithCleanup(subscription.id)"
                            @change="handleSubscriptionToggle(subscription)"
                            @update="handleSubscriptionUpdate(subscription.id)"
                            @edit="handleEditSubscription(subscription.id)"
                            @show-nodes="$emit('show-nodes', subscription)"
                            @toggle-select="toggleSelection(subscription.id)"
                        />
                    </div>
                </template>
            </draggable>
            <div
                v-else
                class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8"
            >
                <div v-for="subscription in paginatedSubscriptions" :key="subscription.id">
                    <Card
                        :sub="subscription"
                        :is-batch-mode="isBatchDeleteMode"
                        :is-selected="isSelected(subscription.id)"
                        @delete="handleDeleteSubscriptionWithCleanup(subscription.id)"
                        @change="handleSubscriptionToggle(subscription)"
                        @update="handleSubscriptionUpdate(subscription.id)"
                        @edit="handleEditSubscription(subscription.id)"
                        @show-nodes="$emit('show-nodes', subscription)"
                        @toggle-select="toggleSelection(subscription.id)"
                    />
                </div>
            </div>
            <Pagination
                v-if="!isSortingSubs"
                :current-page="currentPage"
                :total-pages="totalPages"
                @change-page="changePage"
            />
        </div>
        <EmptyState
            v-else
            :title="t('views.subscriptions.emptyTitle')"
            :description="t('views.subscriptions.emptyDesc')"
            bg-gradient-class="bg-linear-to-br from-primary-500/20 to-secondary-500/20"
            icon-color-class="text-primary-500"
        >
            <template #icon>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-12 w-12 text-primary-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="1.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                </svg>
            </template>
        </EmptyState>

        <!-- ==================== Modals ==================== -->

        <SubscriptionModal
            v-if="showSubModal"
            v-model:show="showSubModal"
            :subscription="editingSubscription"
            :is-new="isNewSubscription"
            @save="handleSaveSubWrapper"
        />

        <ConfirmModal
            v-model:show="showDeleteAllSubsModal"
            :title="t('views.subscriptions.clearAllModal.title')"
            :message="t('views.subscriptions.clearAllModal.desc')"
            type="danger"
            @confirm="handleDeleteAllSubscriptionsWithCleanup"
        />

        <ConfirmModal
            v-model:show="showDeleteSingleSubModal"
            :title="t('views.subscriptions.deleteModal.title')"
            :message="t('views.subscriptions.deleteModal.desc')"
            type="danger"
            @confirm="handleConfirmDeleteSingleSub"
        />
    </div>
</template>
