import yaml from 'js-yaml';

/**
 * 强大的订阅解析器
 * 支持多种格式：Base64、纯文本、YAML、Clash配置等
 */
export class SubscriptionParser {
  constructor() {
    this.supportedProtocols = [
      'ss', 'ssr', 'vmess', 'vless', 'trojan', 
      'hysteria', 'hysteria2', 'hy', 'hy2', 
      'tuic', 'anytls', 'socks5'
    ];
  }

  /**
   * 解析订阅内容
   * @param {string} content - 订阅内容
   * @param {string} subscriptionName - 订阅名称
   * @returns {Array} 解析后的节点列表
   */
  parse(content, subscriptionName = '') {
    if (!content || typeof content !== 'string') {
      return [];
    }

    // 尝试不同的解析方法
    const methods = [
      () => this.parseBase64(content, subscriptionName),
      () => this.parseYAML(content, subscriptionName),
      () => this.parseClashConfig(content, subscriptionName),
      () => this.parsePlainText(content, subscriptionName)
    ];

    for (const method of methods) {
      try {
        const result = method();
        if (result && result.length > 0) {
          console.log(`解析成功，使用 ${method.name} 方法，找到 ${result.length} 个节点`);
          return result;
        }
      } catch (error) {
        console.warn(`解析方法 ${method.name} 失败:`, error);
        continue;
      }
    }

    return [];
  }

  /**
   * 解析Base64编码的内容
   */
  parseBase64(content, subscriptionName) {
    const cleanedContent = content.replace(/\s/g, '');
    
    // 检查是否为Base64编码
    if (!/^[A-Za-z0-9+\/=]+$/.test(cleanedContent) || cleanedContent.length < 20) {
      throw new Error('不是有效的Base64编码');
    }

    try {
      const decodedContent = atob(cleanedContent);
      const decodedLines = decodedContent.split(/\r?\n/).filter(line => line.trim() !== '');
      
      // 检查解码后的内容是否包含节点链接
      if (!decodedLines.some(line => this.isNodeUrl(line))) {
        throw new Error('Base64解码后未找到有效的节点链接');
      }

      return this.parseNodeLines(decodedLines, subscriptionName);
    } catch (error) {
      throw new Error(`Base64解码失败: ${error.message}`);
    }
  }

