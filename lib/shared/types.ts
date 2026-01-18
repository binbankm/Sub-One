/**
 * =================================================================
 * 核心类型定义 - Single Source of Truth
 * =================================================================
 * 
 * 包含所有支持的协议、字段及配置结构
 * 
 * 设计原则:
 * 1. 类型安全优先 - 严格的类型定义
 * 2. 协议完整性 - 支持所有主流代理协议
 * 3. 扩展性 - 易于添加新协议和字段
 * 4. 文档化 - 完整的 JSDoc 注释
 * 
 * 参考规范:
 * - Xray-core: https://xtls.github.io/config/
 * - Clash Meta: https://wiki.metacubex.one/
 * - Sing-Box: https://sing-box.sagernet.org/
 * 
 * @module shared/types
 * =================================================================
 */

// ==================== 基础枚举定义 ====================

/**
 * 支持的代理协议类型
 * 
 * 包含所有主流代理协议和VPN
 */
export type ProxyType =
    // V2Ray 系列
    | 'vmess'       // VMess (V2Ray 经典协议)
    | 'vless'       // VLESS (轻量级协议)
    | 'trojan'      // Trojan (TLS 伪装)

    // Shadowsocks 系列
    | 'ss'          // Shadowsocks
    | 'ssr'         // ShadowsocksR (已停止维护)

    // 现代高性能协议
    | 'hysteria'    // Hysteria v1
    | 'hysteria2'   // Hysteria v2 (UDP/QUIC)
    | 'tuic'        // TUIC (UDP/QUIC)

    // VPN & 其他
    | 'wireguard'   // WireGuard VPN
    | 'anytls'      // AnyTLS
    | 'snell'       // Snell (iOS)
    | 'http'        // HTTP 代理
    | 'https'       // HTTPS 代理
    | 'socks5'      // SOCKS5 代理

    // 特殊类型
    | 'unknown';    // 未知/不支持的协议



/**
 * 网络传输层类型
 * 
 * 支持 Xray-core 的所有传输协议
 */
export type NetworkType =
    // 基础传输
    | 'tcp'             // TCP (默认)
    | 'udp'             // UDP

    // HTTP 系列
    | 'http'            // HTTP
    | 'h2'              // HTTP/2

    // WebSocket
    | 'ws'              // WebSocket

    // gRPC
    | 'grpc'            // gRPC

    // QUIC 系列
    | 'quic'            // QUIC
    | 'kcp'             // mKCP (基于 UDP)

    // Xray 新传输层 (v1.8.0+)
    | 'httpupgrade'     // HTTPUpgrade (WebSocket 替代方案)
    | 'splithttp';      // SplitHTTP (适用于严格审查环境)

/**
 * 加密算法类型
 * 
 * 优先使用 AEAD 加密算法
 */
export type CipherType =
    // 推荐 (AEAD)
    | 'auto'                    // 自动选择
    | 'aes-128-gcm'             // AES-128-GCM (推荐)
    | 'aes-256-gcm'             // AES-256-GCM (推荐)
    | 'chacha20-poly1305'       // ChaCha20-Poly1305 (推荐)
    | 'chacha20-ietf-poly1305'  // ChaCha20-IETF-Poly1305
    | '2022-blake3-aes-128-gcm' // Shadowsocks 2022 (新)
    | '2022-blake3-aes-256-gcm' // Shadowsocks 2022 (新)

    // 传统 (不推荐, 仅兼容)
    | 'aes-128-cfb'             // AES-128-CFB (已弱)
    | 'aes-256-cfb'             // AES-256-CFB (已弱)
    | 'rc4-md5'                 // RC4-MD5 (不安全)
    | 'chacha20-ietf'           // ChaCha20-IETF (无认证)

    // 特殊
    | 'none'                    // 无加密
    | string;                   // 自定义

/**
 * TLS 指纹类型
 * 
 * 用于 uTLS 指纹伪装
 */
