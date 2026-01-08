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
    | 'anytls'
    | 'tuic'
    | 'wireguard'
    | 'snell'
    | 'socks5'
    | 'http'
    | 'unknown';

// Alias for frontend compatibility
export type ProtocolType = ProxyType;

export type NetworkType = 'tcp' | 'udp' | 'h2' | 'http' | 'ws' | 'grpc' | 'quic' | 'kcp';

export type CipherType =
    | 'auto'
    | 'aes-128-gcm' | 'aes-256-gcm' | 'chacha20-poly1305' // Common (AEAD)
    | 'aes-128-cfb' | 'aes-256-cfb' | 'rc4-md5' | 'chacha20-ietf' // Legacy/Insecure
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
    originalProxy?: Record<string, unknown>;       // 原始代理对象 (Clash etc)
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
    encryption?: string;        // encryption=none 等
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

export interface AnyTLSNode extends BaseNode {
    type: 'anytls';
    password?: string;
    clientFingerprint?: string;
    idleTimeout?: number;
    tls?: TlsOptions;
}

export interface SnellNode extends BaseNode {
    type: 'snell';
    password: string;
    version?: string;
    obfs?: {
        type: string;       // http
        host?: string;
    };
}

export interface HttpNode extends BaseNode {
    type: 'http';
    username?: string;
    password?: string;
    tls?: TlsOptions; // HTTP over TLS (HTTPS proxy)
}

export interface Socks5Node extends BaseNode {
    type: 'socks5';
    username?: string;
    password?: string;
    tls?: TlsOptions; // SOCKS5 over TLS
}

// 统一节点类型 (Discriminated Union)
export type ProxyNode =
    | VmessNode
    | VlessNode
    | TrojanNode
    | ShadowsocksNode
    | ShadowsocksRNode
    | HysteriaNode
    | Hysteria2Node
    | AnyTLSNode
    | TuicNode
    | WireGuardNode
    | SnellNode
    | HttpNode
    | Socks5Node
    // 兼容未知类型，防止解析器崩溃
    | (BaseNode & { type: 'unknown';[key: string]: unknown });

// 为兼容性保留 Node 别名 (可能仍有冲突，建议逐步迁移)
export type Node = ProxyNode;

// ==================== 转换器专用配置类型 ====================

/**
 * Clash 代理项配置 (Meta/Premium)
 */
export interface ClashProxyConfig {
    name: string;
    type: string;
    server: string;
    port: number | string;
    remarks?: string;
    id?: string;
    aid?: number | string;
    markup?: string;
    udp?: boolean;
    tls?: boolean;
    servername?: string;
    sni?: string;
    alpn?: string[];
    'skip-cert-verify'?: boolean;
    'client-fingerprint'?: string;
    fingerprint?: string;
    network?: NetworkType;
    uuid?: string;
    alterId?: number | string;
    cipher?: string;
    flow?: string;
    password?: string;
    psk?: string;
    version?: string;
    plugin?: string;
    'plugin-opts'?: Record<string, string>;
    'obfs-opts'?: {
        mode?: string;
        host?: string;
    };
    'ws-opts'?: {
        path?: string;
        headers?: Record<string, string>;
    };
    'grpc-opts'?: {
        'grpc-service-name'?: string;
        mode?: string;
    };
    'h2-opts'?: {
        path?: string;
        host?: string[];
    };
    'reality-opts'?: {
        'public-key': string;
        'short-id': string;
        'spider-x'?: string;
    };
    'congestion-controller'?: string;
    'udp-relay-mode'?: string;
    'idle-timeout'?: number | string;
    username?: string;
    [key: string]: unknown;
}

/**
 * Sing-Box 出站配置 (Partial)
 */
export interface SingBoxOutbound {
    type: string;
    tag: string;
    server?: string;
    server_port?: number;
    uuid?: string;
    security?: string;
    alter_id?: number;
    password?: string;
    method?: string;
    plugin?: string;
    plugin_opts?: string;
    auth_str?: string;
    up_mbps?: number;
    down_mbps?: number;
    obfs?: string | {
        type: string;
        password?: string;
    };
    protocol?: string;
    congestion_control?: string;
    udp_relay_mode?: string;
    private_key?: string;
    peer_public_key?: string;
    pre_shared_key?: string;
    local_address?: string[];
    mtu?: number;
    tls?: {
        enabled: boolean;
        server_name?: string;
        insecure?: boolean;
        alpn?: string[];
        reality?: {
            enabled: boolean;
            public_key: string;
            short_id: string;
        };
    };
    transport?: {
        type: string;
        path?: string;
        headers?: Record<string, string>;
        service_name?: string;
        host?: string[];
    };
    [key: string]: unknown;
}

/**
 * V2rayN (VMess) Base64 内部 JSON 结构
 */
export interface V2rayNConfig {
    v: string;
    ps: string;
    add: string;
    port: number | string;
    id: string;
    aid: number | string;
    scy: string;
    net: string;
    type: string;
    host?: string;
    path?: string;
    tls: string;
    sni?: string;
    alpn?: string;
    fp?: string;
    allowInsecure?: boolean;
}


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
    enabled: boolean;
    type: ClientFormat;
    subscriptions: string[];
    manualNodes?: string[];
    filter?: string;
    token?: string;
    customId?: string;
    ruleTemplate?: string; // 选用的规则模板 ID
    expiresAt?: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface AppConfig {
    FileName: string;
    mytoken: string;
    profileToken: string;
    prependSubName: boolean;
    dedupe: boolean;  // 节点去重开关
    NotifyThresholdDays: number;
    NotifyThresholdPercent: number;
    BotToken?: string;
    ChatID?: string;
    defaultRuleTemplate?: string; // 全局默认规则模板
    [key: string]: unknown;
}

// ==================== 用户管理相关类型 ====================

export type UserRole = 'admin' | 'user';

export interface User {
    id: string;
    username: string;
    passwordHash: string;
    role: UserRole;
    createdAt: number;
    updatedAt: number;
}

export interface ConverterOptions {
    filename?: string;
    includeRules?: boolean;
    ruleTemplate?: string; // 传递给转换器的规则模板 ID
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
    dedupe?: boolean;
}

/**
 * 订阅生成配置（后端专用）
 * 继承 ProcessOptions 并添加文件名字段
 */
export interface SubConfig extends ProcessOptions {
    FileName?: string;
}