  /**
   * 解析YAML格式
   */
  parseYAML(content, subscriptionName) {
    try {
      const parsed = yaml.load(content);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('无效的YAML格式');
      }

      // 检查是否为Clash配置
      if (parsed.proxies && Array.isArray(parsed.proxies)) {
        return this.parseClashProxies(parsed.proxies, subscriptionName);
      }

      // 检查是否为其他YAML格式
      if (parsed.nodes && Array.isArray(parsed.nodes)) {
        return this.parseGenericNodes(parsed.nodes, subscriptionName);
      }

      throw new Error('不支持的YAML格式');
    } catch (error) {
      throw new Error(`YAML解析失败: ${error.message}`);
    }
  }

  /**
   * 解析Clash配置文件
   */
  parseClashConfig(content, subscriptionName) {
    try {
      const parsed = yaml.load(content);
      if (!parsed || !parsed.proxies || !Array.isArray(parsed.proxies)) {
        throw new Error('不是有效的Clash配置');
      }

      return this.parseClashProxies(parsed.proxies, subscriptionName);
    } catch (error) {
      throw new Error(`Clash配置解析失败: ${error.message}`);
    }
  }

  /**
   * 解析纯文本格式
   */
  parsePlainText(content, subscriptionName) {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    const nodeLines = lines.filter(line => this.isNodeUrl(line));
    
    if (nodeLines.length === 0) {
      throw new Error('未找到有效的节点链接');
    }

    return this.parseNodeLines(nodeLines, subscriptionName);
  }

  /**
   * 解析Clash代理配置
   */
  parseClashProxies(proxies, subscriptionName) {
    const nodes = [];

    for (const proxy of proxies) {
      if (!proxy || typeof proxy !== 'object') continue;

      try {
        const nodeUrl = this.convertClashProxyToUrl(proxy);
        if (nodeUrl) {
          nodes.push({
            id: crypto.randomUUID(),
            name: proxy.name || '未命名节点',
            url: nodeUrl,
            protocol: proxy.type?.toLowerCase() || 'unknown',
            enabled: true,
            type: 'subscription',
            subscriptionName: subscriptionName,
            originalProxy: proxy // 保留原始配置
          });
        }
      } catch (error) {
        console.warn(`解析代理配置失败:`, proxy, error);
        continue;
      }
    }

    return nodes;
  }

  /**
   * 将Clash代理配置转换为节点URL
   */
  convertClashProxyToUrl(proxy) {
    const type = proxy.type?.toLowerCase();
    const server = proxy.server;
    const port = proxy.port;

    if (!server || !port) {
      return null;
    }

    switch (type) {
      case 'vmess':
        return this.buildVmessUrl(proxy);
      case 'vless':
        return this.buildVlessUrl(proxy);
      case 'trojan':
        return this.buildTrojanUrl(proxy);
      case 'ss':
        return this.buildShadowsocksUrl(proxy);
      case 'ssr':
        return this.buildShadowsocksRUrl(proxy);
      case 'hysteria':
      case 'hysteria2':
        return this.buildHysteriaUrl(proxy);
      case 'tuic':
        return this.buildTUICUrl(proxy);
      case 'socks5':
        return this.buildSocks5Url(proxy);
      default:
        console.warn(`不支持的代理类型: ${type}`);
        return null;
    }
  }

  /**
   * 构建VMess URL
   */
  buildVmessUrl(proxy) {
    const config = {
      v: '2',
      ps: proxy.name || 'VMess节点',
      add: proxy.server,
      port: proxy.port,
      id: proxy.uuid,
      aid: proxy.alterId || 0,
      net: proxy.network || 'tcp',
      type: proxy.type || 'none',
      host: proxy['ws-opts']?.headers?.Host || proxy.host || '',
      path: proxy['ws-opts']?.path || proxy.path || '',
      tls: proxy.tls || 'none'
    };

    const jsonStr = JSON.stringify(config);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return `vmess://${base64}`;
  }

  /**
   * 构建VLESS URL
   */
  buildVlessUrl(proxy) {
    let url = `vless://${proxy.uuid}@${proxy.server}:${proxy.port}`;
    
    // 添加传输参数
    if (proxy.network && proxy.network !== 'tcp') {
      url += `?type=${proxy.network}`;
      
      if (proxy.network === 'ws') {
        if (proxy['ws-opts']?.path) {
          url += `&path=${encodeURIComponent(proxy['ws-opts'].path)}`;
        }
        if (proxy['ws-opts']?.headers?.Host) {
          url += `&host=${proxy['ws-opts'].headers.Host}`;
        }
      }
    }

    // 添加TLS参数
    if (proxy.tls === 'tls') {
      url += `${url.includes('?') ? '&' : '?'}security=tls`;
      if (proxy.sni) {
        url += `&sni=${proxy.sni}`;
      }
    }

    // 添加名称
    if (proxy.name) {
      url += `#${encodeURIComponent(proxy.name)}`;
    }

    return url;
  }

  /**
   * 构建Trojan URL
   */
  buildTrojanUrl(proxy) {
    let url = `trojan://${proxy.password}@${proxy.server}:${proxy.port}`;
    
    if (proxy.sni) {
      url += `?sni=${proxy.sni}`;
    }
    
    if (proxy.name) {
      url += `#${encodeURIComponent(proxy.name)}`;
    }

    return url;
  }

  /**
   * 构建Shadowsocks URL
   */
  buildShadowsocksUrl(proxy) {
    const method = proxy.cipher;
    const password = proxy.password;
    const server = proxy.server;
    const port = proxy.port;

    const auth = `${method}:${password}@${server}:${port}`;
    const base64 = btoa(auth);
    let url = `ss://${base64}`;

    if (proxy.name) {
      url += `#${encodeURIComponent(proxy.name)}`;
    }

    return url;
  }

  /**
   * 构建ShadowsocksR URL
   */
  buildShadowsocksRUrl(proxy) {
    // SSR URL格式比较复杂，这里提供基础实现
    const config = [
      proxy.server,
      proxy.port,
      proxy.protocol || 'origin',
      proxy.cipher,
      proxy.obfs || 'plain',
      btoa(proxy.password)
    ];

    const query = new URLSearchParams();
    if (proxy['protocol-param']) {
      query.set('protoparam', btoa(proxy['protocol-param']));
    }
    if (proxy['obfs-param']) {
      query.set('obfsparam', btoa(proxy['obfs-param']));
    }
    if (proxy.name) {
      query.set('remarks', btoa(proxy.name));
    }

    const base64 = btoa(config.join(':'));
    let url = `ssr://${base64}`;

    if (query.toString()) {
      url += `/?${query.toString()}`;
    }

    return url;
  }

  /**
   * 构建Hysteria URL
   */
  buildHysteriaUrl(proxy) {
    let url = `hysteria://${proxy.server}:${proxy.port}`;
    
    const params = new URLSearchParams();
    if (proxy.protocol) {
      params.set('protocol', proxy.protocol);
    }
    if (proxy.sni) {
      params.set('sni', proxy.sni);
    }
    if (proxy.auth) {
      params.set('auth', proxy.auth);
    }
    if (proxy.alpn) {
      params.set('alpn', proxy.alpn);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    if (proxy.name) {
      url += `#${encodeURIComponent(proxy.name)}`;
    }

    return url;
  }

  /**
   * 构建TUIC URL
   */
  buildTUICUrl(proxy) {
    let url = `tuic://${proxy.uuid}:${proxy.password}@${proxy.server}:${proxy.port}`;
    
    const params = new URLSearchParams();
    if (proxy.sni) {
      params.set('sni', proxy.sni);
    }
    if (proxy.alpn) {
      params.set('alpn', proxy.alpn);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    if (proxy.name) {
      url += `#${encodeURIComponent(proxy.name)}`;
    }

    return url;
  }

  /**
   * 构建Socks5 URL
   */
  buildSocks5Url(proxy) {
    let url = `socks5://`;
    
    if (proxy.username && proxy.password) {
      url += `${proxy.username}:${proxy.password}@`;
    }
    
    url += `${proxy.server}:${proxy.port}`;

    if (proxy.name) {
      url += `#${encodeURIComponent(proxy.name)}`;
    }

    return url;
  }

  /**
   * 解析通用节点格式
   */
  parseGenericNodes(nodes, subscriptionName) {
    return nodes.map(node => ({
      id: crypto.randomUUID(),
      name: node.name || '未命名节点',
      url: node.url || '',
      protocol: node.protocol || 'unknown',
      enabled: true,
      type: 'subscription',
      subscriptionName: subscriptionName
    }));
  }

  /**
   * 解析节点链接行
   */
  parseNodeLines(lines, subscriptionName) {
    return lines
      .filter(line => this.isNodeUrl(line))
      .map(line => this.parseNodeLine(line, subscriptionName))
      .filter(node => node !== null);
  }

  /**
   * 解析单行节点信息
   */
  parseNodeLine(line, subscriptionName) {
    const nodeRegex = new RegExp(`^(${this.supportedProtocols.join('|')}):\/\/`);
    if (!nodeRegex.test(line)) return null;

    // 提取节点名称
    let name = '';
    let url = line;
    
    if (line.includes('#')) {
      const parts = line.split('#');
      url = parts[0];
      name = decodeURIComponent(parts[1] || '');
    }
    
    // 如果没有名称，尝试从URL中提取
    if (!name) {
      name = this.extractNodeNameFromUrl(line);
    }

    // 获取协议类型
    const protocol = line.match(nodeRegex)?.[1] || 'unknown';
    
    return {
      id: crypto.randomUUID(),
      name: name || '未命名节点',
      url: line,
      protocol: protocol,
      enabled: true,
      type: 'subscription',
      subscriptionName: subscriptionName
    };
  }

  /**
   * 从URL中提取节点名称
   */
  extractNodeNameFromUrl(url) {
    try {
      const protocol = url.match(/^(.*?):\/\//)?.[1] || '';
      
      switch (protocol) {
        case 'vmess':
          try {
            const vmessContent = url.replace('vmess://', '');
            const decoded = atob(vmessContent);
            const vmessConfig = JSON.parse(decoded);
            return vmessConfig.ps || vmessConfig.add || 'VMess节点';
          } catch {
            return 'VMess节点';
          }
        case 'vless':
          const vlessMatch = url.match(/vless:\/\/([^@]+)@([^:]+):(\d+)/);
          return vlessMatch ? vlessMatch[2] : 'VLESS节点';
        case 'trojan':
          const trojanMatch = url.match(/trojan:\/\/([^@]+)@([^:]+):(\d+)/);
          return trojanMatch ? trojanMatch[2] : 'Trojan节点';
        case 'ss':
          try {
            const ssMatch = url.match(/ss:\/\/([^#]+)/);
            if (ssMatch) {
              const decoded = atob(ssMatch[1]);
              const [auth, server] = decoded.split('@');
              return server.split(':')[0] || 'SS节点';
            }
          } catch {
            return 'SS节点';
          }
        default:
          const urlObj = new URL(url);
          return urlObj.hostname || '未命名节点';
      }
    } catch {
      return '未命名节点';
    }
  }

  /**
   * 检查是否为节点URL
   */
  isNodeUrl(line) {
    const nodeRegex = new RegExp(`^(${this.supportedProtocols.join('|')}):\/\/`);
    return nodeRegex.test(line.trim());
  }

  /**
   * 获取支持的协议列表
   */
  getSupportedProtocols() {
    return [...this.supportedProtocols];
  }

  /**
   * 验证订阅内容格式
   */
  validateContent(content) {
    if (!content || typeof content !== 'string') {
      return { valid: false, format: 'unknown', error: '内容为空或格式错误' };
    }

    try {
      // 检查是否为Base64
      const cleanedContent = content.replace(/\s/g, '');
      if (/^[A-Za-z0-9+\/=]+$/.test(cleanedContent) && cleanedContent.length > 20) {
        return { valid: true, format: 'base64' };
      }

      // 检查是否为YAML
      const parsed = yaml.load(content);
      if (parsed && typeof parsed === 'object') {
        if (parsed.proxies && Array.isArray(parsed.proxies)) {
          return { valid: true, format: 'clash' };
        }
        return { valid: true, format: 'yaml' };
      }

      // 检查是否为纯文本节点列表
      const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
      const nodeLines = lines.filter(line => this.isNodeUrl(line));
      if (nodeLines.length > 0) {
        return { valid: true, format: 'plain_text' };
      }

      return { valid: false, format: 'unknown', error: '无法识别的格式' };
    } catch (error) {
      return { valid: false, format: 'unknown', error: error.message };
    }
  }
}

// 导出单例实例
export const subscriptionParser = new SubscriptionParser(); 