import type { Node, ConverterOptions } from '../types';
import { decodeBase64 } from './base64';

/**
 * 转换为 Sing-Box JSON 配置
 */
export function toSingBox(nodes: Node[], _options: ConverterOptions = {}): string {
    const outbounds: any[] = [];
    let successCount = 0;
    let failCount = 0;

    // 添加节点
    for (const node of nodes) {
        try {
            const outbound = nodeToSingBoxOutbound(node);
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
function nodeToSingBoxOutbound(node: Node): any | null {
    const protocol = node.protocol?.toLowerCase();
    const url = node.url;

    try {
        const handlers: Record<string, () => any> = {
            'vmess': () => parseVmessToSingBox(url, node.name),
            'vless': () => parseVlessToSingBox(url, node.name),
            'trojan': () => parseTrojanToSingBox(url, node.name),
            'ss': () => parseShadowsocksToSingBox(url, node.name),
            'shadowsocks': () => parseShadowsocksToSingBox(url, node.name),
            'hysteria2': () => parseHysteria2ToSingBox(url, node.name),
            'hy2': () => parseHysteria2ToSingBox(url, node.name),
            'tuic': () => parseTuicToSingBox(url, node.name),
            'wireguard': () => parseWireGuardToSingBox(url, node.name),
            'wg': () => parseWireGuardToSingBox(url, node.name),
        };

        const handler = handlers[protocol || ''];
        return handler ? handler() : null;

    } catch (error) {
        console.warn(`Sing-Box 转换失败: ${node.name}`, error);
        return null;
    }
}

function parseVmessToSingBox(url: string, name: string): any {
    const base64Content = url.replace('vmess://', '');
    const config = JSON.parse(decodeBase64(base64Content));

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

function parseVlessToSingBox(url: string, name: string): any {
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

function parseTrojanToSingBox(url: string, name: string): any {
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

function parseShadowsocksToSingBox(url: string, name: string): any {
    const urlObj = new URL(url);
    let method = '';
    let password = '';
    let server = '';
    let port = 0;

    if (urlObj.username) {
        const userInfo = decodeBase64(decodeURIComponent(urlObj.username));
        [method, password] = userInfo.split(':');
        server = urlObj.hostname;
        port = Number(urlObj.port);
    } else {
        const base64Part = url.replace('ss://', '').split('#')[0].split('?')[0];
        const decoded = decodeBase64(base64Part);
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

function parseHysteria2ToSingBox(url: string, name: string): any {
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

function parseTuicToSingBox(url: string, name: string): any {
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

function parseWireGuardToSingBox(url: string, name: string): any {
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
