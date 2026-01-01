import type { Node, ConverterOptions } from '../types';
import { decodeBase64 } from './base64';

/**
 * 转换为 QuantumultX 配置
 */
export function toQuantumultX(nodes: Node[], _options: ConverterOptions = {}): string {
    const lines: string[] = [];

    lines.push('[general]');
    lines.push('server_check_url=http://www.apple.com/generate_204');
    lines.push('');
    lines.push('[server_local]');

    for (const node of nodes) {
        const line = nodeToQuantumultXLine(node);
        if (line) {
            lines.push(line);
        }
    }

    lines.push('');
    lines.push('[filter_local]');
    lines.push('host-suffix, local, direct');
    lines.push('geoip, cn, direct');
    lines.push('final, proxy');
    lines.push('');
    lines.push('[policy]');

    return lines.join('\n');
}

/**
 * 将 Node 转换为 QuantumultX 配置行
 */
function nodeToQuantumultXLine(node: Node): string | null {
    const protocol = node.protocol?.toLowerCase();
    const url = node.url;

    try {
        const handlers: Record<string, () => string | null> = {
            'vmess': () => parseVmessToQuantumultX(url, node.name),
            'vless': () => parseVlessToQuantumultX(url, node.name),
            'trojan': () => parseTrojanToQuantumultX(url, node.name),
            'ss': () => parseShadowsocksToQuantumultX(url, node.name),
            'shadowsocks': () => parseShadowsocksToQuantumultX(url, node.name),
            'ssr': () => parseSSRToQuantumultX(url, node.name),
            'shadowsocksr': () => parseSSRToQuantumultX(url, node.name),
        };

        const handler = handlers[protocol || ''];
        return handler ? handler() : null;

    } catch (error) {
        console.warn(`QuantumultX 转换失败: ${node.name}`, error);
        return null;
    }
}

function parseShadowsocksToQuantumultX(url: string, name: string): string {
    const urlObj = new URL(url);
    let userInfo = '';
    let server = '';
    let port = 0;

    if (urlObj.username) {
        userInfo = decodeBase64(decodeURIComponent(urlObj.username));
        server = urlObj.hostname;
        port = Number(urlObj.port);
    } else {
        const base64Part = url.replace('ss://', '').split('#')[0].split('?')[0];
        const decoded = decodeBase64(base64Part);
        const match = decoded.match(/^(.+?):(.+?)@(.+?):(\d+)$/);
        if (!match) return '';

        const [, method, password, host, portStr] = match;
        userInfo = `${method}:${password}`;
        server = host;
        port = Number(portStr);
    }

    const [method, password] = userInfo.split(':');
    const params = new URLSearchParams(urlObj.search);

    const parts: string[] = [];
    parts.push(`shadowsocks=${server.replace(/^\[|\]$/g, '')}:${port}`);
    parts.push(`method=${method}`);
    parts.push(`password=${password}`);

    const plugin = params.get('plugin');
    if (plugin) {
        const [pluginName, ...opts] = plugin.split(';');
        if (pluginName.includes('obfs')) {
            opts.forEach(opt => {
                const [key, value] = opt.split('=');
                if (key === 'obfs') parts.push(`obfs=${value}`);
                if (key === 'obfs-host') parts.push(`obfs-host=${value}`);
                if (key === 'obfs-uri') parts.push(`obfs-uri=${value}`);
            });
        }
    }

    parts.push('fast-open=false');
    parts.push('udp-relay=true');
    parts.push(`tag=${name}`);

    return parts.join(', ');
}

function parseVmessToQuantumultX(url: string, name: string): string {
    const base64Content = url.replace('vmess://', '');
    const config = JSON.parse(decodeBase64(base64Content));

    const parts: string[] = [];
    parts.push(`vmess=${config.add}:${config.port}`);
    parts.push(`method=${config.scy || 'none'}`);
    parts.push(`password=${config.id}`);

    const hasTLS = config.tls === 'tls';
    const network = config.net || 'tcp';

    if (network === 'ws') {
        if (hasTLS) {
            parts.push('obfs=wss');
        } else {
            parts.push('obfs=ws');
        }
        if (config.host) parts.push(`obfs-host=${config.host}`);
        if (config.path) parts.push(`obfs-uri=${config.path}`);
    } else if (network === 'tcp') {
        if (hasTLS) {
            parts.push('obfs=over-tls');
            if (config.host || config.sni) {
                parts.push(`obfs-host=${config.sni || config.host || config.add}`);
            }
        }
    }

    parts.push('fast-open=false');
    parts.push('udp-relay=true');
    parts.push(`tag=${name}`);

    return parts.join(', ');
}

