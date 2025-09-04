// 协议信息映射
export const PROTOCOL_MAP = {
  'ss': { 
    icon: '🔒', 
    color: 'text-blue-500', 
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'SS',
    style: 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30'
  },
  'ssr': { 
    icon: '🛡️', 
    color: 'text-purple-500', 
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'SSR',
    style: 'bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
  },
  'vmess': { 
    icon: '⚡', 
    color: 'text-green-500', 
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'VMESS',
    style: 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30'
  },
  'vless': { 
    icon: '🚀', 
    color: 'text-indigo-500', 
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'VLESS',
    style: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
  },
  'trojan': { 
    icon: '🛡️', 
    color: 'text-red-500', 
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'TROJAN',
    style: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-600 dark:text-red-400 border-red-500/30'
  },
  'hysteria': { 
    icon: '⚡', 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'Hysteria',
    style: 'bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30'
  },
  'hysteria2': { 
    icon: '⚡', 
    color: 'text-orange-500', 
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'HY2',
    style: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30'
  },
  'tuic': { 
    icon: '🚀', 
    color: 'text-teal-500', 
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    text: 'TUIC',
    style: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
  },
  'anytls': {
    icon: '🔒',
    color: 'text-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-900/30',
    text: 'AnyTLS',
    style: 'bg-gradient-to-r from-slate-500/20 to-gray-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30'
  },
  'socks5': { 
    icon: '🔌', 
    color: 'text-gray-500', 
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'SOCKS5',
    style: 'bg-gradient-to-r from-lime-500/20 to-green-500/20 text-lime-600 dark:text-lime-400 border-lime-500/30'
  },
  'http': {
    icon: '🌐',
    color: 'text-green-500',
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'HTTP',
    style: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30'
  }
};

// 从URL获取协议类型
export const getProtocolFromUrl = (url) => {
  if (!url) return 'unknown';
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.startsWith('anytls://')) return 'anytls';
  if (lowerUrl.startsWith('hysteria2://') || lowerUrl.startsWith('hy2://')) return 'hysteria2';
  if (lowerUrl.startsWith('hysteria://') || lowerUrl.startsWith('hy://')) return 'hysteria';
  if (lowerUrl.startsWith('ssr://')) return 'ssr';
  if (lowerUrl.startsWith('tuic://')) return 'tuic';
  if (lowerUrl.startsWith('ss://')) return 'ss';
  if (lowerUrl.startsWith('vmess://')) return 'vmess';
  if (lowerUrl.startsWith('vless://')) return 'vless';
  if (lowerUrl.startsWith('trojan://')) return 'trojan';
  if (lowerUrl.startsWith('socks5://')) return 'socks5';
  if (lowerUrl.startsWith('http')) return 'http';
  
  return 'unknown';
};

// 获取协议信息
export const getProtocolInfo = (protocol) => {
  return PROTOCOL_MAP[protocol] || { 
    icon: '❓', 
    color: 'text-gray-500', 
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'LINK',
    style: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30'
  };
};
