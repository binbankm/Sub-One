
import { AppConfig } from '../../shared/types';

export const defaultSettings: AppConfig = {
    FileName: 'Sub-One',
    mytoken: 'auto',
    profileToken: '',

    theme: 'dark',


    prependSubName: false,
    dedupe: false,

    // 网络与安全
    udp: false,
    skipCertVerify: false,

    // Telegram 通知
    BotToken: '',
    ChatID: '',

    // 通知阈值
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90
};

export const GLOBAL_USER_AGENT = 'Clash.Meta/v1.19.18'; // Unified UA: Mihomo v1.19.18