export type TLSFingerprint =
    | 'chrome'          // Chrome 浏览器
    | 'firefox'         // Firefox 浏览器
    | 'safari'          // Safari 浏览器
    | 'edge'            // Edge 浏览器
    | 'ios'             // iOS Safari
    | 'android'         // Android Chrome
    | 'randomized'      // 随机化
    | '360'             // 360 浏览器
    | 'qq'              // QQ 浏览器
    | string;           // 自定义

// ==================== 核心节点配置 (中间表示层) ====================

/**
 * 基础节点字段 - 所有协议通用
 * 
 * 所有具体协议节点都继承此接口
 */
export interface BaseNode {
    /** 内部唯一 ID (UUID v4) */
    id: string;

    /** 节点名称/备注 */
    name: string;

    /** 协议类型 */
    type: ProxyType;

    /** 服务器地址 (域名或IP) */
    server: string;

    /** 服务器端口 (1-65535) */
    port: number;

    /** 是否支持 UDP 转发 */
    udp: boolean;

    // --- 元数据 ---

    /** 来源订阅名称 */
    subscriptionName?: string;

    /** 原始链接 (用于回溯和重建) */
    originalUrl?: string;

    /** 标准化链接 (运行时生成) */
    url?: string;

    /** 原始代理对象 (Clash/Sing-Box 等) */
    originalProxy?: Record<string, unknown>;
}

/**
 * 传输层配置 (Transport Layer)
 * 
 * 对应 Xray-core 的 streamSettings
 */
export interface TransportOptions {
    /** 传输协议类型 */
    type: NetworkType;

    // ========== WebSocket ==========

    /** WebSocket 路径 */
    path?: string;

    /** HTTP Headers */
    headers?: Record<string, string>;

    /** 0-RTT Early Data 长度 */
    earlyData?: number;

    /** 最大 Early Data 长度 */
    maxEarlyData?: number;

    // ========== gRPC ==========

    /** gRPC 服务名称 */
    serviceName?: string;

    /** gRPC 模式: gun(默认) | multi | guna */
    mode?: 'gun' | 'multi' | 'guna' | string;

    // ========== HTTP/H2 ==========

    /** HTTP Host (数组) */
    host?: string[];

    /** HTTP 方法 */
    method?: string;

    // ========== QUIC/KCP ==========

    /** QUIC 安全类型 */
    quicSecurity?: string;

    /** QUIC 密钥 */
    quicKey?: string;

    /** KCP Seed */
    seed?: string;

    /** Header 类型 (用于流量伪装) */
    headerType?: string;

    // ========== 其他 ==========

    /** TCP Fast Open */
    fastOpen?: boolean;
}

/**
 * TLS/安全层配置
 * 
 * 支持标准 TLS 和 REALITY
 */
export interface TlsOptions {
    /** 是否启用 TLS */
    enabled: boolean;

    /** 服务器名称指示 (SNI) */
    serverName?: string;

    /** 跳过证书验证 (不安全) */
    insecure?: boolean;

    /** ALPN 协议列表 */
    alpn?: string[];

    /** uTLS 指纹 */
    fingerprint?: TLSFingerprint;

    /** 证书固定 (pinning) - SHA256 */
    pinSHA256?: string;

    // ========== REALITY 特有 ==========

    /** REALITY 配置 */
    reality?: {
        /** 是否启用 */
        enabled: boolean;

        /** 服务端公钥 */
        publicKey: string;

        /** Short ID (客户端标识) */
        shortId: string;

        /** Spider X (爬虫初始路径) */
        spiderX?: string;

        /** Master Key (用于某些特定客户端) */
        masterKey?: string;
    };

    /** ECH 配置 (Encrypted Client Hello) */
    ech?: {
        enabled: boolean;
        config?: string[];
    };
}

// ==================== 协议特定字段定义 ====================

/**
 * VMess 节点配置
 * 
 * V2Ray 经典协议 (建议迁移至 VLESS)
 */
export interface VmessNode extends BaseNode {
    type: 'vmess';

    /** 用户 ID (UUID) */
    uuid: string;

    /** 额外 ID (已废弃, 推荐值 0) */
    alterId: number;

    /** 加密方式 */
    cipher: CipherType;

    /** 传输层配置 */
    transport?: TransportOptions;

    /** TLS 配置 */
    tls?: TlsOptions;

