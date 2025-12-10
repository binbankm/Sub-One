export interface Node {
    id: string;
    name: string;
    url: string;
    protocol: string;
    enabled: boolean;
    type: string;
    subscriptionName: string;
    originalProxy?: any;
    nodeCount?: number;
    userInfo?: any;
    exclude?: string;
}

export interface Subscription {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    exclude?: string;
    userInfo?: any;
    nodeCount?: number;
    lastNotifiedExpire?: number;
    lastNotifiedTraffic?: number;
}

export interface Profile {
    id: string;
    name: string;
    customId?: string;
    enabled: boolean;
    subscriptions: string[];
    manualNodes: string[];
    expiresAt?: string;
    subConverter?: string;
    subConfig?: string;
}

export interface Settings {
    FileName: string;
    mytoken: string;
    profileToken: string;
    subConverter: string;
    subConfig: string;
    prependSubName: boolean;
    NotifyThresholdDays: number;
    NotifyThresholdPercent: number;
    BotToken?: string;
    ChatID?: string;
}

export interface Env {
    ADMIN_PASSWORD?: string;
    PORT?: number;
    REDIS_URL?: string;
    DATA_DIR?: string;
}
