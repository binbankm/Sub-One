/**
 * Sub-One ProxyUtils Type Definitions
 *
 *
 */

// ============================================================================
// 代理协议类型
// ============================================================================

export type ProxyType =
    | 'ss' // Shadowsocks
    | 'ssr' // ShadowsocksR
    | 'vmess' // VMess
    | 'vless' // VLESS
    | 'trojan' // Trojan
    | 'hysteria' // Hysteria
    | 'hysteria2' // Hysteria2
    | 'tuic' // TUIC
    | 'wireguard' // WireGuard
    | 'socks5' // SOCKS5
    | 'http' // HTTP
    | 'https' // HTTPS
    | 'snell' // Snell
    | 'anytls' // AnyTLS
    | 'naive' // NaiveProxy
    | 'ssh' // SSH
    | 'external' // Surge External
    | 'direct' // Direct
    | 'reject'; // Reject

// ============================================================================
// 传输层类型
// ============================================================================

export type NetworkType =
    | 'tcp'
    | 'ws' // WebSocket
    | 'grpc' // gRPC
    | 'h2' // HTTP/2
    | 'http' // HTTP
    | 'kcp' // KCP
    | 'quic' // QUIC
    | 'xhttp' // XHTTP/SplitHTTP (Xray-core)
    | 'splithttp'; // SplitHTTP 别名

// ============================================================================
// 平台类型
// ============================================================================

export type PlatformType =
    | 'Clash'
    | 'ClashMeta'
    | 'Singbox'
    | 'Surge'
    | 'Loon'
    | 'Egern'
    | 'QuantumultX'
    | 'Shadowrocket'
    | 'URI'
    | 'JSON';

// ============================================================================
// XHTTP/SplitHTTP 选项 
// ============================================================================

/**
 * XHTTP Download Settings (下行独立配置)
 */
export interface XhttpDownloadSettings {
    server?: string;
    port?: number;
    network?: string;
    tls?: boolean;
    servername?: string;
    'client-fingerprint'?: string;
    'skip-cert-verify'?: boolean;
    alpn?: string[];
    path?: string;
    host?: string;
    mode?: string;
    'reality-opts'?: {
        'public-key'?: string;
        'short-id'?: string;
    };
    'ech-opts'?: EchOptions;
}

/**
 * XHTTP 传输选项
 */
export interface XhttpOptions {
    mode?: string; // auto | packet-up | stream-up | stream-one
    path?: string;
    host?: string;
    headers?: Record<string, string | string[]>;
    'download-settings'?: XhttpDownloadSettings;
    // XHTTP 扩展字段 
    'no-grpc-header'?: boolean;
    'x-padding-bytes'?: number;
    'x-padding-obfs-mode'?: boolean;
    'x-padding-key'?: string;
    'x-padding-header'?: string;
    'x-padding-placement'?: string;
    'x-padding-method'?: string;
    'uplink-http-method'?: string;
    'session-placement'?: string;
    'session-key'?: string;
    'session-table'?: string;
    'session-length'?: number | string;
    'seq-placement'?: string;
    'seq-key'?: string;
    'uplink-data-placement'?: string;
    'uplink-data-key'?: string;
    'uplink-chunk-size'?: number | string;
    'sc-max-each-post-bytes'?: number | string;
    'sc-min-posts-interval-ms'?: number | string;
    'reuse-settings'?: Record<string, any>;
    [key: string]: any;
}

// ============================================================================
// ECH (Encrypted Client Hello) 选项
// ============================================================================

/**
 * ECH 选项 
 */
export interface EchOptions {
    'query-server-name'?: string;
    'config-list'?: string[];
    _dns?: string; // DNS 服务器 (用于查询 ECH config)
    [key: string]: any;
}

// ============================================================================
// ProxyNode - 统一节点中间表示 (IR)
// ============================================================================

/**
 * ProxyNode - 所有解析器的标准输出格式
 * 统一所有协议的节点表示
 *
 * 字段顺序按照 Clash 标准排列：
 * 1. name, type, server, port (核心字段)
 * 2. 认证信息
 * 3. 加密/传输配置
 * 4. 协议特定字段
 * 5. 元数据/内部字段
 */
export interface ProxyNode {
    // === 核心字段 (Clash 标准顺序) ===
    name: string; // 节点名称 (第1位)
    type: ProxyType; // 协议类型 (第2位)
    server: string; // 服务器地址 (第3位)
    port: number; // 端口 (第4位)