    /** VMess AEAD (强制启用) */
    aead?: boolean;

    /** 数据包编码 (packet/xudp) */
    packetEncoding?: string;
}

/**
 * VLESS 节点配置
 * 
 * 轻量级协议, 支持 XTLS 和 REALITY
 */
export interface VlessNode extends BaseNode {
    type: 'vless';

    /** 用户 ID (UUID v4) */
    uuid: string;

    /** XTLS 流控: xtls-rprx-vision 等 */
    flow?: string;

    /** 加密方式 (当前仅支持 none) */
    encryption?: 'none' | string;

    /** 传输层配置 */
    transport?: TransportOptions;

    /** TLS/REALITY 配置 */
    tls?: TlsOptions;

    /** 数据包编码 (packet/xudp) */
    packetEncoding?: string;
}

/**
 * Trojan 节点配置
 * 
 * TLS 伪装协议
 */
export interface TrojanNode extends BaseNode {
    type: 'trojan';

    /** 密码 */
    password: string;

    /** 传输层配置 */
    transport?: TransportOptions;

    /** TLS 配置 (必需) */
    tls?: TlsOptions;
}

/**
 * Shadowsocks 节点配置
 * 
 * 支持 SIP002/SIP008 标准
 */
export interface ShadowsocksNode extends BaseNode {
    type: 'ss';

    /** 加密方法 */
    cipher: string;

    /** 密码 */
    password: string;

    /** 插件名称 (obfs-local, v2ray-plugin 等) */
    plugin?: string;

    /** 插件参数 */
    pluginOpts?: Record<string, string>;
}

/**
 * ShadowsocksR 节点配置
 * 
 * 已停止维护, 仅用于兼容
 */
export interface ShadowsocksRNode extends BaseNode {
    type: 'ssr';

    /** 协议 */
    protocol: string;

    /** 协议参数 */
    protocolParam?: string;

    /** 加密方法 */
    cipher: string;

    /** 混淆 */
    obfs: string;

    /** 混淆参数 */
    obfsParam?: string;

    /** 密码 */
    password: string;
}

/**
 * Hysteria v1 节点配置
 */
export interface HysteriaNode extends BaseNode {
    type: 'hysteria';

    /** 认证字符串 */
    auth?: string;

    /** 上行速度 (Mbps) */
    upMbps?: number;

    /** 下行速度 (Mbps) */
    downMbps?: number;

    /** 混淆 */
    obfs?: string;

    /** 混淆参数 */
    obfsParam?: string;

    /** TLS 配置 */
    tls?: TlsOptions;

    /** 协议伪装: udp | wechat-video | faketcp */
    protocol?: string;
}

/**
 * Hysteria v2 节点配置
 * 
 * 基于 QUIC, 性能优异
 */
export interface Hysteria2Node extends BaseNode {
    type: 'hysteria2';

    /** 密码 (单密码模式) */
    password?: string;

    /** 用户名 (userpass 模式) */
    username?: string;

    /** 混淆配置 */
    obfs?: {
        /** 混淆类型: salamander */
        type: string;

        /** 混淆密码 */
        password: string;
    };

    /** 伪装 (Masquerade) 头部 (非标准, 可以在 Sing-Box 实现) */
    masquerade?: string;

    /** TLS 配置 (必需) */
    tls?: TlsOptions;

    /** 拥塞控制: bbr | cubic | new_reno */
    congestionControl?: string;

    /** 端口跳跃 (e.g. "443,10000-20000") */
    ports?: string;
}

/**
 * TUIC 节点配置
 * 
 * 基于 QUIC 的代理协议
 */
export interface TuicNode extends BaseNode {
    type: 'tuic';

    /** 用户 UUID */
    uuid: string;

    /** 密码 */
    password: string;

    /** 拥塞控制算法 */
    congestionControl?: string;

    /** UDP 中继模式: native | quic */
    udpRelayMode?: string;

    /** TLS 配置 (必需) */
    tls?: TlsOptions;

    /** ALPN (必需: h3) */
    alpn?: string[];
}

/**
 * WireGuard 节点配置
 * 
 * 内核级 VPN 协议
 */
