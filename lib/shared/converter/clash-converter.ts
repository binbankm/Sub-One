import * as yaml from 'js-yaml';
import type { Node, ConverterOptions } from '../types';
import { decodeBase64 } from './base64';

/**
 * 转换为 Clash Meta YAML 配置
 */
export function toClash(nodes: Node[], _options: ConverterOptions = {}): string {
    const proxies: any[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const node of nodes) {
        try {
            const proxy = nodeToClashProxy(node);
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
function nodeToClashProxy(node: Node): any | null {
    const url = node.url;
    const protocol = node.protocol?.toLowerCase();

    try {
        // 如果已有 originalProxy (从 Clash 解析来的),直接使用
        if (node.originalProxy) {
            return node.originalProxy;
        }

        // 否则从 URL 解析
        const handlers: Record<string, () => any> = {
            'vmess': () => parseVmessToClash(url),
            'vless': () => parseVlessToClash(url),
            'trojan': () => parseTrojanToClash(url),
            'ss': () => parseShadowsocksToClash(url),
            'shadowsocks': () => parseShadowsocksToClash(url),
            'ssr': () => null, // SSR 不被 Clash Meta 原生支持
            'hysteria': () => parseHysteriaToClash(url),
            'hysteria2': () => parseHysteria2ToClash(url),
            'hy2': () => parseHysteria2ToClash(url),
            'tuic': () => parseTuicToClash(url),
            'snell': () => parseSnellToClash(url),
            'wireguard': () => parseWireGuardToClash(url),
            'wg': () => parseWireGuardToClash(url),
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
function parseVmessToClash(url: string): any {
    const base64Content = url.replace('vmess://', '');
    const jsonStr = decodeBase64(base64Content);
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
function parseVlessToClash(url: string): any {
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
function parseTrojanToClash(url: string): any {
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
function parseShadowsocksToClash(url: string): any {
    const urlObj = new URL(url);
    let userInfo = '';
    let server = '';
    let port = 0;

    // 处理两种 SS URL 格式
    if (urlObj.username) {
        // ss://base64@server:port 格式
        userInfo = decodeBase64(decodeURIComponent(urlObj.username));
        server = urlObj.hostname;
        port = Number(urlObj.port);
    } else {
        // ss://base64#name 格式
        const base64Part = url.replace('ss://', '').split('#')[0].split('?')[0];
        const decoded = decodeBase64(base64Part);
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
function parseHysteria2ToClash(url: string): any {
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
function parseHysteriaToClash(url: string): any {
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
function parseTuicToClash(url: string): any {
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
function parseSnellToClash(url: string): any {
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
function parseWireGuardToClash(url: string): any {
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
