/**
 * Sub-One Egern Converter
 * https://egernapp.com/zh-CN/docs/configuration/proxies
 */
import type { ConvertOptions, ProxyNode } from '../types';
import { BaseConverter } from './base';
import { isPresent } from './utils';

type EgernProxy = Record<string, any>;

export class EgernConverter extends BaseConverter {
    name = 'Egern';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const list = nodes
            .map((node) => this.convertSingle(node))
            .filter(Boolean);

        return (
            'proxies:\n' +
            list.map((p) => '  - ' + JSON.stringify(p) + '\n').join('')
        );
    }

    private convertSingle(proxy: ProxyNode): EgernProxy | null {
        try {
            switch (proxy.type) {
                case 'ss':
                    return this.ss(proxy);
                case 'vmess':
                    return this.vmess(proxy);
                case 'vless':
                    return this.vless(proxy);
                case 'trojan':
                    return this.trojan(proxy);
                case 'http':
                case 'https':
                    return this.http(proxy);
                case 'socks5':
                    return this.socks5(proxy);
                case 'hysteria2':
                    return this.hysteria2(proxy);
                case 'tuic':
                    return this.tuic(proxy);
                case 'wireguard':
                    return this.wireguard(proxy);
                case 'anytls':
                    return this.anytls(proxy);
                case 'snell':
                    return this.snell(proxy);
                default:
                    console.warn(`[EgernConverter] Unsupported proxy type: ${proxy.type}`);
                    return null;
            }
        } catch (e) {
            console.error(`[EgernConverter] Failed to produce Egern config for ${proxy.name}:`, e);
            return null;
        }
    }

    // ── Shadowsocks ──────────────────────────────────────────
    private ss(proxy: ProxyNode): EgernProxy {
        const method = proxy.cipher === 'chacha20-ietf-poly1305'
            ? 'chacha20-poly1305'
            : proxy.cipher;
        const result: EgernProxy = {
            type: 'shadowsocks',
            name: proxy.name,
            method,
            server: proxy.server,
            port: proxy.port,
            password: proxy.password,
            tfo: getTfo(proxy),
        };

        // obfs plugin
        if (proxy.plugin === 'obfs') {
            const opts = (proxy['plugin-opts'] || {}) as any;
            if (['http', 'tls'].includes(opts.mode)) {
                result.obfs = {
                    [opts.mode]: {
                        host: opts.host,
                        path: opts.path,
                    },
                };
            }
        }

        // shadow-tls
        appendShadowTls(result, proxy);

        return result;
    }

    // ── VMess ────────────────────────────────────────────────
    private vmess(proxy: ProxyNode): EgernProxy {
        const security = proxy.cipher || 'auto';
        const transport = buildTransport(proxy);

        let legacy = false;
        if (isPresent(proxy, 'aead') && !proxy.aead) {
            legacy = true;
        } else if (isPresent(proxy, 'alterId') && proxy.alterId !== 0) {
            legacy = true;
        }

        const result: EgernProxy = {
            type: 'vmess',
            name: proxy.name,
            server: proxy.server,
            port: proxy.port,
            user_id: proxy.uuid,
            security,
            tfo: getTfo(proxy),
            legacy,
            udp_relay: getUdpRelay(proxy),
            transport,
            sni: getSni(proxy),
            skip_tls_verify: proxy['skip-cert-verify'],
            reality: getReality(proxy),
        };

        appendShadowTls(result, proxy);
        appendFingerprintSha256(result, proxy);

        return result;
    }

    // ── VLESS ────────────────────────────────────────────────
    private vless(proxy: ProxyNode): EgernProxy {
        if (proxy.encryption && proxy.encryption !== 'none') {
            throw new Error('VLESS encryption is not supported');
        }
        const transport = buildTransport(proxy);

        const result: EgernProxy = {
            type: 'vless',
            name: proxy.name,
            server: proxy.server,
            port: proxy.port,
            uuid: proxy.uuid,
            tfo: getTfo(proxy),
            udp_relay: getUdpRelay(proxy),
            flow: proxy.flow || undefined,
            transport,
            sni: getSni(proxy),
            skip_tls_verify: proxy['skip-cert-verify'],
            reality: getReality(proxy),
        };

        appendShadowTls(result, proxy);
        appendFingerprintSha256(result, proxy);

        return result;
    }

    // ── Trojan ───────────────────────────────────────────────
    private trojan(proxy: ProxyNode): EgernProxy {
        const transport = buildTransport(proxy);

        const result: EgernProxy = {
            type: 'trojan',
            name: proxy.name,
            server: proxy.server,
            port: proxy.port,
            password: proxy.password,
            tfo: getTfo(proxy),
            udp_relay: getUdpRelay(proxy),
            transport,
            sni: getSni(proxy),
            skip_tls_verify: proxy['skip-cert-verify'],
            reality: getReality(proxy),
        };

        appendShadowTls(result, proxy);
        appendFingerprintSha256(result, proxy);

        return result;
    }

    // ── HTTP / HTTPS ─────────────────────────────────────────
    private http(proxy: ProxyNode): EgernProxy {
        const isHttps = proxy.type === 'https' || proxy.tls;
        const result: EgernProxy = {
            type: isHttps ? 'https' : 'http',
            name: proxy.name,
            server: proxy.server,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
            tfo: getTfo(proxy),
        };

        if (hasHeaders(proxy)) {
            result.headers = proxy.headers;
        }

        if (isHttps) {
            result.sni = getSni(proxy);
            result.skip_tls_verify = proxy['skip-cert-verify'];
            result.reality = getReality(proxy);
        }

        appendShadowTls(result, proxy);

        return result;
    }

    // ── SOCKS5 ───────────────────────────────────────────────
    private socks5(proxy: ProxyNode): EgernProxy {
        const result: EgernProxy = {
            type: proxy.tls ? 'socks5_tls' : 'socks5',
            name: proxy.name,
            server: proxy.server,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
            tfo: getTfo(proxy),
            udp_relay: getUdpRelay(proxy),
        };

        if (proxy.tls) {
            result.sni = getSni(proxy);
            result.skip_tls_verify = proxy['skip-cert-verify'];
            result.reality = getReality(proxy);
        }

        return result;
    }

    // ── Hysteria2 ────────────────────────────────────────────
    private hysteria2(proxy: ProxyNode): EgernProxy {
        const result: EgernProxy = {
            type: 'hysteria2',
            name: proxy.name,
            server: proxy.server,
            port: proxy.port,
            password: proxy.password,
            tfo: getTfo(proxy),
            udp_relay: getUdpRelay(proxy),
            sni: getSni(proxy),
            skip_tls_verify: proxy['skip-cert-verify'],
            reality: getReality(proxy),
        };

        // obfs
        if (proxy.obfs === 'salamander' && proxy['obfs-password']) {
            result.obfs = {
                salamander: {
                    password: proxy['obfs-password'],
                },
            };
        }

        // bandwidth
        if (proxy.up) result.up = proxy.up;
        if (proxy.down) result.down = proxy.down;

        appendFingerprintSha256(result, proxy);

        return result;
    }

    // ── TUIC ─────────────────────────────────────────────────
    private tuic(proxy: ProxyNode): EgernProxy {
        const result: EgernProxy = {
            type: 'tuic',
            name: proxy.name,
            server: proxy.server,
            port: proxy.port,
            uuid: proxy.uuid,
            password: proxy.password,
            tfo: getTfo(proxy),
            udp_relay: getUdpRelay(proxy),
            sni: getSni(proxy),
            skip_tls_verify: proxy['skip-cert-verify'],
            reality: getReality(proxy),
            congestion_control: proxy['congestion-control'] || 'bbr',
        };

        if (proxy.alpn) {
            result.alpn = Array.isArray(proxy.alpn) ? proxy.alpn : [proxy.alpn];
        }

        appendFingerprintSha256(result, proxy);

        return result;
    }

    // ── WireGuard ────────────────────────────────────────────
    private wireguard(proxy: ProxyNode): EgernProxy {
        const privateKey = proxy['private-key'] || proxy.privateKey;
        const publicKey = proxy['public-key'] || proxy.publicKey;
        const allowedIps = proxy['allowed-ips'] || '0.0.0.0/0, ::/0';
        const reserved = proxy.reserved
            ? Array.isArray(proxy.reserved)
                ? proxy.reserved
                : String(proxy.reserved).split(',').map((s: string) => s.trim())
            : undefined;
        const psk = proxy['pre-shared-key'] || proxy['preshared-key'];

        const result: EgernProxy = {
            type: 'wireguard',
            name: proxy.name,
            server: proxy.server,
            port: proxy.port,
            private_key: privateKey,
            peer: {
                public_key: publicKey,
                allowed_ips: allowedIps,
                endpoint: `${proxy.server}:${proxy.port}`,
            },
            interface_ip: proxy.ip,
            interface_ipv6: proxy.ipv6,
            mtu: proxy.mtu,
            dns: proxy.dns,
            keepalive: proxy.keepalive || proxy['persistent-keepalive'],
        };

        if (reserved) result.peer.reserved = reserved;
        if (psk) result.peer.preshared_key = psk;

        return result;
    }

    // ── AnyTLS ───────────────────────────────────────────────
    private anytls(proxy: ProxyNode): EgernProxy {
        const result: EgernProxy = {
            type: 'anytls',
            name: proxy.name,
            server: proxy.server,
            port: proxy.port,
            password: proxy.password,
            sni: getSni(proxy),
            skip_tls_verify: proxy['skip-cert-verify'],
            reality: getReality(proxy),
            udp_relay: getUdpRelay(proxy),
        };

        appendShadowTls(result, proxy);
        appendFingerprintSha256(result, proxy);

        return result;
    }

    // ── Snell ────────────────────────────────────────────────
    private snell(proxy: ProxyNode): EgernProxy {
        const version = normalizeSnellVersion(proxy.version);
        if (version === null) {
            throw new Error(`Snell version ${proxy.version} is not supported`);
        }

        const result: EgernProxy = {
            type: 'snell',
            name: proxy.name,
            server: proxy.server,
            port: proxy.port,
            psk: proxy.password,
            version,
            tfo: getTfo(proxy),
        };

        if (version >= 3) {
            result.udp_relay = getUdpRelay(proxy);
        }

        if (proxy.obfs || proxy['obfs-opts']?.mode) {
            result.obfs = proxy['obfs-opts']?.mode || proxy.obfs;
            result.obfs_host = proxy['obfs-opts']?.host || proxy['obfs-host'];
        }

        return result;
    }
}

