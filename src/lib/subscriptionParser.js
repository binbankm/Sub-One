import yaml from 'js-yaml';

/**
 * 强大的订阅解析器
 * 支持多种格式：Base64、纯文本、YAML、Clash配置等
 * 支持所有主流代理协议和订阅格式
 */
export class SubscriptionParser {
  constructor() {
    // 扩展协议支持列表，包含所有主流协议
    this.supportedProtocols = [
      // Shadowsocks 系列
      'ss', 'ssr', 'ss2022',
      // VMess 系列
      'vmess', 'vless',
      // Trojan 系列
      'trojan',
      // Hysteria 系列
      'hysteria', 'hysteria2', 'hy', 'hy2',
      // 其他协议
      'tuic', 'anytls', 'socks5', 'socks',
      // HTTP 代理
      'http', 'https',
      // WireGuard
      'wireguard', 'wg',
      // Reality (VLESS with Reality)
      'reality',
      // NaiveProxy
      'naive',
      // Snell
      'snell'
    ];
    
    // 预编译正则表达式，提升性能
    this._regexCache = {
      base64: /^[A-Za-z0-9+\/=]+$/,
      whitespace: /\s/g,
      newline: /\r?\n/,
      nodeUrl: null // 延迟初始化
    };
  }

  /**
   * 解析订阅内容
   * @param {string} content - 订阅内容
   * @param {string} subscriptionName - 订阅名称
   * @returns {Array} 解析后的节点列表
   */
  parse(content, subscriptionName = '') {
    if (!content || typeof content !== 'string') {
      console.warn('订阅内容为空或格式错误');
      return [];
    }

    // 去除首尾空白字符
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      console.warn('订阅内容为空');
      return [];
    }
    
    // 根据内容特征选择最合适的解析方法，避免不必要的尝试
    const methods = [];
    
    // 检查是否为Base64编码
    const cleanedContent = trimmedContent.replace(this._regexCache.whitespace, '');
    if (this._regexCache.base64.test(cleanedContent) && cleanedContent.length > 20) {
      methods.push(() => this.parseBase64(trimmedContent, subscriptionName));
    }
    
    // 检查是否为YAML格式（Clash、Surge等）
    if (trimmedContent.includes('proxies:') || trimmedContent.includes('nodes:') || 
        trimmedContent.includes('Proxy:') || trimmedContent.startsWith('---')) {
      methods.push(() => this.parseYAML(trimmedContent, subscriptionName));
      methods.push(() => this.parseClashConfig(trimmedContent, subscriptionName));
    }
    
    // 检查是否为Surge格式
    if (trimmedContent.includes('[Proxy]') || trimmedContent.includes('[Proxy Group]')) {
      methods.push(() => this.parseSurgeConfig(trimmedContent, subscriptionName));
    }
    
    // 最后尝试纯文本解析
    methods.push(() => this.parsePlainText(trimmedContent, subscriptionName));

    // 尝试所有解析方法，直到成功
    for (const method of methods) {
      try {
        const result = method();
        if (result && Array.isArray(result) && result.length > 0) {
          const methodName = method.name || '未知方法';
          console.log(`✓ 解析成功，使用 ${methodName} 方法，找到 ${result.length} 个节点`);
          return result;
        }
      } catch (error) {
        const methodName = method.name || '未知方法';
        console.debug(`解析方法 ${methodName} 失败:`, error.message);
        continue;
      }
    }

