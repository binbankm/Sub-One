/**
 * 工具函数集合
 * 包含节点链接解析、数据处理等实用功能
 */

// 国家/地区代码到旗帜和中文名称的映射
export const COUNTRY_CODE_MAP = {
  'hk': ['🇭🇰', '香港'],
  'tw': ['🇹🇼', '台湾', '臺灣'],
  'sg': ['🇸🇬', '新加坡', '狮城'],
  'jp': ['🇯🇵', '日本'],
  'us': ['🇺🇸', '美国', '美國'],
  'kr': ['🇰🇷', '韩国', '韓國'],
  'gb': ['🇬🇧', '英国', '英國'],
  'de': ['🇩🇪', '德国', '德國'],
  'fr': ['🇫🇷', '法国', '法國'],
  'ca': ['🇨🇦', '加拿大'],
  'au': ['🇦🇺', '澳大利亚', '澳洲', '澳大利亞'],
  'cn': ['🇨🇳', '中国', '大陸', '内地'],
  'my': ['🇲🇾', '马来西亚', '馬來西亞'],
  'th': ['🇹🇭', '泰国', '泰國'],
  'vn': ['🇻🇳', '越南'],
  'ph': ['🇵🇭', '菲律宾', '菲律賓'],
  'id': ['🇮🇩', '印度尼西亚', '印尼'],
  'in': ['🇮🇳', '印度'],
  'pk': ['🇵🇰', '巴基斯坦'],
  'bd': ['🇧🇩', '孟加拉国', '孟加拉國'],
  'ae': ['🇦🇪', '阿联酋', '阿聯酋'],
  'sa': ['🇸🇦', '沙特阿拉伯'],
  'tr': ['🇹🇷', '土耳其'],
  'ru': ['🇷🇺', '俄罗斯', '俄羅斯'],
  'br': ['🇧🇷', '巴西'],
  'mx': ['🇲🇽', '墨西哥'],
  'ar': ['🇦🇷', '阿根廷'],
  'cl': ['🇨🇱', '智利'],
  'za': ['🇿🇦', '南非'],
  'eg': ['🇪🇬', '埃及'],
  'ng': ['🇳🇬', '尼日利亚', '尼日利亞'],
  'ke': ['🇰🇪', '肯尼亚', '肯尼亞'],
  'il': ['🇮🇱', '以色列'],
  'ir': ['🇮🇷', '伊朗'],
  'iq': ['🇮🇶', '伊拉克'],
  'ua': ['🇺🇦', '乌克兰', '烏克蘭'],
  'pl': ['🇵🇱', '波兰', '波蘭'],
  'cz': ['🇨🇿', '捷克'],
  'hu': ['🇭🇺', '匈牙利'],
  'ro': ['🇷🇴', '罗马尼亚', '羅馬尼亞'],
  'gr': ['🇬🇷', '希腊', '希臘'],
  'pt': ['🇵🇹', '葡萄牙'],
  'es': ['🇪🇸', '西班牙'],
  'it': ['🇮🇹', '意大利'],
  'nl': ['🇳🇱', '荷兰', '荷蘭'],
  'be': ['🇧🇪', '比利时', '比利時'],
  'se': ['🇸🇪', '瑞典'],
  'no': ['🇳🇴', '挪威'],
  'dk': ['🇩🇰', '丹麦', '丹麥'],
  'fi': ['🇫🇮', '芬兰', '芬蘭'],
  'ch': ['🇨🇭', '瑞士'],
  'at': ['🇦🇹', '奥地利', '奧地利'],
  'ie': ['🇮🇪', '爱尔兰', '愛爾蘭'],
  'nz': ['🇳🇿', '新西兰', '紐西蘭'],
};

export function extractNodeName(url) {
  if (!url) return '';

  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '';

  // 优先检查URL片段（#后面的内容）
  const hashIndex = trimmedUrl.indexOf('#');
  if (hashIndex !== -1 && hashIndex < trimmedUrl.length - 1) {
    try {
      return decodeURIComponent(trimmedUrl.substring(hashIndex + 1)).trim();
    } catch (e) {
      // 解码失败时静默处理
    }
  }

  // 检查协议
  const protocolIndex = trimmedUrl.indexOf('://');
  if (protocolIndex === -1) return '';

  const protocol = trimmedUrl.substring(0, protocolIndex);
  const mainPart = trimmedUrl.substring(protocolIndex + 3).split('#')[0];

  try {
    switch (protocol) {
      case 'vmess': {
        // 优化Base64解码
        const padded = mainPart.padEnd(mainPart.length + (4 - mainPart.length % 4) % 4, '=');
        const binaryString = atob(padded);

        // 优化字节转换
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const jsonString = new TextDecoder('utf-8').decode(bytes);
        const node = JSON.parse(jsonString);
        return node.ps || '';
      }

      case 'trojan':
      case 'vless': {
        const atIndex = mainPart.indexOf('@');
        if (atIndex === -1) return '';
        return mainPart.substring(atIndex + 1).split(':')[0] || '';
      }

      case 'ss': {
        const atIndex = mainPart.indexOf('@');
        if (atIndex !== -1) {
          return mainPart.substring(atIndex + 1).split(':')[0] || '';
        }

        try {
          const decodedSS = atob(mainPart);
          const ssDecodedAtIndex = decodedSS.indexOf('@');
          if (ssDecodedAtIndex !== -1) {
            return decodedSS.substring(ssDecodedAtIndex + 1).split(':')[0] || '';
          }
        } catch (e) {
          // Base64解码失败，静默处理
        }
        return '';
      }

      default:
        if (trimmedUrl.startsWith('http')) {
          try {
            return new URL(trimmedUrl).hostname;
          } catch (e) {
            return '';
          }
        }
        return '';
    }
  } catch (e) {
    console.error('Error extracting node name:', e);
    return trimmedUrl.substring(0, 50);
  }
}


