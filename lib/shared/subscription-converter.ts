import yaml from 'js-yaml';
import type { Node } from './types';

/**
 * ==================== 订阅转换器 ====================
 * 
 * 功能说明:
 * - 将节点数组转换为各种客户端格式
 * - 支持 Clash、Surge、Sing-Box、Loon、Base64 等格式
 * - 完全内置,无需依赖外部 SubConverter 服务
 * - 基于 Sub-Store 和 SubConverter 的转换逻辑
 * 
 * 支持的格式:
 * - Base64: 原始节点链接的 Base64 编码
 * - Clash: Clash Meta/Premium YAML 配置
 * - Surge: Surge 配置文件
 * - Sing-Box: Sing-Box JSON 配置
 * - Loon: Loon 配置文件
 * 
 * ===================================================
 */

export interface ConverterOptions {
    /** 配置文件名称 */
    filename?: string;
    /** 是否包含规则 */
    includeRules?: boolean;
    /** 远程规则配置 URL */
    remoteConfig?: string;
    /** 订阅用户信息(流量统计) */
    userInfo?: {
        upload?: number;
        download?: number;
        total?: number;
        expire?: number;
    };
}

export class SubscriptionConverter {
    /**
     * 主转换方法 - 根据目标格式转换节点
     */
    convert(nodes: Node[], format: string, options: ConverterOptions = {}): string {
        const formatHandlers: Record<string, () => string> = {
            'base64': () => this.toBase64(nodes),
            'clash': () => this.toClash(nodes, options),
            'singbox': () => this.toSingBox(nodes, options),
            'surge': () => this.toSurge(nodes, options),
            'loon': () => this.toLoon(nodes, options),
        };

        const handler = formatHandlers[format.trim().toLowerCase()];
        if (!handler) {
            throw new Error(`不支持的转换格式: ${format}`);
        }

        return handler();
    }

    /**
     * 转换为 Base64 格式
     */
    toBase64(nodes: Node[]): string {
        const urls = nodes.map(node => node.url).join('\n');
        return this.encodeBase64(urls);
    }