    console.warn('所有解析方法均失败，无法解析订阅内容');
    return [];
  }

  /**
   * 解析Base64编码的内容
   */
  parseBase64(content, subscriptionName) {
    const cleanedContent = content.replace(this._regexCache.whitespace, '');
    
    // 检查是否为Base64编码
    if (!this._regexCache.base64.test(cleanedContent) || cleanedContent.length < 20) {
      throw new Error('不是有效的Base64编码');
    }

    try {
      // 尝试解码Base64
      let decodedContent;
      try {
        decodedContent = atob(cleanedContent);
      } catch (decodeError) {
        throw new Error(`Base64解码失败: ${decodeError.message}`);
      }
      
      if (!decodedContent || decodedContent.length === 0) {
        throw new Error('Base64解码后内容为空');
      }
      
      // 使用缓存的换行符正则表达式分割
      const decodedLines = decodedContent.split(this._regexCache.newline)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (decodedLines.length === 0) {
        throw new Error('Base64解码后未找到有效内容');
      }
      
      // 检查解码后的内容是否包含节点链接
      const hasNodeUrl = decodedLines.some(line => this.isNodeUrl(line));
      if (!hasNodeUrl) {
        // 可能是YAML格式的Base64编码
        try {
          const yamlContent = decodedLines.join('\n');
          return this.parseYAML(yamlContent, subscriptionName);
        } catch {
          throw new Error('Base64解码后未找到有效的节点链接或YAML配置');
        }
      }

      return this.parseNodeLines(decodedLines, subscriptionName);
    } catch (error) {
      throw new Error(`Base64解析失败: ${error.message}`);
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
    const lines = content.split(this._regexCache.newline)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));
    
    if (lines.length === 0) {
      throw new Error('未找到有效内容');
    }
    
    const nodeLines = lines.filter(line => this.isNodeUrl(line));
    
    if (nodeLines.length === 0) {
      throw new Error('未找到有效的节点链接');
    }

    return this.parseNodeLines(nodeLines, subscriptionName);
  }

  /**
   * 解析Surge配置文件格式
   */
  parseSurgeConfig(content, subscriptionName) {
    try {
      const lines = content.split(this._regexCache.newline);
      const nodes = [];
      let inProxySection = false;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // 检测Proxy部分
        if (trimmedLine === '[Proxy]' || trimmedLine.startsWith('[Proxy]')) {
          inProxySection = true;
          continue;
        }
        
        // 检测其他部分，停止解析
        if (trimmedLine.startsWith('[') && trimmedLine !== '[Proxy]') {
          inProxySection = false;
          continue;
        }
        
        // 跳过注释和空行
        if (!inProxySection || !trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
          continue;
        }
        
        // 解析Surge格式的代理配置
        // 格式: 名称 = 协议, 服务器, 端口, 加密方式, 密码, 其他参数
        const match = trimmedLine.match(/^([^=]+)\s*=\s*(.+)$/);
        if (match) {
          const name = match[1].trim();
          const config = match[2].trim();
          const parts = config.split(',').map(p => p.trim());
          
          if (parts.length >= 3) {
            const protocol = parts[0].toLowerCase();
            const server = parts[1];
            const port = parts[2];
            
            // 尝试构建节点URL
            let nodeUrl = null;
            try {
              nodeUrl = this.buildSurgeProxyUrl(name, protocol, server, port, parts.slice(3));
            } catch (error) {
              console.warn(`构建Surge代理URL失败: ${name}`, error);
              continue;
            }
            
            if (nodeUrl) {
              nodes.push({
                id: crypto.randomUUID(),
                name: name,
                url: nodeUrl,
                protocol: protocol,
                enabled: true,
                type: 'subscription',
                subscriptionName: subscriptionName
              });
            }
          }
        }
      }

      if (nodes.length === 0) {
        throw new Error('Surge配置中未找到有效代理');
      }

      return nodes;
    } catch (error) {
      throw new Error(`Surge配置解析失败: ${error.message}`);
    }
  }

  /**
   * 构建Surge格式的代理URL
   */
  buildSurgeProxyUrl(name, protocol, server, port, params) {
    // 将Surge格式转换为标准URL格式
    const protocolMap = {
      'ss': 'ss',
      'vmess': 'vmess',
      'trojan': 'trojan',
      'http': 'http',
      'https': 'https',
      'socks5': 'socks5'
    };

    const mappedProtocol = protocolMap[protocol];
    if (!mappedProtocol) {
      return null;
    }

    // 这里简化处理，实际应该根据协议类型构建完整URL
    // 由于Surge格式复杂，这里返回一个标识URL
    return `${mappedProtocol}://${server}:${port}#${encodeURIComponent(name)}`;
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
      console.warn('代理配置缺少服务器地址或端口', proxy);
      return null;
    }

    // 优化：使用Map提升性能，避免switch语句
    // 支持所有主流协议类型
    const proxyTypeHandlers = new Map([
      // VMess 系列
      ['vmess', () => this.buildVmessUrl(proxy)],
      ['vless', () => this.buildVlessUrl(proxy)],
      // Trojan 系列
      ['trojan', () => this.buildTrojanUrl(proxy)],
      // Shadowsocks 系列
      ['ss', () => this.buildShadowsocksUrl(proxy)],
      ['ssr', () => this.buildShadowsocksRUrl(proxy)],
      ['ss2022', () => this.buildShadowsocks2022Url(proxy)],
      // Hysteria 系列
      ['hysteria', () => this.buildHysteriaUrl(proxy)],
      ['hysteria2', () => this.buildHysteria2Url(proxy)],
      ['hy', () => this.buildHysteriaUrl(proxy)],
      ['hy2', () => this.buildHysteria2Url(proxy)],
      // 其他协议
      ['tuic', () => this.buildTUICUrl(proxy)],
      ['socks5', () => this.buildSocks5Url(proxy)],
      ['socks', () => this.buildSocks5Url(proxy)],
      // HTTP 代理
      ['http', () => this.buildHttpUrl(proxy)],
      ['https', () => this.buildHttpUrl(proxy)],
      // WireGuard
      ['wireguard', () => this.buildWireguardUrl(proxy)],
      ['wg', () => this.buildWireguardUrl(proxy)],
      // NaiveProxy
      ['naive', () => this.buildNaiveUrl(proxy)],
      // Snell
      ['snell', () => this.buildSnellUrl(proxy)]
    ]);

    const handler = proxyTypeHandlers.get(type);
    if (handler) {
      try {
        return handler();
      } catch (error) {
        console.warn(`构建 ${type} 协议URL失败:`, error, proxy);
        return null;
      }
    }

    console.warn(`不支持的代理类型: ${type}`, proxy);
    return null;
  }

  /**
   * 构建VMess URL
   * 支持所有传输协议：tcp, ws, http, h2, grpc, quic
   */
  buildVmessUrl(proxy) {
    if (!proxy.uuid) {
      throw new Error('VMess配置缺少UUID');
    }

    const network = proxy.network || 'tcp';
    const config = {
      v: '2',
      ps: proxy.name || 'VMess节点',
      add: proxy.server,
      port: String(proxy.port),
      id: proxy.uuid,
      aid: proxy.alterId || 0,
      net: network,
      type: proxy.type || 'none',
      host: '',
      path: '',
      tls: proxy.tls || 'none'
    };

    // 处理不同传输协议的参数
    switch (network) {
      case 'ws':
        config.host = proxy['ws-opts']?.headers?.Host || 
                     proxy['ws-opts']?.host || 
                     proxy.host || '';
        config.path = proxy['ws-opts']?.path || proxy.path || '/';
        break;
      case 'http':
        config.host = proxy['http-opts']?.headers?.Host || 
                     proxy['http-opts']?.host || 
                     proxy.host || '';
        config.path = proxy['http-opts']?.path || proxy.path || '/';
        break;
      case 'h2':
        config.host = proxy['h2-opts']?.host || proxy.host || '';
        config.path = proxy['h2-opts']?.path || proxy.path || '/';
        break;
      case 'grpc':
        config.host = proxy['grpc-opts']?.authority || proxy.host || '';
        config.path = proxy['grpc-opts']?.serviceName || proxy.path || '';
        config.type = proxy['grpc-opts']?.grpcServiceName || '';
        break;
      case 'quic':
        config.host = proxy['quic-opts']?.host || proxy.host || '';
        config.path = proxy['quic-opts']?.path || proxy.path || '';
        config.type = proxy['quic-opts']?.quicSecurity || 'none';
        break;
    }

    // 处理TLS配置
    if (proxy.tls === true || proxy.tls === 'tls') {
      config.tls = 'tls';
      if (proxy.sni) {
        config.host = proxy.sni;
      }
    }

    const jsonStr = JSON.stringify(config);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return `vmess://${base64}`;
  }

  /**
   * 构建VLESS URL
   * 支持所有传输协议和Reality配置
   */
  buildVlessUrl(proxy) {
    if (!proxy.uuid) {
      throw new Error('VLESS配置缺少UUID');
    }

    let url = `vless://${proxy.uuid}@${proxy.server}:${proxy.port}`;
    
    // 优化：使用URLSearchParams构建查询参数，提升性能
    const queryParams = new URLSearchParams();
    
    const network = proxy.network || 'tcp';
    
    // 添加传输类型参数
    if (network !== 'tcp') {
      queryParams.set('type', network);
      
      // WebSocket 配置
      if (network === 'ws') {
        if (proxy['ws-opts']?.path) {
          queryParams.set('path', proxy['ws-opts'].path);
        }
        if (proxy['ws-opts']?.headers?.Host) {
          queryParams.set('host', proxy['ws-opts'].headers.Host);
        }
      }
      
      // HTTP/2 配置
      if (network === 'h2') {
        if (proxy['h2-opts']?.host) {
          queryParams.set('host', proxy['h2-opts'].host.join(','));
        }
        if (proxy['h2-opts']?.path) {
          queryParams.set('path', proxy['h2-opts'].path);
        }
      }
      
      // gRPC 配置
      if (network === 'grpc') {
        if (proxy['grpc-opts']?.grpcServiceName) {
          queryParams.set('serviceName', proxy['grpc-opts'].grpcServiceName);
        }
        if (proxy['grpc-opts']?.authority) {
          queryParams.set('host', proxy['grpc-opts'].authority);
        }
      }
      
      // QUIC 配置
      if (network === 'quic') {
        if (proxy['quic-opts']?.quicSecurity) {
          queryParams.set('quicSecurity', proxy['quic-opts'].quicSecurity);
        }
        if (proxy['quic-opts']?.key) {
          queryParams.set('key', proxy['quic-opts'].key);
        }
        if (proxy['quic-opts']?.type) {
          queryParams.set('headerType', proxy['quic-opts'].type);
        }
      }
    }

    // 添加TLS/Reality参数
    if (proxy.tls === true || proxy.tls === 'tls') {
      queryParams.set('security', 'tls');
      if (proxy.sni) {
        queryParams.set('sni', proxy.sni);
      }
      if (proxy.alpn) {
        queryParams.set('alpn', Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn);
      }
    } else if (proxy.tls === 'reality' || proxy.reality) {
      queryParams.set('security', 'reality');
      const realityOpts = proxy['reality-opts'] || proxy.reality || {};
      if (realityOpts.publicKey) {
        queryParams.set('pbk', realityOpts.publicKey);
      }
      if (realityOpts.shortId) {
        queryParams.set('sid', realityOpts.shortId);
      }
      if (realityOpts.serverName) {
        queryParams.set('sni', realityOpts.serverName);
      }
      if (realityOpts.spx) {
        queryParams.set('spx', realityOpts.spx);
      }
    }

    // 添加流控参数
    if (proxy.flow) {
      queryParams.set('flow', proxy.flow);
    }

    // 构建最终URL
    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    // 添加名称
    if (proxy.name) {
      url += `#${encodeURIComponent(proxy.name)}`;
    }

    return url;
  }

  /**
   * 构建Trojan URL
   * 支持所有传输协议和TLS配置
   */
  buildTrojanUrl(proxy) {
    if (!proxy.password) {
      throw new Error('Trojan配置缺少密码');
    }

    let url = `trojan://${proxy.password}@${proxy.server}:${proxy.port}`;
    
    const params = new URLSearchParams();
    
    // TLS/SNI 配置
    if (proxy.sni) {
      params.set('sni', proxy.sni);
    }
    
    // 传输协议配置
    const network = proxy.network || 'tcp';
    if (network !== 'tcp') {
      params.set('type', network);
      
      if (network === 'ws') {
        if (proxy['ws-opts']?.path) {
          params.set('path', proxy['ws-opts'].path);
        }
        if (proxy['ws-opts']?.headers?.Host) {
          params.set('host', proxy['ws-opts'].headers.Host);
        }
      }
      
      if (network === 'grpc') {
        if (proxy['grpc-opts']?.grpcServiceName) {
          params.set('serviceName', proxy['grpc-opts'].grpcServiceName);
        }
      }
    }
    
    // ALPN 配置
    if (proxy.alpn) {
      params.set('alpn', Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn);
    }
    
    // 允许不安全连接
    if (proxy.insecure) {
      params.set('allowInsecure', '1');
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    if (proxy.name) {
      url += `#${encodeURIComponent(proxy.name)}`;
    }

    return url;
  }

  /**
   * 构建Shadowsocks URL
   * 支持插件和所有参数
   */
  buildShadowsocksUrl(proxy) {
    if (!proxy.cipher || !proxy.password) {
      throw new Error('Shadowsocks配置缺少加密方式或密码');
    }

    const method = proxy.cipher;
    const password = proxy.password;
    const server = proxy.server;
    const port = proxy.port;

    const auth = `${method}:${password}@${server}:${port}`;
    const base64 = btoa(auth);
    let url = `ss://${base64}`;

    // 添加插件参数
    const params = new URLSearchParams();
    if (proxy.plugin) {
      params.set('plugin', proxy.plugin);
    }
    if (proxy['plugin-opts']) {
      const pluginOpts = typeof proxy['plugin-opts'] === 'string' 
        ? proxy['plugin-opts'] 
        : JSON.stringify(proxy['plugin-opts']);
      params.set('plugin-opts', pluginOpts);
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
   * 构建ShadowsocksR URL
   */
  buildShadowsocksRUrl(proxy) {
    // SSR URL格式比较复杂，这里提供基础实现
    // 优化：使用数组构建配置，提升性能
    const config = [
      proxy.server,
      proxy.port,
      proxy.protocol || 'origin',
      proxy.cipher,
      proxy.obfs || 'plain',
      btoa(proxy.password)
    ];

    // 优化：使用URLSearchParams构建查询参数
    const query = new URLSearchParams();
    
    // 批量设置参数，减少条件判断
    const params = [
      ['protoparam', proxy['protocol-param']],
      ['obfsparam', proxy['obfs-param']],
      ['remarks', proxy.name]
    ];
    
    params.forEach(([key, value]) => {
      if (value) {
        query.set(key, btoa(value));
      }
    });

    const base64 = btoa(config.join(':'));
    let url = `ssr://${base64}`;

    if (query.toString()) {
      url += `/?${query.toString()}`;
    }

    return url;
  }

  /**
   * 构建Hysteria URL (v1)
   */
  buildHysteriaUrl(proxy) {
    let url = `hysteria://${proxy.server}:${proxy.port}`;
    
    const params = new URLSearchParams();
    
    const paramPairs = [
      ['protocol', proxy.protocol || 'udp'],
      ['sni', proxy.sni],
      ['auth', proxy.auth || proxy.password],
      ['alpn', Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn],
      ['obfs', proxy.obfs],
      ['obfsParam', proxy['obfs-param'] || proxy.obfsParam],
      ['insecure', proxy.insecure ? '1' : undefined],
      ['upmbps', proxy.upmbps],
      ['downmbps', proxy.downmbps]
    ];
    
    paramPairs.forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    if (proxy.name) {
      url += `#${encodeURIComponent(proxy.name)}`;
    }

    return url;
  }

  /**
   * 构建Hysteria2 URL
   */
  buildHysteria2Url(proxy) {
    let url = `hysteria2://`;
    
    // Hysteria2 使用密码认证
    if (proxy.password) {
      url += `${encodeURIComponent(proxy.password)}@`;
    }
    
    url += `${proxy.server}:${proxy.port}`;
    
    const params = new URLSearchParams();
    
    const paramPairs = [
      ['sni', proxy.sni],
      ['insecure', proxy.insecure ? '1' : undefined],
      ['pin', proxy.pin]
    ];
    
    paramPairs.forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    if (proxy.name) {
      url += `#${encodeURIComponent(proxy.name)}`;
    }

    return url;
  }

  /**
   * 构建Shadowsocks 2022 URL
   */
  buildShadowsocks2022Url(proxy) {
    if (!proxy.cipher || !proxy.password) {
      throw new Error('Shadowsocks 2022配置缺少加密方式或密码');
    }

    const method = proxy.cipher;
    const password = proxy.password;
    const server = proxy.server;
    const port = proxy.port;

    // SS2022 使用新的URL格式
    const auth = `${method}:${password}@${server}:${port}`;
    const base64 = btoa(auth);
    let url = `ss://${base64}`;

    // 添加插件参数
    const params = new URLSearchParams();
    if (proxy.plugin) {
      params.set('plugin', proxy.plugin);
    }
    if (proxy['plugin-opts']) {
      const pluginOpts = typeof proxy['plugin-opts'] === 'string' 
        ? proxy['plugin-opts'] 
        : JSON.stringify(proxy['plugin-opts']);
      params.set('plugin-opts', pluginOpts);
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
   * 构建HTTP/HTTPS代理URL
   */
  buildHttpUrl(proxy) {
    let url = proxy.type === 'https' ? 'https://' : 'http://';
    
    if (proxy.username && proxy.password) {
      url += `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`;
    }
    
    url += `${proxy.server}:${proxy.port}`;

    if (proxy.name) {
      url += `#${encodeURIComponent(proxy.name)}`;
    }

    return url;
  }

  /**
   * 构建WireGuard URL
   */
  buildWireguardUrl(proxy) {
    if (!proxy['private-key']) {
      throw new Error('WireGuard配置缺少私钥');
    }

    let url = `wireguard://`;
    
    const params = new URLSearchParams();
    
    // WireGuard 必需参数
    params.set('private_key', proxy['private-key']);
    if (proxy['public-key']) {
      params.set('public_key', proxy['public-key']);
    }
    if (proxy['pre-shared-key']) {
      params.set('preshared_key', proxy['pre-shared-key']);
    }
    
    // 服务器信息
    params.set('endpoint', `${proxy.server}:${proxy.port}`);
    
    // 其他参数
    const paramPairs = [
      ['dns', Array.isArray(proxy.dns) ? proxy.dns.join(',') : proxy.dns],
      ['mtu', proxy.mtu],
      ['keepalive', proxy['persistent-keepalive'] || proxy.keepalive],
      ['allowed_ip', Array.isArray(proxy['allowed-ips']) ? proxy['allowed-ips'].join(',') : proxy['allowed-ips']]
    ];
    
    paramPairs.forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });

    url += `${params.toString()}`;

    if (proxy.name) {
      url += `#${encodeURIComponent(proxy.name)}`;
    }

    return url;
  }

  /**
   * 构建NaiveProxy URL
   */
  buildNaiveUrl(proxy) {
    if (!proxy.username || !proxy.password) {
      throw new Error('NaiveProxy配置缺少用户名或密码');
    }

    let url = `naive+${proxy.protocol || 'https'}://`;
    url += `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`;
    url += `${proxy.server}:${proxy.port}`;

    const params = new URLSearchParams();
    if (proxy['extra-headers']) {
      const headers = typeof proxy['extra-headers'] === 'string'
        ? proxy['extra-headers']
        : JSON.stringify(proxy['extra-headers']);
      params.set('extra_headers', headers);
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
   * 构建Snell URL
   */
  buildSnellUrl(proxy) {
    if (!proxy.psk) {
      throw new Error('Snell配置缺少PSK');
    }

    let url = `snell://${proxy.server}:${proxy.port}`;
    
    const params = new URLSearchParams();
    params.set('psk', proxy.psk);
    
    const paramPairs = [
      ['obfs', proxy.obfs],
      ['obfsParam', proxy['obfs-opts']?.host || proxy.obfsParam],
      ['version', proxy.version]
    ];
    
    paramPairs.forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });

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
    
    // 优化：使用数组构建参数，提升性能
    const params = new URLSearchParams();
    
    // 批量设置参数，减少条件判断
    const paramPairs = [
      ['sni', proxy.sni],
      ['alpn', proxy.alpn]
    ];
    
    paramPairs.forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

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
    if (!this.isNodeUrl(line)) {
      return null;
    }

    // 获取协议类型
    const protocolMatch = line.match(/^([^:]+):\/\//i);
    if (!protocolMatch) {
      return null;
    }
    
    const protocol = protocolMatch[1].toLowerCase();

    // 提取节点名称
    let name = '';
    
    // 优化：使用更高效的字符串分割
    const hashIndex = line.indexOf('#');
    if (hashIndex !== -1) {
      try {
        name = decodeURIComponent(line.substring(hashIndex + 1) || '');
      } catch (e) {
        // 如果解码失败，使用原始字符串
        name = line.substring(hashIndex + 1) || '';
      }
    }
    
    // 如果没有名称，尝试从URL中提取
    if (!name) {
      name = this.extractNodeNameFromUrl(line);
    }
    
    return {
      id: crypto.randomUUID(),
      name: name || '未命名节点',
      url: line.trim(),
      protocol: protocol,
      enabled: true,
      type: 'subscription',
      subscriptionName: subscriptionName
    };
  }

  /**
   * 从URL中提取节点名称
   * 支持所有协议类型
   */
  extractNodeNameFromUrl(url) {
    try {
      const protocolMatch = url.match(/^([^:]+):\/\//i);
      if (!protocolMatch) {
        return '未命名节点';
      }
      
      const protocol = protocolMatch[1].toLowerCase();
      
      // 优化：使用Map提升性能，避免switch语句
      const protocolHandlers = new Map([
        ['vmess', () => {
          try {
            const vmessContent = url.substring('vmess://'.length).split('#')[0];
            const decoded = atob(vmessContent);
            const vmessConfig = JSON.parse(decoded);
            return vmessConfig.ps || vmessConfig.add || 'VMess节点';
          } catch {
            return 'VMess节点';
          }
        }],
        ['vless', () => {
          try {
            const vlessMatch = url.match(/vless:\/\/([^@]+)@([^:]+):(\d+)/);
            return vlessMatch ? vlessMatch[2] : 'VLESS节点';
          } catch {
            return 'VLESS节点';
          }
        }],
        ['trojan', () => {
          try {
            const trojanMatch = url.match(/trojan:\/\/([^@]+)@([^:]+):(\d+)/);
            return trojanMatch ? trojanMatch[2] : 'Trojan节点';
          } catch {
            return 'Trojan节点';
          }
        }],
        ['ss', () => {
          try {
            const ssMatch = url.match(/ss:\/\/([^#]+)/);
            if (ssMatch) {
              const decoded = atob(ssMatch[1]);
              const parts = decoded.split('@');
              if (parts.length === 2) {
                return parts[1].split(':')[0] || 'SS节点';
              }
            }
          } catch {
            // 忽略错误
          }
          return 'SS节点';
        }],
        ['hysteria', () => {
          try {
            const match = url.match(/hysteria:\/\/([^:]+):(\d+)/);
            return match ? match[1] : 'Hysteria节点';
          } catch {
            return 'Hysteria节点';
          }
        }],
        ['hysteria2', () => {
          try {
            const match = url.match(/hysteria2:\/\/([^:]+):(\d+)/);
            return match ? match[1] : 'Hysteria2节点';
          } catch {
            return 'Hysteria2节点';
          }
        }],
        ['tuic', () => {
          try {
            const match = url.match(/tuic:\/\/([^@]+)@([^:]+):(\d+)/);
            return match ? match[2] : 'TUIC节点';
          } catch {
            return 'TUIC节点';
          }
        }]
      ]);
      
      const handler = protocolHandlers.get(protocol);
      if (handler) {
        return handler();
      }
      
      // 默认处理：尝试从URL中提取主机名
      try {
        // 移除协议前缀和查询参数
        const urlWithoutProtocol = url.replace(/^[^:]+:\/\//, '');
        const urlWithoutQuery = urlWithoutProtocol.split('?')[0];
        const urlWithoutHash = urlWithoutQuery.split('#')[0];
        const parts = urlWithoutHash.split('@');
        const serverPart = parts.length > 1 ? parts[parts.length - 1] : parts[0];
        const hostname = serverPart.split(':')[0];
        return hostname || '未命名节点';
      } catch {
        return '未命名节点';
      }
    } catch {
      return '未命名节点';
    }
  }

  /**
   * 检查是否为节点URL
   * 使用缓存的正则表达式提升性能
   */
  isNodeUrl(line) {
    if (!line || typeof line !== 'string') {
      return false;
    }

    const trimmedLine = line.trim();
    if (!trimmedLine) {
      return false;
    }

    // 优化：缓存正则表达式，避免重复创建
    if (!this._regexCache.nodeUrl) {
      // 转义特殊字符并构建正则表达式
      const escapedProtocols = this.supportedProtocols
        .map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
      this._regexCache.nodeUrl = new RegExp(`^(${escapedProtocols}):\/\/`, 'i');
    }
    
    return this._regexCache.nodeUrl.test(trimmedLine);
  }

  /**
   * 获取支持的协议列表
   */
  getSupportedProtocols() {
    return [...this.supportedProtocols];
  }

  /**
   * 验证订阅内容格式
   * 返回格式信息和验证结果
   */
  validateContent(content) {
    if (!content || typeof content !== 'string') {
      return { valid: false, format: 'unknown', error: '内容为空或格式错误' };
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return { valid: false, format: 'unknown', error: '内容为空' };
    }

    try {
      // 检查是否为Base64编码
      const cleanedContent = trimmedContent.replace(this._regexCache.whitespace, '');
      if (this._regexCache.base64.test(cleanedContent) && cleanedContent.length > 20) {
        try {
          // 尝试解码验证
          const decoded = atob(cleanedContent);
          if (decoded && decoded.length > 0) {
            return { valid: true, format: 'base64', decoded: decoded.substring(0, 100) };
          }
        } catch {
          // Base64格式可能不正确
        }
      }

      // 检查是否为YAML格式（Clash等）
      try {
        const parsed = yaml.load(trimmedContent);
        if (parsed && typeof parsed === 'object') {
          if (parsed.proxies && Array.isArray(parsed.proxies)) {
            return { 
              valid: true, 
              format: 'clash', 
              nodeCount: parsed.proxies.length 
            };
          }
          if (parsed.nodes && Array.isArray(parsed.nodes)) {
            return { 
              valid: true, 
              format: 'yaml', 
              nodeCount: parsed.nodes.length 
            };
          }
          return { valid: true, format: 'yaml' };
        }
      } catch {
        // 不是YAML格式，继续检查
      }

      // 检查是否为Surge格式
      if (trimmedContent.includes('[Proxy]') || trimmedContent.includes('[Proxy Group]')) {
        return { valid: true, format: 'surge' };
      }

      // 检查是否为纯文本节点列表
      const lines = trimmedContent.split(this._regexCache.newline)
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('//'));
      
      const nodeLines = lines.filter(line => this.isNodeUrl(line));
      if (nodeLines.length > 0) {
        return { 
          valid: true, 
          format: 'plain_text', 
          nodeCount: nodeLines.length 
        };
      }

      return { valid: false, format: 'unknown', error: '无法识别的格式' };
    } catch (error) {
      return { valid: false, format: 'unknown', error: error.message };
    }
  }
}

// 导出单例实例
export const subscriptionParser = new SubscriptionParser(); 