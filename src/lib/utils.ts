/**
 * ==================== 实用工具函数模块 ====================
 * 
 * 功能说明：
 * - 提供节点链接解析和名称提取功能
 * - 支持多种代理协议（VMess, Trojan, VLESS, SS, SSR 等）
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
 * - http:// / https:// - HTTP 订阅链接（提取域名）
 * 
 * @param {string} url - 节点链接或订阅链接
 * @returns {string} 提取出的名称，失败返回空字符串或截断的 URL
 * 
 * @example
 * ```typescript
 * // VMess 协议
 * extractNodeName('vmess://xxxxx#香港节点') // => '香港节点'
 * 
 * // Trojan 协议
 * extractNodeName('trojan://password@example.com:443') // => 'example.com'
 * 
 * // HTTP 订阅
 * extractNodeName('https://sub.example.com/api/v1/sub') // => 'sub.example.com'
 * ```
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
  const protocol = trimmedUrl.substring(0, protocolIndex);
  // 提取主体部分（去除协议和 fragment）
  const mainPart = trimmedUrl.substring(protocolIndex + 3).split('#')[0];

  // ==================== 第三步：根据协议类型解析 ====================
  try {
    switch (protocol) {
      // ========== VMess 协议 ==========
      case 'vmess': {
        // VMess 配置使用 Base64 编码的 JSON 格式
        // 格式：vmess://base64EncodedJson

        // 修正 Base64 填充（确保长度是 4 的倍数）
        const padded = mainPart.padEnd(mainPart.length + (4 - mainPart.length % 4) % 4, '=');
        // 解码 Base64
        const binaryString = atob(padded);

        // 将二进制字符串转换为字节数组
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // 解码为 UTF-8 字符串
        const jsonString = new TextDecoder('utf-8').decode(bytes);
        // 解析 JSON 配置
        const node = JSON.parse(jsonString);
        // 返回 ps 字段（节点名称）
        return node.ps || '';
      }

      // ========== Trojan 和 VLESS 协议 ==========
      case 'trojan':
      case 'vless': {
        // 格式：trojan://password@host:port?params#name
        // 格式：vless://uuid@host:port?params#name

        // 查找 @ 符号位置（分隔密码/UUID 和服务器地址）
        const atIndex = mainPart.indexOf('@');
        if (atIndex === -1) return '';

        // 提取 @ 后面的主机部分（host:port）
        // 返回主机名（去除端口号）
        return mainPart.substring(atIndex + 1).split(':')[0] || '';
      }

      // ========== Shadowsocks 协议 ==========
      case 'ss': {
        // SS 有两种格式：
        // 1. 原始格式：ss://method:password@host:port
        // 2. Base64 格式：ss://base64EncodedConfig

        // 先尝试原始格式
        const atIndex = mainPart.indexOf('@');
        if (atIndex !== -1) {
          // 找到 @，说明是原始格式
          return mainPart.substring(atIndex + 1).split(':')[0] || '';
        }

        // 尝试 Base64 解码
        try {
          const decodedSS = atob(mainPart);
          // 在解码后的字符串中查找 @
          const ssDecodedAtIndex = decodedSS.indexOf('@');
          if (ssDecodedAtIndex !== -1) {
            return decodedSS.substring(ssDecodedAtIndex + 1).split(':')[0] || '';
          }
        } catch (e) {
          // Base64 解码失败，静默处理
        }
        return '';
      }

      // ========== 其他协议（HTTP/HTTPS） ==========
      default:
        // 如果是 HTTP 链接，提取域名
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
 * @deprecated 当前项目中未被直接调用
 * 
 * **现状说明：**
 * - 相同功能已在 `subscription-parser.ts` 的 `processNodes` 方法中实现
 * - 订阅解析时通过 `prependSubName` 选项批量处理节点前缀
 * - 此函数保留作为独立工具，供未来可能的单节点处理场景使用
 * 
 * **使用场景（潜在）：**
 * - 手动编辑单个节点时添加前缀
 * - 合并来自不同订阅的节点时标记来源
 * - 自定义节点处理流程
 * 
 * @param {string} link - 原始节点链接
 * @param {string} prefix - 要添加的前缀（通常是订阅名）
 * @returns {string} 添加了前缀的新链接
 * 
 * @example
 * ```typescript
 * const link = 'vmess://xxxxx#香港节点';
 * const newLink = prependNodeName(link, '我的订阅');
 * // 结果：'vmess://xxxxx#我的订阅 - 香港节点'
 * ```
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
 * 说明：
 * - 支持多种代理协议的主机端口解析
 * - 支持 IPv4 和 IPv6 地址格式
 * - 包含针对不同协议的特殊处理逻辑
 * 
 * 支持的协议：
 * - vmess:// - 从 JSON 配置中提取 add 和 port 字段
 * - ss:// / ssr:// - 支持 Base64 编码和原始格式
 * - vless:// / trojan:// - 从 @ 后面提取 host:port
 * 
 * @param {string} url - 节点链接
 * @returns {{host: string, port: string}} 包含主机和端口的对象
 * 
 * @example
 * ```typescript
 * // IPv4 地址
 * extractHostAndPort('trojan://pass@192.168.1.1:443')
 * // => { host: '192.168.1.1', port: '443' }
 * 
 * // IPv6 地址
 * extractHostAndPort('trojan://pass@[2001:db8::1]:443')
 * // => { host: '2001:db8::1', port: '443' }
 * 
 * // 域名
 * extractHostAndPort('trojan://pass@example.com:443')
 * // => { host: 'example.com', port: '443' }
 * ```
 */