// ── Helper functions ──────────────────────────────────────

function getTfo(proxy: ProxyNode): boolean | undefined {
    return proxy.tfo ?? proxy['fast-open'];
}

function getUdpRelay(proxy: ProxyNode): boolean | undefined {
    return proxy.udp;
}

function getSni(proxy: ProxyNode): string | undefined {
    if (proxy.tls && !proxy.sni) return proxy.server;
    return proxy.sni;
}

function getReality(proxy: ProxyNode): { public_key: string; short_id: string } | undefined {
    const opts = proxy['reality-opts'];
    if (!opts) return undefined;
    const publicKey = opts['public-key'];
    const shortId = opts['short-id'];
    if (!publicKey && !shortId) return undefined;
    const reality: Record<string, string> = {};
    if (publicKey) reality.public_key = publicKey;
    if (shortId) reality.short_id = shortId;
    return reality as { public_key: string; short_id: string };
}

function hasHeaders(proxy: ProxyNode): boolean {
    return !!(proxy.headers && typeof proxy.headers === 'object' && Object.keys(proxy.headers).length > 0);
}

function normalizeSnellVersion(version: any): number | null {
    if (version == null) return undefined as any;
    const v = `${version}`.trim();
    if (!/^[1-5]$/.test(v)) return null;
    return parseInt(v, 10);
}

