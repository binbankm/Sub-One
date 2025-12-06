import yaml from 'js-yaml';

interface Node {
  id: string;
  name: string;
  url: string;
  protocol: string;
  enabled: boolean;
  type: string;
  subscriptionName: string;
  originalProxy?: any;
}

interface ProcessOptions {
  exclude?: string;
  prependSubName?: boolean;
}

/**
 * 强大的订阅解析器
 * 支持多种格式：Base64、纯文本、YAML、Clash配置等
 */
export class SubscriptionParser {
  supportedProtocols: string[];
  _base64Regex: RegExp;
  _whitespaceRegex: RegExp;
  _newlineRegex: RegExp;
  _nodeRegex: RegExp | null;
  _protocolRegex: RegExp;

  constructor() {
    this.supportedProtocols = [
      'ss', 'ssr', 'vmess', 'vless', 'trojan',
      'hysteria', 'hysteria2', 'hy', 'hy2',
      'tuic', 'anytls', 'socks5'
    ];

    // 预编译正则表达式，提升性能
    this._base64Regex = /^[A-Za-z0-9+\/=]+$/;
    this._whitespaceRegex = /\s/g;
    this._newlineRegex = /\r?\n/;
    this._nodeRegex = null; // 延迟初始化
    this._protocolRegex = /^(.*?):\/\//;
  }

  /**
   * 安全解码 Base64 字符串 (支持 UTF-8)
   */
  decodeBase64(str: string) {
    try {
      const binaryString = atob(str);
      const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
      console.warn('Base64 decoding failed:', e);
      return atob(str); // Fallback to standard atob
    }
  }