export function extractHostAndPort(url: string): { host: string; port: string } {
  // 处理空输入
  if (!url) return { host: '', port: '' };

  try {
    // ==================== 第一步：提取协议和主体部分 ====================
    const protocolEndIndex = url.indexOf('://');
    if (protocolEndIndex === -1) throw new Error('无效的 URL：缺少协议头');

    // 提取协议名称
    const protocol = url.substring(0, protocolEndIndex);

    // 提取主体部分（去除 fragment）
    const fragmentStartIndex = url.indexOf('#');
    const mainPartEndIndex = fragmentStartIndex === -1 ? url.length : fragmentStartIndex;
    let mainPart = url.substring(protocolEndIndex + 3, mainPartEndIndex);

    // ==================== VMess 专用处理 ====================
    if (protocol === 'vmess') {
      // VMess 使用 Base64 编码的 JSON 配置
      const padded = mainPart.padEnd(mainPart.length + (4 - mainPart.length % 4) % 4, '=');
      const decodedString = atob(padded);
      const nodeConfig = JSON.parse(decodedString);
      return {
        host: nodeConfig.add || '',  // add 字段存储主机地址
        port: nodeConfig.port ? String(nodeConfig.port) : ''  // port 字段存储端口号
      };
    }

    // ==================== SS/SSR Base64 解码处理 ====================
    let decoded = false;
    if ((protocol === 'ss' || protocol === 'ssr') && mainPart.indexOf('@') === -1) {
      // 如果没有 @，可能是 Base64 编码格式
      try {
        const padded = mainPart.padEnd(mainPart.length + (4 - mainPart.length % 4) % 4, '=');
        mainPart = atob(padded);
        decoded = true;
      } catch (e) {
        // 解码失败则按原文处理
      }
    }

    // ==================== SSR 解码后专门处理 ====================
    if (protocol === 'ssr' && decoded) {
      // SSR 解码后格式：host:port:protocol:method:obfs:password
      const parts = mainPart.split(':');
      if (parts.length >= 2) {
        return { host: parts[0], port: parts[1] };
      }
    }

    // ==================== 通用解析逻辑 ====================
    // 适用于 VLESS, Trojan, SS原文, 解码后的SS等

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

      // 如果主机部分包含多个冒号，可能是无端口的 IPv6 地址
      if (potentialHost.includes(':')) {
        return { host: serverPart, port: '' };
      }

      return { host: potentialHost, port: potentialPort };
    }

    // 没有端口号的情况
    if (serverPart) {
      return { host: serverPart, port: '' };
    }

    // 无法解析的情况
    throw new Error('自定义解析失败');

  } catch (e) {
    // 错误处理：记录日志并返回空值
    console.error('提取主机和端口失败:', url, e);
    return { host: '', port: '' };
  }
}