    // === 认证信息 ===
    password?: string; // 密码 (SS/Trojan/Snell/Hysteria2)
    uuid?: string; // UUID (VMess/VLESS/TUIC)
    username?: string; // 用户名 (SOCKS5/HTTP)

    // === 加密信息 ===
    cipher?: string; // 加密方法 (SS)
    method?: string; // 加密方法别名
    alterId?: number; // AlterId (VMess)
    'alter-id'?: number; // AlterId 别名

    // === 传输层配置 ===
    network?: NetworkType; // 传输协议
    tls?: boolean; // 是否启用TLS
    sni?: string; // SNI
    alpn?: string[]; // ALPN
    'skip-cert-verify'?: boolean; // 跳过证书验证

    // === WebSocket 选项 ===
    'ws-opts'?: {
        path?: string;
        headers?: Record<string, string | string[]>;
        'max-early-data'?: number;
        'early-data-header-name'?: string;
        // httpupgrade 
        'v2ray-http-upgrade'?: boolean;
        'v2ray-http-upgrade-fast-open'?: boolean;
        '_v2ray-http-upgrade-ed'?: string;
    };
    'ws-path'?: string; // 兼容简化写法
    'ws-headers'?: Record<string, string>;

    // === XHTTP/SplitHTTP 选项  ===
    'xhttp-opts'?: XhttpOptions;

    // === HTTP Upgrade (httpupgrade) 标记 ===
    'httpupgrade'?: boolean; // WS 实际为 httpupgrade

    // === gRPC 选项 ===
    'grpc-opts'?: {
        'service-name'?: string;
    };
    'grpc-service-name'?: string; // 兼容简化写法

    // === HTTP/2 选项 ===
    'h2-opts'?: {
        path?: string;
        host?: string[];
    };

    // === KCP (mKCP) 选项 ===
    'kcp-opts'?: {
        seed?: string;
        'header-type'?: string;
    };
    seed?: string; // mKCP seed (兼容简化写法)
    headerType?: string; // mKCP 伪装头部类型 (none/srtp/utp/wechat-video/dtls/wireguard)

    // === QUIC 选项 ===
    'quic-opts'?: {
        security?: string;
        key?: string;
        'header-type'?: string;
    };

    // === VLESS Reality 选项 ===
    'reality-opts'?: {
        'public-key'?: string;
        'short-id'?: string;
        'spider-x'?: string;
        '_spider-x'?: string; // 兼容
    };

    // === ECH (Encrypted Client Hello) 选项 ===
    'ech-opts'?: EchOptions;
    _echConfigList?: string; // ECH config-list (URI round-trip)

    // === VMess 额外字段 ===
    _extra?: string | Record<string, any>; // VLESS/VMess extra JSON (URI round-trip)
    _mode?: string; // VLESS Reality mode (URI round-trip)
    _pqv?: string; // VLESS pre-shared quantum version (URI round-trip)
    _h2?: boolean; // VLESS H2 标记 (URI round-trip)
    _extra_unsupported?: Record<string, any>; // VLESS xhttp 不支持字段

    // === UDP/TCP 选项 ===
    udp?: boolean; // 是否支持UDP
    'udp-relay'?: boolean; // UDP中继
    tfo?: boolean; // TCP Fast Open
    'fast-open'?: boolean; // TCP Fast Open 别名
    mptcp?: boolean; // Multipath TCP
    ports?: string | number; // 端口跳跃 (Port Hopping)
    'udp-over-tcp'?: boolean; // UDP Over TCP
    'udp-over-tcp-version'?: number;

    // === VMess 特有 ===
    aead?: boolean; // VMess AEAD
    'vmess-aead'?: boolean; // 别名

    // === VLESS 特有 ===
    flow?: string; // VLESS flow (xtls-rprx-*)
    encryption?: string; // VLESS encryption

    // === Hysteria/Hysteria2 特有 ===
    auth?: string; // Hysteria auth
    'auth-str'?: string; // Hysteria2 auth
    obfs?: string; // 混淆类型
    'obfs-password'?: string; // 混淆密码
    protocol?: string; // 协议类型
    up?: string | number; // 上传速度
    down?: string | number; // 下载速度
    'up-mbps'?: number; // 上传速度 (Mbps)
    'down-mbps'?: number; // 下载速度 (Mbps)
    'recv-window'?: number; // 接收窗口
    'recv-window-conn'?: number; // 连接接收窗口
    'disable-mtu-discovery'?: boolean; // 禁用MTU发现
    'hop-interval'?: string | number; // 端口跳跃间隔 (Hysteria2)
    'heartbeat-interval'?: number; // 心跳间隔 (TUIC)

