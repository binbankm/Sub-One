/**
 * @file 工具函数集合
 * @description 提供节点链接解析、名称处理和主机端口提取等功能
 */

/**
 * 从节点URL中提取节点名称
 * @param {string} url - 节点链接URL
 * @returns {string} - 提取的节点名称，如果无法提取则返回空字符串
 */
export function extractNodeName(url) {
  // 输入验证
  if (!url || typeof url !== 'string') return '';
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '';
  
  try {
    // 优先检查URL片段（#后面的内容）
    const hashIndex = trimmedUrl.indexOf('#');
    if (hashIndex !== -1 && hashIndex < trimmedUrl.length - 1) {
      return decodeURIComponent(trimmedUrl.substring(hashIndex + 1)).trim();
    }
    
    // 检查协议
    const protocolIndex = trimmedUrl.indexOf('://');
    if (protocolIndex === -1) return '';
    
    const protocol = trimmedUrl.substring(0, protocolIndex);
    const mainPart = trimmedUrl.substring(protocolIndex + 3).split('#')[0];
    
    switch (protocol) {
      case 'vmess':
        return extractVmessNodeName(mainPart);
        
      case 'trojan':
      case 'vless':
        return extractStandardNodeName(mainPart);
        
      case 'ss':
        return extractSSNodeName(mainPart);
        
      default:
        return extractHttpNodeName(trimmedUrl);
    }
  } catch (e) {
    console.warn('节点名称提取失败:', e);
    return trimmedUrl.substring(0, 50);
  }
}

/**
 * 提取VMess节点名称
 * @param {string} mainPart - VMess链接的主要部分
 * @returns {string} - 提取的节点名称
 * @private
 */
function extractVmessNodeName(mainPart) {
  try {
    // Base64解码优化
    const padded = mainPart.padEnd(mainPart.length + (4 - mainPart.length % 4) % 4, '=');
    const jsonString = decodeBase64ToUtf8(padded);
    const node = JSON.parse(jsonString);
    return node.ps || '';
  } catch (e) {
    console.error('VMess链接解码失败:', e);
    return '';
  }
}

/**
 * 提取Trojan和VLESS节点名称
 * @param {string} mainPart - 节点链接的主要部分
 * @returns {string} - 提取的节点名称
 * @private
 */
function extractStandardNodeName(mainPart) {
  const atIndex = mainPart.indexOf('@');
  if (atIndex === -1) return '';
  return mainPart.substring(atIndex + 1).split(':')[0] || '';
}

/**
 * 提取SS节点名称
 * @param {string} mainPart - SS链接的主要部分
 * @returns {string} - 提取的节点名称
 * @private
 */