export interface WireGuardNode extends BaseNode {
    type: 'wireguard';

    /** 客户端私钥 */
    privateKey: string;

    /** 服务器公钥 */
    publicKey: string;

    /** 预共享密钥 (可选) */
    preSharedKey?: string;

    /** 本地 IPv4 地址 */
    ip?: string;

    /** 本地 IPv6 地址 */
    ipv6?: string;

    /** MTU */
    mtu?: number;

    /** Reserved 字节 */
    reserved?: number[];

    /** 对端地址 (多个) */
    peers?: Array<{
        publicKey: string;
        endpoint?: string;
        allowedIPs?: string[];
    }>;
}

/**
 * AnyTLS 节点配置
 */
export interface AnyTLSNode extends BaseNode {
    type: 'anytls';

    /** 密码 */
    password?: string;

    /** 客户端指纹 */
    clientFingerprint?: string;

    /** 空闲超时 (秒) */
    idleTimeout?: number;

    /** TLS 配置 */
    tls?: TlsOptions;
}

/**
 * Snell 节点配置
 * 
 * iOS 专用协议
 */
export interface SnellNode extends BaseNode {
    type: 'snell';

    /** 密码/PSK */
    password: string;

    /** 协议版本: v3 | v4 */
    version?: string;

    /** 混淆配置 */
    obfs?: {
        /** 混淆类型: http | tls */
        type: string;

        /** 混淆 Host */
        host?: string;
    };
}

/**
 * SOCKS5 节点配置
 */
export interface Socks5Node extends BaseNode {
    type: 'socks5';

    /** 用户名 (可选) */
    username?: string;

    /** 密码 (可选) */
    password?: string;

    /** SOCKS5 over TLS */
    tls?: TlsOptions;
}

/**
 * HTTP/HTTPS 节点配置
 */
export interface HttpNode extends BaseNode {
    type: 'http' | 'https';

    /** 用户名 (可选) */
    username?: string;

    /** 密码 (可选) */
    password?: string;

    /** HTTPS requires TLS */
    tls?: TlsOptions;
}

/**
 * 统一节点类型 (Discriminated Union)
 * 
 * 使用 type 字段进行类型区分
 */
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
    | Socks5Node
    | HttpNode
    // 兼容未知类型
    | (BaseNode & { type: 'unknown';[key: string]: unknown });

/**
 * Node 别名 (向后兼容)
 */
export type Node = ProxyNode;

// ==================== 转换器专用配置类型 ====================

/**
 * Clash 代理项配置
 * 
 * 兼容 Clash / Clash Premium / Clash Meta
 */
export interface ClashProxyConfig {
    name: string;
    type: string;
    server: string;
    port: number | string;

    // 通用字段
    remarks?: string;
    id?: string;
    udp?: boolean;

    // V2Ray 系列
    uuid?: string;
    aid?: number | string;
    alterId?: number | string;
    cipher?: string;
    flow?: string;

    // TLS
    tls?: boolean;
    servername?: string;
    sni?: string;
    alpn?: string[];
    'skip-cert-verify'?: boolean;
    'client-fingerprint'?: string;
    fingerprint?: string;

    // Transport
    network?: NetworkType;
    'ws-opts'?: {
        path?: string;
        headers?: Record<string, string>;
        'max-early-data'?: number;
        'early-data-header-name'?: string;
    };
    'grpc-opts'?: {
        'grpc-service-name'?: string;
        mode?: string;
    };
    'h2-opts'?: {
        path?: string;
        host?: string[];
    };

    // Shadowsocks
    password?: string;
    plugin?: string;
    'plugin-opts'?: Record<string, string>;
    'obfs-opts'?: {
        mode?: string;
        host?: string;
    };

    // REALITY
    'reality-opts'?: {
        'public-key': string;
        'short-id'?: string;
        'spider-x'?: string;
    };

    // WireGuard
    psk?: string;

    // Others
    version?: string;
    'congestion-controller'?: string;
    'udp-relay-mode'?: string;
    'idle-timeout'?: number | string;
    username?: string;
    markup?: string;

    // 扩展字段
    [key: string]: unknown;
}

