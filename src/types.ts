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

// ==================== 基础类型定义 ====================

// ==================== 统一类型引用 (Single Source of Truth) ====================
// 核心数据结构直接复用 lib/shared/types
import type {
    ProxyNode as SharedProxyNode,
    Subscription as SharedSubscription,
    Profile as SharedProfile,
    AppConfig as SharedAppConfig,
    SubscriptionUserInfo as SharedUserInfo,
    CipherType,
    ProtocolType as SharedProtocolType,
    ClientFormat
} from '../lib/shared/types';

// 重新导出核心类型，方便前端其他文件引用
export type { CipherType, ClientFormat };

// ==================== 基础类型扩展 ====================

/** 
 * 支持的代理协议类型 
 * 扩展共享定义，允许前端特定的宽泛字符串
 */
export type ProtocolType = SharedProtocolType | string;


/**
 * 订阅用户信息
 * 直接复用共享定义
 */
export type SubscriptionUserInfo = SharedUserInfo;

// ==================== 节点接口扩展 ====================
/**
 * 节点（Node）接口定义 - 前端扩展版
 * 继承自共享 ProxyNode 定义，并添加前端 UI 所需字段
 */
export type Node = SharedProxyNode & {
    /** 旧版协议类型字段 (兼容性保留，指向 type) */
    protocol?: ProtocolType;
    /** 启用状态 (UI控制) */
    enabled: boolean;
    /** 原始代理配置对象 (兼容旧逻辑) */
    originalProxy?: Record<string, unknown>;

    // 前端可能用到但 SharedProxyNode 中可能是特定协议才有的字段，
    // 在此声明为可选以方便 UI 统一访问 (如列表中展示 cipher)
    cipher?: string;
    uuid?: string;
    password?: string;
    udp?: boolean;
    sni?: string;

    /** 动态扩展字段 */
    [key: string]: unknown;
};

// ==================== 订阅接口扩展 ====================
/**
 * 订阅（Subscription）接口定义 - 前端扩展版
 */
export type Subscription = SharedSubscription & {
    /** 订阅状态（前端特有：unchecked、checking、success、error） */
    status?: string;
    /** 更新状态标识 */
    isUpdating?: boolean;

    /** 动态扩展字段 */
    [key: string]: unknown;
}


// ==================== 订阅组接口 ====================
/**
 * 订阅组（Profile）接口定义 - 前端引用版
 */
export type Profile = SharedProfile;

// ==================== 应用配置接口 ====================
/**
 * 应用配置（AppConfig）接口定义 - 前端引用版
 */
export type AppConfig = SharedAppConfig;

// ==================== 转换选项接口 ====================
/**
 * 转换器选项 (ConverterOptions)
 * 控制输出格式和内容的选项
 */
export interface ConverterOptions {
    /** 配置文件名称 */
    filename?: string;
    /** 是否包含规则 */
    includeRules?: boolean;
    /** 远程规则配置 URL */
    remoteConfig?: string;
    /** 订阅用户信息 */
    userInfo?: {
        upload?: number;
        download?: number;
        total?: number;
        expire?: number;
    };
    /** 目标客户端版本 */
    clientVersion?: string;
    /** 是否启用 UDP */
    udp?: boolean;
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
export interface ApiResponse<T = unknown> {
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