    // === TUIC 特有 ===
    token?: string; // TUIC token
    'congestion-controller'?: string; // 拥塞控制
    'udp-relay-mode'?: string; // UDP中继模式
    'reduce-rtt'?: boolean; // 减少RTT
    'disable-sni'?: boolean; // 禁用 SNI (TUIC)
    'udp-over-stream'?: boolean; // UDP over Stream (TUIC)
    'request-timeout'?: number; // 请求超时
    'max-udp-relay-packet-size'?: number;
    'max-open-streams'?: number; // 最大打开流数

    // === WireGuard 特有 ===
    'private-key'?: string; // 私钥
    privateKey?: string; // 别名 (兼容旧版)
    'public-key'?: string; // 公钥
    publicKey?: string; // 别名 (兼容旧版)
    'pre-shared-key'?: string; // 预共享密钥
    'preshared-key'?: string; // 别名
    preSharedKey?: string; // 别名 (兼容旧版)
    reserved?: string | number[]; // 保留字段
    mtu?: number; // MTU
    dns?: string | string[]; // DNS 服务器 (WireGuard)
    'allowed-ips'?: string[]; // 允许的 IP 段 (WireGuard top-level)
    ipv6?: string; // IPv6地址
    peers?: Array<{
        // WireGuard peers
        server?: string;
        port?: number;
        endpoint?: string;
        'public-key'?: string;
        'pre-shared-key'?: string;
        'allowed-ips'?: string[];
        allowed_ips?: string[];
        reserved?: string | number[];
    }>;

    // === AnyTLS 特有 ===
    'idle-session-check-interval'?: number; // 空闲会话检测间隔 (秒)
    'idle-session-timeout'?: number; // 空闲会话超时 (秒)
    'min-idle-session'?: number; // 最小空闲会话数
    'max-stream-count'?: number; // 最大流数量
    'tls-pubkey-sha256'?: string; // TLS 公钥 SHA256

    // === Snell 特有 ===
    version?: number; // Snell 版本
    'obfs-opts'?: {
        mode?: string;
        host?: string;
    };

    // === Shadowsocks 插件 ===
    plugin?: string; // 插件名称
    'plugin-opts'?: Record<string, any>; // 插件选项

    // === 平台特定选项 ===
    interface?: string; // 出站接口
    'routing-mark'?: number; // 路由标记
    'ip-version'?: string; // IP版本 (dual/ipv4/ipv6/ipv4-prefer/ipv6-prefer)
    'client-fingerprint'?: string; // 客户端指纹
    'tls-fingerprint'?: string; // TLS 指纹 (用于 Hysteria2 pinSHA256)

    // === 内部工具 / 扩展字段 ===
    exec?: string; // Surge External exec
    'local-port'?: string | number; // Surge External local-port
    localPort?: string | number; // 别名
    args?: string[]; // Surge External args
    addresses?: string[]; // Surge External addresses
    'test-url'?: string; // 测速地址
    'test-timeout'?: number; // 测速超时
    'underlying-proxy'?: string; // 底层代理
    'dialer-proxy'?: string; // 拨号代理 (Clash Meta)
    keepalive?: number; // Keepalive
    'persistent-keepalive'?: number; // 持久 Keepalive (WireGuard)

    // === 元数据 (下划线开头的内部字段) ===
    _subName?: string; // 所属订阅名称
    _subDisplayName?: string; // 订阅显示名
    _collectionName?: string; // 所属订阅组
    _geo?: {
        // 地理位置信息
        country?: string;
        countryCode?: string;
        region?: string;
    };
    _unavailable?: boolean; // 是否不可用
    _uptime?: number; // 正常运行时间
    _resolved?: boolean; // 是否已解析域名

    // === 原始数据 ===
    url?: string; // 原始 URL
    rawConfig?: any; // 原始配置对象

    // === 平台支持标记 ===
    supported?: {
        [platform: string]: boolean;
    };

    // === 内部标识符 (放在最后) ===
    id: string; // 唯一ID (内部使用,不输出到配置文件)
    subName?: string; // 订阅名称 (兼容旧代码,已废弃,使用 _subName)

    // 允许其他自定义字段
    [key: string]: any;
}

// ============================================================================
// 解析选项
// ============================================================================

export interface ProcessOptions {
    subscriptionName?: string; // 订阅名称
    exclude?: string; // 排除规则 (旧版正则字符串)
    prependSubName?: boolean; // 是否在节点名前添加订阅名
    dedupe?: boolean; // 是否去重
    includeRules?: string[]; // 包含规则列表
    excludeRules?: string[]; // 排除规则列表
}

