/**
 * ==================== 实用工具函数模块 ====================
 * 
 * 功能说明：
 * - 提供节点链接解析和名称提取功能
 * - 支持多种代理协议（VMess, Trojan, VLESS, SS, SSR, Hysteria, TUIC 等）
 * - 提供主机和端口提取功能
 * - 提供节点名称前缀添加功能
 * 
 * =========================================================
 */

// ==================== 节点名称提取 ====================

/**
 * 从节点 URL 中提取节点名称
 * 
 * 说明：
 * - 支持多种代理协议的解析
 * - 优先从 URL fragment（#后面的部分）提取名称
 * - 针对不同协议采用不同的解析策略
 * - 包含完整的错误处理机制
 * 
 * 支持的协议：
 * - vmess:// - V2Ray VMess 协议（Base64 编码的 JSON）
 * - vless:// - V2Ray VLESS 协议
 * - trojan:// - Trojan 协议
 * - ss:// - Shadowsocks 协议（支持 Base64 编码）
 * - ssr:// - ShadowsocksR 协议
 * - hysteria:// (hy1), hysteria2:// (hy2) - Hysteria 协议
 * - tuic:// - TUIC 协议
 * - anytls:// - AnyTLS 协议
 * - socks5:// - SOCKS5 协议
 * - snell:// - Snell 协议
 * - wireguard:// (wg) - WireGuard 协议
 * - http:// / https:// - HTTP 订阅链接（提取域名）
 * 
 * @param {string} url - 节点链接或订阅链接
 * @returns {string} 提取出的名称，失败返回空字符串或截断的 URL
 */