/**
 * Sing-Box 出站配置
 */
export interface SingBoxOutbound {
    type: string;
    tag: string;
    server?: string;
    server_port?: number;

    // V2Ray
    uuid?: string;
    security?: string;
    alter_id?: number;

    // Shadowsocks
    password?: string;
    method?: string;
    plugin?: string;
    plugin_opts?: string;

    // Hysteria/Hysteria2 端口跳跃
    ports?: string;

    // Hysteria/Hysteria2 伪装
    masquerade?: string;

    // Hysteria
    auth_str?: string;
    up_mbps?: number;
    down_mbps?: number;
    obfs?: string | {
        type: string;
        password?: string;
    };

    // TUIC
    protocol?: string;
    congestion_control?: string;
    udp_relay_mode?: string;

    // WireGuard
    private_key?: string;
    peer_public_key?: string;
    pre_shared_key?: string;
    local_address?: string[];
    mtu?: number;

    // TLS
    tls?: {
        enabled: boolean;
        server_name?: string;
        insecure?: boolean;
        alpn?: string[];
        utls?: {
            enabled: boolean;
            fingerprint: string;
        };
        reality?: {
            enabled: boolean;
            public_key: string;
            short_id?: string;
        };
        ech?: {
            enabled: boolean;
            config?: string[];
            config_path?: string;
        };
    };

    /** 数据包编码 (VLESS/VMess) */
    packet_encoding?: string;

    /** 多路复用 */
    multiplex?: {
        enabled: boolean;
        padding?: boolean;
        protocol?: string;
        max_connections?: number;
        min_streams?: number;
        max_streams?: number;
    };

    // Transport
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
 * V2rayN (VMess) Base64 JSON 结构
 * 
 * VMess 分享链接的内部格式
 */
export interface V2rayNConfig {


    /** 节点名称 */
    ps: string;

    /** 服务器地址 */
    add: string;

    /** 端口 */
    port: number | string;

    /** UUID */
    id: string;

    /** alterID */
    aid: number | string;

    /** 加密方式 */
    scy: string;

    /** 网络类型 */
    net: string;

    /** 伪装类型 */
    type: string;

    /** Host */
    host?: string;

    /** Path */
    path?: string;

    /** TLS */
    tls: string;

    /** SNI */
    sni?: string;

    /** ALPN */
    alpn?: string;

    /** Fingerprint */
    fp?: string;

    /** Allow Insecure */
    allowInsecure?: boolean;
}



/**
 * SIP008 服务器配置
 * 
 * Shadowsocks 标准订阅格式
 */
export interface SIP008Server {
    /** 服务器地址 */
    server: string;

    /** 服务器端口 */
    server_port: number;

    /** 密码 */
    password: string;

    /** 加密方法 */
    method: string;

    /** 插件 */
    plugin?: string;

    /** 插件参数 */
    plugin_opts?: string;

    /** 备注/名称 */
    remarks?: string;

    /** 备注 (别名) */
    ps?: string;

    /** 服务器 ID (UUID) */
    id?: string;
}

// ==================== 订阅管理相关类型 ====================

/**
 * 订阅流量信息
 */
export interface SubscriptionUserInfo {
    /** 已上传流量 (字节) */
    upload: number;

    /** 已下载流量 (字节) */
    download: number;

    /** 总流量 (字节) */
    total: number;

    /** 过期时间 (Unix 时间戳) */
    expire?: number;
}

/**
 * 订阅配置
 */
export interface Subscription {
    /** 订阅 ID */
    id: string;

    /** 订阅名称 */
    name: string;

    /** 订阅 URL */
    url: string;

    /** 是否启用 */
    enabled: boolean;

    /** 排除规则 */
    exclude?: string;

    /** 节点数量 */
    nodeCount?: number;

    /** 流量信息 */
    userInfo?: SubscriptionUserInfo;

    /** 更新时间 */
    updatedAt?: number;

    /** 创建时间 */
    createdAt?: number;

    /** 上次流量通知时间 */
    lastNotifiedExpire?: number;