  /**
   * 解析订阅内容
   * @param {string} content - 订阅内容
   * @param {string} subscriptionName - 订阅名称
   * @returns {Array} 解析后的节点列表
   */
  parse(content: string, subscriptionName = ''): Node[] {
    if (!content || typeof content !== 'string') {
      return [];
    }

    // 根据内容特征选择最合适的解析方法，避免不必要的尝试
    let methods: (() => Node[])[] = [];

    // 检查是否为Base64编码
    const cleanedContent = content.replace(this._whitespaceRegex, '');
    if (this._base64Regex.test(cleanedContent) && cleanedContent.length > 20) {
      methods.push(() => this.parseBase64(content, subscriptionName));
    }

    // 检查是否为YAML格式
    if (content.includes('proxies:') || content.includes('nodes:')) {
      methods.push(() => this.parseYAML(content, subscriptionName));
      methods.push(() => this.parseClashConfig(content, subscriptionName));
    }

    // 最后尝试纯文本解析
    methods.push(() => this.parsePlainText(content, subscriptionName));

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
  parseBase64(content: string, subscriptionName: string): Node[] {
    const cleanedContent = content.replace(this._whitespaceRegex, '');

    // 检查是否为Base64编码
    if (!this._base64Regex.test(cleanedContent) || cleanedContent.length < 20) {
      throw new Error('不是有效的Base64编码');
    }

    try {
      const decodedContent = this.decodeBase64(cleanedContent);
      // 优化：使用更高效的换行符分割
      const decodedLines = decodedContent.split(this._newlineRegex).filter(line => line.trim() !== '');

      // 检查解码后的内容是否包含节点链接
      if (!decodedLines.some(line => this.isNodeUrl(line))) {
        throw new Error('Base64解码后未找到有效的节点链接');
      }

      return this.parseNodeLines(decodedLines, subscriptionName);
    } catch (error: any) {
      throw new Error(`Base64解码失败: ${error.message}`);
    }
  }

  /**
   * 解析YAML格式
   */
  parseYAML(content: string, subscriptionName: string): Node[] {
    try {
      const parsed: any = yaml.load(content);
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
    } catch (error: any) {
      throw new Error(`YAML解析失败: ${error.message}`);
    }
  }

  /**
   * 解析Clash配置文件
   */
  parseClashConfig(content: string, subscriptionName: string): Node[] {
    try {
      const parsed: any = yaml.load(content);
      if (!parsed || !parsed.proxies || !Array.isArray(parsed.proxies)) {
        throw new Error('不是有效的Clash配置');
      }

      return this.parseClashProxies(parsed.proxies, subscriptionName);
    } catch (error: any) {
      throw new Error(`Clash配置解析失败: ${error.message}`);
    }
  }

  /**
   * 解析纯文本格式
   */
  parsePlainText(content: string, subscriptionName: string): Node[] {
    const lines = content.split(this._newlineRegex).filter(line => line.trim() !== '');
    const nodeLines = lines.filter(line => this.isNodeUrl(line));

    if (nodeLines.length === 0) {
      throw new Error('未找到有效的节点链接');
    }

    return this.parseNodeLines(nodeLines, subscriptionName);
  }

  /**
   * 解析Clash代理配置
   */
  parseClashProxies(proxies: any[], subscriptionName: string): Node[] {
    const nodes: Node[] = [];

    for (const proxy of proxies) {
      if (!proxy || typeof proxy !== 'object') continue;

      try {
        // 规范化字段
        if (proxy.servername && !proxy.sni) {
          proxy.sni = proxy.servername;
        }
        if (proxy['skip-cert-verify'] === undefined && proxy.skipCertVerify !== undefined) {
          proxy['skip-cert-verify'] = proxy.skipCertVerify;
        }

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
  convertClashProxyToUrl(proxy: any) {
    const type = proxy.type?.toLowerCase();
    const server = proxy.server;
    const port = proxy.port;

    if (!server || !port) {
      return null;
    }

    // 优化：使用Map提升性能，避免switch语句
    const proxyTypeHandlers = new Map([
      ['vmess', () => this.buildVmessUrl(proxy)],
      ['vless', () => this.buildVlessUrl(proxy)],
      ['trojan', () => this.buildTrojanUrl(proxy)],
      ['ss', () => this.buildShadowsocksUrl(proxy)],
      ['ssr', () => this.buildShadowsocksRUrl(proxy)],
      ['hysteria', () => this.buildHysteriaUrl(proxy)],
      ['hysteria2', () => this.buildHysteriaUrl(proxy)],
      ['tuic', () => this.buildTUICUrl(proxy)],
      ['socks5', () => this.buildSocks5Url(proxy)]
    ]);

    const handler = proxyTypeHandlers.get(type);
    if (handler) {
      return handler();
    }

    console.warn(`不支持的代理类型: ${type}`);
    return null;
  }

  /**
   * 构建VMess URL
   */
  buildVmessUrl(proxy: any) {
    // 处理 TLS
    let tls = 'none';
    if (proxy.tls === true || proxy.tls === 'true' || proxy.tls === 'tls') {
      tls = 'tls';
    }

    // 处理 SNI/Host
    // 优先使用 sni 或 servername，其次是 host
    const sni = proxy.sni || proxy.servername || proxy.host || '';
    const host = proxy.host || proxy['ws-opts']?.headers?.Host || sni || '';

    const config = {
      v: '2',
      ps: proxy.name || 'VMess节点',
      add: proxy.server,
      port: proxy.port,
      id: proxy.uuid,
      aid: proxy.alterId || 0,
      scy: proxy['skip-cert-verify'] ? 1 : 0,
      net: proxy.network || 'tcp',
      type: proxy.type || 'none',
      host: host,
      path: proxy['ws-opts']?.path || proxy.path || '',
      tls: tls,
      sni: sni,
      alpn: proxy.alpn || ''
    };

    const jsonStr = JSON.stringify(config);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return `vmess://${base64}`;
  }

  /**
   * 构建VLESS URL
   */
  buildVlessUrl(proxy: any) {
    let url = `vless://${proxy.uuid}@${proxy.server}:${proxy.port}`;

    // 优化：使用数组构建查询参数，提升性能
    const queryParams = [];

    // 添加传输参数
    if (proxy.network && proxy.network !== 'tcp') {
      queryParams.push(`type=${proxy.network}`);

      if (proxy.network === 'ws') {
        if (proxy['ws-opts']?.path) {
          queryParams.push(`path=${encodeURIComponent(proxy['ws-opts'].path)}`);
        }
        if (proxy['ws-opts']?.headers?.Host) {
          queryParams.push(`host=${proxy['ws-opts'].headers.Host}`);
        }
      }
    }

    // 添加TLS参数
    if (proxy.tls === 'tls') {
      queryParams.push('security=tls');
      if (proxy.sni) {
        queryParams.push(`sni=${proxy.sni}`);
      }
    }

    // 构建最终URL
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
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
  buildTrojanUrl(proxy: any) {
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
  buildShadowsocksUrl(proxy: any) {
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
  buildShadowsocksRUrl(proxy: any) {
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
    const params: [string, any][] = [
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
   * 构建Hysteria URL
   */
  buildHysteriaUrl(proxy: any) {
    let url = `hysteria://${proxy.server}:${proxy.port}`;

    // 优化：使用数组构建参数，提升性能
    const params = new URLSearchParams();

    // 批量设置参数，减少条件判断
    const paramPairs: [string, any][] = [
      ['protocol', proxy.protocol],
      ['sni', proxy.sni],
      ['auth', proxy.auth],
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
   * 构建TUIC URL
   */
  buildTUICUrl(proxy: any) {
    let url = `tuic://${proxy.uuid}:${proxy.password}@${proxy.server}:${proxy.port}`;

    // 优化：使用数组构建参数，提升性能
    const params = new URLSearchParams();

    // 批量设置参数，减少条件判断
    const paramPairs: [string, any][] = [
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
  buildSocks5Url(proxy: any) {
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
  parseGenericNodes(nodes: any[], subscriptionName: string): Node[] {
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
  parseNodeLines(lines: string[], subscriptionName: string): Node[] {
    return lines
      .filter(line => this.isNodeUrl(line))
      .map(line => this.parseNodeLine(line, subscriptionName))
      .filter((node): node is Node => node !== null);
  }

  /**
   * 解析单行节点信息
   */
  parseNodeLine(line: string, subscriptionName: string): Node | null {
    // 优化：延迟初始化并缓存正则表达式，避免重复创建
    if (!this._nodeRegex) {
      this._nodeRegex = new RegExp(`^(${this.supportedProtocols.join('|')}):\/\/`);
    }

    if (!this._nodeRegex.test(line)) return null;

    // 提取节点名称
    let name = '';

    // 优化：使用更高效的字符串分割
    const hashIndex = line.indexOf('#');
    if (hashIndex !== -1) {
      name = decodeURIComponent(line.substring(hashIndex + 1) || '');
    }

    // 如果没有名称，尝试从URL中提取
    if (!name) {
      name = this.extractNodeNameFromUrl(line);
    }

    // 获取协议类型
    const protocol = line.match(this._nodeRegex)?.[1] || 'unknown';

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
  extractNodeNameFromUrl(url: string) {
    try {
      const protocol = url.match(this._protocolRegex)?.[1] || '';

      // 优化：使用Map提升性能，避免switch语句
      const protocolHandlers = new Map([
        ['vmess', () => {
          try {
            const vmessContent = url.substring('vmess://'.length);
            const decoded = this.decodeBase64(vmessContent);
            const vmessConfig = JSON.parse(decoded);
            return vmessConfig.ps || vmessConfig.add || 'VMess节点';
          } catch {
            return 'VMess节点';
          }
        }],
        ['vless', () => {
          const vlessMatch = url.match(/vless:\/\/([^@]+)@([^:]+):(\d+)/);
          return vlessMatch ? vlessMatch[2] : 'VLESS节点';
        }],
        ['trojan', () => {
          const trojanMatch = url.match(/trojan:\/\/([^@]+)@([^:]+):(\d+)/);
          return trojanMatch ? trojanMatch[2] : 'Trojan节点';
        }],
        ['ss', () => {
          try {
            const ssMatch = url.match(/ss:\/\/([^#]+)/);
            if (ssMatch) {
              const decoded = this.decodeBase64(ssMatch[1]);
              const [, server] = decoded.split('@');
              return server.split(':')[0] || 'SS节点';
            }
          } catch {
            return 'SS节点';
          }
          return 'SS节点';
        }]
      ]);

      const handler = protocolHandlers.get(protocol);
      if (handler) {
        return handler();
      }

      // 默认处理
      const urlObj = new URL(url);
      return urlObj.hostname || '未命名节点';
    } catch {
      return '未命名节点';
    }
  }

  /**
   * 检查是否为节点URL
   */
  isNodeUrl(line: string) {
    // 优化：延迟初始化并缓存正则表达式，避免重复创建
    if (!this._nodeRegex) {
      this._nodeRegex = new RegExp(`^(${this.supportedProtocols.join('|')}):\/\/`);
    }
    return this._nodeRegex.test(line.trim());
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
  validateContent(content: string) {
    if (!content || typeof content !== 'string') {
      return { valid: false, format: 'unknown', error: '内容为空或格式错误' };
    }

    try {
      // 检查是否为Base64
      const cleanedContent = content.replace(this._whitespaceRegex, '');
      if (this._base64Regex.test(cleanedContent) && cleanedContent.length > 20) {
        return { valid: true, format: 'base64' };
      }

      // 检查是否为YAML
      const parsed: any = yaml.load(content);
      if (parsed && typeof parsed === 'object') {
        if (parsed.proxies && Array.isArray(parsed.proxies)) {
          return { valid: true, format: 'clash' };
        }
        return { valid: true, format: 'yaml' };
      }

      // 检查是否为纯文本节点列表
      const lines = content.split(this._newlineRegex).filter(line => line.trim() !== '');
      const nodeLines = lines.filter(line => this.isNodeUrl(line));
      if (nodeLines.length > 0) {
        return { valid: true, format: 'plain_text' };
      }

      return { valid: false, format: 'unknown', error: '无法识别的格式' };
    } catch (error: any) {
      return { valid: false, format: 'unknown', error: error.message };
    }
  }
  /**
   * 处理节点：过滤和重命名
   */
  processNodes(nodes: Node[], subName: string, options: ProcessOptions = {}): Node[] {
    let processed = nodes;

    // 1. 处理 Include/Exclude 规则
    if (options.exclude && options.exclude.trim()) {
      const rules = options.exclude.trim().split('\n').map(r => r.trim()).filter(Boolean);
      const keepRules = rules.filter(r => r.toLowerCase().startsWith('keep:'));

      if (keepRules.length > 0) {
        // 白名单模式
        const nameRegexParts: string[] = [];
        const protocolsToKeep = new Set();
        keepRules.forEach(rule => {
          const content = rule.substring(5).trim(); // 'keep:'.length
          if (content.toLowerCase().startsWith('proto:')) {
            content.substring(6).split(',').forEach(p => protocolsToKeep.add(p.trim().toLowerCase()));
          } else {
            nameRegexParts.push(content);
          }
        });
        const nameRegex = nameRegexParts.length ? new RegExp(nameRegexParts.join('|'), 'i') : null;

        processed = processed.filter(node => {
          if (protocolsToKeep.has(node.protocol)) return true;
          if (nameRegex && nameRegex.test(node.name)) return true;
          return false;
        });
      } else {
        // 黑名单模式
        const protocolsToExclude = new Set();
        const nameRegexParts: string[] = [];
        rules.forEach(rule => {
          if (rule.toLowerCase().startsWith('proto:')) {
            rule.substring(6).split(',').forEach(p => protocolsToExclude.add(p.trim().toLowerCase()));
          } else {
            nameRegexParts.push(rule);
          }
        });
        const nameRegex = nameRegexParts.length ? new RegExp(nameRegexParts.join('|'), 'i') : null;

        processed = processed.filter(node => {
          if (protocolsToExclude.has(node.protocol)) return false;
          if (nameRegex && nameRegex.test(node.name)) return false;
          return true;
        });
      }
    }

    // 2. 添加前缀
    if (options.prependSubName && subName) {
      processed = processed.map(node => {
        if (!node.name.startsWith(subName)) {
          node.name = `${subName} - ${node.name}`;
          // 更新 URL 中的 hash
          const hashIndex = node.url.lastIndexOf('#');
          const baseUrl = hashIndex !== -1 ? node.url.substring(0, hashIndex) : node.url;
          node.url = `${baseUrl}#${encodeURIComponent(node.name)}`;
        }
        return node;
      });
    }

    return processed;
  }
}

// 导出单例实例
export const subscriptionParser = new SubscriptionParser();
