// 分页相关常量
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 6,
  MAX_PAGE_SIZE: 50,
  MIN_PAGE_SIZE: 1
};

// 验证相关常量
export const VALIDATION = {
  URL_REGEX: /^https?:\/\/.+/,
  NODE_REGEX: /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//,
  CUSTOM_ID_REGEX: /[^a-zA-Z0-9-_]/g
};

// 存储键名常量
export const STORAGE_KEYS = {
  VIEW_MODE: 'manualNodeViewMode',
  THEME: 'theme',
  LANGUAGE: 'language',
  SETTINGS: 'appSettings'
};

// 视图模式常量
export const VIEW_MODES = {
  CARD: 'card',
  LIST: 'list'
};

// 状态常量
export const STATUS = {
  IDLE: 'idle',
  SAVING: 'saving',
  SUCCESS: 'success',
  ERROR: 'error'
};

// 订阅状态常量
export const SUBSCRIPTION_STATUS = {
  UNCHECKED: 'unchecked',
  CHECKING: 'checking',
  SUCCESS: 'success',
  ERROR: 'error'
};

// 操作类型常量
export const OPERATION_TYPES = {
  ADD: 'add',
  EDIT: 'edit',
  DELETE: 'delete',
  TOGGLE: 'toggle',
  UPDATE: 'update',
  SORT: 'sort',
  IMPORT: 'import',
  EXPORT: 'export'
};

// 错误消息映射
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接异常，请检查网络后重试',
  FORMAT_ERROR: '数据格式异常，请刷新页面后重试',
  STORAGE_ERROR: '存储服务暂时不可用，请稍后重试',
  VALIDATION_ERROR: '输入数据验证失败，请检查后重试',
  PERMISSION_ERROR: '权限不足，无法执行此操作',
  UNKNOWN_ERROR: '发生未知错误，请稍后重试'
};

// 成功消息模板
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: '保存成功！',
  DELETE_SUCCESS: '删除成功！',
  UPDATE_SUCCESS: '更新成功！',
  IMPORT_SUCCESS: '导入成功！',
  SORT_SUCCESS: '排序已保存！'
};

// 延迟时间常量
export const DELAYS = {
  DEBOUNCE_SEARCH: 300,
  DEBOUNCE_SAVE: 1000,
  THROTTLE_SCROLL: 100,
  TOAST_DISPLAY: 3000,
  SAVE_SUCCESS_DISPLAY: 1500
};

// 默认配置
export const DEFAULT_CONFIG = {
  itemsPerPage: 6,
  searchDebounce: 300,
  saveDebounce: 1000,
  maxBulkImport: 1000,
  maxNodeCount: 10000
};
