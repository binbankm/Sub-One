/**
 * 核心类型定义 - Single Source of Truth
 * 包含所有支持的协议、字段及配置结构
 */

// ==================== 基础枚举定义 ====================

export type ProxyType =
    | 'vmess'
    | 'vless'
    | 'trojan'
    | 'ss'      // shadowsocks
    | 'ssr'     // shadowsocksr
    | 'hysteria'
    | 'hysteria2'
    | 'tuic'
    | 'wireguard'
    | 'snell'
    | 'socks5'
    | 'http'
    | 'unknown';

export type NetworkType = 'tcp' | 'udp' | 'h2' | 'http' | 'ws' | 'grpc' | 'quic' | 'kcp';

export type CipherType =
    | 'auto'
    | 'aes-128-gcm' | 'aes-256-gcm' | 'chacha20-poly1305' // Common
    | 'none'
    | string;

// ==================== 核心节点配置 (中间表示层) ====================

/**
 * 基础节点字段 - 所有协议通用
 */
export interface BaseNode {
    id: string;             // 内部唯一ID
    name: string;           // 节点名称 (Remarks)
    type: ProxyType;        // 协议类型
    server: string;         // 地址
    port: number;           // 端口
    udp: boolean;           // 是否支持 UDP

    // --- 通用来源信息 ---
    subscriptionName?: string; // 来源订阅名称
    originalUrl?: string;      // 原始链接 (用于回溯)
    url?: string;              // 标准化链接 (Runtime generate)
    originalProxy?: any;       // 原始代理对象 (Clash etc)
}

/**
 * 传输层配置 (Transport Layer)
 */
export interface TransportOptions {
    type: NetworkType;
    // WS
    path?: string;
    headers?: Record<string, string>;
    // gRPC
    serviceName?: string;
    mode?: string; // gun, multi
    // HTTP/H2
    host?: string[];
    method?: string;
    // QUIC
    quicSecurity?: string;
    quicKey?: string;
    headerType?: string;
}

/**
 * TLS/安全层配置
 */
export interface TlsOptions {
    enabled: boolean;
    serverName?: string;        // SNI
    insecure?: boolean;         // Skip Cert Verify
    alpn?: string[];
    fingerprint?: string;       // uTLS Fingerprint: chrome, firefox, randomize...

    // --- Reality 特有 ---
    reality?: {
        enabled: boolean;
        publicKey: string;      // pbk
        shortId: string;        // sid
        spiderX?: string;       // spx
    };
}

/**
 * 协议特定字段定义
 */

export interface VmessNode extends BaseNode {
    type: 'vmess';
    uuid: string;
    alterId: number;
    cipher: CipherType;
    transport?: TransportOptions;
    tls?: TlsOptions;
}

export interface VlessNode extends BaseNode {
    type: 'vless';
    uuid: string;
    flow?: string;              // xtls-rprx-vision 等
    transport?: TransportOptions;
    tls?: TlsOptions;           // 必须支持 Reality
}

export interface TrojanNode extends BaseNode {
    type: 'trojan';
    password: string;
    transport?: TransportOptions;
    tls?: TlsOptions;
}

export interface ShadowsocksNode extends BaseNode {
    type: 'ss';
    cipher: string;
    password: string;
    plugin?: string;
    pluginOpts?: Record<string, string>;
}

export interface ShadowsocksRNode extends BaseNode {
    type: 'ssr';
    protocol: string;
    protocolParam?: string;
    cipher: string;
    obfs: string;
    obfsParam?: string;
    password: string;
}

export interface HysteriaNode extends BaseNode {
    type: 'hysteria';
    auth?: string;          // Hysteria 1
    upMbps?: number;
    downMbps?: number;
    obfs?: string;
    obfsParam?: string;     // Hysteria 1 string param
    tls?: TlsOptions;
    protocol?: string;      // udp/wechat-video...
}

export interface Hysteria2Node extends BaseNode {
    type: 'hysteria2';
    password?: string;      // Hysteria 2 使用 password
    obfs?: {
        type: string;       // salamander
        password: string;
    };
    tls?: TlsOptions;
}

export interface TuicNode extends BaseNode {
    type: 'tuic';
    uuid: string;
    password: string;
    congestionControl?: string;
    udpRelayMode?: string;
    tls?: TlsOptions;
}

export interface WireGuardNode extends BaseNode {
    type: 'wireguard';
    privateKey: string;
    publicKey: string;
    preSharedKey?: string;
    ip?: string;           // Local Address (IPv4)
    ipv6?: string;         // Local Address (IPv6)
    mtu?: number;
    reserved?: number[];   // [0, 0, 0]
}

// 统一节点类型 (Discriminated Union)
export type Node =
    | VmessNode
    | VlessNode
    | TrojanNode
    | ShadowsocksNode
    | ShadowsocksRNode
    | HysteriaNode
    | Hysteria2Node
    | TuicNode
    | WireGuardNode
    // 兼容未知类型，防止解析器崩溃
    | (BaseNode & { type: 'unknown' | 'socks5' | 'http' | 'snell';[key: string]: any });


// ==================== 接口定义 (兼容旧代码) ====================

export interface SubscriptionUserInfo {
    upload: number;
    download: number;
    total: number;
    expire?: number;
}

export interface Subscription {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    exclude?: string;
    nodeCount?: number;
    userInfo?: SubscriptionUserInfo;
    updatedAt?: number;
    createdAt?: number;
    lastNotifiedExpire?: number;
    lastNotifiedTraffic?: number;
}

export type ClientFormat = 'clash' | 'singbox' | 'surge' | 'loon' | 'quantumultx' | 'base64';

export interface Profile {
    id: string;
    name: string;
    description?: string;
    type: ClientFormat;
    subscriptions: string[];
    manualNodes?: string[];
    filter?: string;
    token?: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface AppConfig {
    FileName: string;
    mytoken: string;
    profileToken: string;
    prependSubName: boolean;
    NotifyThresholdDays: number;
    NotifyThresholdPercent: number;
    BotToken?: string;
    ChatID?: string;
    [key: string]: unknown;
}

export interface ConverterOptions {
    filename?: string;
    includeRules?: boolean;
    remoteConfig?: string;
    userInfo?: {
        upload?: number;
        download?: number;
        total?: number;
        expire?: number;
    };
    clientVersion?: string;
    udp?: boolean;
}

export interface ProcessOptions {
    exclude?: string;
    prependSubName?: boolean;
    udpCheck?: boolean;
    userAgent?: string;
}
