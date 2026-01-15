/**
 * Loon Producer (Ultra Level)
 * 参考自 Sub-Store: producers/loon.js
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

export function Loon_Producer(): Producer {
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

        const lines = proxyArray
            .map((p) => {
                try {
                    return processOne(p, opts, true);
                } catch (e: any) {
                    console.warn(`Loon Producer: Skip node [${p.name}] - ${e.message}`);
                    return '';
                }
            })
            .filter((l) => l !== '');

        return lines.join('\n');
    };

    return { type, produce };
}

function processOne(proxy: Proxy, opts: ProducerOptions, asString: boolean): any {
    const p = cleanProxy(removeMetadata(proxy));

    switch (p.type) {
        case 'ss':
            return shadowsocks(p, asString);
        case 'ssr':
            return shadowsocksr(p, asString);
        case 'trojan':
            return trojan(p, asString);
        case 'vmess':
            return vmess(p, asString);
        case 'vless':
            return vless(p, asString);
        case 'hysteria2':
            return hysteria2(p, asString);
        case 'wireguard':
            return wireguard(p, asString);
        case 'http':
        case 'socks5':
            return httpSocks(p, asString);
        case 'anytls':
            // AnyTLS 映射为 SOCKS5 + TLS
            return httpSocks({ ...p, type: 'socks5', tls: true } as any, asString);
        default:
            if (opts['include-unsupported-proxy']) {
                return `${p.name} = ${p.type},${p.server},${p.port}`;
            }
            throw new Error(`Unsupported type for Loon: ${p.type}`);
    }
}

/**
 * Shadowsocks 转换
 */
function shadowsocks(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`${p.name} = shadowsocks,${p.server},${p.port},${p.cipher || 'none'},"${p.password}"`);

    // SS 插件
    if (isPresent(p, 'plugin')) {
        if (p.plugin === 'obfs') {
            const opts = p['plugin-opts'] as any;
            result.append(`,obfs-name=${opts.mode}`);
            if (opts.host) result.append(`,obfs-host=${opts.host}`);
            if (opts.path) result.append(`,obfs-uri=${opts.path}`);
        }
    }

    appendShadowTls(result, p);
    appendCommonParams(result, p);
    return result.toString();
}

/**
 * ShadowsocksR 转换
 */
function shadowsocksr(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`${p.name} = shadowsocksr,${p.server},${p.port},${p.cipher},"${p.password}"`);
    result.append(`,protocol=${p.protocol},protocol-param="${p['protocol-param'] || ''}"`);
    result.append(`,obfs=${p.obfs},obfs-param="${p['obfs-param'] || ''}"`);

    appendCommonParams(result, p);
    return result.toString();
}

/**
 * Trojan 转换
 */
function trojan(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`${p.name} = trojan,${p.server},${p.port},"${p.password}"`);

    if (p.network === 'ws') {
        result.append(`,transport=ws`);
        const wsOpts = p['ws-opts'] as any;
        if (wsOpts?.path) result.append(`,path=${wsOpts.path}`);
        if (wsOpts?.headers?.Host) result.append(`,host=${wsOpts.headers.Host}`);
    }

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    return result.toString();
}

/**
 * VMess 转换
 */
function vmess(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`${p.name} = vmess,${p.server},${p.port},${p.cipher === 'auto' ? 'none' : (p.cipher || 'none')},"${p.uuid}"`);

    // Transport
    if (p.network === 'ws') {
        result.append(`,transport=ws`);
    } else if (p.network === 'http') {
        result.append(`,transport=http`);
    }
    const opts = p[`${p.network}-opts` as keyof Proxy] as any;
    if (opts) {
        if (opts.path) result.append(`,path=${Array.isArray(opts.path) ? opts.path[0] : opts.path}`);
        if (opts.headers?.Host) result.append(`,host=${Array.isArray(opts.headers.Host) ? opts.headers.Host[0] : opts.headers.Host}`);
    }

    // AEAD
    result.append(`,alterId=${(p.aead !== undefined ? p.aead : (p.alterId === 0)) ? 0 : 1}`);

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    return result.toString();
}

/**
 * VLESS 转换
 */
