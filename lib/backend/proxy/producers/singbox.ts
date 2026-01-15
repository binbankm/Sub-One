/**
 * Sing-Box Producer (Ultra Level)
 * 参考自 Sub-Store: producers/sing-box.js
 * 
 * 包含对 Transport, TLS, Reality, Smux, uTLS 的完全适配
 */

import { Producer, Proxy, ProducerOptions } from '../types';
import { removeMetadata, cleanProxy } from './utils';

export function SingBox_Producer(): Producer {
    const type = 'ALL' as const;

    const produce = (
        proxies: Proxy | Proxy[],
        outputType: 'internal' | 'external' = 'external',
        _opts: ProducerOptions = {}
    ): any[] | string => {
        const proxyArray = Array.isArray(proxies) ? proxies : [proxies];

        let allOutbounds: any[] = [];
        proxyArray.forEach((p) => {
            try {
                const results = processOne(p);
                if (Array.isArray(results)) {
                    allOutbounds.push(...results);
                } else if (results) {
                    allOutbounds.push(results);
                }
            } catch (e: any) {
                console.warn(`Sing-Box Producer: Skip node [${p.name}] - ${e.message}`);
            }
        });

        if (outputType === 'internal') return allOutbounds;

        return JSON.stringify(allOutbounds, null, 2);
    };

    return { type, produce };
}

function processOne(proxy: Proxy): any {
    const p = cleanProxy(removeMetadata(proxy));

    // 基础参数
    const base: any = {
        tag: p.name,
        server: p.server,
        server_port: p.port,
    };

    // 如果是 Shadowsocks + Shadow-TLS，Sing-Box 需要拆分成两个 Outbound
    if (p.plugin === 'shadow-tls') {
        return shadowTlsSupport(p);
    }

    switch (p.type) {
        case 'ss':
            return {
                ...base,
                type: 'shadowsocks',
                method: p.cipher,
                password: p.password,
                ...commonParsers(p)
            };
        case 'ssr':
            return {
                ...base,
                type: 'shadowsocksr',
                method: p.cipher,
                password: p.password,
                obfs: p.obfs,
                obfs_param: p['obfs-param'],
                protocol: p.protocol,
                protocol_param: p['protocol-param'],
                ...commonParsers(p)
            };
        case 'vmess':
            const vmess: any = {
                ...base,
                type: 'vmess',
                uuid: p.uuid,
                security: p.cipher === 'auto' ? 'auto' : (p.cipher || 'auto'),
                alter_id: p.alterId || 0,
                ...commonParsers(p)
            };
            applyTransport(p, vmess);
            applyTls(p, vmess);
            return vmess;
        case 'vless':
            const vless: any = {
                ...base,
                type: 'vless',
                uuid: p.uuid,
                flow: p.flow || '',
                ...commonParsers(p)
            };
            applyTransport(p, vless);
            applyTls(p, vless);
            return vless;
        case 'trojan':
            const trojan: any = {
                ...base,
                type: 'trojan',
                password: p.password,
                ...commonParsers(p)
            };
            applyTransport(p, trojan);
            applyTls(p, trojan);
            return trojan;
        case 'hysteria':
            return {
                ...base,
                type: 'hysteria',
                up_mbps: parseInt(String(p.up || 0), 10),
                down_mbps: parseInt(String(p.down || 0), 10),
                auth_str: p['auth-str'] || p.auth_str,
                obfs: p.obfs,
                ...commonParsers(p),
                ...hysteriaTls(p)
            };
        case 'hysteria2':
            const hy2: any = {
                ...base,
                type: 'hysteria2',
                password: p.password,
                up_mbps: parseInt(String(p.up || 0), 10),
                down_mbps: parseInt(String(p.down || 0), 10),
                ...commonParsers(p),
                ...hysteriaTls(p)
            };
            if (p.obfs === 'salamander') {
                hy2.obfs = { type: 'salamander', password: p['obfs-password'] };
            }
            return hy2;
        case 'tuic':
            return {
                ...base,
                type: 'tuic',
                uuid: p.uuid,
                password: p.password,
                version: p.version || 5,
                congestion_control: p['congestion-controller'] || 'bbr',
                ...commonParsers(p),
                ...hysteriaTls(p)
            };
        case 'wireguard':
            return {
                ...base,
                type: 'wireguard',
                local_address: p.ip ? [p.ip] : [],
                private_key: p['private-key'],
                peers: [{
                    server: p.server,
                    server_port: p.port,
                    public_key: p['public-key'],
                    pre_shared_key: p['pre-shared-key']
                }],
                mtu: p.mtu || 1420
            };
        case 'http':
        case 'socks5':
            const socks: any = {
                ...base,
                type: p.type === 'socks5' ? 'socks' : 'http',
                username: p.username,
                password: p.password
            };
            if (p.type === 'socks5') socks.version = '5';
            applyTls(p, socks);
            return socks;
        case 'anytls':
            const anytls: any = {
                ...base,
                type: 'socks',
                version: '5',
                username: '',
                password: p.password
            };
            applyTls(p, anytls);
            anytls.tls = { ...anytls.tls, enabled: true };
            return anytls;
        default:
            throw new Error(`Unsupported type: ${p.type}`);
    }
}

