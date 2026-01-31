import { AppConfig } from '../proxy/types';

export const defaultSettings: AppConfig = {
    FileName: 'Sub-One',
    mytoken: 'auto',
    profileToken: '',


    prependSubName: false,
    dedupe: false,

    // 转换配置
    useExternalConverter: false,
    externalConverterUrl: '',
    externalConverterApis: [
        'api-suc.0z.gs',
        'subapi.fxxk.dedyn.io',
        'subapi.cmliussss.net',
        'url.v1.mk',
        'api.v1.mk'
    ],

    // Telegram 通知
    BotToken: '',
    ChatID: '',

    // 通知阈值
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90
};

export const GLOBAL_USER_AGENT = 'Clash.Meta/v1.19.19'; // Unified UA: Mihomo v1.19.19
