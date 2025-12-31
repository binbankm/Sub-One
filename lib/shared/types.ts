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
