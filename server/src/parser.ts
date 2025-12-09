import * as yaml from 'js-yaml';
import * as crypto from 'crypto';
import { Node } from './types';

interface ProcessOptions {
    exclude?: string;
    prependSubName?: boolean;
}

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

        this._base64Regex = /^[A-Za-z0-9+\/=]+$/;
        this._whitespaceRegex = /\s/g;
        this._newlineRegex = /\r?\n/;
        this._nodeRegex = null;
        this._protocolRegex = /^(.*?):\/\//;
    }

    decodeBase64(str: string) {
        try {
            const binaryString = atob(str);
            const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            console.warn('Base64 decoding failed, trying native atob:', e);
            return atob(str);
        }
    }

    parse(content: string, subscriptionName = '', options: ProcessOptions = {}): Node[] {
        if (!content || typeof content !== 'string') {
            return [];
        }

        let methods: (() => Node[])[] = [];

        const cleanedContent = content.replace(this._whitespaceRegex, '');
        if (this._base64Regex.test(cleanedContent) && cleanedContent.length > 20) {
            methods.push(() => this.parseBase64(content, subscriptionName));
        }

        if (content.includes('proxies:') || content.includes('nodes:')) {
            methods.push(() => this.parseYAML(content, subscriptionName));
            methods.push(() => this.parseClashConfig(content, subscriptionName));
        }

        methods.push(() => this.parsePlainText(content, subscriptionName));

        for (const method of methods) {
            try {
                const result = method();
                if (result && result.length > 0) {
                    return this.processNodes(result, subscriptionName, options);
                }
            } catch (error) {
                continue;
            }
        }

        return [];
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
                if (proxy.servername && !proxy.sni) {
                    proxy.sni = proxy.servername;
                }
                if (proxy['skip-cert-verify'] === undefined && proxy.skipCertVerify !== undefined) {
                    proxy['skip-cert-verify'] = proxy.skipCertVerify;
                }

                if ((proxy.tls === true || proxy.tls === 'true') && proxy['skip-cert-verify'] === undefined) {
                    proxy['skip-cert-verify'] = true;
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
                        originalProxy: proxy
                    });
                }
            } catch (error) {
                continue;
            }
        }

        return nodes;
    }

    convertClashProxyToUrl(proxy: any) {
        const type = proxy.type?.toLowerCase();
        const server = proxy.server;
        const port = proxy.port;

        if (!server || !port) {
            return null;
        }

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
        return null;
    }

    buildVmessUrl(proxy: any) {
        let tls = 'none';
        if (proxy.tls === true || proxy.tls === 'true' || proxy.tls === 'tls') {
            tls = 'tls';
        }

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
            alpn: proxy.alpn || '',
            fp: proxy['client-fingerprint'] || proxy.fingerprint || ''
        };

        const jsonStr = JSON.stringify(config);
        const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
        return `vmess://${base64}`;
    }

    buildVlessUrl(proxy: any) {
        let url = `vless://${proxy.uuid}@${proxy.server}:${proxy.port}`;
        const queryParams: string[] = [];

        // Network type
        if (proxy.network && proxy.network !== 'tcp') {
            queryParams.push(`type=${proxy.network}`);

            if (proxy.network === 'ws') {
                if (proxy['ws-opts']?.path) {
                    queryParams.push(`path=${encodeURIComponent(proxy['ws-opts'].path)}`);
                }
                if (proxy['ws-opts']?.headers?.Host) {
                    queryParams.push(`host=${proxy['ws-opts'].headers.Host}`);
                }
            } else if (proxy.network === 'grpc') {
                if (proxy['grpc-opts']?.['grpc-service-name']) {
                    queryParams.push(`serviceName=${encodeURIComponent(proxy['grpc-opts']['grpc-service-name'])}`);
                }
            }
        }

        // Security
        if (proxy.tls === true || proxy.tls === 'true' || proxy.tls === 'tls') {
            queryParams.push('security=tls');
        } else if (proxy.reality === true || proxy.reality === 'true' || proxy['client-fingerprint']) {
            // Auto-detect reality based on presence of reality fields or fingerprint
            if (proxy['reality-opts'] || proxy.servername || proxy.sni) {
                queryParams.push('security=reality');
            }
        }

        // Common TLS/Reality fields
        const sni = proxy.sni || proxy.servername;
        if (sni) {
            queryParams.push(`sni=${sni}`);
        }

        const fp = proxy['client-fingerprint'] || proxy.fingerprint;
        if (fp) {
            queryParams.push(`fp=${fp}`);
        }

        const alpn = proxy.alpn;
        if (alpn && Array.isArray(alpn)) {
            queryParams.push(`alpn=${alpn.join(',')}`);
        }

        // Reality specific fields
        if (proxy['reality-opts']) {
            if (proxy['reality-opts']['public-key']) {
                queryParams.push(`pbk=${proxy['reality-opts']['public-key']}`);
            }
            if (proxy['reality-opts']['short-id']) {
                queryParams.push(`sid=${proxy['reality-opts']['short-id']}`);
            }
            if (proxy['reality-opts']['spider-x']) {
                queryParams.push(`spx=${proxy['reality-opts']['spider-x']}`);
            }
        }

        // Flow (Vision)
        if (proxy.flow) {
            queryParams.push(`flow=${proxy.flow}`);
        }

        if (queryParams.length > 0) {
            url += `?${queryParams.join('&')}`;
        }

        if (proxy.name) {
            url += `#${encodeURIComponent(proxy.name)}`;
        }

        return url;
    }

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

    buildShadowsocksRUrl(proxy: any) {
        const config = [
            proxy.server,
            proxy.port,
            proxy.protocol || 'origin',
            proxy.cipher,
            proxy.obfs || 'plain',
            btoa(proxy.password)
        ];

        const query = new URLSearchParams();
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

    buildHysteriaUrl(proxy: any) {
        let url = `hysteria://${proxy.server}:${proxy.port}`;
        const params = new URLSearchParams();
        const paramPairs = [
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

    buildTUICUrl(proxy: any) {
        let url = `tuic://${proxy.uuid}:${proxy.password}@${proxy.server}:${proxy.port}`;
        const params = new URLSearchParams();
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
        if (!this._nodeRegex) {
            this._nodeRegex = new RegExp(`^(${this.supportedProtocols.join('|')}):\/\/`);
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

    extractNodeNameFromUrl(url: string) {
        try {
            const protocol = url.match(this._protocolRegex)?.[1] || '';
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

            const urlObj = new URL(url);
            return urlObj.hostname || '未命名节点';
        } catch {
            return '未命名节点';
        }
    }

    isNodeUrl(line: string) {
        if (!this._nodeRegex) {
            this._nodeRegex = new RegExp(`^(${this.supportedProtocols.join('|')}):\/\/`);
        }
        return this._nodeRegex.test(line.trim());
    }

    processNodes(nodes: Node[], subName: string, options: ProcessOptions = {}): Node[] {
        let processed = nodes;

        if (options.exclude && options.exclude.trim()) {
            const rules = options.exclude.trim().split('\n').map(r => r.trim()).filter(Boolean);
            const keepRules = rules.filter(r => r.toLowerCase().startsWith('keep:'));

            if (keepRules.length > 0) {
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
}

export const subscriptionParser = new SubscriptionParser();
