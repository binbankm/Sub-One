// TypeScript类型定义

/**
 * 订阅节点接口
 */
export interface SubscriptionNode {
  id?: string;
  name: string;
  url: string;
  type?: string;
  enabled?: boolean;
  remark?: string;
  ps?: string;
  [key: string]: any;
}

/**
 * 订阅接口
 */
export interface Subscription {
  id?: string;
  name: string;
  url: string;
  enabled?: boolean;
  remark?: string;
  include?: string;
  exclude?: string;
  nodeCount?: number;
  lastUpdate?: string;
  [key: string]: any;
}

/**
 * 订阅组接口
 */
export interface Profile {
  id: string;
  name: string;
  enabled: boolean;
  subscriptions: string[];
  manualNodes: string[];
  customId?: string;
  subConverter?: string;
  subConfig?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 手动节点接口
 */
export interface ManualNode {
  id?: string;
  name: string;
  url: string;
  enabled?: boolean;
  remark?: string;
  protocol?: string;
  [key: string]: any;
}

/**
 * 分页信息接口
 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 分页数据接口
 */
export interface PaginatedData<T> extends PaginationInfo {
  items: T[];
}

/**
 * API响应接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 配置接口
 */
export interface Config {
  adminPassword?: string;
  theme?: string;
  language?: string;
  [key: string]: any;
}

/**
 * 会话状态类型
 */
export type SessionState = 'loading' | 'loggedIn' | 'loggedOut';

/**
 * 保存状态类型
 */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * 主题类型
 */
export type Theme = 'light' | 'dark' | 'auto';

/**
 * 消息类型
 */
export type MessageType = 'success' | 'error' | 'warning' | 'info';

/**
 * 消息接口
 */
export interface Message {
  id: string;
  type: MessageType;
  message: string;
  duration?: number;
}

/**
 * 标签页类型
 */
export type TabType = 'subscriptions' | 'profiles' | 'generator' | 'nodes';

/**
 * 视图模式类型
 */
export type ViewMode = 'card' | 'list';

/**
 * 协议类型
 */
export type Protocol = 
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
  | 'socks5' 
  | 'http' 
  | 'unknown';

/**
 * 订阅解析结果接口
 */
export interface ParseResult {
  nodes: SubscriptionNode[];
  format: string;
  count: number;
}

/**
 * 订阅解析器接口
 */
export interface SubscriptionParser {
  parse(content: string, subscriptionName?: string): SubscriptionNode[];
  validateContent(content: string): {
    valid: boolean;
    format: string;
    error?: string;
  };
  getSupportedProtocols(): string[];
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  type: string;
  message: string;
  originalError?: Error;
  context?: string;
  timestamp?: string;
}

/**
 * 表单验证规则接口
 */
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

/**
 * 表单字段接口
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'url' | 'textarea' | 'select' | 'checkbox';
  value: any;
  rules?: ValidationRule[];
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * 模态框接口
 */
export interface ModalProps {
  show: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  persistent?: boolean;
}

/**
 * 组件Props基础接口
 */
export interface BaseComponentProps {
  class?: string;
  style?: string | Record<string, any>;
  id?: string;
}

/**
 * 事件处理器类型
 */
export type EventHandler<T = any> = (event: T) => void;

/**
 * 异步事件处理器类型
 */
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;

/**
 * 工具函数类型
 */
export type UtilityFunction<T = any, R = any> = (value: T) => R;

/**
 * 异步工具函数类型
 */
export type AsyncUtilityFunction<T = any, R = any> = (value: T) => Promise<R>;

/**
 * 存储接口
 */
export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

/**
 * 本地存储接口
 */
export interface LocalStorage extends Storage {
  length: number;
  key(index: number): string | null;
}

/**
 * 会话存储接口
 */
export interface SessionStorage extends Storage {
  length: number;
  key(index: number): string | null;
}

/**
 * 路由接口
 */
export interface Route {
  path: string;
  name: string;
  component: any;
  meta?: Record<string, any>;
}

/**
 * 路由配置接口
 */
export interface RouterConfig {
  routes: Route[];
  mode?: 'hash' | 'history';
  base?: string;
}

/**
 * 状态管理接口
 */
export interface Store {
  state: Record<string, any>;
  getters: Record<string, any>;
  mutations: Record<string, Function>;
  actions: Record<string, Function>;
}

/**
 * Pinia Store接口
 */
export interface PiniaStore {
  $id: string;
  $state: Record<string, any>;
  $patch: (partial: any) => void;
  $reset: () => void;
  $subscribe: (callback: Function) => () => void;
}

/**
 * 组合式函数接口
 */
export interface ComposableFunction<T = any> {
  (...args: any[]): T;
}

/**
 * 生命周期钩子接口
 */
export interface LifecycleHooks {
  onMounted?: () => void;
  onUnmounted?: () => void;
  onUpdated?: () => void;
  onBeforeMount?: () => void;
  onBeforeUnmount?: () => void;
  onBeforeUpdate?: () => void;
}

/**
 * 组件实例接口
 */
export interface ComponentInstance {
  $el: HTMLElement;
  $props: Record<string, any>;
  $emit: (event: string, ...args: any[]) => void;
  $slots: Record<string, any>;
  $refs: Record<string, any>;
}

/**
 * 响应式引用接口
 */
export interface Ref<T = any> {
  value: T;
}

/**
 * 计算属性接口
 */
export interface ComputedRef<T = any> extends Ref<T> {
  readonly value: T;
}

/**
 * 监听器接口
 */
export interface WatchStopHandle {
  (): void;
}

/**
 * 监听选项接口
 */
export interface WatchOptions {
  immediate?: boolean;
  deep?: boolean;
  flush?: 'pre' | 'post' | 'sync';
}

/**
 * 监听器函数类型
 */
export type WatchCallback<T = any> = (newValue: T, oldValue: T) => void;

/**
 * 监听器接口
 */
export interface Watcher<T = any> {
  (source: Ref<T> | (() => T), callback: WatchCallback<T>, options?: WatchOptions): WatchStopHandle;
}
