/**
 * 共享类型定义
 * 前后端通用
 */

// ==================== 基础类型定义 ====================

/** 
 * 支持的代理协议类型 
 * 包含所有常见协议，也允许字符串扩展
 */
export type ProtocolType =
    | 'vmess'
    | 'vless'
    | 'trojan'
    | 'ss'
    | 'shadowsocks'
    | 'ssr'
    | 'shadowsocksr'
    | 'hysteria'
    | 'hysteria2'
    | 'hy'
    | 'hy2'
    | 'tuic'
    | 'juicity'
    | 'wireguard'
    | 'wg'
    | 'snell'
    | 'socks'
    | 'socks5'
    | 'http'
    | 'https'
    | string; // 允许扩展支持未来的协议

/**
 * 客户端配置格式
 */
export type ClientFormat =
    | 'clash'
    | 'singbox'
    | 'surge'
    | 'loon'
    | 'quantumultx'
    | 'base64';

// ==================== 节点接口 ====================

/**
 * 节点（Node）接口定义
 * 表示单个代理节点的数据结构
 */
export interface Node {
    /** 节点唯一标识符（UUID 或 哈希） */
    id: string;
    /** 节点显示名称 */
    name: string;
    /** 节点链接地址（协议://配置信息） */
    url: string;
    /** 协议类型 */
    protocol?: ProtocolType;
    /** 节点启用状态 */
    enabled: boolean;
    /** 节点类型（可选扩展字段） */
    type?: string;
    /** 所属订阅名称（用于区分来源） */
    subscriptionName?: string;
    /** 原始代理配置对象（解析后的 JSON 对象，避免重复解析） */
    originalProxy?: Record<string, unknown>;

    // --- 常用解析属性 (可选) ---
    server?: string;
    port?: number;
    uuid?: string;
    password?: string;
    cipher?: string;
    udp?: boolean;
    tfo?: boolean;

    /** 动态扩展字段 */
    [key: string]: unknown;
}

// ==================== 订阅源接口 ====================

/**
 * 流量信息接口
 */
export interface SubscriptionUserInfo {
    /** 上传流量 (Bytes) */
    upload: number;
    /** 下载流量 (Bytes) */
    download: number;
    /** 总流量限制 (Bytes) */
    total: number;
    /** 过期时间戳 (秒) */
    expire?: number;
}

/**
 * 订阅源（Subscription）接口
 * 用户添加的原始订阅链接或节点集合
 */
export interface Subscription {
    /** 订阅 ID */
    id: string;
    /** 订阅名称 */
    name: string;
    /** 订阅链接 (如果是手动节点则可能不是标准 URL) */
    url: string;
    /** 是否启用 */
    enabled: boolean;
    /** 排除关键词 (用于过滤不想保留的节点) */
    exclude?: string;
    /** 节点数量 (缓存值) */
    nodeCount?: number;
    /** 流量信息 (缓存值) */
    userInfo?: SubscriptionUserInfo;
    /** 上次更新时间 */
    updatedAt?: number;
    /** 创建时间 */
    createdAt?: number;

    // --- 通知相关状态 ---
    /** 上次发送过期提醒的时间 */
    lastNotifiedExpire?: number;
    /** 上次发送流量预警的时间 */
    lastNotifiedTraffic?: number;
}

// ==================== 订阅组/配置接口 ====================

/**
 * 订阅配置（Profile）接口
 * 定义如何组合多个订阅源并输出为特定格式
 */
export interface Profile {
    /** 配置 ID */
    id: string;
    /** 配置名称 (显示在订阅列表) */
    name: string;
    /** 描述信息 */
    description?: string;
    /** 目标客户端格式 */
    type: ClientFormat;
    /** 包含的订阅源 ID 列表 */
    subscriptions: string[];
    /** 包含的手动节点ID列表 */
    manualNodes?: string[];
    /** 节点过滤/筛选规则 (Regex 或 关键词) */
    filter?: string;
    /** 生成的订阅链接 token (可选，用于个性化 URL) */
    token?: string;
    /** 创建时间 */
    createdAt?: number;
    /** 更新时间 */
    updatedAt?: number;
    /** 动态扩展字段 */
    [key: string]: unknown;
}

// ==================== 应用设置接口 ====================

/**
 * 全局应用设置 (AppConfig)
 */
export interface AppConfig {
    /** 站点名称 */
    FileName: string;
    /** 访问令牌 (API Key) */
    mytoken: string;
    /** 订阅配置路径 Token */
    profileToken: string;
    /** 后端转换服务地址 (SubConverter) */
    subConverter: string;
    /** 外部配置模板地址 (用于 Clash 等) */
    subConfig: string;
    /** 是否自动在节点名前添加订阅源名称 */
    prependSubName: boolean;
    /** 订阅过期提前提醒天数 */
    NotifyThresholdDays: number;
    /** 流量使用百分比提醒阈值 */
    NotifyThresholdPercent: number;

    // --- Telegram 通知设置 ---
    BotToken?: string;
    ChatID?: string;

    /** 动态扩展字段 */
    [key: string]: unknown;
}

// 兼容导出，避免破坏现有引用
export type AppSettings = AppConfig;

// ==================== 处理选项接口 ====================

/**
 * 节点解析/处理选项
 */
export interface ProcessOptions {
    /** 排除规则（节点过滤关键词） */
    exclude?: string;
    /** 是否自动添加订阅名作为节点名前缀 */
    prependSubName?: boolean;
    /** 是否进行 UDP 检测 (可选) */
    udpCheck?: boolean;
    /** 用户代理字符串 */
    userAgent?: string;
}

// ==================== 转换选项接口 ====================

/**
 * 转换器选项 (ConverterOptions)
 * 控制输出格式和内容的选项
 */
export interface ConverterOptions {
    /** 配置文件名称 (用于生成的文件名或头部注释) */
    filename?: string;
    /** 是否包含规则 (Clash/Surge 等) */
    includeRules?: boolean;
    /** 远程规则配置 URL */
    remoteConfig?: string;
    /** 订阅用户信息 (流量统计，用于在配置中展示) */
    userInfo?: {
        upload?: number;
        download?: number;
        total?: number;
        expire?: number;
    };
    /** 目标客户端版本 (可选，如 Clash Meta vs Premium) */
    clientVersion?: string;
    /** 是否启用 UDP (部分客户端支持) */
    udp?: boolean;
}

