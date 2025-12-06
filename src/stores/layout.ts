import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useLayoutStore = defineStore('layout', () => {
    const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true');
    const sidebarMobileOpen = ref(false);

    const sidebarWidth = computed(() => sidebarCollapsed.value ? '5rem' : '18rem');
    const mainPaddingLeft = computed(() => sidebarCollapsed.value ? 'lg:pl-20' : 'lg:pl-72');

    function toggleSidebar() {
        sidebarCollapsed.value = !sidebarCollapsed.value;
        localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed.value));
    }

    function toggleMobileSidebar() {
        sidebarMobileOpen.value = !sidebarMobileOpen.value;
    }

    function closeMobileSidebar() {
        sidebarMobileOpen.value = false;
    }

    function init() {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved !== null) {
            sidebarCollapsed.value = saved === 'true';
        }
    }

    return {
        sidebarCollapsed,
        sidebarMobileOpen,
        sidebarWidth,
        mainPaddingLeft,
        toggleSidebar,
        toggleMobileSidebar,
        closeMobileSidebar,
        init
    };
});
