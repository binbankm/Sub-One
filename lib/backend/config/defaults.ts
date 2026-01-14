
import { AppConfig } from '../../shared/types';

export const defaultSettings: AppConfig = {
    FileName: 'Sub-One',
    mytoken: 'auto',
    profileToken: '',

    theme: 'dark',


    prependSubName: true,
    dedupe: false,

    // 网络与安全
    udp: true,
    skipCertVerify: false,

    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90
};

export const GLOBAL_USER_AGENT = 'Clash.Meta/v1.19.18'; // Unified UA: Mihomo v1.19.18
