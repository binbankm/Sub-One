import yaml from 'js-yaml';
import type { Node, ProcessOptions } from './types';

/**
 * 增强版订阅解析器 - 完善版
 * 基于 GitHub 优秀项目和协议规范改进
 * 
 * 改进点：
 * 1. 完善 Reality 协议支持（pbk, sid, spx）
 * 2. 增强 Hysteria2 obfs 参数解析
 * 3. 支持 Shadowsocks SIP002/SIP008 插件格式
 * 4. 改进 VMess 加密方式和传输协议解析
 * 5. 增强错误处理和日志记录
 * 6. 支持更多 Clash Meta 特性
 */
export class SubscriptionParserEnhanced {
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
            'tuic', 'anytls', 'socks', 'socks5', 'http', 'https'
        ];

        // 预编译正则表达式
        this._base64Regex = /^[A-Za-z0-9+\/=]+$/;
        this._whitespaceRegex = /\s/g;
        this._newlineRegex = /\r?\n/;
        this._nodeRegex = null;
        this._protocolRegex = /^(.*?):\/\//;
    }

    /**
     * 安全解码 Base64（UTF-8 支持）
     */
    decodeBase64(str: string): string {
        try {
            const binaryString = atob(str);
            const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            console.warn('Base64 decoding failed, using fallback:', e);
            return atob(str);
        }
    }

    /**
     * 主解析方法
     */
    parse(content: string, subscriptionName = '', options: ProcessOptions = {}): Node[] {
        if (!content || typeof content !== 'string') {
            return [];
        }

        let methods: (() => Node[])[] = [];

        // 智能检测内容类型
        const cleanedContent = content.replace(this._whitespaceRegex, '');

        // 检查 Base64
        if (this._base64Regex.test(cleanedContent) && cleanedContent.length > 20) {
            methods.push(() => this.parseBase64(content, subscriptionName));
        }

        // 检查 YAML/Clash
        if (content.includes('proxies:') || content.includes('nodes:')) {
            methods.push(() => this.parseYAML(content, subscriptionName));
            methods.push(() => this.parseClashConfig(content, subscriptionName));
        }

        // 检查 JSON (SIP008)
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
            methods.push(() => this.parseSIP008(content, subscriptionName));
        }

        // 纯文本
        methods.push(() => this.parsePlainText(content, subscriptionName));

        for (const method of methods) {
            try {
                const result = method();
                if (result && result.length > 0) {
                    console.log(`✅ 解析成功，使用 ${method.name}，找到 ${result.length} 个节点`);
                    return this.processNodes(result, subscriptionName, options);
                }
            } catch (error) {
                console.warn(`⚠️ 解析方法 ${method.name} 失败:`, error);
                continue;
            }
        }

        return [];
    }

    /**
     * 解析 SIP008 JSON 格式
     */
    parseSIP008(content: string, subscriptionName: string): Node[] {
        try {
            const json = JSON.parse(content);
            const servers = json.servers || (Array.isArray(json) ? json : [json]);

            const nodes: Node[] = [];

            for (const server of servers) {
                if (!server.server || !server.server_port) continue;

                try {
                    let nodeUrl = '';

                    // Shadowsocks SIP008
                    if (server.method && server.password) {
                        nodeUrl = this.buildShadowsocksUrlFromSIP008(server);
                    }

                    if (nodeUrl) {
                        nodes.push({
                            id: crypto.randomUUID(),
                            name: server.remarks || server.name || '未命名节点',
                            url: nodeUrl,
                            protocol: 'ss',
                            enabled: true,
                            type: 'subscription',
                            subscriptionName: subscriptionName
                        });
                    }
                } catch (error) {
                    console.warn('解析 SIP008 服务器配置失败:', server, error);
                }
            }

            return nodes;
        } catch (error: any) {
            throw new Error(`SIP008 JSON 解析失败: ${error.message}`);
        }
    }

    /**
     * 从 SIP008 构建 Shadowsocks URL
     */
    buildShadowsocksUrlFromSIP008(server: any): string {
        const method = server.method;
        const password = server.password;
        const serverAddr = server.server;
        const port = server.server_port;

        if (!serverAddr || !port || !method || !password) return '';

        const userInfo = `${method}:${password}`;
        const base64UserInfo = btoa(userInfo);
        const serverPart = serverAddr.includes(':') && !serverAddr.startsWith('[')
            ? `[${serverAddr}]`
            : serverAddr;

        let url = `ss://${base64UserInfo}@${serverPart}:${port}`;

        // 插件支持 (SIP002)
        if (server.plugin && server.plugin_opts) {
            const params = new URLSearchParams();
            const pluginStr = `${server.plugin};${server.plugin_opts}`;
            params.set('plugin', pluginStr);
            url += `?${params.toString()}`;
        }

        if (server.remarks || server.name) {
            url += `#${encodeURIComponent(server.remarks || server.name)}`;
        }

        return url;
    }

    parseBase64(content: string, subscriptionName: string): Node[] {
        const cleanedContent = content.replace(this._whitespaceRegex, '');

        if (!this._base64Regex.test(cleanedContent) || cleanedContent.length < 20) {
            throw new Error('不是有效的Base64编码');
        }

        try {
            const decodedContent = this.decodeBase64(cleanedContent);
            const decodedLines = decodedContent.split(this._newlineRegex).filter(line => line.trim() !== '');

            if (!decodedLines.some(line => this.isNodeUrl(line))) {
                throw new Error('Base64解码后未找到有效的节点链接');
            }

            return this.parseNodeLines(decodedLines, subscriptionName);
        } catch (error: any) {
            throw new Error(`Base64解码失败: ${error.message}`);
        }
    }

    parseYAML(content: string, subscriptionName: string): Node[] {
        try {
            const parsed: any = yaml.load(content);
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('无效的YAML格式');
            }

            if (parsed.proxies && Array.isArray(parsed.proxies)) {
                return this.parseClashProxies(parsed.proxies, subscriptionName);
            }

            if (parsed.nodes && Array.isArray(parsed.nodes)) {
                return this.parseGenericNodes(parsed.nodes, subscriptionName);
            }

            throw new Error('不支持的YAML格式');
        } catch (error: any) {
            throw new Error(`YAML解析失败: ${error.message}`);
        }
    }

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

    parsePlainText(content: string, subscriptionName: string): Node[] {
        const lines = content.split(this._newlineRegex).filter(line => line.trim() !== '');
        const nodeLines = lines.filter(line => this.isNodeUrl(line));

        if (nodeLines.length === 0) {
            throw new Error('未找到有效的节点链接');
        }

        return this.parseNodeLines(nodeLines, subscriptionName);
    }

    parseClashProxies(proxies: any[], subscriptionName: string): Node[] {
        const nodes: Node[] = [];

        for (const proxy of proxies) {
            if (!proxy || typeof proxy !== 'object') continue;

            try {
                // 字段规范化
                this.normalizeProxyFields(proxy);

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
                        originalProxy: proxy
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
     * 规范化 Clash 代理字段
     */
    normalizeProxyFields(proxy: any): void {
        // SNI 字段统一
        if (proxy.servername && !proxy.sni) {
            proxy.sni = proxy.servername;
        }

        // 证书验证字段统一
        if (proxy.skipCertVerify !== undefined && proxy['skip-cert-verify'] === undefined) {
            proxy['skip-cert-verify'] = proxy.skipCertVerify;
        }

        // UUID 字段统一
        if (proxy.id && !proxy.uuid) {
            proxy.uuid = proxy.id;
        }
    }

    convertClashProxyToUrl(proxy: any): string | null {
        const type = proxy.type?.toLowerCase();
        const server = proxy.server;
        const port = proxy.port;

        if (!server || !port) {
            return null;
        }

        const handlers = new Map([
            ['vmess', () => this.buildVmessUrl(proxy)],
            ['vless', () => this.buildVlessUrlEnhanced(proxy)],
            ['trojan', () => this.buildTrojanUrl(proxy)],
            ['ss', () => this.buildShadowsocksUrlEnhanced(proxy)],
            ['ssr', () => this.buildShadowsocksRUrl(proxy)],
            ['hysteria', () => this.buildHysteriaUrlEnhanced(proxy)],
            ['hysteria2', () => this.buildHysteriaUrlEnhanced(proxy)],
            ['hy2', () => this.buildHysteriaUrlEnhanced(proxy)],
            ['tuic', () => this.buildTUICUrl(proxy)],
            ['socks5', () => this.buildSocks5Url(proxy)],
            ['socks', () => this.buildSocks5Url(proxy)]
        ]);

        const handler = handlers.get(type);
        if (handler) {
            return handler();
        }

        console.warn(`不支持的代理类型: ${type}`);
        return null;
    }

    /**
     * 构建 VMess URL（完善版）
     */
    buildVmessUrl(proxy: any): string {
        const config: any = {
            v: '2',
            ps: proxy.name || 'VMess节点',
            add: proxy.server,
            port: String(proxy.port),
            id: proxy.uuid || proxy.id,
            aid: String(proxy.alterId || proxy.aid || 0),
            scy: proxy.cipher || 'auto',
            net: proxy.network || 'tcp',
            type: '',
            host: '',
            path: '',
            tls: '',
            sni: '',
            alpn: '',
            fp: ''
        };

        //TLS 配置
        if (proxy.tls === true || proxy.tls === 'true' || proxy.tls === 'tls') {
            config.tls = 'tls';
            config.sni = proxy.sni || proxy.servername || '';

            if (proxy.alpn) {
                config.alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
            }

            config.fp = proxy['client-fingerprint'] || proxy.fingerprint || '';
        }

        // 传输协议配置
        switch (config.net) {
            case 'ws':
                config.host = proxy['ws-opts']?.headers?.Host || proxy['ws-headers']?.Host || proxy.host || '';
                config.path = proxy['ws-opts']?.path || proxy['ws-path'] || proxy.path || '/';
                break;

            case 'h2':
            case 'http':
                if (proxy['h2-opts']?.host) {
                    config.host = Array.isArray(proxy['h2-opts'].host)
                        ? proxy['h2-opts'].host.join(',')
                        : proxy['h2-opts'].host;
                }
                config.path = proxy['h2-opts']?.path || '/';
                break;

            case 'grpc':
                config.path = proxy['grpc-opts']?.['grpc-service-name'] || '';
                config.type = 'gun';
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
     * 构建 VLESS URL（增强版 - 完整 Reality 支持）
     */
    buildVlessUrlEnhanced(proxy: any): string {
        const uuid = proxy.uuid || proxy.id;
        const server = proxy.server;
        const port = proxy.port;

        if (!uuid || !server || !port) return '';

        const serverPart = server.includes(':') && !server.startsWith('[') ? `[${server}]` : server;
        let url = `vless://${uuid}@${serverPart}:${port}`;
        const params = new URLSearchParams();

        // 基础设置
        params.set('encryption', 'none');

        // 传输协议
        const network = proxy.network || proxy.type || 'tcp';
        params.set('type', network);

        // Flow（XTLS Vision）
        if (proxy.flow) {
            params.set('flow', proxy.flow);
        }

        // 安全层判断 - Reality 优先
        const realityOpts = proxy['reality-opts'];
        const isReality = realityOpts ||
            proxy.security === 'reality' ||
            proxy.tls === 'reality' ||
            (proxy.servername && proxy['public-key'] && !proxy.tls);
        const isTls = proxy.tls === true || proxy.tls === 'true' || proxy.tls === 'tls' || proxy.security === 'tls';

        if (isReality) {
            params.set('security', 'reality');

            // Reality 核心参数
            const opts = realityOpts || proxy;

            // pbk - Public Key (必需)
            const pbk = opts['public-key'] || opts.publicKey || opts.pbk;
            if (pbk) {
                params.set('pbk', pbk);
            }

            // sid - Short ID (可选但建议)
            const sid = opts['short-id'] || opts.shortId || opts.sid || '';
            if (sid) {
                params.set('sid', sid);
            }

            // spx - SpiderX (可选)
            const spx = opts['spider-x'] || opts.spiderX || opts.spx || '';
            if (spx) {
                params.set('spx', encodeURIComponent(spx));
            }

            // SNI (必需)
            const sni = opts.sni || opts.serverName || proxy.sni || proxy.servername;
            if (sni) {
                params.set('sni', sni);
            }

            // Fingerprint (建议)
            const fp = opts['client-fingerprint'] || opts.fingerprint || opts.fp || 'chrome';
            if (fp) {
                params.set('fp', fp);
            }

            // Insecure
            if (opts['skip-cert-verify'] === true || opts.insecure === true) {
                params.set('insecure', '1');
            }

        } else if (isTls) {
            params.set('security', 'tls');

            const sni = proxy.sni || proxy.servername;
            if (sni) params.set('sni', sni);

            if (proxy.alpn) {
                const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
                params.set('alpn', alpn);
            }

            const fp = proxy['client-fingerprint'] || proxy.fingerprint;
            if (fp) params.set('fp', fp);

            if (proxy['skip-cert-verify'] === true) {
                params.set('allowInsecure', '1');
            }
        }

        // 传输层参数
        switch (network) {
            case 'ws':
                const wsOpts = proxy['ws-opts'] || {};
                if (wsOpts.path) params.set('path', encodeURIComponent(wsOpts.path));
                if (wsOpts.headers?.Host) params.set('host', wsOpts.headers.Host);

                // Early Data
                if (wsOpts['max-early-data']) params.set('ed', String(wsOpts['max-early-data']));
                if (wsOpts['early-data-header-name']) params.set('eh', wsOpts['early-data-header-name']);
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

            case 'tcp':
                // HTTP 伪装
                const tcpOpts = proxy['tcp-opts'] || {};
                if (tcpOpts.type === 'http' || proxy.http) {
                    params.set('headerType', 'http');
                    if (tcpOpts.headers || proxy.httpHeaders) {
                        const headers = tcpOpts.headers || proxy.httpHeaders;
                        if (headers.Host) params.set('host', headers.Host);
                        if (headers.request) params.set('path', headers.request);
                    }
                } else {
                    params.set('headerType', 'none');
                }
                break;

            case 'quic':
                const quicOpts = proxy['quic-opts'] || {};
                if (quicOpts.security) params.set('quicSecurity', quicOpts.security);
                if (quicOpts.key) params.set('key', quicOpts.key);
                if (quicOpts['header-type']) params.set('headerType', quicOpts['header-type']);
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
     * 构建 Trojan URL
     */
    buildTrojanUrl(proxy: any): string {
        const password = encodeURIComponent(proxy.password);
        const server = proxy.server;
        const port = proxy.port;

        if (!server || !port) return '';

        const serverPart = server.includes(':') && !server.startsWith('[') ? `[${server}]` : server;
        let url = `trojan://${password}@${serverPart}:${port}`;
        const params = new URLSearchParams();

        const sni = proxy.sni || proxy.servername;
        if (sni) params.set('sni', sni);

        if (proxy['skip-cert-verify'] === true) params.set('allowInsecure', '1');

        if (proxy.alpn) {
            const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
            params.set('alpn', alpn);
        }

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
            }
        }

        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;
        if (proxy.name) url += `#${encodeURIComponent(proxy.name)}`;

        return url;
    }

    /**
     * 构建 Shadowsocks URL（增强版 - SIP002 插件支持）
     */
    buildShadowsocksUrlEnhanced(proxy: any): string {
        const method = proxy.cipher;
        const password = proxy.password;
        const server = proxy.server;
        const port = proxy.port;

        if (!server || !port || !method || !password) return '';

        const userInfo = `${method}:${password}`;
        const base64UserInfo = btoa(userInfo);
        const serverPart = server.includes(':') && !server.startsWith('[') ? `[${server}]` : server;
        let url = `ss://${base64UserInfo}@${serverPart}:${port}`;

        // SIP002 插件支持
        if (proxy.plugin) {
            const params = new URLSearchParams();
            const opts = proxy['plugin-opts'] || {};

            // 构建插件参数字符串
            let pluginStr = proxy.plugin;
            const optPairs: string[] = [];

            Object.entries(opts).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    // SIP002 要求特殊字符转义
                    const escapedValue = String(value)
                        .replace(/\\/g, '\\\\')
                        .replace(/:/g, '\\:')
                        .replace(/;/g, '\\;')
                        .replace(/=/g, '\\=');
                    optPairs.push(`${key}=${escapedValue}`);
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

    buildShadowsocksRUrl(proxy: any): string {
        if (!proxy.server || !proxy.port || !proxy.protocol || !proxy.cipher) return '';

        const server = proxy.server;
        const config = [
            server.includes(':') && !server.startsWith('[') ? `[${server}]` : server,
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
     * 构建 Hysteria/Hysteria2 URL（增强版）
     */
    buildHysteriaUrlEnhanced(proxy: any): string {
        const isV2 = proxy.type === 'hysteria2' || proxy.type === 'hy2' || proxy.version === '2';
        const protocol = isV2 ? 'hysteria2' : 'hysteria';
        const server = proxy.server;
        const port = proxy.port;

        // Hysteria2 使用 password，Hysteria1 使用 auth
        const auth = isV2 ? (proxy.password || proxy.auth || '') : (proxy.auth || proxy.password || '');

        if (!server || !port) return '';

        const serverPart = server.includes(':') && !server.startsWith('[') ? `[${server}]` : server;
        let url = '';

        if (isV2) {
            // Hysteria2: hysteria2://password@server:port
            url = `${protocol}://${encodeURIComponent(auth)}@${serverPart}:${port}`;
        } else {
            // Hysteria1: hysteria://server:port
            url = `${protocol}://${serverPart}:${port}`;
        }

        const params = new URLSearchParams();

        // 通用参数
        const sni = proxy.sni || proxy.servername;
        if (sni) params.set('sni', sni);

        if (proxy['skip-cert-verify'] === true || proxy.insecure === true) {
            params.set('insecure', '1');
        }

        if (proxy.alpn) {
            const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
            params.set('alpn', alpn);
        }

        const fp = proxy['client-fingerprint'] || proxy.fingerprint;
        if (fp) params.set('fp', fp);

        // pinSHA256 支持
        if (proxy.pinSHA256) {
            params.set('pinSHA256', proxy.pinSHA256);
        }

        if (isV2) {
            // Hysteria2 特有参数
            if (proxy.obfs) {
                params.set('obfs', proxy.obfs);  // salamander
                if (proxy['obfs-password']) {
                    params.set('obfs-password', proxy['obfs-password']);
                }
            }
        } else {
            // Hysteria1 特有参数
            if (auth) params.set('auth', auth);
            if (proxy.protocol) params.set('protocol', proxy.protocol);
            if (proxy.obfs) params.set('obfs', proxy.obfs);
            if (proxy.up || proxy['up-speed']) params.set('upmbps', String(proxy.up || proxy['up-speed']));
            if (proxy.down || proxy['down-speed']) params.set('downmbps', String(proxy.down || proxy['down-speed']));
        }

        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;
        if (proxy.name) url += `#${encodeURIComponent(proxy.name)}`;

        return url;
    }

    buildTUICUrl(proxy: any): string {
        const uuid = proxy.uuid || proxy.id;
        const password = proxy.password;
        const server = proxy.server;
        const port = proxy.port;

        if (!server || !port || !uuid || !password) return '';

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

    buildSocks5Url(proxy: any): string {
        if (!proxy.server || !proxy.port) return '';

        let url = `socks5://`;
        if (proxy.username && proxy.password) {
            url += `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`;
        }
        url += `${proxy.server}:${proxy.port}`;
        if (proxy.name) url += `#${encodeURIComponent(proxy.name)}`;

        return url;
    }

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

    parseNodeLines(lines: string[], subscriptionName: string): Node[] {
        return lines
            .filter(line => this.isNodeUrl(line))
            .map(line => this.parseNodeLine(line, subscriptionName))
            .filter((node): node is Node => node !== null);
    }

    parseNodeLine(line: string, subscriptionName: string): Node | null {
        line = line.trim();

        if (!this._nodeRegex) {
            this._nodeRegex = new RegExp(`^(${this.supportedProtocols.join('|')}):\/\/`, 'i');
        }

        if (!this._nodeRegex.test(line)) return null;

        let name = '';
        const hashIndex = line.indexOf('#');
        if (hashIndex !== -1) {
            name = decodeURIComponent(line.substring(hashIndex + 1) || '');
        }

        if (!name) {
            name = this.extractNodeNameFromUrl(line);
        }

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

    extractNodeNameFromUrl(url: string): string {
        try {
            const protocol = url.match(this._protocolRegex)?.[1] || '';

            const handlers = new Map([
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
                }]
            ]);

            const handler = handlers.get(protocol);
            if (handler) {
                return handler();
            }

            const urlObj = new URL(url);
            return urlObj.hostname || '未命名节点';
        } catch {
            return '未命名节点';
        }
    }

    isNodeUrl(line: string): boolean {
        if (!this._nodeRegex) {
            this._nodeRegex = new RegExp(`^(${this.supportedProtocols.join('|')}):\/\/`, 'i');
        }
        return this._nodeRegex.test(line.trim());
    }

    processNodes(nodes: Node[], subName: string, options: ProcessOptions = {}): Node[] {
        let processed = nodes;

        // 过滤规则
        if (options.exclude && options.exclude.trim()) {
            const rules = options.exclude.trim().split('\n').map(r => r.trim()).filter(Boolean);
            const keepRules = rules.filter(r => r.toLowerCase().startsWith('keep:'));

            if (keepRules.length > 0) {
                // 白名单模式
                const nameRegexParts: string[] = [];
                const protocolsToKeep = new Set();

                keepRules.forEach(rule => {
                    const content = rule.substring(5).trim();
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

        // 添加前缀
        if (options.prependSubName && subName) {
            processed = processed.map(node => {
                if (!node.name.startsWith(subName)) {
                    node.name = `${subName} - ${node.name}`;
                    const hashIndex = node.url.lastIndexOf('#');
                    const baseUrl = hashIndex !== -1 ? node.url.substring(0, hashIndex) : node.url;
                    node.url = `${baseUrl}#${encodeURIComponent(node.name)}`;
                }
                return node;
            });
        }

        return processed;
    }

    validateContent(content: string) {
        if (!content || typeof content !== 'string') {
            return { valid: false, format: 'unknown', error: '内容为空或格式错误' };
        }

        try {
            const cleanedContent = content.replace(this._whitespaceRegex, '');

            if (this._base64Regex.test(cleanedContent) && cleanedContent.length > 20) {
                return { valid: true, format: 'base64' };
            }

            const parsed: any = yaml.load(content);
            if (parsed && typeof parsed === 'object') {
                if (parsed.proxies && Array.isArray(parsed.proxies)) {
                    return { valid: true, format: 'clash' };
                }
                return { valid: true, format: 'yaml' };
            }

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

    getSupportedProtocols(): string[] {
        return [...this.supportedProtocols];
    }
}

// 导出单例
export const subscriptionParserEnhanced = new SubscriptionParserEnhanced();
