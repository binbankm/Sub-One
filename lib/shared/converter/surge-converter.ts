import type { Node, ConverterOptions } from '../types';
import { decodeBase64 } from './base64';

/**
 * 转换为 Surge 配置
 */
export function toSurge(nodes: Node[], _options: ConverterOptions = {}): string {
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
        const line = nodeToSurgeLine(node);
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
function nodeToSurgeLine(node: Node): string | null {
    const protocol = node.protocol?.toLowerCase();
    const url = node.url;

    try {
        const handlers: Record<string, () => string | null> = {
            'vmess': () => parseVmessToSurge(url, node.name),
            'trojan': () => parseTrojanToSurge(url, node.name),
            'ss': () => parseShadowsocksToSurge(url, node.name),
            'shadowsocks': () => parseShadowsocksToSurge(url, node.name),
            'hysteria2': () => parseHysteria2ToSurge(url, node.name),
            'hy2': () => parseHysteria2ToSurge(url, node.name),
            'snell': () => parseSnellToSurge(url, node.name),
            'tuic': () => parseTuicToSurge(url, node.name),
            'wireguard': () => parseWireGuardToSurge(url, node.name),
            'wg': () => parseWireGuardToSurge(url, node.name),
        };

        const handler = handlers[protocol || ''];
        return handler ? handler() : null;

    } catch (error) {
        console.warn(`Surge 转换失败: ${node.name}`, error);
        return null;
    }
}

function parseVmessToSurge(url: string, name: string): string {
    const base64Content = url.replace('vmess://', '');
    const config = JSON.parse(decodeBase64(base64Content));

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

function parseTrojanToSurge(url: string, name: string): string {
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

function parseShadowsocksToSurge(url: string, name: string): string {
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
        const hostMatch = plugin.match(/obfs-host=([^;]+)/);
        if (hostMatch) {
            parts.push(`obfs-host=${hostMatch[1]}`);
        }
    }

    return `${name} = ${parts.join(', ')}`;
}

function parseHysteria2ToSurge(url: string, name: string): string {
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

function parseSnellToSurge(url: string, name: string): string {
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

function parseTuicToSurge(url: string, name: string): string {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    const parts = [
        'tuic',
        urlObj.hostname.replace(/^\[|\]$/g, ''),
        urlObj.port,
        `uuid=${urlObj.username}`,
        `password=${decodeURIComponent(urlObj.password || '')}`,
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

function parseWireGuardToSurge(_url: string, name: string): string {
    // Surge WireGuard uses a section-based configuration
    const sectionName = name.replace(/[^a-zA-Z0-9]/g, '_');
    return `${name} = wireguard, section-name = ${sectionName}`;
}
