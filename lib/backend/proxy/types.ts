/**
 * Sub-One Core Types
 * 参考 Sub-Store 架构，采用 Clash-compatible 内部表示
 *
 * 设计原则：
 * 1. 内部使用 Clash 风格的扁平对象（与 Sub-Store 一致）
 * 2. 所有解析器产出相同格式
 * 3. 所有生产器消费相同格式
 */

// ==================== 协议类型 ====================

export type ProxyType =
    | 'ss'          // Shadowsocks
    | 'ssr'         // ShadowsocksR
    | 'vmess'
    | 'vless'
    | 'trojan'
    | 'hysteria'
    | 'hysteria2'
    | 'tuic'
    | 'wireguard'
    | 'snell'
    | 'socks5'
    | 'http'
    | 'anytls';

// ==================== 核心代理对象 (Clash-compatible) ====================

/**
 * 统一代理节点接口
 * 采用 Clash 风格的扁平结构，与 Sub-Store 保持一致
 * 这是所有解析器和生产器之间的通用格式
 */
export interface Proxy {
    // === 必填字段 ===
    name: string;
    type: ProxyType;
    server: string;
    port: number;

    // === 通用可选字段 ===
    udp?: boolean;
    tfo?: boolean;  // TCP Fast Open
    tls?: boolean;
    sni?: string;
    'skip-cert-verify'?: boolean;
    'client-fingerprint'?: string;
    fingerprint?: string;
    alpn?: string[];

    // === VMess/VLESS ===
    uuid?: string;
    alterId?: number;
    cipher?: string;
    flow?: string;
    encryption?: string;

    // === Trojan/SS/SSR/Snell ===
    password?: string;
    psk?: string;

    // === SSR 专用 ===
    protocol?: string;
    'protocol-param'?: string;
    obfs?: string;
    'obfs-param'?: string;

    // === 传输层 (network) ===
    network?: 'tcp' | 'ws' | 'http' | 'h2' | 'grpc' | 'quic' | 'kcp';
    'ws-opts'?: {
        path?: string;
        headers?: Record<string, string>;
        'max-early-data'?: number;
        'early-data-header-name'?: string;
        'v2ray-http-upgrade'?: boolean;
        'v2ray-http-upgrade-fast-open'?: boolean;
    };
    'http-opts'?: {
        path?: string[];
        headers?: Record<string, string | string[]>;
        method?: string;
    };
    'h2-opts'?: {
        path?: string;
        host?: string[];
        headers?: Record<string, string>;
    };
    'grpc-opts'?: {
        'grpc-service-name'?: string;
        '_grpc-type'?: string;
        '_grpc-authority'?: string;
    };

    // === Reality ===
    'reality-opts'?: {
        'public-key': string;
        'short-id'?: string;
        '_spider-x'?: string;
    };

    // === SS 插件 ===
    plugin?: string;
    'plugin-opts'?: Record<string, unknown>;

    // === Hysteria ===
    'auth-str'?: string;
    up?: number | string;
    down?: number | string;
    'obfs-password'?: string;
    ports?: string;

    // === TUIC ===
    'congestion-controller'?: string;
    'udp-relay-mode'?: string;
    'reduce-rtt'?: boolean;

    // === WireGuard ===
    'private-key'?: string;
    'public-key'?: string;
    'pre-shared-key'?: string;
    'preshared-key'?: string;
    ip?: string;
    ipv6?: string;
    mtu?: number;
    reserved?: number[] | string;
    keepalive?: number;
    'persistent-keepalive'?: number;
    peers?: Array<{
        server: string;
        port: number;
        'public-key': string;
        'pre-shared-key'?: string;
        reserved?: number[] | string;
        'allowed-ips'?: string[];
    }>;

    // === Snell ===
    version?: number;
    'obfs-opts'?: {
        mode?: string;
        host?: string;
    };

    // === Socks5/HTTP ===
    username?: string;

    // === AnyTLS ===
    'idle-timeout'?: number;

    // === 其他扩展字段 ===
    'udp-over-tcp'?: boolean;
    'tls-fingerprint'?: string;
    'ca-str'?: string;
    'disable-sni'?: boolean;
    servername?: string;  // Clash 格式的 SNI
    interface?: string;
    'interface-name'?: string;
    'routing-mark'?: number;
    'underlying-proxy'?: string;
    'dialer-proxy'?: string;

    // === 元数据（下划线前缀，不输出） ===
    _subName?: string;          // 来源订阅名
    _desc?: string;             // 描述
    _category?: string;         // 分类
    _resolved?: boolean;        // 是否已解析域名
    _extra?: string;            // 额外参数
    _mode?: string;             // 模式
    _pqv?: string;              // PQ 版本

    // 允许额外属性
    [key: string]: unknown;
}

// ==================== 解析器接口 ====================

/**
 * 解析器接口 (参考 Sub-Store)
 * 每个解析器必须实现:
 * - name: 解析器名称
 * - test: 检测是否匹配
 * - parse: 解析内容
 */
export interface Parser {
    name: string;
    test: (line: string) => boolean;
    parse: (line: string) => Proxy;
}

// ==================== 生产器接口 ====================

/**
 * 生产器类型
 * - SINGLE: 逐个处理节点，返回单行
 * - ALL: 批量处理所有节点，返回完整输出
 */
export type ProducerType = 'SINGLE' | 'ALL';

/**
 * 生产器选项
 */
export interface ProducerOptions {
    'include-unsupported-proxy'?: boolean;
    filename?: string;
    [key: string]: unknown;
}

/**
 * 生产器接口 (参考 Sub-Store)
 * 简化版：统一使用 Proxy[] 作为输入
 */
export interface Producer {
    type: ProducerType;
    produce: (
        proxies: Proxy | Proxy[],
        type?: 'internal' | 'external',
        opts?: ProducerOptions
    ) => Proxy[] | string | unknown;
}

// ==================== 目标平台 ====================

export type TargetPlatform =
    | 'Clash'
    | 'ClashMeta'
    | 'Surge'
    | 'Loon'
    | 'QX'
    | 'QuantumultX'
    | 'Shadowrocket'
    | 'Stash'
    | 'SingBox'
    | 'URI';

// ==================== 处理选项 ====================

export interface ProcessOptions {
    /** 排除规则 (正则) */
    exclude?: string;
    /** 包含规则 (正则) */
    include?: string;
    /** 节点名称前缀 */
    prefix?: string;
    /** 节点名称后缀 */
    suffix?: string;
    /** 是否去重 */
    dedupe?: boolean;
    /** 来源订阅名 */
    subName?: string;
    /** 重命名规则 (search==>replace) */
    rename?: string;
}

// ==================== 转换选项 ====================

export interface ConvertOptions extends ProcessOptions {
    /** 目标平台 */
    target?: TargetPlatform;
    /** 输出文件名 */
    filename?: string;
    /** 是否启用 UDP */
    udp?: boolean;
    /** 是否跳过证书验证 */
    skipCertVerify?: boolean;
    /** 允许额外属性 */
    [key: string]: unknown;
}
