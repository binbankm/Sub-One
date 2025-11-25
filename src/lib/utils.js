/**
 * 工具函数集合
 * 包含节点链接解析、数据处理等实用功能
 */
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