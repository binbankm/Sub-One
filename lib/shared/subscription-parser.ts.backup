import yaml from 'js-yaml';
import type { Node, ProcessOptions } from './types';

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
   * @param {ProcessOptions} options - 处理选项（过滤和前缀）
   * @returns {Array} 解析后的节点列表
   */
  parse(content: string, subscriptionName = '', options: ProcessOptions = {}): Node[] {
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
          // 应用过滤和处理选项
          return this.processNodes(result, subscriptionName, options);
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
    // 构建配置对象
    const config: any = {
      v: '2',
      ps: proxy.name || 'VMess节点',
      add: proxy.server,
      port: String(proxy.port),
      id: proxy.uuid || proxy.id,
      aid: String(proxy.alterId || proxy.aid || 0),
      scy: proxy.cipher || 'auto',
      net: proxy.network || 'tcp',
      type: '',  // 默认为空，兼容性更好
      host: '',
      path: '',
      tls: '',
      sni: '',
      alpn: '',
      fp: ''
    };

    // TLS 配置
    if (proxy.tls === true || proxy.tls === 'true' || proxy.tls === 'tls') {
      config.tls = 'tls';
      config.sni = proxy.sni || proxy.servername || '';
      // ALPN 处理
      if (proxy.alpn) {
        config.alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
      }
      // Client Fingerprint
      config.fp = proxy['client-fingerprint'] || proxy.fingerprint || '';
    }

    // 根据网络类型配置
    switch (config.net) {
      case 'ws':
        config.host = proxy['ws-opts']?.headers?.Host || proxy['ws-headers']?.Host || proxy.host || '';
        config.path = proxy['ws-opts']?.path || proxy['ws-path'] || proxy.path || '/';
        // 恢复：不再强制 type 为 none，而是保留原始值（如果存在），以兼容 v2rayN
        // 如果原始没有 type，buildVmessUrl 后续逻辑会处理默认值
        break;

      case 'h2':
      case 'http':
        // HTTP/2 支持多个 host
        if (proxy['h2-opts']?.host) {
          config.host = Array.isArray(proxy['h2-opts'].host)
            ? proxy['h2-opts'].host.join(',')
            : proxy['h2-opts'].host;
        }
        config.path = proxy['h2-opts']?.path || '/';
        break;

      case 'grpc':
        config.path = proxy['grpc-opts']?.['grpc-service-name'] || '';
        config.type = 'gun';  // gRPC 的 type 是 gun
        if (proxy['grpc-opts']?.mode === 'multi') {
          config.type = 'multi';
        }
        break;

      case 'quic':
        config.host = proxy['quic-opts']?.security || 'none';
        config.path = proxy['quic-opts']?.key || '';
        config.type = proxy['quic-opts']?.['header-type'] || 'none';
        break;

      case 'kcp':
        config.type = proxy['kcp-opts']?.['header-type'] || 'none';
        if (proxy['kcp-opts']?.seed) {
          config.path = proxy['kcp-opts'].seed;
        }
        break;
    }

    const jsonStr = JSON.stringify(config);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return `vmess://${base64}`;
  }

  /**
   * 构建VLESS URL
   */
  /**
   * 构建VLESS URL
   * 遵循 Xray 标准格式
   */
  buildVlessUrl(proxy: any) {
    const uuid = proxy.uuid || proxy.id;
    const server = proxy.server;
    const port = proxy.port;

    if (!uuid || !server || !port) return '';

    // 处理 IPv6 地址
    const serverPart = server.includes(':') && !server.startsWith('[') ? `[${server}]` : server;
    let url = `vless://${uuid}@${serverPart}:${port}`;
    const params = new URLSearchParams();

    // 1. 基础传输设置
    params.set('encryption', 'none'); // VLESS 默认 encryption=none

    // 传输协议 (network/type)
    const network = proxy.network || proxy.type || 'tcp';
    params.set('type', network); // 始终显式设置 type，即使是 tcp
    params.set('network', network); // 额外添加 network 参数，以防 Subconverter 偏好此字段

    if (proxy.flow) params.set('flow', proxy.flow);
    if (proxy.mode) params.set('mode', proxy.mode); // 补全 mode 参数

    // 2. 安全设置 (TLS/Reality)
    // 优先检测 Reality
    const isReality = proxy['reality-opts'] || proxy.tls === 'reality' || (proxy.servername && proxy.fingerprint && !proxy.tls);
    const isTls = proxy.tls === true || proxy.tls === 'true' || proxy.tls === 'tls';

    if (isReality) {
      params.set('security', 'reality');

      // Reality 参数
      const opts = proxy['reality-opts'] || {};
      if (opts['public-key']) params.set('pbk', opts['public-key']);
      if (opts['short-id']) params.set('sid', opts['short-id']);
      if (opts['spider-x']) params.set('spx', opts['spider-x']);

      // SNI
      const sni = opts.sni || proxy.sni || proxy.servername;
      if (sni) {
        params.set('sni', sni);
        params.set('servername', sni); // 补全 servername 参数
      }

      if (proxy['skip-cert-verify'] === true) {
        params.set('insecure', '1');
      }

      // Fingerprint
      const fp = proxy['client-fingerprint'] || proxy.fingerprint;
      if (fp) params.set('fp', fp);

    } else if (isTls) {
      params.set('security', 'tls');

      // SNI
      const sni = proxy.sni || proxy.servername;
      if (sni) params.set('sni', sni);

      // ALPN
      if (proxy.alpn) {
        const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
        params.set('alpn', alpn);
      }

      // Fingerprint
      const fp = proxy['client-fingerprint'] || proxy.fingerprint;
      if (fp) params.set('fp', fp);

      // Insecure
      if (proxy['skip-cert-verify'] === true) {
        params.set('allowInsecure', '1');
      }
    }

    // 3. 流控 (Flow) - XTLS Vision
    if (proxy.flow) {
      params.set('flow', proxy.flow);
    }

    // 4. 传输层特定参数
    switch (network) {
      case 'ws':
        const wsOpts = proxy['ws-opts'] || {};
        if (wsOpts.path) params.set('path', encodeURIComponent(wsOpts.path));
        if (wsOpts.headers?.Host) params.set('host', wsOpts.headers.Host);
        break;

      case 'grpc':
        const grpcOpts = proxy['grpc-opts'] || {};
        if (grpcOpts['grpc-service-name']) params.set('serviceName', grpcOpts['grpc-service-name']);
        if (grpcOpts.mode) params.set('mode', grpcOpts.mode);
        break;

      case 'h2':
      case 'http':
        const h2Opts = proxy['h2-opts'] || {};
        if (h2Opts.path) params.set('path', encodeURIComponent(h2Opts.path));
        if (h2Opts.host) {
          const host = Array.isArray(h2Opts.host) ? h2Opts.host.join(',') : h2Opts.host;
          params.set('host', host);
        }
        break;

      case 'quic':
        const quicOpts = proxy['quic-opts'] || {};
        if (quicOpts.security) params.set('quicSecurity', quicOpts.security);
        if (quicOpts.key) params.set('key', quicOpts.key);
        if (quicOpts['header-type']) params.set('headerType', quicOpts['header-type']);
        break;

      case 'tcp':
        params.set('headerType', 'none'); // 显式设置 headerType=none
        break;
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
   * 构建Trojan URL
   */
  buildTrojanUrl(proxy: any) {
    const password = encodeURIComponent(proxy.password);
    const server = proxy.server;
    const port = proxy.port;

    if (!server || !port) return '';

    // 处理 IPv6 地址
    const serverPart = server.includes(':') && !server.startsWith('[') ? `[${server}]` : server;
    let url = `trojan://${password}@${serverPart}:${port}`;
    const params = new URLSearchParams();

    // SNI
    const sni = proxy.sni || proxy.servername;
    if (sni) params.set('sni', sni);

    // TLS 设置
    if (proxy['skip-cert-verify'] === true) params.set('allowInsecure', '1');

    // ALPN
    if (proxy.alpn) {
      const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
      params.set('alpn', alpn);
    }

    // Fingerprint
    const fp = proxy['client-fingerprint'] || proxy.fingerprint;
    if (fp) params.set('fp', fp);

    // 传输方式
    const network = proxy.network || 'tcp';
    if (network !== 'tcp') {
      params.set('type', network);

      switch (network) {
        case 'ws':
          const wsOpts = proxy['ws-opts'] || {};
          if (wsOpts.path) params.set('path', encodeURIComponent(wsOpts.path));
          if (wsOpts.headers?.Host) params.set('host', wsOpts.headers.Host);
          break;

        case 'grpc':
          const grpcOpts = proxy['grpc-opts'] || {};
          if (grpcOpts['grpc-service-name']) params.set('serviceName', grpcOpts['grpc-service-name']);
          if (grpcOpts.mode) params.set('mode', grpcOpts.mode);
          break;

        case 'h2':
        case 'http':
          const h2Opts = proxy['h2-opts'] || {};
          if (h2Opts.path) params.set('path', h2Opts.path);
          if (h2Opts.host) {
            const hosts = Array.isArray(h2Opts.host) ? h2Opts.host.join(',') : h2Opts.host;
            params.set('host', hosts);
          }
          break;
      }
    }

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    if (proxy.name) url += `#${encodeURIComponent(proxy.name)}`;

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

    if (!server || !port || !method || !password) return '';

    const userInfo = `${method}:${password}`;
    const base64UserInfo = btoa(userInfo);
    // 处理 IPv6 地址
    const serverPart = server.includes(':') && !server.startsWith('[') ? `[${server}]` : server;
    let url = `ss://${base64UserInfo}@${serverPart}:${port}`;

    // 插件支持
    if (proxy.plugin) {
      const params = new URLSearchParams();
      const opts = proxy['plugin-opts'] || {};

      // 构建插件参数字符串
      let pluginStr = proxy.plugin;
      const optPairs: string[] = [];
      Object.entries(opts).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          optPairs.push(`${key}=${value}`);
        }
      });

      if (optPairs.length > 0) {
        pluginStr += `;${optPairs.join(';')}`;
      }

      params.set('plugin', pluginStr);
      url += `?${params.toString()}`;
    }

    if (proxy.name) url += `#${encodeURIComponent(proxy.name)}`;
    return url;
  }

  /**
   * 构建ShadowsocksR URL
   */
  buildShadowsocksRUrl(proxy: any) {
    if (!proxy.server || !proxy.port || !proxy.protocol || !proxy.cipher) return '';

    const server = proxy.server;
    const config = [
      server.includes(':') && !server.startsWith('[') ? `[${server}]` : server, // IPv6 支持
      proxy.port,
      proxy.protocol,
      proxy.cipher,
      proxy.obfs || 'plain',
      btoa(proxy.password || '')
    ];

    const query = new URLSearchParams();
    if (proxy['protocol-param']) query.set('protoparam', btoa(proxy['protocol-param']));
    if (proxy['obfs-param']) query.set('obfsparam', btoa(proxy['obfs-param']));
    if (proxy.name) query.set('remarks', btoa(proxy.name));

    const base64 = btoa(config.join(':'));
    let url = `ssr://${base64}`;
    if (query.toString()) url += `/?${query.toString()}`;

    return url;
  }

  /**
   * 构建Hysteria/Hysteria2 URL
   */
  buildHysteriaUrl(proxy: any) {
    const isV2 = proxy.type === 'hysteria2' || proxy.version === '2';
    const protocol = isV2 ? 'hysteria2' : 'hysteria';
    const server = proxy.server;
    const port = proxy.port;
    const auth = proxy.auth || proxy.password || '';

    if (!server || !port) return '';

    // 处理 IPv6 地址
    const serverPart = server.includes(':') && !server.startsWith('[') ? `[${server}]` : server;
    let url = '';
    if (isV2) {
      // Hysteria2: hysteria2://auth@server:port
      url = `${protocol}://${encodeURIComponent(auth)}@${serverPart}:${port}`;
    } else {
      // Hysteria1: hysteria://server:port?auth=...
      url = `${protocol}://${serverPart}:${port}`;
    }

    const params = new URLSearchParams();

    // 通用参数
    const sni = proxy.sni || proxy.servername;
    if (sni) params.set('sni', sni);

    if (proxy['skip-cert-verify'] === true) params.set('insecure', '1');

    // ALPN
    if (proxy.alpn) {
      const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
      params.set('alpn', alpn);
    }

    // Fingerprint
    const fp = proxy['client-fingerprint'] || proxy.fingerprint;
    if (fp) params.set('fp', fp);

    // Hysteria1 特有
    if (!isV2) {
      if (auth) params.set('auth', auth);
      if (proxy.protocol) params.set('protocol', proxy.protocol);
      if (proxy.obfs) params.set('obfs', proxy.obfs);
      if (proxy.up || proxy['up-speed']) params.set('upmbps', String(proxy.up || proxy['up-speed']));
      if (proxy.down || proxy['down-speed']) params.set('downmbps', String(proxy.down || proxy['down-speed']));
    }

    // Hysteria2 特有
    if (isV2) {
      if (proxy.obfs) {
        params.set('obfs', proxy.obfs);
        if (proxy['obfs-password']) params.set('obfs-password', proxy['obfs-password']);
      }
    }

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    if (proxy.name) url += `#${encodeURIComponent(proxy.name)}`;

    return url;
  }

  /**
   * 构建TUIC URL
   */
  buildTUICUrl(proxy: any) {
    const uuid = proxy.uuid || proxy.id;
    const password = proxy.password;
    const server = proxy.server;
    const port = proxy.port;

    if (!server || !port || !uuid || !password) return '';

    // 处理 IPv6 地址
    const serverPart = server.includes(':') && !server.startsWith('[') ? `[${server}]` : server;
    let url = `tuic://${uuid}:${password}@${serverPart}:${port}`;
    const params = new URLSearchParams();

    const sni = proxy.sni || proxy.servername;
    if (sni) params.set('sni', sni);

    if (proxy.alpn) {
      const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
      params.set('alpn', alpn);
    }

    if (proxy['skip-cert-verify'] === true) params.set('allowInsecure', '1');
    if (proxy['congestion-controller']) params.set('congestion_control', proxy['congestion-controller']);
    if (proxy['udp-relay-mode']) params.set('udp_relay_mode', proxy['udp-relay-mode']);

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    if (proxy.name) url += `#${encodeURIComponent(proxy.name)}`;

    return url;
  }

  /**
   * 构建Socks5 URL
   */
  buildSocks5Url(proxy: any) {
    if (!proxy.server || !proxy.port) return '';

    let url = `socks5://`;
    if (proxy.username && proxy.password) {
      url += `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`;
    }
    url += `${proxy.server}:${proxy.port}`;
    if (proxy.name) url += `#${encodeURIComponent(proxy.name)}`;

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
    line = line.trim();
    // 优化：延迟初始化并缓存正则表达式，避免重复创建
    if (!this._nodeRegex) {
      this._nodeRegex = new RegExp(`^(${this.supportedProtocols.join('|')}):\/\/`, 'i');
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
      this._nodeRegex = new RegExp(`^(${this.supportedProtocols.join('|')}):\/\/`, 'i');
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
