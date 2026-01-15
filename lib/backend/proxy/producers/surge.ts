/**
 * Surge Producer (Ultra Level)
 * 参考自 Sub-Store: producers/surge.js (全协议补完版)
 * 
 * 包含对 Hysteria 2, TUIC v5, WireGuard 的原生支持
 */

import { Producer, Proxy, ProducerOptions } from '../types';
import { Result, isPresent, removeMetadata, cleanProxy } from './utils';

const ipVersions: Record<string, string> = {
    dual: 'dual',
    ipv4: 'v4-only',
    ipv6: 'v6-only',
    'ipv4-prefer': 'prefer-v4',
    'ipv6-prefer': 'prefer-v6',
};

export function Surge_Producer(): Producer {
    const type = 'ALL' as const;

    const produce = (
        proxies: Proxy | Proxy[],
        outputType: 'internal' | 'external' = 'external',
        opts: ProducerOptions = {}
    ): string | Proxy[] => {
        const proxyArray = Array.isArray(proxies) ? proxies : [proxies];

        if (outputType === 'internal') {
            return proxyArray.map((p) => processOne(p, opts, false));
        }

        const sections: string[] = [];
        const lines = proxyArray
            .map((p) => {
                try {
                    const result = processOne(p, opts, true);
                    // WireGuard 会额外返回 Section 信息，特殊处理
                    if (p.type === 'wireguard' && typeof result === 'object') {
                        sections.push(result.section);
                        return result.line;
                    }
                    return result as string;
                } catch (e: any) {
                    console.warn(`Surge Producer: Skip node [${p.name}] - ${e.message}`);
                    return '';
                }
            })
            .filter((l) => l !== '');

        let output = lines.join('\n');
        if (sections.length > 0) {
            output += '\n\n' + sections.join('\n');
        }

        return output;
    };

    return { type, produce };
}

function processOne(proxy: Proxy, opts: ProducerOptions, asString: boolean): any {
    const p = cleanProxy(removeMetadata(proxy));
    p.name = p.name.replace(/=|,/g, '');

    switch (p.type) {
        case 'ss':
            return shadowsocks(p, asString);
        case 'ssr':
            throw new Error('Surge does not support SSR');
        case 'vmess':
            return vmess(p, asString);
        case 'vless':
            throw new Error('Surge does not support VLESS');
        case 'trojan':
            return trojan(p, asString);
        case 'hysteria2':
            return hysteria2(p, asString);
        case 'tuic':
            return tuic(p, asString);
        case 'snell':
            return snell(p, asString);
        case 'wireguard':
            return wireguard(p, asString);
        case 'http':
        case 'socks5':
            return httpSocks(p, asString);
        case 'anytls':
            // AnyTLS 映射为 Socks5-TLS
            const anyP = { ...p, type: 'socks5', tls: true };
            return httpSocks(anyP as any, asString);
        default:
            if (opts['include-unsupported-proxy']) {
                return `${p.name} = ${p.type},${p.server},${p.port}`;
            }
            throw new Error(`Unsupported type: ${p.type}`);
    }
}

/**
 * Hysteria 2 转换
 */
function hysteria2(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`${p.name} = hysteria2,${p.server},${p.port}`);

    result.appendIfPresent(`,password="${p.password}"`, 'password');

    // 端口跳跃
    if (isPresent(p, 'ports')) {
        result.append(`,port-hopping="${p.ports?.replace(/,/g, ';')}"`);
    }
    result.appendIfPresent(`,port-hopping-interval=${p['hop-interval']}`, 'hop-interval');

    // 混淆 (Surge 仅支持 salamander)
    if (p.obfs === 'salamander' && p['obfs-password']) {
        result.append(`,salamander-password="${p['obfs-password']}"`);
    }

    // 带宽
    if (p.down) {
        const down = String(p.down).match(/\d+/)?.[0];
        if (down) result.append(`,download-bandwidth=${down}`);
    }

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    return result.toString();
}

/**
 * TUIC 转换
 */
function tuic(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);

    // Surge 通常映射为 tuic-v5
    let type = 'tuic-v4';
    const token = p.token as string | undefined;
    if (!token || token.length === 0) {
        type = 'tuic-v5';
    }

    result.append(`${p.name} = ${type},${p.server},${p.port}`);
    result.appendIfPresent(`,uuid=${p.uuid}`, 'uuid');
    result.appendIfPresent(`,password="${p.password}"`, 'password');
    result.appendIfPresent(`,token=${token}`, 'token');

    if (isPresent(p, 'ports')) {
        result.append(`,port-hopping="${p.ports?.replace(/,/g, ';')}"`);
    }

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    return result.toString();
}