function parseVlessToQuantumultX(url: string, name: string): string {
    const urlObj = new URL(url);
    const uuid = urlObj.username;
    const server = urlObj.hostname.replace(/^\[|\]$/g, '');
    const port = Number(urlObj.port);
    const params = new URLSearchParams(urlObj.search);

    const parts: string[] = [];
    parts.push(`vless=${server}:${port}`);
    parts.push(`method=none`);
    parts.push(`password=${uuid}`);

    const security = params.get('security');
    const hasTLS = security === 'tls' || security === 'reality';
    const network = params.get('type') || 'tcp';

    if (network === 'ws') {
        if (hasTLS) {
            parts.push('obfs=wss');
        } else {
            parts.push('obfs=ws');
        }
        if (params.get('host')) parts.push(`obfs-host=${params.get('host')}`);
        if (params.get('path')) parts.push(`obfs-uri=${params.get('path')}`);
    } else if (network === 'tcp') {
        if (hasTLS) {
            parts.push('obfs=over-tls');
            const sni = params.get('sni') || server;
            parts.push(`obfs-host=${sni}`);
        }
    }

    if (hasTLS) {
        if (params.get('allowInsecure') === '1' || params.get('skipCertVerify') === '1') {
            parts.push('tls-verification=false');
        }
    }

    parts.push('fast-open=false');
    parts.push('udp-relay=false');
    parts.push(`tag=${name}`);

    return parts.join(', ');
}

function parseTrojanToQuantumultX(url: string, name: string): string {
    const urlObj = new URL(url);
    const password = decodeURIComponent(urlObj.username);
    const server = urlObj.hostname.replace(/^\[|\]$/g, '');
    const port = Number(urlObj.port);
    const params = new URLSearchParams(urlObj.search);

    const parts: string[] = [];
    parts.push(`trojan=${server}:${port}`);
    parts.push(`password=${password}`);

    parts.push('over-tls=true');

    const sni = params.get('sni') || server;
    parts.push(`tls-host=${sni}`);

    if (params.get('allowInsecure') === '1' || params.get('skipCertVerify') === '1') {
        parts.push('tls-verification=false');
    } else {
        parts.push('tls-verification=true');
    }

    parts.push('fast-open=false');
    parts.push('udp-relay=true');
    parts.push(`tag=${name}`);

    return parts.join(', ');
}

function parseSSRToQuantumultX(url: string, name: string): string {
    const base64Part = url.replace('ssr://', '');
    const decoded = decodeBase64(base64Part);

    const match = decoded.match(/^(.+?):(\d+?):(.+?):(.+?):(.+?):(.+?)\/?\\??(.*)$/);
    if (!match) {
        console.warn(`无法解析 SSR URL: ${name}`);
        return '';
    }

    const [, server, port, protocol, method, obfs, passwordBase64, paramsStr] = match;
    const password = decodeBase64(passwordBase64.replace(/_/g, '/').replace(/-/g, '+'));

    const params = new URLSearchParams(paramsStr);
    const obfsParam = params.get('obfsparam') ? decodeBase64(params.get('obfsparam')!.replace(/_/g, '/').replace(/-/g, '+')) : '';
    const protocolParam = params.get('protoparam') ? decodeBase64(params.get('protoparam')!.replace(/_/g, '/').replace(/-/g, '+')) : '';

    const parts: string[] = [];
    parts.push(`shadowsocks=${server}:${port}`);
    parts.push(`method=${method}`);
    parts.push(`password=${password}`);
    parts.push(`ssr-protocol=${protocol}`);
    if (protocolParam) parts.push(`ssr-protocol-param=${protocolParam}`);
    parts.push(`obfs=${obfs}`);
    if (obfsParam) parts.push(`obfs-host=${obfsParam}`);
    parts.push('fast-open=false');
    parts.push('udp-relay=true');
    parts.push(`tag=${name}`);

    return parts.join(', ');
}