    /**
     * 转换为 Clash Meta YAML 配置
     */
    toClash(nodes: Node[], _options: ConverterOptions = {}): string {
        const proxies: any[] = [];
        let successCount = 0;
        let failCount = 0;

        for (const node of nodes) {
            try {
                const proxy = this.nodeToClashProxy(node);
                if (proxy) {
                    proxies.push(proxy);
                    successCount++;
                } else {
                    failCount++;
                    console.warn(`[Clash] 跳过不支持的协议: ${node.protocol} (${node.name})`);
                }
            } catch (error) {
                failCount++;
                console.error(`[Clash] 转换失败: ${node.name}`, error);
            }
        }

        // 如果没有任何有效节点,返回默认配置
        if (proxies.length === 0) {
            console.warn('[Clash] 警告: 没有有效节点,返回空配置');
            return yaml.dump({
                port: 7890,
                'socks-port': 7891,
                'allow-lan': false,
                mode: 'Rule',
                'log-level': 'info',
                proxies: [],
                'proxy-groups': [{
                    name: 'DIRECT',
                    type: 'select',
                    proxies: ['DIRECT']
                }],
                rules: ['MATCH,DIRECT']
            }, {
                indent: 2,
                lineWidth: -1,
                quotingType: '"',
                forceQuotes: false
            });
        }

        console.log(`[Clash] 转换完成: 成功 ${successCount}, 失败 ${failCount}`);

        // 构建完整的 Clash 配置
        const config: any = {
            port: 7890,
            'socks-port': 7891,
            'allow-lan': false,
            mode: 'Rule',
            'log-level': 'info',
            'external-controller': '127.0.0.1:9090',
            proxies: proxies,
            'proxy-groups': [
                {
                    name: '🚀 节点选择',
                    type: 'select',
                    proxies: ['♻️ 自动选择', '🎯 全球直连', ...proxies.map(p => p.name)]
                },
                {
                    name: '♻️ 自动选择',
                    type: 'url-test',
                    proxies: proxies.map(p => p.name),
                    url: 'http://www.gstatic.com/generate_204',
                    interval: 300
                },
                {
                    name: '🎯 全球直连',
                    type: 'select',
                    proxies: ['DIRECT']
                },
                {
                    name: '🛑 全球拦截',
                    type: 'select',
                    proxies: ['REJECT', 'DIRECT']
                }
            ],
            rules: [
                'GEOIP,CN,🎯 全球直连',
                'MATCH,🚀 节点选择'
            ]
        };

        try {
            return yaml.dump(config, {
                indent: 2,
                lineWidth: -1,
                quotingType: '"',
                forceQuotes: false
            });
        } catch (error) {
            console.error('[Clash] YAML 序列化失败:', error);
            throw new Error(`Clash YAML 生成失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 将 Node 转换为 Clash Proxy 对象
     */
    private nodeToClashProxy(node: Node): any | null {
        const url = node.url;
        const protocol = node.protocol?.toLowerCase();

        try {
            // 如果已有 originalProxy (从 Clash 解析来的),直接使用
            if (node.originalProxy) {
                return node.originalProxy;
            }

            // 否则从 URL 解析
            const handlers: Record<string, () => any> = {
                'vmess': () => this.parseVmessToClash(url),
                'vless': () => this.parseVlessToClash(url),
                'trojan': () => this.parseTrojanToClash(url),
                'ss': () => this.parseShadowsocksToClash(url),
                'shadowsocks': () => this.parseShadowsocksToClash(url),
                'ssr': () => null, // SSR 不被 Clash Meta 原生支持
                'hysteria': () => this.parseHysteriaToClash(url),
                'hysteria2': () => this.parseHysteria2ToClash(url),
                'hy2': () => this.parseHysteria2ToClash(url),
                'tuic': () => this.parseTuicToClash(url),
                'snell': () => this.parseSnellToClash(url),
                'wireguard': () => this.parseWireGuardToClash(url),
                'wg': () => this.parseWireGuardToClash(url),
            };

            const handler = handlers[protocol || ''];
            return handler ? handler() : null;

        } catch (error) {
            console.warn(`转换节点失败: ${node.name}`, error);
            return null;
        }
    }

    /**
     * 解析 VMess URL 为 Clash 代理配置
     */
    private parseVmessToClash(url: string): any {
        const base64Content = url.replace('vmess://', '');
        const jsonStr = this.decodeBase64(base64Content);
        const config = JSON.parse(jsonStr);

        const proxy: any = {
            name: config.ps || 'VMess节点',
            type: 'vmess',
            server: config.add,
            port: Number(config.port),
            uuid: config.id,
            alterId: Number(config.aid || 0),
            cipher: config.scy || 'auto',
            udp: true,
            network: config.net || 'tcp',
        };

        // TLS
        if (config.tls === 'tls') {
            proxy.tls = true;
            if (config.sni) proxy.servername = config.sni;
            if (config.alpn) proxy.alpn = config.alpn.split(',');
            if (config.fp) proxy['client-fingerprint'] = config.fp;
            if (config['skip-cert-verify']) proxy['skip-cert-verify'] = true;
        }

        // 传输协议
        switch (proxy.network) {
            case 'ws':
                proxy['ws-opts'] = {
                    path: config.path || '/',
                    headers: config.host ? { Host: config.host } : {}
                };
                break;
            case 'h2':
            case 'http':
                proxy['h2-opts'] = {
                    path: config.path || '/',
                    host: config.host ? [config.host] : []
                };
                break;
            case 'grpc':
                proxy['grpc-opts'] = {
                    'grpc-service-name': config.path || ''
                };
                break;
        }

        return proxy;
    }

    /**
     * 解析 VLESS URL 为 Clash 代理配置
     */
    private parseVlessToClash(url: string): any {
        const urlObj = new URL(url);
        const uuid = urlObj.username;
        const server = urlObj.hostname.replace(/^\[|\]$/g, '');
        const port = Number(urlObj.port);
        const params = new URLSearchParams(urlObj.search);
        const name = decodeURIComponent(urlObj.hash.slice(1)) || 'VLESS节点';

        const proxy: any = {
            name,
            type: 'vless',
            server,
            port,
            uuid,
            udp: true,
            network: params.get('type') || 'tcp',
        };

        // Flow
        if (params.get('flow')) {
            proxy.flow = params.get('flow');
        }

        // 安全层
        const security = params.get('security');
        if (security === 'tls') {
            proxy.tls = true;
            if (params.get('sni')) proxy.servername = params.get('sni');
            if (params.get('alpn')) proxy.alpn = params.get('alpn')!.split(',');
            if (params.get('fp')) proxy['client-fingerprint'] = params.get('fp');
            if (params.get('allowInsecure') === '1') proxy['skip-cert-verify'] = true;
        } else if (security === 'reality') {
            proxy.tls = true;
            proxy.servername = params.get('sni') || '';
            proxy['reality-opts'] = {
                'public-key': params.get('pbk') || '',
                'short-id': params.get('sid') || '',
            };
            if (params.get('spx')) {
                proxy['reality-opts']['spider-x'] = params.get('spx');
            }
            if (params.get('fp')) {
                proxy['client-fingerprint'] = params.get('fp');
            }
        }

        // 传输协议
        switch (proxy.network) {
            case 'ws':
                proxy['ws-opts'] = {
                    path: params.get('path') || '/',
                    headers: params.get('host') ? { Host: params.get('host') } : {}
                };
                break;
            case 'grpc':
                proxy['grpc-opts'] = {
                    'grpc-service-name': params.get('serviceName') || ''
                };
                break;
            case 'h2':
                proxy['h2-opts'] = {
                    path: params.get('path') || '/',
                    host: params.get('host') ? [params.get('host')] : []
                };
                break;
        }

        return proxy;
    }

    /**
     * 解析 Trojan URL 为 Clash 代理配置
     */
    private parseTrojanToClash(url: string): any {
        const urlObj = new URL(url);
        const password = decodeURIComponent(urlObj.username);
        const server = urlObj.hostname.replace(/^\[|\]$/g, '');
        const port = Number(urlObj.port);
        const params = new URLSearchParams(urlObj.search);
        const name = decodeURIComponent(urlObj.hash.slice(1)) || 'Trojan节点';

        const proxy: any = {
            name,
            type: 'trojan',
            server,
            port,
            password,
            udp: true,
            network: params.get('type') || 'tcp'
        };

        // SNI
        if (params.get('sni')) {
            proxy.sni = params.get('sni');
        }

        // ALPN
        if (params.get('alpn')) {
            proxy.alpn = params.get('alpn')!.split(',');
        }

        // 跳过证书验证
        if (params.get('allowInsecure') === '1') {
            proxy['skip-cert-verify'] = true;
        }

        // 传输协议
        if (proxy.network === 'ws') {
            proxy['ws-opts'] = {
                path: params.get('path') || '/',
                headers: params.get('host') ? { Host: params.get('host') } : {}
            };
        } else if (proxy.network === 'grpc') {
            proxy['grpc-opts'] = {
                'grpc-service-name': params.get('serviceName') || ''
            };
        }

        return proxy;
    }

    /**
     * 解析 Shadowsocks URL 为 Clash 代理配置
     */
    private parseShadowsocksToClash(url: string): any {
        const urlObj = new URL(url);
        let userInfo = '';
        let server = '';
        let port = 0;

        // 处理两种 SS URL 格式
        if (urlObj.username) {
            // ss://base64@server:port 格式
            userInfo = this.decodeBase64(decodeURIComponent(urlObj.username));
            server = urlObj.hostname;
            port = Number(urlObj.port);
        } else {
            // ss://base64#name 格式
            const base64Part = url.replace('ss://', '').split('#')[0].split('?')[0];
            const decoded = this.decodeBase64(base64Part);
            const match = decoded.match(/^(.+?):(.+?)@(.+?):(\d+)$/);
            if (!match) return null;

            const [, method, password, host, portStr] = match;
            userInfo = `${method}:${password}`;
            server = host;
            port = Number(portStr);
        }

        const [method, password] = userInfo.split(':');
        const params = new URLSearchParams(urlObj.search);
        const name = decodeURIComponent(urlObj.hash.slice(1)) || 'SS节点';

        const proxy: any = {
            name,
            type: 'ss',
            server: server.replace(/^\[|\]$/g, ''),
            port,
            cipher: method,
            password,
            udp: true
        };

        // 插件支持
        const plugin = params.get('plugin');
        if (plugin) {
            const [pluginName, ...opts] = plugin.split(';');
            proxy.plugin = pluginName;
            const pluginOpts: any = {};

            opts.forEach(opt => {
                const [key, value] = opt.split('=');
                if (key && value) {
                    pluginOpts[key] = value;
                }
            });

            if (Object.keys(pluginOpts).length > 0) {
                proxy['plugin-opts'] = pluginOpts;
            }
        }

        return proxy;
    }

    /**
     * 解析 Hysteria2 URL 为 Clash 代理配置
     */
    private parseHysteria2ToClash(url: string): any {
        const urlObj = new URL(url);
        const password = decodeURIComponent(urlObj.username);
        const server = urlObj.hostname.replace(/^\[|\]$/g, '');
        const port = Number(urlObj.port);
        const params = new URLSearchParams(urlObj.search);
        const name = decodeURIComponent(urlObj.hash.slice(1)) || 'Hysteria2节点';

        const proxy: any = {
            name,
            type: 'hysteria2',
            server,
            port,
            password,
            udp: true,
        };

        if (params.get('sni')) proxy.sni = params.get('sni');
        if (params.get('alpn')) proxy.alpn = params.get('alpn')!.split(',');
        if (params.get('insecure') === '1') proxy['skip-cert-verify'] = true;
        if (params.get('obfs')) {
            proxy.obfs = params.get('obfs');
            if (params.get('obfs-password')) {
                proxy['obfs-password'] = params.get('obfs-password');
            }
        }

        return proxy;
    }

    /**
     * 解析 Hysteria URL 为 Clash 代理配置
     */
    private parseHysteriaToClash(url: string): any {
        const urlObj = new URL(url);
        const server = urlObj.hostname.replace(/^\[|\]$/g, '');
        const port = Number(urlObj.port);
        const params = new URLSearchParams(urlObj.search);
        const name = decodeURIComponent(urlObj.hash.slice(1)) || 'Hysteria节点';

        const proxy: any = {
            name,
            type: 'hysteria',
            server,
            port,
            udp: true,
        };

        if (params.get('auth')) proxy.auth = params.get('auth');
        if (params.get('sni')) proxy.sni = params.get('sni');
        if (params.get('alpn')) proxy.alpn = params.get('alpn')!.split(',');
        if (params.get('insecure') === '1') proxy['skip-cert-verify'] = true;
        if (params.get('obfs')) proxy.obfs = params.get('obfs');
        if (params.get('protocol')) proxy.protocol = params.get('protocol');
        if (params.get('upmbps')) proxy.up = Number(params.get('upmbps'));
        if (params.get('downmbps')) proxy.down = Number(params.get('downmbps'));

        return proxy;
    }

    /**
     * 解析 TUIC URL 为 Clash 代理配置
     */
    private parseTuicToClash(url: string): any {
        const urlObj = new URL(url);
        const [uuid, password] = urlObj.username.split(':');
        const server = urlObj.hostname.replace(/^\[|\]$/g, '');
        const port = Number(urlObj.port);
        const params = new URLSearchParams(urlObj.search);
        const name = decodeURIComponent(urlObj.hash.slice(1)) || 'TUIC节点';

        const proxy: any = {
            name,
            type: 'tuic',
            server,
            port,
            uuid,
            password,
            udp: true,
        };

        if (params.get('sni')) proxy.sni = params.get('sni');
        if (params.get('alpn')) proxy.alpn = params.get('alpn')!.split(',');
        if (params.get('allowInsecure') === '1') proxy['skip-cert-verify'] = true;
        if (params.get('congestion_control')) proxy['congestion-controller'] = params.get('congestion_control');
        if (params.get('udp_relay_mode')) proxy['udp-relay-mode'] = params.get('udp_relay_mode');

        return proxy;
    }

    /**
     * 解析 Snell URL 为 Clash 代理配置
     */
    private parseSnellToClash(url: string): any {
        // Snell URL格式: snell://server:port?psk=xxx&version=4&obfs=http&obfs-host=xxx
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        const name = decodeURIComponent(urlObj.hash.slice(1)) || 'Snell节点';

        const proxy: any = {
            name,
            type: 'snell',
            server: urlObj.hostname.replace(/^\[|\]$/g, ''),
            port: Number(urlObj.port),
            psk: params.get('psk') || params.get('password') || '',
            version: Number(params.get('version') || '4'),
            udp: true,
        };

        // Obfs 混淆
        const obfs = params.get('obfs');
        if (obfs) {
            proxy['obfs-opts'] = {
                mode: obfs, // http, tls
            };
            if (params.get('obfs-host')) {
                proxy['obfs-opts'].host = params.get('obfs-host');
            }
        }

        return proxy;
    }

    /**
     * 解析 WireGuard URL 为 Clash 代理配置
     */
    private parseWireGuardToClash(url: string): any {
        // WireGuard URL格式: wireguard://privatekey@server:port?publickey=xxx&ip=xxx
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        const name = decodeURIComponent(urlObj.hash.slice(1)) || 'WireGuard节点';

        const proxy: any = {
            name,
            type: 'wireguard',
            server: urlObj.hostname.replace(/^\[|\]$/g, ''),
            port: Number(urlObj.port || '51820'),
            'private-key': decodeURIComponent(urlObj.username) || params.get('private-key') || '',
            'public-key': params.get('public-key') || params.get('publickey') || '',
            udp: true,
        };

        // IP 地址
        const ip = params.get('ip') || params.get('address');
        if (ip) {
            proxy.ip = ip;
        }

        // IPv6
        const ipv6 = params.get('ipv6');
        if (ipv6) {
            proxy.ipv6 = ipv6;
        }

        // Pre-shared key
        const preshared = params.get('preshared-key') || params.get('psk');
        if (preshared) {
            proxy['preshared-key'] = preshared;
        }

        // MTU
        const mtu = params.get('mtu');
        if (mtu) {
            proxy.mtu = Number(mtu);
        }

        // Reserved
        const reserved = params.get('reserved');
        if (reserved) {
            proxy.reserved = reserved.split(',').map(n => Number(n));
        }

        return proxy;
    }

    /**
     * 转换为 Sing-Box JSON 配置
     */
    toSingBox(nodes: Node[], _options: ConverterOptions = {}): string {
        const outbounds: any[] = [];
        let successCount = 0;
        let failCount = 0;

        // 添加节点
        for (const node of nodes) {
            try {
                const outbound = this.nodeToSingBoxOutbound(node);
                if (outbound) {
                    outbounds.push(outbound);
                    successCount++;
                } else {
                    failCount++;
                    console.warn(`[Sing-Box] 跳过不支持的协议: ${node.protocol} (${node.name})`);
                }
            } catch (error) {
                failCount++;
                console.error(`[Sing-Box] 转换失败: ${node.name}`, error);
            }
        }

        // 如果没有有效节点,返回最小配置
        if (outbounds.length === 0) {
            console.warn('[Sing-Box] 警告: 没有有效节点,返回最小配置');
        }

        console.log(`[Sing-Box] 转换完成: 成功 ${successCount}, 失败 ${failCount}`);

        // 构建完整配置
        const config = {
            log: {
                level: 'info'
            },
            dns: {
                servers: [
                    {
                        tag: 'google',
                        address: 'https://8.8.8.8/dns-query'
                    },
                    {
                        tag: 'local',
                        address: '223.5.5.5',
                        detour: 'direct'
                    }
                ],
                rules: [
                    {
                        geosite: 'cn',
                        server: 'local'
                    }
                ]
            },
            inbounds: [
                {
                    type: 'mixed',
                    tag: 'mixed-in',
                    listen: '127.0.0.1',
                    listen_port: 7890
                }
            ],
            outbounds: outbounds.length > 0 ? [
                {
                    type: 'selector',
                    tag: 'proxy',
                    outbounds: outbounds.map(o => o.tag),
                    default: outbounds[0]?.tag
                },
                {
                    type: 'direct',
                    tag: 'direct'
                },
                {
                    type: 'block',
                    tag: 'block'
                },
                ...outbounds
            ] : [
                {
                    type: 'direct',
                    tag: 'direct'
                },
                {
                    type: 'block',
                    tag: 'block'
                }
            ],
            route: {
                rules: [
                    {
                        geoip: 'cn',
                        outbound: 'direct'
                    },
                    {
                        geosite: 'cn',
                        outbound: 'direct'
                    }
                ],
                final: outbounds.length > 0 ? 'proxy' : 'direct'
            }
        };

        try {
            return JSON.stringify(config, null, 2);
        } catch (error) {
            console.error('[Sing-Box] JSON 序列化失败:', error);
            throw new Error(`Sing-Box JSON 生成失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 将 Node 转换为 Sing-Box Outbound
     */
    private nodeToSingBoxOutbound(node: Node): any | null {
        const protocol = node.protocol?.toLowerCase();
        const url = node.url;

        try {
            const handlers: Record<string, () => any> = {
                'vmess': () => this.parseVmessToSingBox(url, node.name),
                'vless': () => this.parseVlessToSingBox(url, node.name),
                'trojan': () => this.parseTrojanToSingBox(url, node.name),
                'ss': () => this.parseShadowsocksToSingBox(url, node.name),
                'shadowsocks': () => this.parseShadowsocksToSingBox(url, node.name),
                'hysteria2': () => this.parseHysteria2ToSingBox(url, node.name),
                'hy2': () => this.parseHysteria2ToSingBox(url, node.name),
                'tuic': () => this.parseTuicToSingBox(url, node.name),
                'wireguard': () => this.parseWireGuardToSingBox(url, node.name),
                'wg': () => this.parseWireGuardToSingBox(url, node.name),
            };

            const handler = handlers[protocol || ''];
            return handler ? handler() : null;

        } catch (error) {
            console.warn(`Sing-Box 转换失败: ${node.name}`, error);
            return null;
        }
    }

    /**
     * VMess to Sing-Box Outbound
     */
    private parseVmessToSingBox(url: string, name: string): any {
        const base64Content = url.replace('vmess://', '');
        const config = JSON.parse(this.decodeBase64(base64Content));

        const outbound: any = {
            type: 'vmess',
            tag: name,
            server: config.add,
            server_port: Number(config.port),
            uuid: config.id,
            security: config.scy || 'auto',
            alter_id: Number(config.aid || 0),
        };

        // TLS
        if (config.tls === 'tls') {
            outbound.tls = {
                enabled: true,
                server_name: config.sni || config.add,
                insecure: config['skip-cert-verify'] || false,
            };
            if (config.alpn) {
                outbound.tls.alpn = config.alpn.split(',');
            }
        }

        // Transport
        const network = config.net || 'tcp';
        if (network === 'ws') {
            outbound.transport = {
                type: 'ws',
                path: config.path || '/',
                headers: config.host ? { Host: config.host } : {},
            };
        } else if (network === 'grpc') {
            outbound.transport = {
                type: 'grpc',
                service_name: config.path || '',
            };
        } else if (network === 'h2' || network === 'http') {
            outbound.transport = {
                type: 'http',
                host: config.host ? [config.host] : [],
                path: config.path || '/',
            };
        }

        return outbound;
    }

    /**
     * VLESS to Sing-Box Outbound
     */
    private parseVlessToSingBox(url: string, name: string): any {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const outbound: any = {
            type: 'vless',
            tag: name,
            server: urlObj.hostname.replace(/^\[|\]$/g, ''),
            server_port: Number(urlObj.port),
            uuid: urlObj.username,
        };

        // Flow
        if (params.get('flow')) {
            outbound.flow = params.get('flow');
        }

        // TLS/Reality
        const security = params.get('security');
        if (security === 'tls') {
            outbound.tls = {
                enabled: true,
                server_name: params.get('sni') || outbound.server,
                insecure: params.get('allowInsecure') === '1',
            };
            if (params.get('alpn')) {
                outbound.tls.alpn = params.get('alpn')!.split(',');
            }
        } else if (security === 'reality') {
            outbound.tls = {
                enabled: true,
                server_name: params.get('sni') || outbound.server,
                reality: {
                    enabled: true,
                    public_key: params.get('pbk') || '',
                    short_id: params.get('sid') || '',
                },
            };
        }

        // Transport
        const network = params.get('type') || 'tcp';
        if (network === 'ws') {
            outbound.transport = {
                type: 'ws',
                path: params.get('path') || '/',
                headers: params.get('host') ? { Host: params.get('host') } : {},
            };
        } else if (network === 'grpc') {
            outbound.transport = {
                type: 'grpc',
                service_name: params.get('serviceName') || '',
            };
        }

        return outbound;
    }

    /**
     * Trojan to Sing-Box Outbound
     */
    private parseTrojanToSingBox(url: string, name: string): any {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const outbound: any = {
            type: 'trojan',
            tag: name,
            server: urlObj.hostname.replace(/^\[|\]$/g, ''),
            server_port: Number(urlObj.port),
            password: decodeURIComponent(urlObj.username),
        };

        // TLS
        outbound.tls = {
            enabled: true,
            server_name: params.get('sni') || outbound.server,
            insecure: params.get('allowInsecure') === '1',
        };
        if (params.get('alpn')) {
            outbound.tls.alpn = params.get('alpn')!.split(',');
        }

        // Transport
        const network = params.get('type') || 'tcp';
        if (network === 'ws') {
            outbound.transport = {
                type: 'ws',
                path: params.get('path') || '/',
                headers: params.get('host') ? { Host: params.get('host') } : {},
            };
        } else if (network === 'grpc') {
            outbound.transport = {
                type: 'grpc',
                service_name: params.get('serviceName') || '',
            };
        }

        return outbound;
    }

    /**
     * Shadowsocks to Sing-Box Outbound
     */
    private parseShadowsocksToSingBox(url: string, name: string): any {
        const urlObj = new URL(url);
        let method = '';
        let password = '';
        let server = '';
        let port = 0;

        if (urlObj.username) {
            const userInfo = this.decodeBase64(decodeURIComponent(urlObj.username));
            [method, password] = userInfo.split(':');
            server = urlObj.hostname;
            port = Number(urlObj.port);
        } else {
            const base64Part = url.replace('ss://', '').split('#')[0].split('?')[0];
            const decoded = this.decodeBase64(base64Part);
            const match = decoded.match(/^(.+?):(.+?)@(.+?):(\d+)$/);
            if (!match) return null;
            [, method, password, server, port] = match as any;
            port = Number(port);
        }

        const outbound: any = {
            type: 'shadowsocks',
            tag: name,
            server: server.replace(/^\[|\]$/g, ''),
            server_port: port,
            method: method,
            password: password,
        };

        // Plugin
        const params = new URLSearchParams(urlObj.search);
        const plugin = params.get('plugin');
        if (plugin) {
            const [pluginName] = plugin.split(';');
            if (pluginName === 'obfs-local' || pluginName.includes('obfs')) {
                outbound.plugin = 'obfs-local';
                outbound.plugin_opts = plugin.substring(pluginName.length + 1);
            }
        }

        return outbound;
    }

    /**
     * Hysteria2 to Sing-Box Outbound
     */
    private parseHysteria2ToSingBox(url: string, name: string): any {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const outbound: any = {
            type: 'hysteria2',
            tag: name,
            server: urlObj.hostname.replace(/^\[|\]$/g, ''),
            server_port: Number(urlObj.port),
            password: decodeURIComponent(urlObj.username),
        };

        // Bandwidth
        if (params.get('up') || params.get('upmbps')) {
            outbound.up_mbps = Number(params.get('up') || params.get('upmbps'));
        }
        if (params.get('down') || params.get('downmbps')) {
            outbound.down_mbps = Number(params.get('down') || params.get('downmbps'));
        }

        // TLS
        outbound.tls = {
            enabled: true,
            server_name: params.get('sni') || outbound.server,
            insecure: params.get('insecure') === '1',
        };
        if (params.get('alpn')) {
            outbound.tls.alpn = params.get('alpn')!.split(',');
        }

        // Obfuscation
        if (params.get('obfs')) {
            outbound.obfs = {
                type: params.get('obfs'),
                password: params.get('obfs-password') || '',
            };
        }

        return outbound;
    }

    /**
     * TUIC to Sing-Box Outbound
     */
    private parseTuicToSingBox(url: string, name: string): any {
        // TUIC URL格式: tuic://uuid:password@server:port?sni=xxx&alpn=h3&congestion_control=cubic
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const outbound: any = {
            type: 'tuic',
            tag: name,
            server: urlObj.hostname.replace(/^\[|\]$/g, ''),
            server_port: Number(urlObj.port),
            uuid: urlObj.username,
            password: decodeURIComponent(urlObj.password || ''),
        };

        // TLS
        outbound.tls = {
            enabled: true,
            server_name: params.get('sni') || urlObj.hostname,
            insecure: params.get('allowInsecure') === '1' || params.get('skip_cert_verify') === '1',
        };

        if (params.get('alpn')) {
            outbound.tls.alpn = params.get('alpn')!.split(',');
        }

        // Congestion control
        if (params.get('congestion_control') || params.get('cc')) {
            outbound.congestion_control = params.get('congestion_control') || params.get('cc');
        }

        // UDP relay mode
        if (params.get('udp_relay_mode')) {
            outbound.udp_relay_mode = params.get('udp_relay_mode');
        }

        // Heartbeat
        if (params.get('heartbeat')) {
            outbound.heartbeat = params.get('heartbeat');
        }

        return outbound;
    }

    /**
     * WireGuard to Sing-Box Outbound
     */
    private parseWireGuardToSingBox(url: string, name: string): any {
        // WireGuard URL格式: wireguard://privatekey@server:port?publickey=xxx&ip=10.0.0.2
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const outbound: any = {
            type: 'wireguard',
            tag: name,
            server: urlObj.hostname.replace(/^\[|\]$/g, ''),
            server_port: Number(urlObj.port || '51820'),
            private_key: decodeURIComponent(urlObj.username) || params.get('private-key') || params.get('private_key') || '',
            peer_public_key: params.get('public-key') || params.get('publickey') || params.get('public_key') || '',
            local_address: [],
        };

        // Local addresses (IP)
        const ip = params.get('ip') || params.get('address');
        if (ip) {
            outbound.local_address.push(ip);
        }

        const ipv6 = params.get('ipv6');
        if (ipv6) {
            outbound.local_address.push(ipv6);
        }

        // Pre-shared key
        const preshared = params.get('preshared-key') || params.get('preshared_key') || params.get('psk');
        if (preshared) {
            outbound.pre_shared_key = preshared;
        }

        // MTU
        const mtu = params.get('mtu');
        if (mtu) {
            outbound.mtu = Number(mtu);
        }

        // Reserved
        const reserved = params.get('reserved');
        if (reserved) {
            outbound.reserved = reserved.split(',').map(n => Number(n));
        }

        return outbound;
    }

    /**
     * 转换为 Surge 配置
     */
    toSurge(nodes: Node[], _options: ConverterOptions = {}): string {
        const lines: string[] = [];

        lines.push('#!MANAGED-CONFIG https://example.com/surge.conf');
        lines.push('');
        lines.push('[General]');
        lines.push('loglevel = notify');
        lines.push('skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, localhost, *.local');
        lines.push('dns-server = 223.5.5.5, 114.114.114.114');
        lines.push('');
        lines.push('[Proxy]');

        for (const node of nodes) {
            const line = this.nodeToSurgeLine(node);
            if (line) {
                lines.push(line);
            }
        }

        lines.push('');
        lines.push('[Proxy Group]');
        lines.push('Proxy = select, ' + nodes.map(n => n.name).join(', '));
        lines.push('');
        lines.push('[Rule]');
        lines.push('GEOIP,CN,DIRECT');
        lines.push('FINAL,Proxy');

        return lines.join('\n');
    }

    /**
     * 将 Node 转换为 Surge 配置行
     */
    private nodeToSurgeLine(node: Node): string | null {
        const protocol = node.protocol?.toLowerCase();
        const url = node.url;

        try {
            const handlers: Record<string, () => string | null> = {
                'vmess': () => this.parseVmessToSurge(url, node.name),
                'trojan': () => this.parseTrojanToSurge(url, node.name),
                'ss': () => this.parseShadowsocksToSurge(url, node.name),
                'shadowsocks': () => this.parseShadowsocksToSurge(url, node.name),
                'hysteria2': () => this.parseHysteria2ToSurge(url, node.name),
                'hy2': () => this.parseHysteria2ToSurge(url, node.name),
                'snell': () => this.parseSnellToSurge(url, node.name),
                'tuic': () => this.parseTuicToSurge(url, node.name),
                'wireguard': () => this.parseWireGuardToSurge(url, node.name),
                'wg': () => this.parseWireGuardToSurge(url, node.name),
            };

            const handler = handlers[protocol || ''];
            return handler ? handler() : null;

        } catch (error) {
            console.warn(`Surge 转换失败: ${node.name}`, error);
            return null;
        }
    }

    /**
     * VMess to Surge配置行
     */
    private parseVmessToSurge(url: string, name: string): string {
        const base64Content = url.replace('vmess://', '');
        const config = JSON.parse(this.decodeBase64(base64Content));

        const parts = [
            'vmess',
            config.add,
            config.port,
            `username=${config.id}`,
        ];

        // TLS
        if (config.tls === 'tls') {
            parts.push('tls=true');
            if (config.sni) parts.push(`sni=${config.sni}`);
            if (config['skip-cert-verify']) parts.push('skip-cert-verify=true');
        }

        // Transport
        const network = config.net || 'tcp';
        if (network === 'ws') {
            parts.push('ws=true');
            if (config.path) parts.push(`ws-path=${config.path}`);
            if (config.host) parts.push(`ws-headers=Host:${config.host}`);
        }

        return `${name} = ${parts.join(', ')}`;
    }

    /**
     * Trojan to Surge配置行
     */
    private parseTrojanToSurge(url: string, name: string): string {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const parts = [
            'trojan',
            urlObj.hostname.replace(/^\[|\]$/g, ''),
            urlObj.port,
            `password=${decodeURIComponent(urlObj.username)}`,
        ];

        // SNI
        if (params.get('sni')) {
            parts.push(`sni=${params.get('sni')}`);
        }

        // Skip cert verify
        if (params.get('allowInsecure') === '1') {
            parts.push('skip-cert-verify=true');
        }

        // Transport
        if (params.get('type') === 'ws') {
            parts.push('ws=true');
            if (params.get('path')) parts.push(`ws-path=${params.get('path')}`);
            if (params.get('host')) parts.push(`ws-headers=Host:${params.get('host')}`);
        }

        return `${name} = ${parts.join(', ')}`;
    }

    /**
     * Shadowsocks to Surge配置行
     */
    private parseShadowsocksToSurge(url: string, name: string): string {
        const urlObj = new URL(url);
        let method = '';
        let password = '';
        let server = '';
        let port = 0;

        if (urlObj.username) {
            const userInfo = this.decodeBase64(decodeURIComponent(urlObj.username));
            [method, password] = userInfo.split(':');
            server = urlObj.hostname;
            port = Number(urlObj.port);
        } else {
            const base64Part = url.replace('ss://', '').split('#')[0].split('?')[0];
            const decoded = this.decodeBase64(base64Part);
            const match = decoded.match(/^(.+?):(.+?)@(.+?):(\d+)$/);
            if (!match) return '';
            [, method, password, server, port] = match as any;
        }

        const parts = [
            'ss',
            server.replace(/^\[|\]$/g, ''),
            port,
            `encrypt-method=${method}`,
            `password=${password}`,
        ];

        // Plugin
        const params = new URLSearchParams(urlObj.search);
        const plugin = params.get('plugin');
        if (plugin && plugin.includes('obfs')) {
            parts.push('obfs=http');
            // Try to extract obfs-host from plugin string (obfs-local;obfs=http;obfs-host=xxx)
            const hostMatch = plugin.match(/obfs-host=([^;]+)/);
            if (hostMatch) {
                parts.push(`obfs-host=${hostMatch[1]}`);
            }
        }

        return `${name} = ${parts.join(', ')}`;
    }

    /**
     * Hysteria2 to Surge配置行
     */
    private parseHysteria2ToSurge(url: string, name: string): string {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const parts = [
            'hysteria2',
            urlObj.hostname.replace(/^\[|\]$/g, ''),
            urlObj.port,
            `password=${decodeURIComponent(urlObj.username)}`,
        ];

        // Bandwidth
        if (params.get('down') || params.get('downmbps')) {
            parts.push(`download-bandwidth=${params.get('down') || params.get('downmbps')}`);
        }

        // SNI
        if (params.get('sni')) {
            parts.push(`sni=${params.get('sni')}`);
        }

        // Skip cert verify
        if (params.get('insecure') === '1') {
            parts.push('skip-cert-verify=true');
        }

        return `${name} = ${parts.join(', ')}`;
    }

    /**
     * Snell to Surge配置行
     */
    private parseSnellToSurge(url: string, name: string): string {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const parts = [
            'snell',
            urlObj.hostname.replace(/^\[|\]$/g, ''),
            urlObj.port,
            `psk=${params.get('psk') || params.get('password')}`,
            `version=${params.get('version') || '4'}`,
        ];

        // Obfs
        const obfs = params.get('obfs');
        if (obfs) {
            parts.push(`obfs=${obfs}`);
            if (params.get('obfs-host')) {
                parts.push(`obfs-host=${params.get('obfs-host')}`);
            }
        }

        return `${name} = ${parts.join(', ')}`;
    }

    /**
     * TUIC to Surge配置行
     */
    private parseTuicToSurge(url: string, name: string): string {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const parts = [
            'tuic',
            urlObj.hostname.replace(/^\[|\]$/g, ''),
            urlObj.port,
            `uuid=${urlObj.username}`,
            `token=${decodeURIComponent(urlObj.password || '')}`, // Changed from password to token for Surge
        ];

        // SNI
        if (params.get('sni')) {
            parts.push(`sni=${params.get('sni')}`);
        }

        // ALPN
        if (params.get('alpn')) {
            parts.push(`alpn=${params.get('alpn')}`);
        }

        // Skip cert verify
        if (params.get('skip-cert-verify') === '1' || params.get('allowInsecure') === '1') {
            parts.push('skip-cert-verify=true');
        }

        return `${name} = ${parts.join(', ')}`;
    }

    /**
     * WireGuard to Surge配置行
     */
    private parseWireGuardToSurge(_url: string, name: string): string {
        // Surge WireGuard uses a section-based configuration
        // Format: name = wireguard, section-name = SectionName
        const sectionName = name.replace(/[^a-zA-Z0-9]/g, '_');

        return `${name} = wireguard, section-name = ${sectionName}`;

        // Note: The actual WireGuard config goes in a [WireGuard SectionName] section
        // which includes: private-key, self-ip, dns-server, mtu, peer settings
        // This is typically done separately in the full configuration
    }

    /**
     * 转换为 Loon 配置
     */
    toLoon(nodes: Node[], _options: ConverterOptions = {}): string {
        const lines: string[] = [];

        lines.push('[General]');
        lines.push('skip-proxy = 192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,localhost,*.local');
        lines.push('');
        lines.push('[Proxy]');

        for (const node of nodes) {
            const line = this.nodeToLoonLine(node);
            if (line) {
                lines.push(line);
            }
        }

        lines.push('');
        lines.push('[Proxy Group]');
        lines.push('Proxy = select,' + nodes.map(n => n.name).join(','));
        lines.push('');
        lines.push('[Rule]');
        lines.push('GEOIP,CN,DIRECT');
        lines.push('FINAL,Proxy');

        return lines.join('\n');
    }

    /**
     * 将 Node 转换为 Loon 配置行
     */
    private nodeToLoonLine(node: Node): string | null {
        const protocol = node.protocol?.toLowerCase();
        const url = node.url;

        try {
            const handlers: Record<string, () => string | null> = {
                'vmess': () => this.parseVmessToLoon(url, node.name),
                'vless': () => this.parseVlessToLoon(url, node.name),
                'trojan': () => this.parseTrojanToLoon(url, node.name),
                'ss': () => this.parseShadowsocksToLoon(url, node.name),
                'shadowsocks': () => this.parseShadowsocksToLoon(url, node.name),
                'ssr': () => this.parseSSRToLoon(url, node.name),
                'shadowsocksr': () => this.parseSSRToLoon(url, node.name),
                'hysteria2': () => this.parseHysteria2ToLoon(url, node.name),
                'hy2': () => this.parseHysteria2ToLoon(url, node.name),
                'wireguard': () => this.parseWireGuardToLoon(url, node.name),
                'wg': () => this.parseWireGuardToLoon(url, node.name),
                'snell': () => this.parseSnellToLoon(url, node.name),
                'tuic': () => this.parseTuicToLoon(url, node.name),
            };

            const handler = handlers[protocol || ''];
            return handler ? handler() : null;

        } catch (error) {
            console.warn(`Loon 转换失败: ${node.name}`, error);
            return null;
        }
    }

    /**
     * VMess to Loon配置行
     */
    private parseVmessToLoon(url: string, name: string): string {
        const base64Content = url.replace('vmess://', '');
        const config = JSON.parse(this.decodeBase64(base64Content));

        const parts = [
            'VMess',
            config.add,
            config.port,
            config.scy || 'auto',
            `"${config.id}"`,
        ];

        // 简化实现,Loon 格式较特殊
        if (config.net === 'ws') {
            parts.push(`transport:ws`);
            if (config.path) parts.push(`path:${config.path}`);
            if (config.host) parts.push(`host:${config.host}`);
        }

        if (config.tls === 'tls') {
            parts.push('over-tls:true');
            if (config.sni) parts.push(`tls-name:${config.sni}`);
        }

        return `${name} = ${parts.join(',')}`;
    }

    /**
     * VLESS to Loon配置行
     */
    private parseVlessToLoon(url: string, name: string): string {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const parts = [
            'VLESS',
            urlObj.hostname.replace(/^\[|\]$/g, ''),
            urlObj.port,
            decodeURIComponent(urlObj.username), // UUID
        ];

        // Flow
        const flow = params.get('flow');
        if (flow) {
            parts.push(`flow:${flow}`);
        }

        // 安全层
        const security = params.get('security');
        if (security === 'tls') {
            parts.push('over-tls:true');
            if (params.get('sni')) {
                parts.push(`tls-name:${params.get('sni')}`);
            }
            if (params.get('alpn')) {
                parts.push(`alpn:${params.get('alpn')}`);
            }
            if (params.get('allowInsecure') === '1') {
                parts.push('skip-cert-verify:true');
            }
        } else if (security === 'reality') {
            // Loon的Reality支持: xtls-rprx-vision + reality
            parts.push('over-tls:true');
            parts.push('xtls-rprx-vision:true');

            if (params.get('sni')) {
                parts.push(`tls-name:${params.get('sni')}`);
            }

            // Reality参数
            if (params.get('pbk')) {
                parts.push(`public-key:${params.get('pbk')}`);
            }
            if (params.get('sid')) {
                parts.push(`short-id:${params.get('sid')}`);
            }
            if (params.get('spx')) {
                parts.push(`spider-x:${params.get('spx')}`);
            }
            if (params.get('fp')) {
                parts.push(`fingerprint:${params.get('fp')}`);
            }
        }

        // 传输协议
        const network = params.get('type') || 'tcp';
        if (network === 'ws') {
            parts.push('transport:ws');
            if (params.get('path')) {
                parts.push(`path:${params.get('path')}`);
            }
            if (params.get('host')) {
                parts.push(`host:${params.get('host')}`);
            }
        } else if (network === 'grpc') {
            parts.push('transport:grpc');
            if (params.get('serviceName')) {
                parts.push(`serviceName:${params.get('serviceName')}`);
            }
        } else if (network === 'http' || network === 'h2') {
            parts.push('transport:http');
            if (params.get('path')) {
                parts.push(`path:${params.get('path')}`);
            }
            if (params.get('host')) {
                parts.push(`host:${params.get('host')}`);
            }
        }

        return `${name} = ${parts.join(',')}`;
    }

    /**
     * Trojan to Loon配置行
     */
    private parseTrojanToLoon(url: string, name: string): string {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const parts = [
            'Trojan',
            urlObj.hostname.replace(/^\[|\]$/g, ''),
            urlObj.port,
            decodeURIComponent(urlObj.username),
        ];

        if (params.get('sni')) {
            parts.push(`tls-name:${params.get('sni')}`);
        }

        if (params.get('allowInsecure') === '1') {
            parts.push('skip-cert-verify:true');
        }

        if (params.get('type') === 'ws') {
            parts.push('transport:ws');
            if (params.get('path')) parts.push(`path:${params.get('path')}`);
            if (params.get('host')) parts.push(`host:${params.get('host')}`);
        }

        return `${name} = ${parts.join(',')}`;
    }

    /**
     * Shadowsocks to Loon配置行
     */
    private parseShadowsocksToLoon(url: string, name: string): string {
        const urlObj = new URL(url);
        let method = '';
        let password = '';
        let server = '';
        let port = 0;

        if (urlObj.username) {
            const userInfo = this.decodeBase64(decodeURIComponent(urlObj.username));
            [method, password] = userInfo.split(':');
            server = urlObj.hostname;
            port = Number(urlObj.port);
        } else {
            const base64Part = url.replace('ss://', '').split('#')[0].split('?')[0];
            const decoded = this.decodeBase64(base64Part);
            const match = decoded.match(/^(.+?):(.+?)@(.+?):(\d+)$/);
            if (!match) return '';
            [, method, password, server, port] = match as any;
        }

        const parts = [
            'Shadowsocks',
            server.replace(/^\[|\]$/g, ''),
            port,
            method,
            `"${password}"`,
        ];

        // Plugin (Obfs)
        const params = new URLSearchParams(urlObj.search);
        const plugin = params.get('plugin');
        if (plugin && plugin.includes('obfs')) {
            parts.push('obfs-name:http'); // Loon uses obfs-name for obfs type
            const hostMatch = plugin.match(/obfs-host=([^;]+)/);
            if (hostMatch) {
                parts.push(`obfs-host:${hostMatch[1]}`);
            }
        }

        return `${name} = ${parts.join(',')}`;
    }

    /**
     * SSR to Loon配置行
     */
    private parseSSRToLoon(url: string, name: string): string {
        const base64Part = url.replace('ssr://', '');
        const decoded = this.decodeBase64(base64Part);

        // SSR格式: server:port:protocol:method:obfs:password_base64/?params
        const match = decoded.match(/^(.+?):(\d+):(.+?):(.+?):(.+?):(.+?)\/?\??(.*)$/);
        if (!match) return '';

        const [, server, port, protocol, method, obfs, passwordBase64] = match;
        const password = this.decodeBase64(passwordBase64.replace(/_/g, '/').replace(/-/g, '+'));

        return `${name} = ShadowsocksR,${server},${port},${method},"${password}",protocol:${protocol},obfs:${obfs}`;
    }

    /**
     * Hysteria2 to Loon配置行
     */
    private parseHysteria2ToLoon(url: string, name: string): string {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const parts = [
            'Hysteria2',
            urlObj.hostname.replace(/^\[|\]$/g, ''),
            urlObj.port,
            decodeURIComponent(urlObj.username), // password
        ];

        // Bandwidth
        if (params.get('down') || params.get('downmbps')) {
            parts.push(`download-bandwidth:${params.get('down') || params.get('downmbps')}`);
        }

        // SNI
        if (params.get('sni')) {
            parts.push(`sni:${params.get('sni')}`);
        }

        // Skip cert verify
        if (params.get('insecure') === '1' || params.get('allowInsecure') === '1') {
            parts.push('skip-cert-verify:true');
        }

        return `${name} = ${parts.join(',')}`;
    }

    /**
     * WireGuard to Loon配置行
     */
    private parseWireGuardToLoon(url: string, name: string): string {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const parts = [
            'WireGuard',
        ];

        // Loon WireGuard config - simplified format
        // interface-ip
        const ip = params.get('ip') || params.get('address');
        if (ip) {
            parts.push(`interface-ip:${ip}`);
        }

        // private-key
        const privateKey = decodeURIComponent(urlObj.username) || params.get('private-key') || params.get('private_key');
        if (privateKey) {
            parts.push(`private-key:${privateKey}`);
        }

        // MTU
        const mtu = params.get('mtu');
        if (mtu) {
            parts.push(`mtu:${mtu}`);
        }

        // Peer info
        parts.push(`peer:(public-key:${params.get('public-key') || params.get('publickey')},endpoint:${urlObj.hostname}:${urlObj.port || '51820'})`);

        return `${name} = ${parts.join(',')}`;
    }

    /**
     * Snell to Loon配置行
     */
    private parseSnellToLoon(url: string, name: string): string {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const parts = [
            'Snell',
            urlObj.hostname.replace(/^\[|\]$/g, ''),
            urlObj.port,
            `psk=${params.get('psk') || params.get('password')}`,
            `version=${params.get('version') || '4'}`,
        ];

        if (params.get('obfs')) {
            parts.push(`obfs=${params.get('obfs')}`);
            if (params.get('obfs-host')) {
                parts.push(`obfs-host=${params.get('obfs-host')}`);
            }
        }

        return `${name} = ${parts.join(',')}`;
    }

    /**
     * TUIC to Loon配置行
     */
    private parseTuicToLoon(url: string, name: string): string {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const parts = [
            'TUIC',
            urlObj.hostname.replace(/^\[|\]$/g, ''),
            urlObj.port,
        ];

        // TUIC v5 uses uuid and password (token)
        if (urlObj.username) {
            parts.push(`uuid=${urlObj.username}`);
        }
        if (urlObj.password) {
            parts.push(`password=${decodeURIComponent(urlObj.password)}`);
        }

        // SNI
        if (params.get('sni')) {
            parts.push(`sni=${params.get('sni')}`);
        }

        // ALPN
        if (params.get('alpn')) {
            parts.push(`alpn=${params.get('alpn')}`);
        }

        // Skip cert verify
        if (params.get('skip-cert-verify') === '1' || params.get('allowInsecure') === '1') {
            parts.push('skip-cert-verify=true');
        }

        return `${name} = ${parts.join(',')}`;
    }

    // ========== 工具方法 ==========

    private encodeBase64(str: string): string {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str).toString('base64');
        }
        try {
            const bytes = new TextEncoder().encode(str);
            const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
            return btoa(binaryString);
        } catch (e) {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
                return String.fromCharCode(parseInt(p1, 16));
            }));
        }
    }

    private decodeBase64(str: string): string {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'base64').toString('utf-8');
        }
        try {
            const binaryString = atob(str);
            const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            return atob(str);
        }
    }
}

// 导出单例
export const subscriptionConverter = new SubscriptionConverter();
