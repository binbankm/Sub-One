/**
 * Sub-One Loon Converter
 */
import type { ConvertOptions, ProxyNode } from '../types';
import { normalizeReserved } from '../utils';
import { BaseConverter } from './base';
import { Result, isPresent } from './utils';

const ipVersions: Record<string, string> = {
    dual: 'dual',
    ipv4: 'v4-only',
    ipv6: 'v6-only',
    'ipv4-prefer': 'prefer-v4',
    'ipv6-prefer': 'prefer-v6'
};

function appendReality(result: Result, proxy: ProxyNode) {
    result.appendIfPresent(`,sni=${proxy.sni}`, 'sni');
    if (proxy['reality-opts']) {
        result.appendIfPresent(
            `,public-key="${proxy['reality-opts']['public-key']}"`,
            'reality-opts.public-key'
        );
        result.appendIfPresent(
            `,short-id=${proxy['reality-opts']['short-id']}`,
            'reality-opts.short-id'
        );
    }
}

function getLoonTlsProfile(proxy: ProxyNode): string | undefined {
    const tlsProfile = `${proxy._loon_tls_profile || ''}`.trim();
    if (
        [
            'global',
            'default',
            'safari-ios18',
            'safari-ios-26',
            'chrome',
            'chrome147'
        ].includes(tlsProfile)
    ) {
        return tlsProfile;
    }

    const fingerprint = `${proxy['client-fingerprint'] || ''}`.trim().toLowerCase();
    if (proxy['reality-opts']?.['support-x25519mlkem768']) {
        return ['safari', 'ios'].includes(fingerprint)
            ? 'safari-ios-26'
            : 'chrome147';
    }

    switch (fingerprint) {
        case 'chrome':
            return 'chrome';
        case 'safari':
        case 'ios':
            return 'safari-ios18';
    }
    return undefined;
}

function appendTlsProfile(result: Result, proxy: ProxyNode) {
    const tlsProfile = getLoonTlsProfile(proxy);
    if (tlsProfile) result.append(`,tls-profile=${tlsProfile}`);
}

