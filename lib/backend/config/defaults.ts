
import { AppConfig } from '../../shared/types';

export const defaultSettings: AppConfig = {
    FileName: 'Sub-One',
    mytoken: 'auto',
    profileToken: '',  // 默认为空，用户需主动设置
    prependSubName: true,
    dedupe: false,  // 默认关闭去重
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90,
    defaultRuleTemplate: 'advanced'
};

export const GLOBAL_USER_AGENT = 'Clash.Meta/v1.19.18'; // Unified UA: Mihomo v1.19.18
