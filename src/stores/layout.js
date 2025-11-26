import { defineStore } from 'pinia';

export const useLayoutStore = defineStore('layout', {
    state: () => ({
        sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
        sidebarMobileOpen: false,
    }),

    getters: {
        sidebarWidth: (state) => state.sidebarCollapsed ? '5rem' : '18rem',
        mainPaddingLeft: (state) => state.sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72',
    },

    actions: {
        toggleSidebar() {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            localStorage.setItem('sidebarCollapsed', String(this.sidebarCollapsed));
        },

        toggleMobileSidebar() {
            this.sidebarMobileOpen = !this.sidebarMobileOpen;
        },

        closeMobileSidebar() {
            this.sidebarMobileOpen = false;
        },

        init() {
            // 初始化时从 localStorage 读取设置
            const saved = localStorage.getItem('sidebarCollapsed');
            if (saved !== null) {
                this.sidebarCollapsed = saved === 'true';
            }
        }
    }
});