export class LoonConverter extends BaseConverter {
    name = 'Loon';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const lines = nodes.map((node) => this.convertSingle(node, _options)).filter(Boolean);
        return lines.join('\n');
    }

    private convertSingle(proxy: ProxyNode, _opts: ConvertOptions): string {
        try {
            let result = '';
            switch (proxy.type) {
                case 'ss':
                    result = this.ss(proxy);
                    break;
                case 'ssr':
                    result = this.ssr(proxy);
                    break;
                case 'trojan':
                    result = this.trojan(proxy);
                    break;
                case 'vmess':
                    result = this.vmess(proxy);
                    break;
                case 'vless':
                    result = this.vless(proxy);
                    break;
                case 'http':
                case 'https':
                    result = this.http(proxy);
                    break;
                case 'socks5':
                    result = this.socks5(proxy);
                    break;
                case 'wireguard':
                    result = this.wireguard(proxy);
                    break;
                case 'snell':
                    result = this.snell(proxy);
                    break;
                case 'tuic':
                    result = this.tuic(proxy);
                    break;
                case 'hysteria':
                    result = this.hysteria(proxy);
                    break;
                case 'hysteria2':
                    result = this.hysteria2(proxy);
                    break;
                case 'anytls':
                    result = this.anytls(proxy);
                    break;
                default:
                    console.warn(`[LoonConverter] Unsupported proxy type: ${proxy.type}`);
                    return '';
            }
            if (result && Array.isArray(proxy['server-dns']) && proxy['server-dns'].length > 0) {
                result += `,server-dns="${proxy['server-dns'].join(',')}"`;
            }
            return result;
        } catch (e) {
            console.error(`[LoonConverter] Failed to produce Loon config for ${proxy.name}:`, e);
            return '';
        }
    }

    private ss(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=shadowsocks,${proxy.server},${proxy.port},${proxy.cipher},"${proxy.password}"`
        );

        if (proxy.plugin === 'obfs') {
            const opts = (proxy['plugin-opts'] || {}) as any;
            result.append(`,obfs-name=${opts.mode || 'http'}`);
            result.appendIfPresent(`,obfs-host=${opts.host}`, 'plugin-opts.host');
            result.appendIfPresent(`,obfs-uri=${opts.path}`, 'plugin-opts.path');
        } else if (proxy.plugin === 'shadow-tls' || isPresent(proxy, 'shadow-tls-password')) {
            const opts = (proxy['plugin-opts'] || {}) as any;
            const password = opts.password || proxy['shadow-tls-password'];
            const host = opts.host || proxy['shadow-tls-sni'];
            const version = opts.version || proxy['shadow-tls-version'];
            if (password) {
                result.append(`,shadow-tls-password=${password}`);
                if (host) result.append(`,shadow-tls-sni=${host}`);
                if (version) result.append(`,shadow-tls-version=${version}`);
                result.appendIfPresent(`,udp-port=${proxy['udp-port']}`, 'udp-port');
            }
        }

        if ((proxy['udp-over-tcp'] || proxy.uot) && proxy.plugin !== 'obfs' && proxy['udp-over-tcp-version'] !== 1) {
            result.append(`,udp-over-tcp=true`);
        }

        this.appendCommon(result, proxy);
        return result.toString();
    }

    private ssr(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=shadowsocksr,${proxy.server},${proxy.port},${proxy.cipher},"${proxy.password}"`
        );
        result.append(`,protocol=${proxy.protocol || 'origin'}`);
        result.appendIfPresent(`,protocol-param=${proxy['protocol-param']}`, 'protocol-param');
        result.appendIfPresent(`,obfs=${proxy.obfs || 'plain'}`, 'obfs');
        result.appendIfPresent(`,obfs-param=${proxy['obfs-param']}`, 'obfs-param');

        this.appendCommon(result, proxy);
        return result.toString();
    }

    private trojan(proxy: ProxyNode): string {
        const isReality = !!proxy['reality-opts'];
        const result = new Result(proxy);
        result.append(`${proxy.name}=trojan,${proxy.server},${proxy.port},"${proxy.password}"`);

        if (proxy.network === 'ws') {
            result.append(`,transport=ws`);
            const wsOpts = (proxy['ws-opts'] || {}) as any;
            result.appendIfPresent(`,path=${wsOpts.path || '/'}`, 'ws-opts.path');
            result.appendIfPresent(`,host=${wsOpts.headers?.Host}`, 'ws-opts.headers.Host');
        }

        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );

        if (isReality) {
            appendReality(result, proxy);
        } else {
            const sni = proxy.sni || proxy.servername;
            if (sni) result.append(`,tls-name=${sni}`);
            result.appendIfPresent(
                `,tls-cert-sha256=${proxy['tls-fingerprint']}`,
                'tls-fingerprint'
            );
            result.appendIfPresent(
                `,tls-pubkey-sha256=${proxy['tls-pubkey-sha256']}`,
                'tls-pubkey-sha256'
            );
        }

        if (proxy.alpn) {
            const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
            if (alpn) result.append(`,alpn="${alpn}"`);
        }

        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vmess(proxy: ProxyNode): string {
        const isReality = !!proxy['reality-opts'];
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=vmess,${proxy.server},${proxy.port},${proxy.cipher || 'auto'},"${proxy.uuid}"`
        );
        this.appendTransport(result, proxy);
        result.appendIfPresent(`,over-tls=${!!proxy.tls}`, 'tls');
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );

        if (isReality) {
            appendReality(result, proxy);
        } else {
            result.appendIfPresent(`,tls-name=${proxy.sni}`, 'sni');
        }

        // aead 字段存在时: true→alterId=0 (AEAD开启), false→alterId=1; 不存在时直接用 alterId
        if (proxy.aead !== undefined) {
            result.append(`,alterId=${proxy.aead ? 0 : 1}`);
        } else {
            result.append(`,alterId=${proxy.alterId ?? 0}`);
        }
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vless(proxy: ProxyNode): string {
        if (proxy.encryption && proxy.encryption !== 'none') {
            throw new Error(
                `[LoonConverter] VLESS encryption is not supported: ${proxy.encryption}`
            );
        }
        const result = new Result(proxy);
        result.append(`${proxy.name}=vless,${proxy.server},${proxy.port},"${proxy.uuid}"`);
        this.appendTransport(result, proxy);
        result.appendIfPresent(`,over-tls=${!!proxy.tls}`, 'tls');
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );
        if (proxy.flow) result.append(`,flow=${proxy.flow}`);
        if (proxy['reality-opts']) {
            appendReality(result, proxy);
            const reality = proxy['reality-opts'];
            result.appendIfPresent(
                `,spider-x=${reality['_spider-x'] || reality['spider-x']}`,
                'reality-opts.spider-x'
            );
        } else {
            result.appendIfPresent(`,tls-name=${proxy.sni}`, 'sni');
            result.appendIfPresent(
                `,tls-cert-sha256=${proxy['tls-fingerprint']}`,
                'tls-fingerprint'
            );
        }
        // TLS profile
        appendTlsProfile(result, proxy);
        // ALPN
        if (proxy.alpn) {
            const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
            if (alpn) result.append(`,alpn="${alpn}"`);
        }
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private http(proxy: ProxyNode): string {
        const result = new Result(proxy);
        const type = proxy.type === 'https' || proxy.tls ? 'https' : 'http';
        result.append(`${proxy.name}=${type},${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,${proxy.username}`, 'username');
        result.appendIfPresent(`,"${proxy.password}"`, 'password');
        result.appendIfPresent(`,tls-name=${proxy.sni}`, 'sni');
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private socks5(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=socks5,${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,${proxy.username}`, 'username');
        result.appendIfPresent(`,"${proxy.password}"`, 'password');
        result.appendIfPresent(`,over-tls=${!!proxy.tls}`, 'tls');
        result.appendIfPresent(`,tls-name=${proxy.sni}`, 'sni');
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private wireguard(proxy: ProxyNode): string {
        const p = { ...proxy };
        if (Array.isArray(p.peers) && p.peers.length > 0) {
            const peer = p.peers[0];
            if (peer.endpoint) {
                const [server, port] = peer.endpoint.split(':');
                p.server = server;
                p.port = parseInt(port || '51820', 10);
            } else {
                if (peer.server) p.server = peer.server;
                if (peer.port) p.port = parseInt(String(peer.port), 10);
            }
            if ((peer as any).ip) p.ip = (peer as any).ip;
            if ((peer as any).ipv6) p.ipv6 = (peer as any).ipv6;
            if (peer['public-key']) p['public-key'] = peer['public-key'];
            if (peer['pre-shared-key']) p['pre-shared-key'] = peer['pre-shared-key'];
            if (peer['allowed-ips']) p['allowed-ips'] = peer['allowed-ips'];
            if (peer.reserved) p.reserved = peer.reserved;
        }

        const result = new Result(p);
        result.append(`${p.name}=wireguard`);
        result.appendIfPresent(`,interface-ip=${p.ip}`, 'ip');
        result.appendIfPresent(`,interface-ipv6=${p.ipv6}`, 'ipv6');
        result.appendIfPresent(
            `,private-key="${p['private-key'] || p.privateKey}"`,
            'private-key'
        );
        result.appendIfPresent(`,mtu=${p.mtu}`, 'mtu');
        // DNS: 区分 IPv4 (dns=) 和 IPv6 (dnsv6=)
        if (p.dns) {
            let dns: string | undefined;
            let dnsv6: string | undefined;
            if (Array.isArray(p.dns)) {
                const isIPv4 = (ip: string) => /^\d+\.\d+\.\d+\.\d+$/.test(ip);
                const isIPv6 = (ip: string) => /^[\da-fA-F:]+$/.test(ip) && ip.includes(':');
                dnsv6 = p.dns.find(isIPv6);
                dns = p.dns.find(isIPv4);
                if (!dns) dns = p.dns.find((i: string) => !isIPv4(i) && !isIPv6(i));
            } else {
                dns = String(p.dns);
            }
            if (dns) result.append(`,dns=${dns}`);
            if (dnsv6) result.append(`,dnsv6=${dnsv6}`);
        }
        result.appendIfPresent(
            `,keepalive=${p.keepalive || p['persistent-keepalive']}`,
            'keepalive'
        );

        const publicKey = p['public-key'] || p.publicKey;
        const rawAllowed = p['allowed-ips'];
        const allowedIps = Array.isArray(rawAllowed) ? rawAllowed.join(', ') : rawAllowed || '0.0.0.0/0, ::/0';
        const resNums = normalizeReserved(p.reserved);
        const reserved = resNums
            ? `,reserved=[${resNums.join(',')}]`
            : '';
        const psk =
            p['pre-shared-key'] || p['preshared-key']
                ? `,preshared-key="${p['pre-shared-key'] || p['preshared-key']}"`
                : '';

        result.append(
            `,peers=[{public-key="${publicKey}",allowed-ips="${allowedIps}",endpoint=${p.server}:${p.port}${reserved}${psk}}]`
        );

        return result.toString();
    }

    private hysteria(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=hysteria,${proxy.server},${proxy.port},${proxy.auth || ''}`);
        result.appendIfPresent(`,up=${proxy.up}`, 'up');
        result.appendIfPresent(`,down=${proxy.down}`, 'down');
        const sni = proxy.sni || proxy.servername;
        if (sni) result.append(`,sni=${sni}`);
        if (proxy.obfs) result.append(`,obfs=${proxy.obfs}`);
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private hysteria2(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=Hysteria2,${proxy.server},${proxy.port}`);
        const pass = proxy.password || proxy.auth;
        if (pass) result.append(`,"${pass}"`);
        const ports = proxy.ports || proxy['server-ports'];
        if (ports && `${ports}`.trim().length > 0) {
            result.append(`,server-ports="${ports}"`);
        }
        if (isPresent(proxy, 'hop-interval') && `${proxy['hop-interval']}`.trim().length > 0) {
            result.append(`,hop-interval=${proxy['hop-interval']}`);
        }
        const sni = proxy.sni || proxy.servername;
        if (sni) result.append(`,tls-name=${sni}`);
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );
        result.appendIfPresent(
            `,tls-cert-sha256=${proxy['tls-fingerprint']}`,
            'tls-fingerprint'
        );
        const down = proxy['down-mbps'] || proxy.down;
        if (down) {
            const downVal = String(down).match(/\d+/)?.[0] || '0';
            result.append(`,download-bandwidth=${downVal}`);
        }
        const obfsPassword =
            proxy['obfs-password'] ||
            (proxy.obfs && proxy.obfs !== 'salamander' && proxy.obfs !== 'gecko' ? proxy.obfs : undefined);
        if (obfsPassword || proxy.obfs === 'salamander') {
            if (obfsPassword) result.append(`,salamander-password=${obfsPassword}`);
        }
        if (proxy.alpn) {
            const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
            if (alpn) result.append(`,alpn="${alpn}"`);
        }
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private tuic(proxy: ProxyNode): string {
        const result = new Result(proxy);
        const pass = proxy.password || proxy.token || '';
        result.append(
            `${proxy.name}=tuic,${proxy.server},${proxy.port},"${proxy.uuid || ''}","${pass}"`
        );
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );
        const sni = proxy.sni || proxy.servername;
        if (sni) result.append(`,sni=${sni}`);
        if (proxy.alpn) {
            const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
            if (alpn) result.append(`,alpn=${alpn}`);
        }
        if (proxy['congestion-controller']) {
            result.append(`,congestion-controller=${proxy['congestion-controller']}`);
        }
        if (proxy['udp-relay-mode']) {
            result.append(`,udp-relay-mode=${proxy['udp-relay-mode']}`);
        }
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private snell(proxy: ProxyNode): string {
        const result = new Result(proxy);
        const psk = proxy.psk || proxy.password;
        result.append(
            `${proxy.name}=snell,${proxy.server},${proxy.port},psk="${psk}",version=${proxy.version || 4}`
        );
        const obfs = proxy['obfs-opts']?.mode || proxy.obfs;
        const obfsHost = proxy['obfs-opts']?.host || proxy['obfs-host'];
        if (obfs) result.append(`,obfs=${obfs}`);
        if (obfsHost) result.append(`,obfs-host=${obfsHost}`);
        if (proxy.reuse !== undefined) result.append(`,reuse=${proxy.reuse}`);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private anytls(proxy: ProxyNode): string {
        const isReality = !!proxy['reality-opts'];
        const result = new Result(proxy);
        result.append(`${proxy.name}=anytls,${proxy.server},${proxy.port},"${proxy.password}"`);

        // Session 参数（只附加整数值）
        for (const key of ['idle-session-timeout', 'max-stream-count'] as const) {
            if (isPresent(proxy, key) && Number.isInteger(proxy[key])) {
                result.append(`,${key}=${proxy[key]}`);
            }
        }

        // TLS验证
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );

        if (isReality) {
            appendReality(result, proxy);
        } else {
            const sni = proxy.sni || proxy.servername;
            if (sni) result.append(`,tls-name=${sni}`);
            result.appendIfPresent(
                `,tls-cert-sha256=${proxy['tls-fingerprint']}`,
                'tls-fingerprint'
            );
            result.appendIfPresent(
                `,tls-pubkey-sha256=${proxy['tls-pubkey-sha256']}`,
                'tls-pubkey-sha256'
            );
        }

        if (proxy.alpn) {
            const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
            if (alpn) result.append(`,alpn="${alpn}"`);
        }

        // TFO
        result.appendIfPresent(`,fast-open=${proxy.tfo}`, 'tfo');

        // block-quic
        if (proxy['block-quic'] === 'on') result.append(',block-quic=true');
        else if (proxy['block-quic'] === 'off') result.append(',block-quic=false');

        // UDP
        if (proxy.udp) result.append(`,udp=true`);

        // IP version
        if (proxy['ip-version']) {
            const val = ipVersions[proxy['ip-version']] || proxy['ip-version'];
            result.append(`,ip-mode=${val}`);
        }

        return result.toString();
    }

    private appendTransport(result: Result, proxy: ProxyNode) {
        const network = proxy.network || 'tcp';
        if (network === 'ws') {
            result.append(`,transport=ws`);
            const wsOpts = (proxy['ws-opts'] || {}) as any;
            let path = wsOpts.path || '/';
            const ed = wsOpts['max-early-data'];
            if (ed && !path.includes('ed=')) {
                const sep = path.includes('?') ? '&' : '?';
                path = `${path}${sep}ed=${ed}`;
            }
            result.append(`,path=${path}`);
            result.appendIfPresent(`,host=${wsOpts.headers?.Host}`, 'ws-opts.headers.Host');
        } else if (network === 'grpc') {
            result.append(`,transport=grpc`);
            const grpcOpts = (proxy['grpc-opts'] || {}) as any;
            result.appendIfPresent(`,path=${grpcOpts['service-name']}`, 'grpc-opts.service-name');
        } else if (network === 'http') {
            result.append(`,transport=http`);
            const opts = (proxy['http-opts'] || {}) as any;
            const path = Array.isArray(opts.path) ? opts.path[0] : opts.path || '/';
            const host = Array.isArray(opts.headers?.Host)
                ? opts.headers.Host[0]
                : opts.headers?.Host || '';
            result.append(`,path=${path},host=${host}`);
        } else {
            result.append(`,transport=tcp`);
        }
    }

    private appendCommon(result: Result, proxy: ProxyNode) {
        result.appendIfPresent(`,fast-open=${proxy.tfo}`, 'tfo');
        if (proxy.udp) result.append(`,udp=true`);

        if (proxy['ip-version']) {
            const val = ipVersions[proxy['ip-version']] || proxy['ip-version'];
            result.append(`,ip-mode=${val}`);
        }

        if (proxy['block-quic'] === 'on') result.append(',block-quic=true');
        else if (proxy['block-quic'] === 'off') result.append(',block-quic=false');
    }
}
