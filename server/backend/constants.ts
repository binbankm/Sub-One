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
const getDefaultSubConverter = (): string => {
    // Docker 环境：使用内部服务
    if (process.env.DOCKER === 'true') {
        console.log('[Config] Docker环境检测到，使用内部Subconverter服务: subconverter:25500');
        return 'subconverter:25500';
    }

    // 开发环境：使用本地服务
    if (process.env.NODE_ENV === 'development') {
        console.log('[Config] 开发环境检测到，使用本地Subconverter服务: localhost:25500');
        return 'localhost:25500';
    }

    // 生产环境（非Docker）：使用公网服务
    console.log('[Config] 生产环境，使用公网Subconverter服务: url.v1.mk');
    return 'url.v1.mk';
};

// Default settings configuration
export const defaultSettings: Settings = {
    FileName: 'Sub-One',
    mytoken: 'auto',
    profileToken: '',
    subConverter: getDefaultSubConverter(),
    subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Full.ini',
    prependSubName: true,
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90
};

// Session configuration
export const COOKIE_NAME = 'auth_session';
export const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
