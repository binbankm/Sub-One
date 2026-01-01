import type { Node, ConverterOptions } from '../types';
import { decodeBase64 } from './base64';

/**
 * 转换为 Loon 配置
 */
export function toLoon(nodes: Node[], _options: ConverterOptions = {}): string {
    const lines: string[] = [];

    lines.push('[General]');
    lines.push('skip-proxy = 192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,localhost,*.local');
    lines.push('');
    lines.push('[Proxy]');

    for (const node of nodes) {
        const line = nodeToLoonLine(node);
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
function nodeToLoonLine(node: Node): string | null {
    const protocol = node.protocol?.toLowerCase();
    const url = node.url;

    try {
        const handlers: Record<string, () => string | null> = {
            'vmess': () => parseVmessToLoon(url, node.name),
            'vless': () => parseVlessToLoon(url, node.name),
            'trojan': () => parseTrojanToLoon(url, node.name),
            'ss': () => parseShadowsocksToLoon(url, node.name),
            'shadowsocks': () => parseShadowsocksToLoon(url, node.name),
            'ssr': () => parseSSRToLoon(url, node.name),
            'shadowsocksr': () => parseSSRToLoon(url, node.name),
            'hysteria2': () => parseHysteria2ToLoon(url, node.name),
            'hy2': () => parseHysteria2ToLoon(url, node.name),
            'wireguard': () => parseWireGuardToLoon(url, node.name),
            'wg': () => parseWireGuardToLoon(url, node.name),
            'snell': () => parseSnellToLoon(url, node.name),
            'tuic': () => parseTuicToLoon(url, node.name),
        };

        const handler = handlers[protocol || ''];
        return handler ? handler() : null;

    } catch (error) {
        console.warn(`Loon 转换失败: ${node.name}`, error);
        return null;
    }
}

function parseVmessToLoon(url: string, name: string): string {
    const base64Content = url.replace('vmess://', '');
    const config = JSON.parse(decodeBase64(base64Content));

    const parts = [
        'VMess',
        config.add,
        config.port,
        config.scy || 'auto',
        `"${config.id}"`,
    ];

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

function parseVlessToLoon(url: string, name: string): string {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    const parts = [
        'VLESS',
        urlObj.hostname.replace(/^\[|\]$/g, ''),
        urlObj.port,
        decodeURIComponent(urlObj.username),
    ];

    const flow = params.get('flow');
    if (flow) {
        parts.push(`flow:${flow}`);
    }

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
        parts.push('over-tls:true');
        if (params.get('sni')) {
            parts.push(`tls-name:${params.get('sni')}`);
        }
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

function parseTrojanToLoon(url: string, name: string): string {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    const parts = [
        'Trojan',
        urlObj.hostname.replace(/^\[|\]$/g, ''),
        urlObj.port,
        `"${decodeURIComponent(urlObj.username)}"`,
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

    return `${name} = ${parts.join(', ')}`;
}

function parseShadowsocksToLoon(url: string, name: string): string {
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

    const params = new URLSearchParams(urlObj.search);
    const plugin = params.get('plugin');
    if (plugin && plugin.includes('obfs')) {
        parts.push('obfs-name:http');
        const hostMatch = plugin.match(/obfs-host=([^;]+)/);
        if (hostMatch) {
            parts.push(`obfs-host:${hostMatch[1]}`);
        }
    }

    return `${name} = ${parts.join(',')}`;
}

function parseSSRToLoon(url: string, name: string): string {
    const base64Part = url.replace('ssr://', '');
    const decoded = decodeBase64(base64Part);

    const match = decoded.match(/^(.+?):(\d+):(.+?):(.+?):(.+?):(.+?)\/?\\??(.*)$/);
    if (!match) return '';

    const [, server, port, protocol, method, obfs, passwordBase64] = match;
    const password = decodeBase64(passwordBase64.replace(/_/g, '/').replace(/-/g, '+'));

    return `${name} = ShadowsocksR,${server},${port},${method},"${password}",protocol:${protocol},obfs:${obfs}`;
}

function parseHysteria2ToLoon(url: string, name: string): string {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    const parts = [
        'Hysteria2',
        urlObj.hostname.replace(/^\[|\]$/g, ''),
        urlObj.port,
        decodeURIComponent(urlObj.username),
    ];

    if (params.get('down') || params.get('downmbps')) {
        parts.push(`download-bandwidth:${params.get('down') || params.get('downmbps')}`);
    }

    if (params.get('sni')) {
        parts.push(`sni:${params.get('sni')}`);
    }

    if (params.get('insecure') === '1' || params.get('allowInsecure') === '1') {
        parts.push('skip-cert-verify:true');
    }

    return `${name} = ${parts.join(',')}`;
}

function parseWireGuardToLoon(url: string, name: string): string {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    const parts = [
        'WireGuard',
    ];

    const ip = params.get('ip') || params.get('address');
    if (ip) {
        parts.push(`interface-ip:${ip}`);
    }

    const privateKey = decodeURIComponent(urlObj.username) || params.get('private-key') || params.get('private_key');
    if (privateKey) {
        parts.push(`private-key:${privateKey}`);
    }

    const mtu = params.get('mtu');
    if (mtu) {
        parts.push(`mtu:${mtu}`);
    }

    parts.push(`peer:(public-key:${params.get('public-key') || params.get('publickey')},endpoint:${urlObj.hostname}:${urlObj.port || '51820'})`);

    return `${name} = ${parts.join(',')}`;
}

function parseSnellToLoon(url: string, name: string): string {
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

function parseTuicToLoon(url: string, name: string): string {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    const parts = [
        'TUIC',
        urlObj.hostname.replace(/^\[|\]$/g, ''),
        urlObj.port,
    ];

    if (urlObj.username) {
        parts.push(`uuid=${urlObj.username}`);
    }
    if (urlObj.password) {
        parts.push(`password=${decodeURIComponent(urlObj.password)}`);
    }

    if (params.get('sni')) {
        parts.push(`sni=${params.get('sni')}`);
    }

    if (params.get('alpn')) {
        parts.push(`alpn=${params.get('alpn')}`);
    }

    if (params.get('skip-cert-verify') === '1' || params.get('allowInsecure') === '1') {
        parts.push('skip-cert-verify=true');
    }

    return `${name} = ${parts.join(',')}`;
}
