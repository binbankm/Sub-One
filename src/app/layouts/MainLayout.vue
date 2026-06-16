<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import { storeToRefs } from 'pinia';

import Footer from '@/app/layouts/AppFooter.vue';
import Sidebar from '@/app/layouts/AppSidebar.vue';
import { useDataCounts } from '@/common/hooks/useDataCounts';
import { APP_TABS, type AppTab } from '@/common/utils/navigation';
import { NodeDetailsModal } from '@/widgets/node';

import { useDataStore } from '@/stores/useAppStore';
import { useLayoutStore } from '@/stores/useLayoutStore';
import { useUIStore } from '@/stores/useNotificationStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { type Profile, type Subscription } from '@/common/types/index';

const SettingsModal = defineAsyncComponent(() =>
    import('@/widgets/settings').then((module) => module.SettingsModal)
);
const HelpModal = defineAsyncComponent(() =>
    import('@/widgets/settings').then((module) => module.HelpModal)
);

const sessionStore = useSessionStore();
const layoutStore = useLayoutStore();
const uiStore = useUIStore();
const dataStore = useDataStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const { initialData } = storeToRefs(sessionStore);

const handleLogout = async () => {
    await sessionStore.logout();
    router.push({ name: 'login' });
};

const { subscriptionsCount, profilesCount, manualNodesCount } = useDataCounts(initialData);

const activeTab = computed({
    get: () => (route.name as AppTab) || 'dashboard',
    set: (val: AppTab) => {
        router.push({ name: val });
    }
});

const showHelpModal = ref(false);
const currentTabInfo = computed(() => APP_TABS[activeTab.value] || APP_TABS.dashboard);

const openSettings = () => {
    uiStore.show();
};

const openHelp = () => {
    showHelpModal.value = true;
};

// 状态共享给子动态组件
const showNodeDetailsModal = ref(false);
const selectedSubscription = ref<Subscription | null>(null);
const selectedProfile = ref<Profile | null>(null);
const tabAction = ref<{ action: string; payload?: unknown } | null>(null);

const handleShowNodes = (payload: Subscription | Profile) => {
    if ('url' in payload || 'nodeCount' in payload) {
        selectedSubscription.value = payload as Subscription;
        selectedProfile.value = null;
    } else {
        selectedProfile.value = payload as Profile;
        selectedSubscription.value = null;
    }
    showNodeDetailsModal.value = true;
};

onMounted(() => {
    // 确保数据已初始化
    if (initialData.value) {
        dataStore.initData(initialData.value);
    }
});
</script>

<template>
    <div class="dashboard-container">
        <Sidebar
            v-model="activeTab"
            :subscriptions-count="subscriptionsCount"
            :profiles-count="profilesCount"
            :manual-nodes-count="manualNodesCount"
            @logout="handleLogout"
            @settings="openSettings"
            @help="openHelp"
        />

        <main class="main-content" :class="{ 'main-content-full': layoutStore.sidebarCollapsed }">
            <div class="content-wrapper">
                <header class="page-header">
                    <div class="header-content">
                        <div class="header-text">
                            <h1 class="page-title">{{ t(currentTabInfo.title) }}</h1>
                            <p class="page-description">{{ t(currentTabInfo.description) }}</p>
                        </div>
                    </div>
                </header>

                <div class="dashboard-content">
                    <router-view v-slot="{ Component }">
                        <Transition name="page-fade" mode="out-in">
                            <div :key="route.name as string" class="space-y-6 lg:space-y-8">
                                <component
                                    :is="Component"
                                    :tab-action="tabAction"
                                    @action-handled="tabAction = null"
                                    @show-nodes="handleShowNodes"
                                    @add-subscription="router.push('/subscriptions')"
                                    @add-node="router.push('/nodes')"
                                    @add-profile="router.push('/profiles')"
                                />
                            </div>
                        </Transition>
                    </router-view>
                </div>

                <Footer class="dashboard-footer" />
            </div>
        </main>

        <SettingsModal v-model:show="uiStore.isSettingsModalVisible" />
        <HelpModal v-if="showHelpModal" v-model:show="showHelpModal" />
        
        <NodeDetailsModal
            :show="showNodeDetailsModal"
            :subscription="selectedSubscription"
            :profile="selectedProfile"
            @update:show="showNodeDetailsModal = $event"
        />
    </div>
</template>

<style scoped>
.page-fade-enter-active,
.page-fade-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-fade-enter-from {
    opacity: 0;
    transform: translateX(10px);
}

.page-fade-leave-to {
    opacity: 0;
    transform: translateX(-10px);
}

@media (max-width: 1024px) {
    .container-optimized {
        width: 100% !important;
    }
}
</style>
