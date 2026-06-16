export const APP_TABS = {
    dashboard: {
        title: 'views.tabs.dashboard.title',
        description: 'views.tabs.dashboard.desc'
    },
    subscriptions: {
        title: 'views.tabs.subscriptions.title',
        description: 'views.tabs.subscriptions.desc'
    },
    profiles: {
        title: 'views.tabs.profiles.title',
        description: 'views.tabs.profiles.desc'
    },
    nodes: {
        title: 'views.tabs.nodes.title',
        description: 'views.tabs.nodes.desc'
    }
} as const;

export type AppTab = keyof typeof APP_TABS;