function extractSSNodeName(mainPart) {
  // 直接查找@符号
  const atIndex = mainPart.indexOf('@');
  if (atIndex !== -1) {
    return mainPart.substring(atIndex + 1).split(':')[0] || '';
  }
  
  // 尝试Base64解码
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

/**
 * 提取HTTP节点名称（使用主机名）
 * @param {string} url - HTTP节点链接
 * @returns {string} - 提取的节点名称
 * @private
 */
function extractHttpNodeName(url) {
  if (!url.startsWith('http')) return '';
  
  try {
    return new URL(url).hostname;
  } catch (e) {
    console.warn('HTTP URL解析失败:', e);
    return '';
  }
}

/**
 * 为节点链接添加名称前缀
 * @param {string} link - 原始节点链接
 * @param {string} prefix - 要添加的前缀 (通常是订阅名)
 * @returns {string} - 添加了前缀的新链接
 */
export function prependNodeName(link, prefix) {
  // 输入验证
  if (!prefix || !link || typeof prefix !== 'string' || typeof link !== 'string') return link;
  
  const hashIndex = link.lastIndexOf('#');
  
  // 如果链接没有 #fragment，直接添加前缀
  if (hashIndex === -1) {
    return `${link}#${encodeURIComponent(prefix)}`;
  }
  
  // 提取基础链接和原始名称
  const baseLink = link.substring(0, hashIndex);
  const originalName = decodeURIComponent(link.substring(hashIndex + 1));
  
  // 避免重复添加前缀
  if (originalName.startsWith(prefix)) {
    return link;
  }
  
  // 组合新名称
  const newName = `${prefix} - ${originalName}`;
  return `${baseLink}#${encodeURIComponent(newName)}`;
}

/**
 * 从节点链接中提取主机和端口
 * @param {string} url - 节点链接
 * @returns {{host: string, port: string}} - 包含主机和端口的对象
 */
export function extractHostAndPort(url) {
  // 输入验证
  if (!url || typeof url !== 'string') return { host: '', port: '' };
  
  try {
    const protocolEndIndex = url.indexOf('://');
    if (protocolEndIndex === -1) throw new Error('无效的 URL：缺少协议头');
    
    const protocol = url.substring(0, protocolEndIndex);
    
    // 移除协议和fragment部分
    const fragmentStartIndex = url.indexOf('#');
    const mainPartEndIndex = fragmentStartIndex === -1 ? url.length : fragmentStartIndex;
    let mainPart = url.substring(protocolEndIndex + 3, mainPartEndIndex);
    
    // 根据协议类型选择不同的提取方法
    switch (protocol) {
      case 'vmess':
        return extractVmessHostAndPort(mainPart);
      case 'ssr':
        return extractSSRHostAndPort(mainPart);
      case 'ss':
        return extractSSHostAndPort(mainPart);
      case 'trojan':
      case 'vless':
      case 'http':
      case 'https':
        return extractStandardHostAndPort(mainPart);
      default:
        throw new Error(`不支持的协议类型: ${protocol}`);
    }
  } catch (e) {
    console.error('提取主机和端口失败:', e.message, url);
    return { host: '解析失败', port: 'N/A' };
  }
}

/**
 * 提取VMess节点的主机和端口
 * @param {string} mainPart - VMess链接的主要部分
 * @returns {{host: string, port: string}} - 主机和端口对象
 * @private
 */
function extractVmessHostAndPort(mainPart) {
  const jsonString = decodeBase64ToUtf8(mainPart);
  const nodeConfig = JSON.parse(jsonString);
  return {
    host: nodeConfig.add || '',
    port: String(nodeConfig.port || '')
  };
}

/**
 * 提取SSR节点的主机和端口
 * @param {string} mainPart - SSR链接的主要部分
 * @returns {{host: string, port: string}} - 主机和端口对象
 * @private
 */
function extractSSRHostAndPort(mainPart) {
  try {
    // SSR链接通常需要Base64解码
    const decodedPart = atob(mainPart);
    const parts = decodedPart.split(':');
    if (parts.length >= 2) {
      return { host: parts[0], port: parts[1] };
    }
  } catch (e) {
    console.warn('SSR解码失败，尝试直接解析:', e);
  }
  return extractStandardHostAndPort(mainPart);
}

/**
 * 提取SS节点的主机和端口
 * @param {string} mainPart - SS链接的主要部分
 * @returns {{host: string, port: string}} - 主机和端口对象
 * @private
 */
function extractSSHostAndPort(mainPart) {
  // 尝试解码SS链接
  if (mainPart.indexOf('@') === -1) {
    try {
      const decodedPart = atob(mainPart);
      return extractStandardHostAndPort(decodedPart);
    } catch (e) {
      // 解码失败，使用原始部分
    }
  }
  return extractStandardHostAndPort(mainPart);
}

/**
 * 提取标准协议节点的主机和端口
 * @param {string} mainPart - 节点链接的主要部分
 * @returns {{host: string, port: string}} - 主机和端口对象
 * @private
 */
function extractStandardHostAndPort(mainPart) {
  // 处理查询参数和路径
  const queryIndex = mainPart.indexOf('?');
  const pathIndex = mainPart.indexOf('/');
  
  let serverPart = mainPart;
  if (pathIndex !== -1) {
    serverPart = mainPart.substring(0, pathIndex);
  }
  if (queryIndex !== -1) {
    serverPart = serverPart.substring(0, queryIndex);
  }
  
  // 处理@符号（SS/Trojan/VLESS格式）
  const atIndex = serverPart.lastIndexOf('@');
  if (atIndex !== -1) {
    serverPart = serverPart.substring(atIndex + 1);
  }
  
  // 处理IPv6格式
  if (serverPart.startsWith('[') && serverPart.includes(']')) {
    const bracketEndIndex = serverPart.lastIndexOf(']');
    const host = serverPart.substring(1, bracketEndIndex);
    const lastColonIndex = serverPart.lastIndexOf(':');
    
    if (lastColonIndex > bracketEndIndex) {
      const port = serverPart.substring(lastColonIndex + 1);
      return { host, port };
    }
    return { host, port: '' };
  }
  
  // 处理IPv4格式
  const lastColonIndex = serverPart.lastIndexOf(':');
  if (lastColonIndex !== -1) {
    const potentialHost = serverPart.substring(0, lastColonIndex);
    const potentialPort = serverPart.substring(lastColonIndex + 1);
    
    // 检查是否为纯IPv4或域名
    if (!potentialHost.includes(':')) {
      return { host: potentialHost, port: potentialPort };
    }
  }
  
  // 默认返回
  return { host: serverPart || 'unknown', port: '' };
}

/**
 * Base64解码并转换为UTF-8字符串
 * @param {string} base64String - Base64编码的字符串
 * @returns {string} - UTF-8解码后的字符串
 * @private
 */
function decodeBase64ToUtf8(base64String) {
  try {
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    
    // 优化字符转换性能
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    console.error('Base64解码失败:', e);
    throw new Error('Base64解码错误');
  }
}