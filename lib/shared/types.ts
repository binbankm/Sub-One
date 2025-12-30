/**
 * 共享类型定义
 * 前后端通用
 */

// ==================== 基础类型定义 ====================

/** 
 * 支持的代理协议类型 
 * 包含所有常见协议，也允许字符串扩展
 * 
 * 协议说明：
 * - ss/ssr: Shadowsocks 系列
 * - vmess/vless: V2Ray 系列
 * - trojan: Trojan 协议
 * - hysteria/hysteria2/hy/hy2: Hysteria 系列（高性能UDP协议）
 * - tuic: TUIC 协议
 * - anytls: AnyTLS 协议
 * - socks/socks5: SOCKS 代理
 * - http/https: HTTP 代理
 * - snell: Snell 协议（Surge 原生协议）
 */
export type ProtocolType =
    | 'vmess'
    | 'vless'
    | 'trojan'
    | 'ss'
    | 'ssr'
    | 'hysteria'
    | 'hysteria2'
    | 'hy'
    | 'hy2'
    | 'tuic'
    | 'anytls'
    | 'socks'
    | 'socks5'
    | 'http'
    | 'https'
    | 'snell'
    | string; // 允许扩展支持未来的协议

// ==================== 节点接口 ====================
/**
 * 节点（Node）接口定义
 * 表示单个代理节点的数据结构
 * 前后端共享类型
 */
export interface Node {
    /** 节点唯一标识符（UUID） */
    id: string;
    /** 节点显示名称 */
    name: string;
    /** 节点链接地址（协议://配置信息） */
    url: string;
    /** 协议类型 */
    protocol?: ProtocolType;
    /** 节点启用状态（true=启用, false=禁用） */
    enabled: boolean;
    /** 节点类型（可选扩展字段） */
    type?: string;
    /** 所属订阅名称（用于区分来源） */
    subscriptionName?: string;
    /** 原始代理配置对象（保留完整配置信息） */
    originalProxy?: Record<string, unknown>;
    /** 动态扩展字段 */
    [key: string]: unknown;
}

// ==================== 处理选项接口 ====================
/**
 * 节点处理选项
 * 用于订阅解析时的配置
 */
export interface ProcessOptions {
    /** 排除规则（节点过滤关键词） */
    exclude?: string;
    /** 是否自动添加订阅名作为节点名前缀 */
    prependSubName?: boolean;
}

// ==================== Clash 类型定义 ====================
/**
 * Clash 代理配置接口 (Partial)
 * 用于构建 Clash 配置文件
 */
export interface ClashProxy {
    name: string;
    type: string;
    server: string;
    port: number | string;
    uuid?: string;
    cipher?: string;
    password?: string;
    udp?: boolean;
    tls?: boolean;
    servername?: string;
    'client-fingerprint'?: string;
    'skip-cert-verify'?: boolean;
    alpn?: string[];
    network?: string;
    'ws-opts'?: {
        path?: string;
        headers?: Record<string, string>;
    };
    'grpc-opts'?: {
        'grpc-service-name'?: string;
        mode?: string;
    };
    'reality-opts'?: {
        'public-key': string;
        'short-id': string;
        'spider-x'?: string;
    };
    plugin?: string;
    'plugin-opts'?: Record<string, string>;
    obfs?: string;
    'obfs-password'?: string;
    'congestion-controller'?: string;
    'udp-relay-mode'?: string;
    'idle-timeout'?: string;
    [key: string]: any; // 允许额外的未定义字段
}

// ==================== Sing-Box 类型定义 ====================
/**
 * Sing-Box Outbound 配置接口 (Partial)
 * 用于构建 Sing-Box 配置文件
 */
export interface SingBoxOutbound {
    type: string;
    tag: string;
    server: string;
    server_port: number;
    uuid?: string;
    password?: string;
    method?: string; // shadowsocks cipher
    plugin?: string;
    plugin_opts?: string;
    network?: string;
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
            public_key?: string;
            short_id?: string;
        };
    };
    transport?: {
        type: string;
        path?: string;
        headers?: Record<string, string>;
        service_name?: string;
    };
    obfs?: {
        type: string;
        password?: string;
    };
    flow?: string;
    alter_id?: number; // vmess
    security?: string; // vmess
    idle_timeout?: string;
    down?: string; // hysteria2
    up?: string; // hysteria2
    [key: string]: any; // 允许其他字段
}

// ==================== VMess 配置接口 ====================
/**
 * VMess 节点 JSON 配置接口
 * 用于解码 vmess:// base64 后的对象
 */
export interface VmessConfig {
    v: string;
    ps: string;
    add: string;
    port: string | number;
    id: string;
    aid: string | number;
    scy?: string;
    net: string;
    type?: string;
    host?: string;
    path?: string;
    tls?: string;
    sni?: string;
    alpn?: string;
    fp?: string; // fingerprint
    serviceName?: string; // grpc
    skip_cert_verify?: boolean;
    'skip-cert-verify'?: boolean;
    [key: string]: any;
}