function buildTransport(proxy: ProxyNode): Record<string, any> | undefined {
    const network = proxy.network || 'tcp';

    if (network === 'ws') {
        const wsOpts = (proxy['ws-opts'] || {}) as any;
        const key = proxy.tls ? 'wss' : 'ws';
        return {
            [key]: {
                path: wsOpts.path,
                headers: wsOpts.headers?.Host ? { Host: wsOpts.headers.Host } : undefined,
                sni: proxy.tls ? getSni(proxy) : undefined,
                skip_tls_verify: proxy.tls ? proxy['skip-cert-verify'] : undefined,
                reality: proxy.tls ? getReality(proxy) : undefined,
            },
        };
    }

    if (network === 'h2') {
        const h2Opts = (proxy['h2-opts'] || {}) as any;
        const headers: Record<string, string> = {};
        if (h2Opts.headers) {
            for (const [k, v] of Object.entries(h2Opts.headers)) {
                if (/^host$/i.test(k)) continue;
                const val = Array.isArray(v) ? v[0] : v;
                if (val != null) headers[k] = String(val);
            }
        }
        const host = Array.isArray(h2Opts.host) ? h2Opts.host[0] : h2Opts.host;
        if (host) headers.Host = host;
        return {
            http2: {
                method: h2Opts.method,
                path: Array.isArray(h2Opts.path) ? h2Opts.path[0] : h2Opts.path,
                headers: Object.keys(headers).length > 0 ? headers : undefined,
                sni: getSni(proxy),
                skip_tls_verify: proxy['skip-cert-verify'],
            },
        };
    }

    if (network === 'http') {
        const httpOpts = (proxy['http-opts'] || {}) as any;
        const host = Array.isArray(httpOpts.headers?.Host)
            ? httpOpts.headers.Host[0]
            : httpOpts.headers?.Host;
        return {
            http1: {
                method: httpOpts.method,
                path: Array.isArray(httpOpts.path) ? httpOpts.path[0] : httpOpts.path,
                headers: host ? { Host: host } : undefined,
                skip_tls_verify: proxy['skip-cert-verify'],
            },
        };
    }

    if (network === 'grpc') {
        const grpcOpts = (proxy['grpc-opts'] || {}) as any;
        return {
            grpc: {
                service_name: grpcOpts['grpc-service-name'],
                sni: getSni(proxy),
                reality: getReality(proxy),
                skip_tls_verify: proxy['skip-cert-verify'],
            },
        };
    }

    if (network === 'tcp' && proxy.tls) {
        return {
            tls: {
                sni: getSni(proxy),
                skip_tls_verify: proxy['skip-cert-verify'],
            },
        };
    }

    return undefined;
}

function appendShadowTls(result: EgernProxy, proxy: ProxyNode) {
    if (isPresent(proxy, 'shadow-tls-password')) {
        if (proxy['shadow-tls-version'] != null && proxy['shadow-tls-version'] != 3) {
            throw new Error(`shadow-tls version ${proxy['shadow-tls-version']} is not supported`);
        }
        result.shadow_tls = {
            password: proxy['shadow-tls-password'],
            sni: proxy['shadow-tls-sni'],
        };
    } else if (proxy.plugin === 'shadow-tls' && proxy['plugin-opts']) {
        const opts = proxy['plugin-opts'] as any;
        if (opts.version != null && opts.version != 3) {
            throw new Error(`shadow-tls version ${opts.version} is not supported`);
        }
        result.shadow_tls = {
            password: opts.password,
            sni: opts.host,
        };
    }
}

function appendFingerprintSha256(result: EgernProxy, proxy: ProxyNode) {
    const fp = proxy['tls-fingerprint'];
    if (typeof fp !== 'string') return;
    const trimmed = fp.trim();
    if (trimmed.length === 0) return;
    result.fingerprint_sha256 = trimmed;
}
