/**
 * Sub-One Constants
 */

// ============================================================================
// 协议常量
// ============================================================================

/**
 * 支持的代理协议
 */
export const PROXY_PROTOCOLS = [
  'ss',
  'ssr',
  'vmess',
  'vless',
  'trojan',
  'hysteria',
  'hysteria2',
  'tuic',
  'wireguard',
  'socks5',
  'http',
  'https',
  'snell',
  'anytls',
  'naive',
] as const;

/**
 * 传输协议
 */
export const NETWORK_TYPES = [
  'tcp',
  'ws',
  'grpc',
  'h2',
  'http',
  'kcp',
  'quic',
] as const;

// ============================================================================
// 平台常量
// ============================================================================

/**
 * 支持的平台
 */
export const PLATFORMS = [
  'Clash',
  'ClashMeta',
  'Singbox',
  'Surge',
  'Loon',
  'QuantumultX',
  'Shadowrocket',
  'URI',
  'JSON',
] as const;

/**
 * 平台别名映射
 */
export const PLATFORM_ALIASES: Record<string, string> = {
  // Clash 系列
  'clash': 'Clash',
  'clash-meta': 'ClashMeta',
  'clashmeta': 'ClashMeta',
  'meta': 'ClashMeta',
  'mihomo': 'ClashMeta',

  // sing-box
  'singbox': 'Singbox',
  'sing-box': 'Singbox',

  // Surge
  'surge': 'Surge',

  // Loon
  'loon': 'Loon',

  // QuantumultX
  'quantumultx': 'QuantumultX',
  'qx': 'QuantumultX',
  'quantumult-x': 'QuantumultX',
  'quantumult': 'QuantumultX',

  // Shadowrocket
  'shadowrocket': 'Shadowrocket',
  'rocket': 'Shadowrocket',

  // URI/Base64
  'uri': 'URI',
  'base64': 'URI',
  'v2ray': 'URI',

  // JSON
  'json': 'JSON',
};

// ============================================================================
// 加密方法常量
// ============================================================================

/**
 * Shadowsocks 支持的加密方法
 */
export const SS_CIPHERS = [
  // AEAD 2022 (推荐)
  '2022-blake3-aes-128-gcm',
  '2022-blake3-aes-256-gcm',
  '2022-blake3-chacha20-poly1305',

  // AEAD (推荐)
  'aes-128-gcm',
  'aes-192-gcm',
  'aes-256-gcm',
  'chacha20-ietf-poly1305',
  'xchacha20-ietf-poly1305',

  // Stream (不安全，不推荐)
  'aes-128-cfb',
  'aes-192-cfb',
  'aes-256-cfb',
  'aes-128-ctr',
  'aes-192-ctr',
  'aes-256-ctr',
  'rc4-md5',
  'chacha20-ietf',
  'none',
  'plain',
] as const;

/**
 * VMess 支持的加密方法
 */
export const VMESS_CIPHERS = [
  'auto',
  'aes-128-gcm',
  'chacha20-poly1305',
  'none',
  'zero',
] as const;

// ============================================================================
// 协议特定常量
// ============================================================================

/**
 * VLESS Flow 类型
 */
export const VLESS_FLOWS = [
  '',
  'xtls-rprx-origin',
  'xtls-rprx-origin-udp443',
  'xtls-rprx-direct',
  'xtls-rprx-direct-udp443',
  'xtls-rprx-vision',
  'xtls-rprx-vision-udp443',
] as const;

/**
 * Hysteria2 混淆类型
 */
export const HYSTERIA2_OBFS = [
  'salamander',
] as const;

/**
 * TUIC 拥塞控制算法
 */
export const TUIC_CONGESTION_CONTROLLERS = [
  'cubic',
  'new_reno',
  'bbr',
] as const;

/**
 * ALPN 协议列表
 */
export const ALPN_PROTOCOLS = [
  'h3',
  'h2',
  'http/1.1',
] as const;

// ============================================================================
// 默认值
// ============================================================================

/**
 * 默认端口
 */
export const DEFAULT_PORTS: Record<string, number> = {
  'http': 80,
  'https': 443,
  'socks5': 1080,
};

/**
 * 默认配置
 */
export const DEFAULTS = {
  // 超时
  timeout: 30000,

  // User-Agent
  userAgent: 'Sub-One/1.0',

  // 默认MTU
  mtu: 1420,

  // 默认 UDP 中继模式
  udpRelayMode: 'native',

  // Hysteria 默认速度 (mbps)
  hysteriaSpeed: 100,

  // TUIC 默认设置
  tuicMaxOpenStreams: 100,
  tuicMaxUdpRelayPacketSize: 1500,
} as const;

// ============================================================================
// 正则表达式常量
// ============================================================================

/**
 * 常用正则表达式
 */
export const REGEX_PATTERNS = {
  // 协议前缀
  protocolPrefix: /^([a-z0-9]+):\/\//i,

  // IPv4
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,

  // IPv6
  ipv6: /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,

  // UUID
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,

  // Base64
  base64: /^[A-Za-z0-9+/]+=*$/,

  // ASCII
  ascii: /^[\x00-\x7F]+$/,

  // 端口
  port: /^([1-9]\d{0,4}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])$/,
} as const;

// =


// 平台协议支持矩阵
// ============================================================================

/**
 * 各平台支持的协议

 */
export const PLATFORM_PROTOCOL_SUPPORT: Record<string, string[]> = {
  'Clash': [
    'ss',
    'ssr',
    'vmess',
    'vless',
    'trojan',
    'hysteria',
    'hysteria2',
    'tuic',
    'wireguard',
    'socks5',
    'http',
    'snell',
    'anytls',
    'naive',
  ],

  'ClashMeta': [
    'ss',
    'ssr',
    'vmess',
    'vless',
    'trojan',
    'hysteria',
    'hysteria2',
    'tuic',
    'wireguard',
    'socks5',
    'http',
    'snell',
    'anytls',
    'naive',
  ],

  'Singbox': [
    'ss',
    'vmess',
    'vless',
    'trojan',
    'hysteria',
    'hysteria2',
    'tuic',
    'wireguard',
    'socks5',
    'http',
  ],

  'Surge': [
    'ss',
    'vmess',
    'trojan',
    'hysteria2',
    'tuic',
    'wireguard',
    'socks5',
    'http',
    'snell',
    'anytls',
  ],

  'Loon': [
    'ss',
    'ssr',
    'vmess',
    'vless',
    'trojan',
    'hysteria2',
    'tuic',
    'wireguard',
    'socks5',
    'http',
    'snell',
  ],

  'QuantumultX': [
    'ss',
    'ssr',
    'vmess',
    'vless',
    'trojan',
    'hysteria2',
    'wireguard',
    'socks5',
    'http',
  ],

  'Shadowrocket': [
    'ss',
    'ssr',
    'vmess',
    'vless',
    'trojan',
    'hysteria',
    'hysteria2',
    'tuic',
    'socks5',
    'http',
  ],
};

/**
 * 检查平台是否支持指定协议
 */
export function isPlatformSupported(platform: string, protocol: string): boolean {
  const normalizedPlatform = PLATFORM_ALIASES[platform.toLowerCase()] || platform;
  const supportedProtocols = PLATFORM_PROTOCOL_SUPPORT[normalizedPlatform];
  return supportedProtocols ? supportedProtocols.includes(protocol) : false;
}