export function extractNodeName(url: string): string {
  // 处理空输入
  if (!url) return '';

  // 去除首尾空白
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '';

  // ==================== 第一步：检查 URL Fragment ====================
  // URL fragment 是 # 后面的部分，通常包含节点的自定义名称
  const hashIndex = trimmedUrl.indexOf('#');
  if (hashIndex !== -1 && hashIndex < trimmedUrl.length - 1) {
    try {
      // 提取并解码 fragment（处理 URL 编码的中文字符）
      return decodeURIComponent(trimmedUrl.substring(hashIndex + 1)).trim();
    } catch (e) {
      // 解码失败时静默处理，继续后续逻辑
    }
  }

  // ==================== 第二步：检查协议 ====================
  const protocolIndex = trimmedUrl.indexOf('://');
  if (protocolIndex === -1) return ''; // 无效的 URL 格式

  // 提取协议名称（如：vmess, trojan, ss 等）
  const protocol = trimmedUrl.substring(0, protocolIndex).toLowerCase();
  // 提取主体部分（去除协议和 fragment）
  const mainPart = trimmedUrl.substring(protocolIndex + 3).split('#')[0];

  // ==================== 第三步：根据协议类型解析 ====================
  try {
    switch (protocol) {
      // ========== VMess 协议 ==========
      case 'vmess': {
        try {
          // VMess 配置使用 Base64 编码的 JSON 格式
          // 格式：vmess://base64EncodedJson

          // 修正 Base64 填充（确保长度是 4 的倍数）
          const padded = mainPart.padEnd(mainPart.length + (4 - mainPart.length % 4) % 4, '=');
          // 解码 Base64，移除可能存在的空白符
          const binaryString = atob(padded.replace(/\s/g, ''));

          // 解析 JSON 配置
          // 处理 UTF-8 字符
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const jsonString = new TextDecoder('utf-8').decode(bytes);

          const node = JSON.parse(jsonString);
          // 返回 ps 字段（节点名称）
          return node.ps || '';
        } catch (e) {
          // 解析失败，无法提取名称
          return '';
        }
      }

      // ========== 类 URL 格式协议 (Trojan, VLESS, Hysteria, TUIC, Socks5, Snell 等) ==========
      case 'trojan':
      case 'vless':
      case 'hysteria':
      case 'hy1':
      case 'hysteria2':
      case 'hy2':
      case 'tuic':
      case 'socks5':
      case 'anytls':
      case 'snell': {
        // 格式通常为：protocol://user@host:port?params#name
        // 或者 protocol://host:port#name (无认证)

        // 查找 @ 符号位置
        const atIndex = mainPart.lastIndexOf('@');

        let hostPortPart = mainPart;
        if (atIndex !== -1) {
          hostPortPart = mainPart.substring(atIndex + 1);
        }

        // 提取主机名（去除端口号和之前的 ?）
        // 移除参数
        const qIdx = hostPortPart.indexOf('?');
        if (qIdx !== -1) {
          hostPortPart = hostPortPart.substring(0, qIdx);
        }

        // 移除路径
        const slashIdx = hostPortPart.indexOf('/');
        if (slashIdx !== -1) {
          hostPortPart = hostPortPart.substring(0, slashIdx);
        }

        // 提取 Host
        // IPv6
        if (hostPortPart.startsWith('[')) {
          const bracketEnd = hostPortPart.indexOf(']');
          if (bracketEnd !== -1) {
            return hostPortPart.substring(1, bracketEnd);
          }
        }

        // IPv4 或 域名
        const colonIndex = hostPortPart.lastIndexOf(':');
        if (colonIndex !== -1) {
          return hostPortPart.substring(0, colonIndex);
        }

        return hostPortPart || '';
      }

      // ========== Shadowsocks 协议 ==========
      case 'ss':
      case 'ssr': {
        // SS: ss://method:password@host:port (legacy) 或 ss://base64 (SIP002)
        // SSR: ssr://base64

        if (protocol === 'ss') {
          // 检查是否包含 @，如果有可能是明文格式
          const atIndex = mainPart.lastIndexOf('@');
          if (atIndex !== -1) {
            // 明文格式：提取 @ 后面的 host
            const hostPart = mainPart.substring(atIndex + 1).split(':')[0];
            return hostPart || '';
          }
        }

        // Base64 格式尝试解码
        // 注意：提取名称通常指望 #remark，如果这里通过 Base64 解析，
        // SS SIP002 Base64 解码后的格式是 method:password@host:port
        // 我们尝试从中提取 host
        try {
          const cleanBase64 = mainPart.replace(/[\s-_]/g, (c) => c === '-' ? '+' : '/');
          const padded = cleanBase64.padEnd(cleanBase64.length + (4 - cleanBase64.length % 4) % 4, '=');
          const decoded = atob(padded);

          // 如果是 SSR
          if (protocol === 'ssr') {
            // ssr://server:port:protocol:method:obfs:password_base64/?params_base64
            const parts = decoded.split(':');
            if (parts.length >= 1) return parts[0]; // Server IP/Domain
            return '';
          }

          // 如果是 SS
          const atIdx = decoded.lastIndexOf('@');
          if (atIdx !== -1) {
            const afterAt = decoded.substring(atIdx + 1);
            return afterAt.split(':')[0] || '';
          }
        } catch (e) {
          // 失败忽略
        }
        return '';
      }

      // ========== WireGuard 协议 ==========
      case 'wireguard':
      case 'wg': {
        // 格式 wg://privateKey@host:port? publicKey=...
        const atIndex = mainPart.lastIndexOf('@');
        if (atIndex !== -1) {
          const afterAt = mainPart.substring(atIndex + 1);
          // 去除 ? 后面参数
          return afterAt.split('?')[0].split(':')[0] || '';
        }
        // 这里逻辑可能不完善，因为 WG 格式比较多样，如果没有 @ 很难提取 HOST
        return '';
      }

      // ========== HTTP/HTTPS 订阅链接 ==========
      case 'http':
      case 'https': {
        try {
          return new URL(trimmedUrl).hostname;
        } catch (e) {
          return '';
        }
      }

      default:
        // 未知协议，尝试将其视为 URL 并提取域名
        try {
          // 有些时候虽然协议头不认识，但结构类似 URL
          const atIndex = mainPart.lastIndexOf('@');
          const hostPart = atIndex !== -1 ? mainPart.substring(atIndex + 1) : mainPart;
          return hostPart.split(':')[0].split('?')[0].split('/')[0];
        } catch {
          return '';
        }
    }
  } catch (e) {
    // 解析失败时的错误处理
    console.error('提取节点名称时出错:', e);
    // 返回截断的 URL（最多 50 个字符）作为备用名称
    return trimmedUrl.substring(0, 50);
  }
}

// ==================== 节点名称前缀添加 ====================

/**
 * 为节点链接添加名称前缀
 * 
 * @param {string} link - 原始节点链接
 * @param {string} prefix - 要添加的前缀（通常是订阅名）
 * @returns {string} 添加了前缀的新链接
 */
export function prependNodeName(link: string, prefix: string): string {
  // 参数验证
  if (!prefix || !link) return link;

  // 查找 URL fragment 的位置（# 符号）
  const hashIndex = link.lastIndexOf('#');

  // 如果链接没有 #fragment，直接在末尾添加前缀
  if (hashIndex === -1) {
    return `${link}#${encodeURIComponent(prefix)}`;
  }

  // 分离基础链接和原始名称
  const baseLink = link.substring(0, hashIndex);
  const originalName = decodeURIComponent(link.substring(hashIndex + 1));

  // 如果原始名称已经包含了前缀，则不再重复添加
  if (originalName.startsWith(prefix)) {
    return link;
  }

  // 组合新名称：前缀 - 原始名称
  const newName = `${prefix} - ${originalName}`;
  // 返回新链接（对名称进行 URL 编码）
  return `${baseLink}#${encodeURIComponent(newName)}`;
}

// ==================== 主机和端口提取 ====================