/**
 * 处理 Hysteria / TUIC 的特殊 TLS 格式
 */
function hysteriaTls(p: Proxy) {
    const tls: any = {
        tls: {
            enabled: true,
            server_name: p.sni || p.server,
            insecure: !!p['skip-cert-verify']
        }
    };
    if (p.alpn) tls.tls.alpn = Array.isArray(p.alpn) ? p.alpn : [p.alpn];
    return tls;
}

/**
 * 应用传输层设置
 */
function applyTransport(p: Proxy, target: any) {
    if (!p.network || p.network === 'tcp') return;

    const transport: any = { type: p.network };
    const optsKey = `${p.network}-opts` as keyof Proxy;
    const opts = p[optsKey] as any;

    if (p.network === 'ws') {
        transport.path = opts?.path || '/';
        const headers: any = {};
        if (opts?.headers) {
            Object.keys(opts.headers).forEach(k => {
                headers[k] = opts.headers[k];
            });
        }
        transport.headers = headers;

        // httpupgrade 兼容
        if (opts?.['v2ray-http-upgrade']) {
            transport.type = 'httpupgrade';
        }
    } else if (p.network === 'grpc') {
        transport.service_name = opts?.['grpc-service-name'] || '';
    } else if (p.network === 'h2' || p.network === 'http') {
        transport.type = 'http';
        transport.path = opts?.path || '/';
        transport.host = opts?.host || [p.server];
    }

    target.transport = transport;
}

/**
 * 应用标准 TLS / Reality / uTLS 设置
 */
function applyTls(p: Proxy, target: any) {
    if (!p.tls && p.type !== 'trojan') return;

    const tls: any = {
        enabled: true,
        server_name: p.sni || p.server,
        insecure: !!p['skip-cert-verify']
    };

    if (p.alpn) tls.alpn = Array.isArray(p.alpn) ? p.alpn : [p.alpn];

    // Reality
    if (p['reality-opts']) {
        tls.reality = {
            enabled: true,
            public_key: p['reality-opts']['public-key'],
            short_id: p['reality-opts']['short-id'] || ''
        };
        tls.utls = { enabled: true, fingerprint: p['client-fingerprint'] || 'chrome' };
    } else if (p['client-fingerprint']) {
        tls.utls = { enabled: true, fingerprint: p['client-fingerprint'] };
    }

    target.tls = tls;
}

/**
 * 通用解析器 (TFO, Multiplex, Detour)
 */
function commonParsers(p: Proxy) {
    const res: any = {};
    if (p.tfo) res.tcp_fast_open = true;
    if (p.multiplex) {
        const mux = p.multiplex as any;
        res.multiplex = { enabled: true, protocol: mux.protocol || 'smux' };
    }
    return res;
}

/**
 * Shadow-TLS 特殊支持: 拆分为两个 Outbound
 */
function shadowTlsSupport(p: Proxy) {
    const stTag = `${p.name}-shadow-tls`;
    const ssOutbound = {
        tag: p.name,
        type: 'shadowsocks',
        method: p.cipher,
        password: p.password,
        detour: stTag
    };

    const pluginOpts = p['plugin-opts'] as any;
    const stOutbound = {
        tag: stTag,
        type: 'shadowtls',
        server: p.server,
        server_port: p.port,
        version: pluginOpts?.version || 3,
        password: pluginOpts?.password,
        tls: {
            enabled: true,
            server_name: pluginOpts?.host || p.server,
            utls: { enabled: true, fingerprint: p['client-fingerprint'] || 'chrome' }
        }
    };

    return [ssOutbound, stOutbound];
}

export default SingBox_Producer;
