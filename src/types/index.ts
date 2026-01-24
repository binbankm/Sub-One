// ==================== 2. 需要扩展的基础类型导入 ====================
import type {
    ProxyType,
    // Add this line
    AppConfig as SharedAppConfig,
    Profile as SharedProfile,
    ProxyNode as SharedProxyNode,
    Subscription as SharedSubscription,
    SubscriptionUserInfo as SharedUserInfo
} from '../../lib/backend/proxy/types';

/**
 * ==================== TypeScript 类型定义文件 ====================
 *
 * 功能说明：
 * - 应用核心类型定义入口
 * - 聚合 Shared 类型并进行前端扩展
 * - 统一导出所有节点具体类型
 *
 * =================================================================
 */

// ==================== 1. 核心类型透传导出 ====================
// 直接导出无需扩展的共享类型，减少冗余代码
export type {
    CipherType,
    ClientFormat,
    // 基础枚举
    ProxyType,
    NetworkType,
    // 具体节点接口
    VmessNode,
    VlessNode,
    TrojanNode,
    ShadowsocksNode,
    ShadowsocksRNode,
    HysteriaNode,
    Hysteria2Node,
    TuicNode,
    WireGuardNode,
    AnyTLSNode,
    SnellNode,
    HttpNode,
    Socks5Node,

    // 其他
    User,
    UserRole
} from '../../lib/backend/proxy/types';

// ==================== 3. 类型扩展定义 ====================

/**
 * 支持的代理协议类型
 * 扩展共享定义，优先使用已知类型，同时兼容字符串
 */
export type ProtocolType = ProxyType | string;

/**
 * 订阅用户信息
 * 目前直接复用共享定义，预留扩展空间
 */
export type SubscriptionUserInfo = SharedUserInfo;

// -------------------- 节点 (Node) --------------------
/**
 * 节点接口 - 前端扩展版
 * 继承自 SharedProxyNode，添加 UI 交互状态字段
 */
export type Node = SharedProxyNode & {
    /** 旧版协议类型字段 (兼容性保留) */
    protocol?: ProtocolType;

    /** 启用状态 (UI控制开关) */
    enabled: boolean;

    /** 原始代理配置对象 (用于 Clash/SingBox 编辑回显) */
    originalProxy?: Record<string, unknown>;

    // --- 便捷访问字段 (Flattened/Optional) ---
    // 为了方便 UI 列表展示，声明一些可能存在的字段为可选
    // --- 便捷访问字段 (Flattened/Optional) ---
    // [已优化] 直接继承自 SharedProxyNode，无需重复声明
    // cipher?, uuid?, password?, udp?, sni? 均已包含

    /** 动态扩展字段 (允许 UI 临时状态) */
    [key: string]: unknown;
};

// -------------------- 订阅 (Subscription) --------------------
/**
 * 订阅接口 - 前端扩展版
 */
export type Subscription = SharedSubscription & {
    /** 订阅状态 (UI 状态机: unchecked -> checking -> success/error) */
    status?: 'unchecked' | 'checking' | 'success' | 'error' | string;

    /** 更新中标识 (Loading 状态) */
    isUpdating?: boolean;

    /** 错误信息 (如果更新失败) */
    errorMsg?: string;

    [key: string]: unknown;
};

// -------------------- 订阅组 (Profile) --------------------
/**
 * 订阅组接口
 */
export type Profile = SharedProfile & {
    // 前端可能需要扩展 UI 相关的字段
    [key: string]: unknown;
};

// -------------------- 应用配置 (AppConfig) --------------------
export type AppConfig = SharedAppConfig;

// ==================== 4. 工具类型定义 ====================

/**
 * 转换器选项 (ConverterOptions)
 */
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
}

/**
 * 初始数据结构 (服务端 -> 客户端)
 */
export interface InitialData {
    subs?: Subscription[];
    profiles?: Profile[];
    config?: AppConfig;
}

/**
 * 通用 API 响应结构
 * @template T 响应数据类型
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    /** @deprecated 兼容旧 API */
    results?: T;
}