function vless(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`${p.name} = vless,${p.server},${p.port},"${p.uuid}"`);

    if (p.network === 'ws') result.append(`,transport=ws`);
    const opts = p[`${p.network}-opts` as keyof Proxy] as any;
    if (opts) {
        if (opts.path) result.append(`,path=${opts.path}`);
    }

    if (p.flow) result.append(`,flow=${p.flow}`);

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    return result.toString();
}

/**
 * Hysteria 2 转换
 */
function hysteria2(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`${p.name} = Hysteria2,${p.server},${p.port},"${p.password}"`);

    if (p.obfs === 'salamander' && p['obfs-password']) {
        result.append(`,salamander-password=${p['obfs-password']}`);
    }

    if (p.down) {
        const down = String(p.down).match(/\d+/)?.[0];
        if (down) result.append(`,download-bandwidth=${down}`);
    }

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    return result.toString();
}

/**
 * WireGuard 转换
 */
function wireguard(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`${p.name} = wireguard`);
    if (p.ip) result.append(`,interface-ip=${p.ip}`);
    result.append(`,private-key="${p['private-key']}"`);
    result.append(`,mtu=${p.mtu || 1420}`);

    const allowedIps = Array.isArray(p['allowed-ips']) ? p['allowed-ips'].join(',') : (p['allowed-ips'] || '0.0.0.0/0, ::/0');
    let peerStr = `public-key="${p['public-key']}",allowed-ips="${allowedIps}",endpoint=${p.server}:${p.port}`;
    if (p.reserved) {
        const reserved = Array.isArray(p.reserved) ? p.reserved.join(',') : p.reserved;
        peerStr += `,reserved=[${reserved}]`;
    }
    const psk = p['preshared-key'] ?? p['pre-shared-key'];
    if (psk) peerStr += `,preshared-key="${psk}"`;

    result.append(`,peers=[{${peerStr}}]`);
    appendCommonParams(result, p);
    return result.toString();
}

/**
 * HTTP / SOCKS5 转换
 */
function httpSocks(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    const type = p.tls ? (p.type === 'socks5' ? 'socks5' : 'https') : p.type;
    result.append(`${p.name} = ${type},${p.server},${p.port}`);
    if (p.username) result.append(`,${p.username}`);
    if (p.password) result.append(`,"${p.password}"`);
    if (p.tls) result.append(`,over-tls=true`);

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    return result.toString();
}

/**
 * 工具函数: 追加 TLS
 */
function appendTlsParams(result: Result, p: Proxy) {
    if (p.tls) {
        result.append(`,over-tls=true`);
        if (p.sni) result.append(`,tls-name=${p.sni}`);
        if (p['skip-cert-verify'] !== undefined) result.append(`,skip-cert-verify=${p['skip-cert-verify']}`);
        if (p['tls-fingerprint']) result.append(`,tls-cert-sha256=${p['tls-fingerprint']}`);
    }
    // Reality
    if (p['reality-opts']) {
        result.append(`,public-key="${p['reality-opts']['public-key']}"`);
        if (p['reality-opts']['short-id']) result.append(`,short-id=${p['reality-opts']['short-id']}`);
    }
}

/**
 * 工具函数: 追加 Shadow-TLS
 */
function appendShadowTls(result: Result, p: Proxy) {
    const opts = (p.plugin === 'shadow-tls' ? p['plugin-opts'] as any : null) || (p['shadow-tls-password'] ? p : null);
    if (!opts) return;

    if (opts.password || opts['shadow-tls-password']) result.append(`,shadow-tls-password=${opts.password || opts['shadow-tls-password']}`);
    if (opts.host || opts['shadow-tls-sni']) result.append(`,shadow-tls-sni=${opts.host || opts['shadow-tls-sni']}`);
    if (opts.version || opts['shadow-tls-version']) result.append(`,shadow-tls-version=${opts.version || opts['shadow-tls-version']}`);
}

/**
 * 工具函数: 追加通用参数
 */
function appendCommonParams(result: Result, p: Proxy) {
    if (p.tfo) result.append(`,fast-open=true`);
    if (p.udp) result.append(`,udp=true`);
    if (p['ip-version'] && ipVersions[p['ip-version'] as string]) {
        result.append(`,ip-mode=${ipVersions[p['ip-version'] as string]}`);
    }
    if (p['block-quic'] === 'on' || p['block-quic'] === true) result.append(`,block-quic=true`);
}

export default Loon_Producer;