/**
 * 为节点链接添加名称前缀
 * @param {string} link - 原始节点链接
 * @param {string} prefix - 要添加的前缀 (通常是订阅名)
 * @returns {string} - 添加了前缀的新链接
 */
export function prependNodeName(link, prefix) {
  if (!prefix || !link) return link;

  const hashIndex = link.lastIndexOf('#');

  // 如果链接没有 #fragment，直接添加前缀
  if (hashIndex === -1) {
    return `${link}#${encodeURIComponent(prefix)}`;
  }

  const baseLink = link.substring(0, hashIndex);
  const originalName = decodeURIComponent(link.substring(hashIndex + 1));

  // 如果原始名称已经包含了前缀，则不再重复添加
  if (originalName.startsWith(prefix)) {
    return link;
  }

  const newName = `${prefix} - ${originalName}`;
  return `${baseLink}#${encodeURIComponent(newName)}`;
}

/**
 * 从节点链接中提取主机和端口
 * @param {string} url - 节点链接
 * @returns {{host: string, port: string}}
 */
export function extractHostAndPort(url) {
  if (!url) return { host: '', port: '' };

  try {
    const protocolEndIndex = url.indexOf('://');
    if (protocolEndIndex === -1) throw new Error('无效的 URL：缺少协议头');

    const protocol = url.substring(0, protocolEndIndex);

    const fragmentStartIndex = url.indexOf('#');
    const mainPartEndIndex = fragmentStartIndex === -1 ? url.length : fragmentStartIndex;
    let mainPart = url.substring(protocolEndIndex + 3, mainPartEndIndex);

    // VMess 专用处理
    if (protocol === 'vmess') {
      const padded = mainPart.padEnd(mainPart.length + (4 - mainPart.length % 4) % 4, '=');
      const decodedString = atob(padded);
      const nodeConfig = JSON.parse(decodedString);
      return {
        host: nodeConfig.add || '',
        port: nodeConfig.port ? String(nodeConfig.port) : ''
      };
    }

    // SS/SSR Base64 解码处理
    let decoded = false;
    if ((protocol === 'ss' || protocol === 'ssr') && mainPart.indexOf('@') === -1) {
      try {
        const padded = mainPart.padEnd(mainPart.length + (4 - mainPart.length % 4) % 4, '=');
        mainPart = atob(padded);
        decoded = true;
      } catch (e) {
        // 解码失败则按原文处理
      }
    }

    // SSR 解码后专门处理
    if (protocol === 'ssr' && decoded) {
      const parts = mainPart.split(':');
      if (parts.length >= 2) {
        return { host: parts[0], port: parts[1] };
      }
    }

    // 通用解析逻辑 (适用于 VLESS, Trojan, SS原文, 解码后的SS等)
    const atIndex = mainPart.lastIndexOf('@');
    let serverPart = atIndex !== -1 ? mainPart.substring(atIndex + 1) : mainPart;

    // 移除查询参数和路径部分
    const queryIndex = serverPart.indexOf('?');
    if (queryIndex !== -1) {
      serverPart = serverPart.substring(0, queryIndex);
    }
    const pathIndex = serverPart.indexOf('/');
    if (pathIndex !== -1) {
      serverPart = serverPart.substring(0, pathIndex);
    }

    const lastColonIndex = serverPart.lastIndexOf(':');

    // 处理IPv6地址
    if (serverPart.startsWith('[') && serverPart.includes(']')) {
      const bracketEndIndex = serverPart.lastIndexOf(']');
      const host = serverPart.substring(1, bracketEndIndex);
      if (lastColonIndex > bracketEndIndex) {
        return { host, port: serverPart.substring(lastColonIndex + 1) };
      }
      return { host, port: '' };
    }

    // 处理IPv4地址
    if (lastColonIndex !== -1) {
      const potentialHost = serverPart.substring(0, lastColonIndex);
      const potentialPort = serverPart.substring(lastColonIndex + 1);
      if (potentialHost.includes(':')) { // 处理无端口的 IPv6
        return { host: serverPart, port: '' };
      }
      return { host: potentialHost, port: potentialPort };
    }

    if (serverPart) {
      return { host: serverPart, port: '' };
    }

    throw new Error('自定义解析失败');

  } catch (e) {
    console.error('提取主机和端口失败:', url, e);
    return { host: '', port: '' };
  }
}

/**
 * Detect region from node name
 * @param {string} name 
 * @returns {string}
 */
export function detectRegion(name) {
  if (!name) return '其他';
  const n = name.toUpperCase();

  for (const [code, info] of Object.entries(COUNTRY_CODE_MAP)) {
    // Check code itself (e.g. HK)
    if (n.includes(code.toUpperCase())) return info[1];

    // Check keywords (e.g. 香港, Hong Kong)
    // Skip the first element which is the flag emoji
    for (let i = 1; i < info.length; i++) {
      if (n.includes(info[i])) return info[1];
    }

    // Special case for full English names if needed, but usually covered by keywords or code
  }

  return '其他';
}

/**
 * Get ISO country code from region name
 * @param {string} region 
 * @returns {string|null}
 */
export function getRegionCode(region) {
  for (const [code, info] of Object.entries(COUNTRY_CODE_MAP)) {
    if (info[1] === region) return code;
  }
  return null;
}