/**
 * ==================== TypeScript 类型定义文件 ====================
 * 
 * 功能说明：
 * - 定义应用中使用的核心数据类型
 * - 包括节点、订阅、订阅组、配置等核心接口
 * - 确保类型安全和代码可维护性
 * 
 * =================================================================
 */

// ==================== 节点接口 ====================
/**
 * 节点（Node）接口定义
 * 表示单个代理节点的数据结构
 */
export interface Node {
    /** 节点唯一标识符（UUID） */
    id: string;
    /** 节点显示名称 */
    name: string;
    /** 节点链接地址（协议://配置信息） */
    url: string;
    /** 协议类型（如：vmess, vless, trojan, ss等） */
    protocol?: string;
    /** 节点启用状态（true=启用, false=禁用） */
    enabled: boolean;
    /** 节点类型（可选扩展字段） */
    type?: string;
    /** 所属订阅名称（用于区分来源） */
    subscriptionName?: string;
    /** 原始代理配置对象（保留完整配置信息） */
    originalProxy?: any;
    /** 动态扩展字段（支持其他自定义属性） */
    [key: string]: any;
}

// ==================== 订阅接口 ====================
/**
 * 订阅（Subscription）接口定义
 * 表示一个机场订阅链接及其状态
 */
export interface Subscription {
    /** 订阅唯一标识符（UUID） */
    id: string;
    /** 订阅显示名称（可选，默认从链接提取） */
    name?: string;
    /** 订阅链接地址（HTTP/HTTPS） */
    url?: string;
    /** 订阅启用状态（true=启用, false=禁用） */
    enabled: boolean;
    /** 订阅包含的节点数量 */
    nodeCount?: number;
    /** 更新状态标识（true=正在更新） */
    isUpdating?: boolean;
    /** 订阅用户信息（流量、到期时间等） */
    userInfo?: any;
    /** 排除规则（节点过滤关键词） */
    exclude?: string;
    /** 动态扩展字段（支持其他自定义属性） */
    [key: string]: any;
}

// ==================== 订阅组接口 ====================
/**
 * 订阅组（Profile）接口定义
 * 表示一组订阅和节点的组合配置
 */
export interface Profile {
    /** 订阅组唯一标识符（UUID） */
    id: string;
    /** 订阅组显示名称 */
    name: string;
    /** 订阅组启用状态（true=启用, false=禁用） */
    enabled: boolean;
    /** 包含的订阅ID列表 */
    subscriptions: string[];
    /** 包含的手动节点ID列表 */
    manualNodes: string[];
    /** 自定义短链接 ID（用于生成友好的分享链接） */
    customId?: string;
    /** 订阅转换服务地址 */
    subConverter?: string;
    /** 订阅转换配置参数 */
    subConfig?: string;
    /** 订阅组过期时间（ISO 8601 格式） */
    expiresAt?: string;
    /** 动态扩展字段（支持其他自定义属性） */
    [key: string]: any;
}

// ==================== 应用配置接口 ====================
/**
 * 应用配置（AppConfig）接口定义
 * 存储应用全局设置
 */
export interface AppConfig {
    /** 订阅组分享令牌（用于生成分享链接） */
    profileToken?: string;
    /** 动态扩展字段（支持其他自定义配置项） */
    [key: string]: any;
}

// ==================== 初始数据接口 ====================
/**
 * 初始数据（InitialData）接口定义
 * 应用启动时从服务器获取的完整数据结构
 */
export interface InitialData {
    /** 所有订阅列表 */
    subs?: Subscription[];
    /** 所有订阅组列表 */
    profiles?: Profile[];
    /** 应用配置对象 */
    config?: AppConfig;
}

// ==================== API 响应接口 ====================
/**
 * API 响应（ApiResponse）通用接口定义
 * 统一所有 API 请求的响应格式
 * 
 * @template T - 响应数据的类型参数
 */
export interface ApiResponse<T = any> {
    /** 请求是否成功（true=成功, false=失败） */
    success: boolean;
    /** 响应数据（成功时返回） */
    data?: T;
    /** 成功消息（可选） */
    message?: string;
    /** 错误消息（失败时返回） */
    error?: string;
    /** 兼容某些 API 使用 results 字段返回数据 */
    results?: T;
}