    /** 上次流量通知时间 */
    lastNotifiedTraffic?: number;
}

/**
 * 客户端格式类型
 */
export type ClientFormat =
    | 'clash'        // Clash / Clash Premium / Clash Meta
    | 'singbox'      // Sing-Box
    | 'surge'        // Surge
    | 'loon'         // Loon
    | 'quantumultx'  // QuantumultX
    | 'base64'       // Base64 URL List
    | 'v2ray';       // V2Ray 原生配置

/**
 * 配置文件
 */
export interface Profile {
    /** 配置 ID */
    id: string;

    /** 配置名称 */
    name: string;

    /** 配置描述 */
    description?: string;

    /** 是否启用 */
    enabled: boolean;

    /** 客户端类型 */
    type: ClientFormat;

    /** 订阅 ID 列表 */
    subscriptions: string[];

    /** 手动添加的节点 */
    manualNodes?: string[];

    /** 过滤规则 */
    filter?: string;

    /** 访问令牌 */
    token?: string;

    /** 自定义 ID */
    customId?: string;

    /** 过期时间 */
    expiresAt?: string;

    /** 创建时间 */
    createdAt?: number;

    /** 更新时间 */
    updatedAt?: number;
}

/**
 * 应用配置
 */
export interface AppConfig {
    /** 配置文件名 */
    FileName: string;

    /** 管理令牌 */
    mytoken: string;

    /** 配置令牌 */
    profileToken: string;

    /** 是否在节点名称前添加订阅名 */
    prependSubName: boolean;

    /** 是否启用节点去重 */
    dedupe: boolean;

    /** 是否启用 UDP (默认: false) */
    udp?: boolean;

    /** 是否跳过证书验证 (默认: false) */
    skipCertVerify?: boolean;

    /** 主题设置 */
    theme?: 'dark' | 'light' | 'auto';

    /** 流量通知阈值 (天) */
    NotifyThresholdDays: number;

    /** 流量通知阈值 (百分比) */
    NotifyThresholdPercent: number;

    /** Telegram Bot Token */
    BotToken?: string;

    /** Telegram Chat ID */
    ChatID?: string;

    /** 扩展配置 */
    [key: string]: unknown;
}

// ==================== 用户管理相关类型 ====================

/**
 * 用户角色
 */
export type UserRole = 'admin' | 'user';

/**
 * 用户信息
 */
export interface User {
    /** 用户 ID */
    id: string;

    /** 用户名 */
    username: string;

    /** 密码哈希 */
    passwordHash: string;

    /** 角色 */
    role: UserRole;

    /** 创建时间 */
    createdAt: number;

    /** 更新时间 */
    updatedAt: number;
}

// ==================== 转换器选项 ====================

/**
 * 转换器选项
 */
export interface ConverterOptions {
    /** 配置文件名 */
    filename?: string;

    /** 是否包含路由规则 */
    includeRules?: boolean;

    /** 远程配置 URL */
    remoteConfig?: string;

    /** 流量信息 */
    userInfo?: {
        upload?: number;
        download?: number;
        total?: number;
        expire?: number;
    };

    /** 客户端版本 */
    clientVersion?: string;

    /** 是否启用 UDP */
    udp?: boolean;

    /** 是否跳过证书验证 */
    skipCertVerify?: boolean;


}

/**
 * 处理选项
 */
export interface ProcessOptions {
    /** 排除规则 (旧字段，建议用 excludeRules) */
    exclude?: string;

    /** 排除规则列表 (正则字符串) */
    excludeRules?: string[];

    /** 包含规则列表 (正则字符串) */
    includeRules?: string[];

    /** 重命名模式 */
    renamePattern?: string;

    /** 是否在节点名前加订阅名 */
    prependSubName?: boolean;

    /** 是否检查 UDP 支持 */
    udpCheck?: boolean;

    /** User-Agent */
    userAgent?: string;

    /** 是否去重 */
    dedupe?: boolean;
}

/**
 * 订阅生成配置 (后端专用)
 */
export interface SubConfig extends ProcessOptions {
    /** 文件名 */
    FileName?: string;
}

// ==================== 导出所有类型 ====================

/**
 * 默认导出
 */
export default {
    // 这里可以导出一些常量或默认配置
};
