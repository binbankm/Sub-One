/**
 * Sub-One Egern Converter
 * https://egernapp.com/zh-CN/docs/configuration/proxies
 */
import type { ConvertOptions, ProxyNode } from '../types';
import { getWireGuardAddressWithCIDR } from '../utils';
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
            let result: EgernProxy | null = null;
            switch (proxy.type) {
                case 'ss':
                    result = this.ss(proxy);
                    break;
                case 'ssr':
                    result = this.ssr(proxy);
                    break;
                case 'ssh':
                    result = this.ssh(proxy);
                    break;
                case 'vmess':
                    result = this.vmess(proxy);
                    break;
                case 'vless':
                    result = this.vless(proxy);
                    break;
                case 'trojan':
                    result = this.trojan(proxy);
                    break;
                case 'http':
                case 'https':
                    result = this.http(proxy);
                    break;
                case 'socks5':
                    result = this.socks5(proxy);
                    break;
                case 'hysteria2':
                    result = this.hysteria2(proxy);
                    break;
                case 'tuic':
                    result = this.tuic(proxy);
                    break;
                case 'wireguard':
                    result = this.wireguard(proxy);
                    break;
                case 'anytls':
                    result = this.anytls(proxy);
                    break;
                case 'snell':
                    result = this.snell(proxy);
                    break;
                default:
                    console.warn(`[EgernConverter] Unsupported proxy type: ${proxy.type}`);
                    return null;
            }
            if (result) {
                const bq = proxy['block-quic'] ?? proxy.block_quic;
                if (['on', 'true', true, '1', 1].includes(bq as any)) {
                    result.block_quic = true;
                } else if (['off', 'false', false, '0', 0].includes(bq as any)) {
                    result.block_quic = false;
                }
            }
            return result;
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

    // ── ShadowsocksR ─────────────────────────────────────────
    private ssr(proxy: ProxyNode): EgernProxy {
        return {
            type: 'shadowsocksr',
            name: proxy.name,
            method: proxy.cipher,
            server: proxy.server,
            port: proxy.port,
            password: proxy.password,
            protocol: proxy.protocol,
            protocol_param: proxy['protocol-param'],
            obfs: proxy.obfs,
            obfs_param: proxy['obfs-param'],
            tfo: getTfo(proxy),
            udp_relay: getUdpRelay(proxy),
        };
    }

    // ── SSH ──────────────────────────────────────────────────
    private ssh(proxy: ProxyNode): EgernProxy {
        return {
            type: 'ssh',
            name: proxy.name,
            server: proxy.server,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
            private_key: proxy['private-key'] || proxy.privateKey,
            host_keys: proxy['host-key'],
            tfo: getTfo(proxy),
        };
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
            user_id: proxy.uuid,
            tfo: getTfo(proxy),
            udp_relay: getUdpRelay(proxy),
            flow: proxy.flow || undefined,
            transport,
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
            auth: proxy.password,
            tfo: getTfo(proxy),
            udp_relay: getUdpRelay(proxy),
            sni: getSni(proxy),
            skip_tls_verify: proxy['skip-cert-verify'],
            reality: getReality(proxy),
        };

        if (proxy.ports) result.port_hopping = proxy.ports;
        if (proxy['hop-interval']) result.port_hopping_interval = proxy['hop-interval'];

        // obfs
        if (proxy.obfs === 'salamander' && proxy['obfs-password']) {
            result.obfs = 'salamander';
            result.obfs_password = proxy['obfs-password'];
        }

        // bandwidth
        if (proxy.up || proxy['up-mbps']) {
            result.bandwidth = parseInt(String(proxy['up-mbps'] || proxy.up).match(/\d+/)?.[0] || '0', 10);
        }

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
            congestion_control: proxy['congestion-controller'] || 'bbr',
        };

        if (proxy.ports) result.port_hopping = proxy.ports;
        if (proxy['hop-interval']) result.port_hopping_interval = proxy['hop-interval'];

        if (proxy.alpn) {
            result.alpn = Array.isArray(proxy.alpn) ? proxy.alpn : [proxy.alpn];
        }

        appendFingerprintSha256(result, proxy);

        return result;
    }

    // ── WireGuard ────────────────────────────────────────────
    private wireguard(proxy: ProxyNode): EgernProxy {
        if (Array.isArray(proxy.peers) && proxy.peers.length > 0) {
            const peer = proxy.peers[0];
            if (peer.server) proxy.server = peer.server;
            if (peer.port) proxy.port = peer.port;
            if (peer.ip) proxy.ip = peer.ip;
            if (peer.ipv6) proxy.ipv6 = peer.ipv6;
            if (peer['public-key']) proxy['public-key'] = peer['public-key'];
            if (peer['pre-shared-key']) proxy['pre-shared-key'] = peer['pre-shared-key'];
            if (peer['allowed-ips']) proxy['allowed-ips'] = peer['allowed-ips'];
            if (peer.reserved) proxy.reserved = peer.reserved;
        }

        const privateKey = proxy['private-key'] || proxy.privateKey;
        const publicKey = proxy['public-key'] || proxy.publicKey;
        const allowedIps = proxy['allowed-ips'] || '0.0.0.0/0, ::/0';
        const reserved = proxy.reserved
            ? Array.isArray(proxy.reserved)
                ? proxy.reserved
                : String(proxy.reserved).split(/[,/]/).map((s: string) => s.trim()).filter(Boolean)
            : undefined;
        const psk = proxy['pre-shared-key'] || proxy['preshared-key'];

        const localIpv4 = getWireGuardAddressWithCIDR(proxy, 'ipv4');
        const localIpv6 = getWireGuardAddressWithCIDR(proxy, 'ipv6');

        const result: EgernProxy = {
            type: 'wireguard',
            name: proxy.name,
            server: proxy.server,
            port: proxy.port,
            private_key: privateKey,
            peer_public_key: publicKey,
            peer: {
                public_key: publicKey,
                allowed_ips: allowedIps,
                endpoint: `${proxy.server}:${proxy.port}`,
            },
            local_ipv4: localIpv4,
            local_ipv6: localIpv6,
            interface_ip: proxy.ip,
            interface_ipv6: proxy.ipv6,
            mtu: proxy.mtu,
            dns_servers: proxy.dns ? (Array.isArray(proxy.dns) ? proxy.dns : String(proxy.dns).split(',').map((s) => s.trim()).filter(Boolean)) : undefined,
            keepalive: proxy.keepalive || proxy['persistent-keepalive'],
        };

        if (reserved) {
            result.reserved = reserved;
            result.peer.reserved = reserved;
        }
        if (psk) {
            result.preshared_key = psk;
            result.peer.preshared_key = psk;
        }

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
            tfo: getTfo(proxy),
        };

        if (proxy.reuse !== undefined) {
            result.reuse = proxy.reuse;
        }

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
            psk: proxy.psk || proxy.password,
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

        if (proxy.reuse !== undefined) {
            result.reuse = proxy.reuse;
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

    if (network === 'tcp') {
        const isTls = proxy.tls || !!proxy['reality-opts'];
        if (isTls) {
            return {
                tls: {
                    sni: getSni(proxy),
                    skip_tls_verify: proxy['skip-cert-verify'],
                    reality: getReality(proxy),
                },
            };
        }
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
