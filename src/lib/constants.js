/**
 * 应用常量定义
 * 集中管理应用中使用的常量值
 */

// === 分页配置 ===
export const PAGINATION = {
  SUBSCRIPTIONS_PER_PAGE: 6,
  PROFILES_PER_PAGE: 6,
  MANUAL_NODES_PER_PAGE: 24
}

// === 节点协议类型 ===
export const NODE_PROTOCOLS = {
  SS: 'ss',
  SSR: 'ssr',
  VMESS: 'vmess',
  VLESS: 'vless',
  TROJAN: 'trojan',
  HYSTERIA: 'hysteria',
  HYSTERIA2: 'hysteria2',
  TUIC: 'tuic',
  SOCKS5: 'socks5'
}

// === 订阅格式类型 ===
export const SUBSCRIPTION_FORMATS = {
  CLASH: 'clash',
  SURGE: 'surge',
  LOON: 'loon',
  SING_BOX: 'sing-box',
  BASE64: 'base64',
  QUANX: 'quanx'
}

// === 地区代码映射 ===
export const REGION_CODES = {
  HK: ['🇭🇰', '香港'],
  TW: ['🇹🇼', '台湾', '臺灣'],
  SG: ['🇸🇬', '新加坡', '狮城'],
  JP: ['🇯🇵', '日本'],
  US: ['🇺🇸', '美国', '美國'],
  KR: ['🇰🇷', '韩国', '韓國'],
  GB: ['🇬🇧', '英国', '英國'],
  DE: ['🇩🇪', '德国', '德國'],
  FR: ['🇫🇷', '法国', '法國'],
  CA: ['🇨🇦', '加拿大'],
  AU: ['🇦🇺', '澳大利亚', '澳洲', '澳大利亞'],
  CN: ['🇨🇳', '中国', '大陸', '内地'],
  MY: ['🇲🇾', '马来西亚', '馬來西亞'],
  TH: ['🇹🇭', '泰国', '泰國'],
  VN: ['🇻🇳', '越南'],
  PH: ['🇵🇭', '菲律宾', '菲律賓'],
  ID: ['🇮🇩', '印度尼西亚', '印尼'],
  IN: ['🇮🇳', '印度'],
  PK: ['🇵🇰', '巴基斯坦'],
  BD: ['🇧🇩', '孟加拉国', '孟加拉國'],
  AE: ['🇦🇪', '阿联酋', '阿聯酋'],
  SA: ['🇸🇦', '沙特阿拉伯'],
  TR: ['🇹🇷', '土耳其'],
  RU: ['🇷🇺', '俄罗斯', '俄羅斯'],
  BR: ['🇧🇷', '巴西'],
  MX: ['🇲🇽', '墨西哥'],
  AR: ['🇦🇷', '阿根廷'],
  CL: ['🇨🇱', '智利'],
  ZA: ['🇿🇦', '南非'],
  EG: ['🇪🇬', '埃及'],
  NG: ['🇳🇬', '尼日利亚', '尼日利亞'],
  KE: ['🇰🇪', '肯尼亚', '肯尼亞'],
  IL: ['🇮🇱', '以色列'],
  IR: ['🇮🇷', '伊朗'],
  IQ: ['🇮🇶', '伊拉克'],
  UA: ['🇺🇦', '乌克兰', '烏克蘭'],
  PL: ['🇵🇱', '波兰', '波蘭'],
  CZ: ['🇨🇿', '捷克'],
  HU: ['🇭🇺', '匈牙利'],
  RO: ['🇷🇴', '罗马尼亚', '羅馬尼亞'],
  GR: ['🇬🇷', '希腊', '希臘'],
  PT: ['🇵🇹', '葡萄牙'],
  ES: ['🇪🇸', '西班牙'],
  IT: ['🇮🇹', '意大利'],
  NL: ['🇳🇱', '荷兰', '荷蘭'],
  BE: ['🇧🇪', '比利时', '比利時'],
  SE: ['🇸🇪', '瑞典'],
  NO: ['🇳🇴', '挪威'],
  DK: ['🇩🇰', '丹麦', '丹麥'],
  FI: ['🇫🇮', '芬兰', '芬蘭'],
  CH: ['🇨🇭', '瑞士'],
  AT: ['🇦🇹', '奥地利', '奧地利'],
  IE: ['🇮🇪', '爱尔兰', '愛爾蘭'],
  NZ: ['🇳🇿', '新西兰', '紐西蘭']
}

// === 地区排序顺序 ===
export const REGION_ORDER = ['HK', 'TW', 'SG', 'JP', 'US', 'KR', 'GB', 'DE', 'FR', 'CA', 'AU']

// === 地区关键词映射 ===
export const REGION_KEYWORDS = {
  HK: [/香港/, /HK/, /Hong Kong/i],
  TW: [/台湾/, /TW/, /Taiwan/i],
  SG: [/新加坡/, /SG/, /狮城/, /Singapore/i],
  JP: [/日本/, /JP/, /Japan/i],
  US: [/美国/, /US/, /United States/i],
  KR: [/韩国/, /KR/, /Korea/i],
  GB: [/英国/, /GB/, /UK/, /United Kingdom/i],
  DE: [/德国/, /DE/, /Germany/i],
  FR: [/法国/, /FR/, /France/i],
  CA: [/加拿大/, /CA/, /Canada/i],
  AU: [/澳大利亚/, /AU/, /Australia/i]
}

// === 正则表达式 ===
export const REGEX = {
  HTTP_URL: /^https?:\/\//,
  NODE_PROTOCOL: /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//,
  CUSTOM_ID: /[^a-zA-Z0-9-_]/g
}

// === 默认配置 ===
export const DEFAULT_CONFIG = {
  theme: 'auto',
  viewMode: 'card',
  itemsPerPage: {
    subscriptions: 6,
    profiles: 6,
    manualNodes: 24
  },
  autoUpdate: true,
  updateInterval: 300000 // 5分钟
}

// === 错误消息 ===
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络连接',
  INVALID_DATA: '数据格式错误，请刷新页面后重试',
  STORAGE_ERROR: '存储服务暂时不可用，请稍后重试',
  LOGIN_FAILED: '登录失败，请检查密码',
  SAVE_FAILED: '保存失败，请稍后重试',
  UPDATE_FAILED: '更新失败，请稍后重试'
}

// === 成功消息 ===
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: '保存成功！',
  UPDATE_SUCCESS: '更新成功！',
  DELETE_SUCCESS: '删除成功！',
  IMPORT_SUCCESS: '导入成功！',
  EXPORT_SUCCESS: '导出成功！'
}
