import { Settings } from './types';

// KV Storage Keys
export const KV_KEY_SUBS = 'sub_one_subscriptions_v1';
export const KV_KEY_PROFILES = 'sub_one_profiles_v1';
export const KV_KEY_SETTINGS = 'worker_settings_v1';

// Default expired node
export const DEFAULT_EXPIRED_NODE = `trojan://00000000-0000-0000-0000-000000000000@127.0.0.1:443#${encodeURIComponent('您的订阅已失效')}`;

/**
 * 智能选择 Subconverter 地址
 * 根据部署环境自动选择最优的订阅转换服务
 */
// Default settings configuration
export const defaultSettings: Settings = {
    FileName: 'Sub-One',
    mytoken: 'auto',
    profileToken: '',
    subConverter: 'api.v1.mk',
    subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Full.ini',
    prependSubName: true,
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90
};

// Session configuration
export const COOKIE_NAME = 'auth_session';
export const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
