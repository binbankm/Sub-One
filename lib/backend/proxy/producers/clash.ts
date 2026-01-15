/**
 * Clash & ClashMeta Producer (Pro Level)
 * 参考自 Sub-Store: producers/clash.js & clashmeta.js
 */

import { Producer, Proxy, ProducerOptions } from '../types';
import { removeMetadata, cleanProxy } from './utils';

export function Clash_Producer(): Producer {
    return createClashProducer(false);
}

export function ClashMeta_Producer(): Producer {
    return createClashProducer(true);
}

function createClashProducer(isMeta: boolean): Producer {
    const type = 'ALL' as const;

    const produce = (
        proxies: Proxy | Proxy[],
        outputType: 'internal' | 'external' = 'external',
        opts: ProducerOptions = {}
    ): Proxy[] | string => {
        const proxyArray = Array.isArray(proxies) ? proxies : [proxies];

        // 协议支持过滤
        const list = proxyArray
            .filter((p) => {
                if (opts['include-unsupported-proxy']) return true;
                if (isMeta) return true; // Meta 支持全协议
                return ['ss', 'vmess', 'trojan', 'snell', 'http', 'socks5'].includes(p.type);
            })
            .map((p) => convertToClash(p, isMeta));

        if (outputType === 'internal') return list;

        return 'proxies:\n' + list.map((p) => `  - ${JSON.stringify(p)}`).join('\n');
    };

    return { type, produce };
}

function convertToClash(proxy: Proxy, isMeta: boolean): any {
    let p: any = cleanProxy(removeMetadata(proxy));

    // 通用字段标准化
    const result: any = {
        name: p.name,
        type: p.type,
        server: p.server,
        port: p.port,
        udp: p.udp ?? true,
        tfo: p.tfo ?? false,
    };

    switch (p.type) {
        case 'ss':
            result.cipher = p.cipher;
            result.password = p.password;
            if (p.plugin) {
                result.plugin = p.plugin;
                result['plugin-opts'] = p['plugin-opts'];
            }
            break;

        case 'vmess':
            result.uuid = p.uuid;
            result.alterId = p.alterId ?? 0;
            result.cipher = p.cipher || 'auto';
            if (p.tls) {
                result.tls = true;
                result.sni = p.sni;
                result['skip-cert-verify'] = p['skip-cert-verify'];
                if (isMeta && p['tls-fingerprint']) result.fingerprint = p['tls-fingerprint'];
            }
            if (p.network && p.network !== 'tcp') {
                result.network = p.network;
                result[`${p.network}-opts`] = p[`${p.network}-opts` as keyof Proxy];
            }
            break;

        case 'vless':
            if (!isMeta) throw new Error('VLESS requires ClashMeta');
            result.uuid = p.uuid;
            result.cipher = p.cipher || 'none';
            result.tls = true; // VLESS 通常强制 TLS
            result.sni = p.sni;
            result.flow = p.flow;
            if (p.network && p.network !== 'tcp') {
                result.network = p.network;
                result[`${p.network}-opts`] = p[`${p.network}-opts` as keyof Proxy];
            }
            if (p['reality-opts']) {
                result.reality = {
                    'public-key': p['reality-opts']['public-key'],
                    'short-id': p['reality-opts']['short-id'] || '',
                };
            }
            break;

        case 'trojan':
            result.password = p.password;
            result.sni = p.sni;
            result['skip-cert-verify'] = p['skip-cert-verify'];
            if (p.network && p.network !== 'tcp') {
                result.network = p.network;
                result[`${p.network}-opts`] = p[`${p.network}-opts` as keyof Proxy];
            }
            break;

        case 'snell':
            result.psk = p.psk || p.password;
            result.version = p.version || 2;
            if (p['obfs-opts']) result['obfs-opts'] = p['obfs-opts'];
            break;

        case 'hysteria2':
            if (!isMeta) throw new Error('Hysteria2 requires ClashMeta');
            result.password = p.password;
            result.sni = p.sni;
            result['skip-cert-verify'] = p['skip-cert-verify'];
            break;

        case 'tuic':
            if (!isMeta) throw new Error('TUIC requires ClashMeta');
            result.uuid = p.uuid;
            result.password = p.password;
            result.version = p.version || 5;
            result['congestion-controller'] = p['congestion-controller'] || 'bbr';
            break;

        case 'anytls':
            // AnyTLS 映射为 Socks5 + TLS
            result.type = 'socks5';
            result.password = p.password;
            result.tls = true;
            result.sni = p.sni;
            result['skip-cert-verify'] = p['skip-cert-verify'];
            if (p.alpn) result.alpn = p.alpn;
            break;
    }

    return result;
}
