/**
 * 共享类型定义
 * 前后端通用
 */

export interface Node {
    id: string;
    name: string;
    url: string;
    protocol: string;
    enabled: boolean;
    type: string;
    subscriptionName: string;
    originalProxy?: any;
}

export interface ProcessOptions {
    exclude?: string;
    prependSubName?: boolean;
}
