/**
 * Quantumult X Producer (Ultra Level)
 * 参考自 Sub-Store: producers/qx.js
 */

import { Producer, Proxy, ProducerOptions } from '../types';
import { Result, isPresent, removeMetadata, cleanProxy } from './utils';

export function QX_Producer(): Producer {
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
                    console.warn(`QX Producer: Skip node [${p.name}] - ${e.message}`);
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

    // QX 的格式非常特殊，每种协议都有自己的前缀
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
        case 'http':
        case 'socks5':
            return httpSocks(p, asString);
        case 'anytls':
            // AnyTLS 映射为 SOCKS5 + TLS
            return httpSocks({ ...p, type: 'socks5', tls: true } as any, asString);
        default:
            if (opts['include-unsupported-proxy']) {
                return `generic=${p.server}:${p.port}, tag=${p.name}`;
            }
            throw new Error(`Unsupported type for QX: ${p.type}`);
    }
}

/**
 * Shadowsocks 转换
 */
function shadowsocks(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`shadowsocks=${p.server}:${p.port}, method=${p.cipher || 'none'}, password=${p.password}`);

    // SS 插件映射
    if (isPresent(p, 'plugin')) {
        if (p.plugin === 'obfs') {
            const opts = p['plugin-opts'] as any;
            result.append(`, obfs=${opts.mode}`);
            if (opts.host) result.append(`, obfs-host=${opts.host}`);
            if (opts.path) result.append(`, obfs-uri=${opts.path}`);
        } else if (p.plugin === 'v2ray-plugin') {
            const opts = p['plugin-opts'] as any;
            const obfsType = opts.tls ? 'wss' : 'ws';
            result.append(`, obfs=${obfsType}`);
            if (opts.host) result.append(`, obfs-host=${opts.host}`);
            if (opts.path) result.append(`, obfs-uri=${opts.path}`);
        }
    }

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    result.append(`, tag=${p.name}`);
    return result.toString();
}

/**
 * ShadowsocksR 转换
 */
function shadowsocksr(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`shadowsocks=${p.server}:${p.port}, method=${p.cipher}, password=${p.password}`);
    result.append(`, ssr-protocol=${p.protocol}, ssr-protocol-param=${p['protocol-param'] || ''}`);
    result.append(`, obfs=${p.obfs}, obfs-host=${p['obfs-param'] || ''}`);

    appendCommonParams(result, p);
    result.append(`, tag=${p.name}`);
    return result.toString();
}

/**
 * Trojan 转换
 */
function trojan(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`trojan=${p.server}:${p.port}, password=${p.password}`);

    if (p.network === 'ws') {
        result.append(p.tls ? `, obfs=wss` : `, obfs=ws`);
        const wsOpts = p['ws-opts'] as any;
        if (wsOpts?.path) result.append(`, obfs-uri=${wsOpts.path}`);
        if (wsOpts?.headers?.Host) result.append(`, obfs-host=${wsOpts.headers.Host}`);
    } else if (p.tls) {
        result.append(`, over-tls=true`);
    }

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    result.append(`, tag=${p.name}`);
    return result.toString();
}

/**
 * VMess 转换
 */
function vmess(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`vmess=${p.server}:${p.port}, method=${p.cipher === 'auto' ? 'none' : (p.cipher || 'none')}, password=${p.uuid}`);

    // AEAD
    const aead = p.aead !== undefined ? p.aead : (p.alterId === 0);
    result.append(`, aead=${aead}`);

    // Obfs 转换
    if (p.network === 'ws') {
        result.append(p.tls ? `, obfs=wss` : `, obfs=ws`);
    } else if (p.network === 'http') {
        result.append(`, obfs=http`);
    } else if (p.tls) {
        result.append(`, obfs=over-tls`);
    }

    const optsKey = `${p.network}-opts` as keyof Proxy;
    const opts = p[optsKey] as any;
    if (opts) {
        if (opts.path) result.append(`, obfs-uri=${Array.isArray(opts.path) ? opts.path[0] : opts.path}`);
        if (opts.headers?.Host) result.append(`, obfs-host=${Array.isArray(opts.headers.Host) ? opts.headers.Host[0] : opts.headers.Host}`);
    }

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    result.append(`, tag=${p.name}`);
    return result.toString();
}

/**
 * VLESS 转换
 */
function vless(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`vless=${p.server}:${p.port}, method=none, password=${p.uuid}`);

    if (p.network === 'ws') {
        result.append(p.tls ? `, obfs=wss` : `, obfs=ws`);
    } else if (p.tls) {
        result.append(`, obfs=over-tls`);
    }

    const optsKey = `${p.network}-opts` as keyof Proxy;
    const opts = p[optsKey] as any;
    if (opts) {
        if (opts.path) result.append(`, obfs-uri=${Array.isArray(opts.path) ? opts.path[0] : opts.path}`);
        if (opts.headers?.Host) result.append(`, obfs-host=${Array.isArray(opts.headers.Host) ? opts.headers.Host[0] : opts.headers.Host}`);
    }

    // Reality / Flow
    if (p['reality-opts']) {
        if (p['reality-opts']['public-key']) result.append(`, reality-base64-pubkey=${p['reality-opts']['public-key']}`);
        if (p['reality-opts']['short-id']) result.append(`, reality-hex-shortid=${p['reality-opts']['short-id']}`);
    }
    if (p.flow) result.append(`, vless-flow=${p.flow}`);

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    result.append(`, tag=${p.name}`);
    return result.toString();
}

/**
 * HTTP / SOCKS5 转换
 */
function httpSocks(p: Proxy, asString: boolean): string | any {
    if (!asString) return p;
    const result = new Result(p);
    result.append(`${p.type === 'socks5' ? 'socks5' : 'http'}=${p.server}:${p.port}`);
    if (p.username) result.append(`, username=${p.username}`);
    if (p.password) result.append(`, password=${p.password}`);
    if (p.tls) result.append(`, over-tls=true`);

    appendTlsParams(result, p);
    appendCommonParams(result, p);
    result.append(`, tag=${p.name}`);
    return result.toString();
}

/**
 * 工具函数: 追加 QX TLS 参数
 */
function appendTlsParams(result: Result, p: Proxy) {
    if (p.tls) {
        if (p.sni) result.append(`, tls-host=${p.sni}`);
        if (p['skip-cert-verify'] !== undefined) result.append(`, tls-verification=${!p['skip-cert-verify']}`);
        if (p['tls-fingerprint']) result.append(`, tls-cert-sha256=${p['tls-fingerprint']}`);
        if (p.alpn) result.append(`, tls-alpn=${Array.isArray(p.alpn) ? p.alpn.join(',') : p.alpn}`);
    }
}

/**
 * 工具函数: 追加 QX 通用参数
 */
function appendCommonParams(result: Result, p: Proxy) {
    if (p.tfo) result.append(`, fast-open=true`);
    if (p.udp) result.append(`, udp-relay=true`);
    if (p['test-url']) result.append(`, server_check_url=${p['test-url']}`);

    // UOT (UDP over TCP)
    if (p['udp-over-tcp']) {
        result.append(`, udp-over-tcp=true`);
    }
}

export default QX_Producer;