/**
 * Shadowsocks 转换
 */
function shadowsocks(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`${p.name} = ss,${p.server},${p.port}`);
    result.append(`,encrypt-method=${p.cipher || 'none'}`);
    result.append(`,password="${p.password || ''}"`);

    if (isPresent(p, 'plugin') && p.plugin === 'obfs') {
        const opts = (p['plugin-opts'] as any) || {};
        result.append(`,obfs=${opts.mode}`);
        if (opts.host) result.append(`,obfs-host=${opts.host}`);
    }

    appendCommonParams(result, p);
    return result.toString();
}

/**
 * VMess 转换
 */
function vmess(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`${p.name} = vmess,${p.server},${p.port},username=${p.uuid}`);

    const aead = p.aead !== undefined ? p.aead : (p.alterId === 0);
    result.append(`,vmess-aead=${aead}`);

    if (p.network === 'ws') {
        result.append(`,ws=true`);
        const wsOpts = (p['ws-opts'] as any) || {};
        if (wsOpts.path) result.append(`,ws-path=${wsOpts.path}`);
        if (wsOpts.headers?.Host) result.append(`,ws-headers=Host:${wsOpts.headers.Host}`);
    }

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    return result.toString();
}

/**
 * Trojan 转换
 */
function trojan(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`${p.name} = trojan,${p.server},${p.port},password="${p.password}"`);
    appendTlsParams(result, p);
    appendCommonParams(result, p);
    return result.toString();
}

/**
 * Snell 转换
 */
function snell(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    const psk = p.psk || p.password || '';
    result.append(`${p.name} = snell,${p.server},${p.port},psk=${psk},version=${p.version || 2}`);

    if (p['obfs-opts']) {
        const opts = (p['obfs-opts'] as any) || {};
        if (opts.mode) result.append(`,obfs=${opts.mode}`);
        if (opts.host) result.append(`,obfs-host=${opts.host}`);
    }

    appendCommonParams(result, p);
    return result.toString();
}

/**
 * WireGuard 转换
 */
function wireguard(p: Proxy, asString: boolean): any {
    if (!asString) return p;
    const sectionName = p.name;
    const line = `${p.name} = wireguard,section-name=${sectionName}`;

    const section = `[WireGuard ${sectionName}]
private-key = ${p['private-key']}
self-ip = ${p.ip || '10.0.0.1'}
mtu = ${p.mtu || 1420}
peer = (public-key = ${p['public-key']}, endpoint = ${p.server}:${p.port}, keepalive = ${p.keepalive || 25})`;

    return { line, section };
}

/**
 * HTTP / SOCKS5 转换
 */
function httpSocks(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    const type = p.tls ? (p.type === 'socks5' ? 'socks5-tls' : 'https') : p.type;
    result.append(`${p.name} = ${type},${p.server},${p.port}`);
    if (p.username) result.append(`,username="${p.username}"`);
    if (p.password) result.append(`,password="${p.password}"`);
    appendTlsParams(result, p);
    appendCommonParams(result, p);
    return result.toString();
}

/**
 * 工具函数: 追加 TLS 相关参数
 */
function appendTlsParams(result: Result, p: Proxy) {
    if (p.tls || p.type === 'trojan' || p.type === 'hysteria2' || p.type === 'tuic') {
        result.append(`,tls=true`);
        if (p.sni) result.append(`,sni=${p.sni}`);
        if (p['skip-cert-verify']) result.append(`,skip-cert-verify=true`);
        if (p['tls-fingerprint']) result.append(`,server-cert-fingerprint-sha256=${p['tls-fingerprint']}`);
    }
}


/**
 * 工具函数: 追加通用参数
 */
function appendCommonParams(result: Result, p: Proxy) {
    const anyP = p as any;
    if (p.tfo) result.append(`,fast-open=true`);
    if (p.udp) result.append(`,udp=true`);
    if (anyP['ip-version'] && ipVersions[anyP['ip-version']]) {
        result.append(`,ip-mode=${ipVersions[anyP['ip-version']]}`);
    }
    if (anyP['block-quic'] === 'on' || anyP['block-quic'] === true) result.append(`,block-quic=true`);
    result.appendIfPresent(`,no-error-alert=${anyP['no-error-alert']}`, 'no-error-alert');
    result.appendIfPresent(`,test-url=${anyP['test-url']}`, 'test-url');
    result.appendIfPresent(`,underlying-proxy=${anyP['underlying-proxy']}`, 'underlying-proxy');
}

export default Surge_Producer;