/**
 * 从节点链接中提取主机和端口
 * 
 * 支持的协议：
 * - vmess, vless, trojan, hysteria(2), tuic, socks5, http, snell, ss, ssr, wireguard等
 * 
 * @param {string} url - 节点链接
 * @returns {{host: string, port: string}} 包含主机和端口的对象
 */
export function extractHostAndPort(url: string): { host: string; port: string } {
  // 处理空输入
  if (!url) return { host: '', port: '' };

  try {
    const protocolEndIndex = url.indexOf('://');
    if (protocolEndIndex === -1) throw new Error('无效的 URL：缺少协议头');

    const protocol = url.substring(0, protocolEndIndex).toLowerCase();
    const fragmentStartIndex = url.indexOf('#');
    const mainPartEndIndex = fragmentStartIndex === -1 ? url.length : fragmentStartIndex;
    let mainPart = url.substring(protocolEndIndex + 3, mainPartEndIndex);

    // ==================== VMess 专用处理 ====================
    if (protocol === 'vmess') {
      try {
        const cleanBase64 = mainPart.replace(/[\s-_]/g, (c) => c === '-' ? '+' : '/');
        const padded = cleanBase64.padEnd(cleanBase64.length + (4 - cleanBase64.length % 4) % 4, '=');
        const decodedString = atob(padded);
        const nodeConfig = JSON.parse(decodedString);
        return {
          host: nodeConfig.add || '',
          port: nodeConfig.port ? String(nodeConfig.port) : ''
        };
      } catch (e) {
        return { host: '', port: '' };
      }
    }

    // ==================== SS/SSR Base64 解码处理 ====================
    let decoded = false;
    if ((protocol === 'ss' || protocol === 'ssr') && mainPart.indexOf('@') === -1) {
      try {
        const cleanBase64 = mainPart.replace(/[\s-_]/g, (c) => c === '-' ? '+' : '/');
        const padded = cleanBase64.padEnd(cleanBase64.length + (4 - cleanBase64.length % 4) % 4, '=');
        mainPart = atob(padded);
        decoded = true;
      } catch (e) {
        // 解码失败则按原文处理
      }
    }

    // ==================== SSR 解码后专门处理 ====================
    if (protocol === 'ssr' && decoded) {
      // ssr://server:port:protocol:method:obfs:password_base64/...
      const parts = mainPart.split(':');
      if (parts.length >= 2) {
        return { host: parts[0], port: parts[1] };
      }
    }

    // ==================== 通用解析逻辑 (类 URL 格式) ====================
    // 适用于 VLESS, Trojan, Hysteria, TUIC, Socks5, WireGuard, Snell, SS原文, 解码后的SS等

    // 查找 @ 符号（分隔认证信息和服务器地址）
    const atIndex = mainPart.lastIndexOf('@');
    let serverPart = atIndex !== -1 ? mainPart.substring(atIndex + 1) : mainPart;

    // 移除查询参数（? 后面的部分）
    const queryIndex = serverPart.indexOf('?');
    if (queryIndex !== -1) {
      serverPart = serverPart.substring(0, queryIndex);
    }

    // 移除路径部分（/ 后面的部分）
    const pathIndex = serverPart.indexOf('/');
    if (pathIndex !== -1) {
      serverPart = serverPart.substring(0, pathIndex);
    }

    // 查找最后一个冒号（用于分隔主机和端口）
    const lastColonIndex = serverPart.lastIndexOf(':');

    // ==================== 处理 IPv6 地址 ====================
    // IPv6 格式：[2001:db8::1]:443
    if (serverPart.startsWith('[') && serverPart.includes(']')) {
      const bracketEndIndex = serverPart.lastIndexOf(']');
      const host = serverPart.substring(1, bracketEndIndex);  // 提取括号内的 IPv6 地址

      // 检查是否有端口号（在 ] 后面）
      if (lastColonIndex > bracketEndIndex) {
        return { host, port: serverPart.substring(lastColonIndex + 1) };
      }
      return { host, port: '' };
    }

    // ==================== 处理 IPv4 地址和域名 ====================
    if (lastColonIndex !== -1) {
      const potentialHost = serverPart.substring(0, lastColonIndex);
      const potentialPort = serverPart.substring(lastColonIndex + 1);

      // 如果主机部分包含多个冒号，可能是无端口的 IPv6 地址（但没有带括号，不规范，暂且原样返回）
      if (potentialHost.includes(':')) {
        return { host: serverPart, port: '' };
      }

      return { host: potentialHost, port: potentialPort };
    }

    // 没有端口号的情况
    if (serverPart) {
      return { host: serverPart, port: '' };
    }

    return { host: '', port: '' };

  } catch (e) {
    console.error('提取主机和端口失败:', url, e);
    return { host: '', port: '' };
  }
}