// ============================================================================
// 转换选项
// ============================================================================

export interface ConvertOptions {
    filename?: string; // 文件名
    'include-unsupported-proxy'?: boolean; // 是否包含不支持的代理 (kebab-case)
    includeUnsupportedProxy?: boolean; // 是否包含不支持的代理 (camelCase)
    useMihomoExternal?: boolean; // 是否使用 Mihomo External
    [key: string]: any; // 其他平台特定选项
}

// ============================================================================
// 解析器接口
// ============================================================================

export interface Parser {
    name: string;
    test(line: string): boolean;
    parse(line: string): ProxyNode | null;
}

// ============================================================================
// 转换器接口
// ============================================================================

export interface Converter {
    name: string;
    type: 'SINGLE' | 'ALL'; // SINGLE: 逐个生成, ALL: 批量生成
    convert(proxies: ProxyNode | ProxyNode[], type?: string, opts?: ConvertOptions): string;
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 深度部分类型 - 用于配置合并
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 必需字段类型
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ============================================================================
// 兼容性定义 (Legacy Support & Frontend Compatibility)
// 旨在平滑替换 lib/shared/types.ts
// ============================================================================

// 1. 基础类型别名
export type CipherType = string;
export type ClientFormat = string;

// 2. 具体节点类型别名 (Mapping to ProxyNode)
// 前端依赖这些具体的接口名称
export type Node = ProxyNode;
export type VmessNode = ProxyNode & { type: 'vmess' };
export type VlessNode = ProxyNode & { type: 'vless' };
export type ShadowsocksNode = ProxyNode & { type: 'ss' };
export type ShadowsocksRNode = ProxyNode & { type: 'ssr' };
export type TrojanNode = ProxyNode & { type: 'trojan' };
export type HysteriaNode = ProxyNode & { type: 'hysteria' };
export type Hysteria2Node = ProxyNode & { type: 'hysteria2' };
export type TuicNode = ProxyNode & { type: 'tuic' };
export type WireGuardNode = ProxyNode & { type: 'wireguard' };
export type SnellNode = ProxyNode & { type: 'snell' };
export type AnyTLSNode = ProxyNode & { type: 'anytls' };
export type Socks5Node = ProxyNode & { type: 'socks5' };
export type HttpNode = ProxyNode & { type: 'http' | 'https' };

// 3. 输出配置定义 (Copied from shared/types.ts)

// 4. 应用核心业务类型 (Restored from Any)
export interface AppConfig {
    // 基础配置
    FileName: string;
    mytoken: string;
    profileToken: string;
    prependSubName: boolean;
    dedupe: boolean;

    // 转换配置
    useExternalConverter?: boolean; // 是否使用外部转换API
    externalConverterUrl?: string; // 外部转换API地址
    externalConverterApis?: string[]; // 默认候选API列表

    // 通知配置
    BotToken?: string;
    ChatID?: string;
    NotifyThresholdDays: number;
    NotifyThresholdPercent: number;

    // Cron 配置
    cronEnabled?: boolean;  // 是否启用定时更新
    cronSecret?: string;    // 定时更新安全密钥

    // 其他
    [key: string]: any; // 允许扩展
}

export type SubConfig = AppConfig; // 订阅处理配置目前复用 AppConfig

export type UserRole = 'admin' | 'user';

export interface User {
    id: string;
    username: string;
    passwordHash: string;
    role: UserRole;
    createdAt: number;
    updatedAt: number;
}

export interface SubscriptionUserInfo {
    upload: number;
    download: number;
    total: number;
    expire: number;
}

export interface Subscription {
    id: string;
    name: string;
    url: string;
    enabled: boolean;

    // 状态与缓存
    nodes?: ProxyNode[];
    nodeCount?: number;
    userInfo?: SubscriptionUserInfo;

    // UI状态
    isUpdating?: boolean;
    status?: 'success' | 'error' | 'pending' | 'unchecked';
    errorMsg?: string;

    // 配置项
    type?: string;
    ua?: string;
    exclude?: string;

    // 通知记录
    lastNotifiedExpire?: number;
    lastNotifiedTraffic?: number;
}

export interface Profile {
    id: string;
    name: string;
    enabled: boolean;
    subscriptions: string[]; // Subscription IDs
    manualNodes: string[]; // ProxyNode IDs
    customId?: string;
    expiresAt?: string; // ISO Date String
    type?: string; // Output format (e.g., 'base64')
    updatedAt?: number;
}
