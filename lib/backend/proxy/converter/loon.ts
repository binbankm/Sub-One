/**
 * Sub-One Loon Converter
 */
import type { ConvertOptions, ProxyNode } from '../types';
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
    result.appendIfPresent(
        `,public-key="${proxy['reality-opts']!['public-key']}"`,
        'reality-opts.public-key'
    );
    result.appendIfPresent(
        `,short-id=${proxy['reality-opts']!['short-id']}`,
        'reality-opts.short-id'
    );
}

export class LoonConverter extends BaseConverter {
    name = 'Loon';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const lines = nodes.map((node) => this.convertSingle(node, _options)).filter(Boolean);
        return lines.join('\n');
    }

    private convertSingle(proxy: ProxyNode, _opts: ConvertOptions): string {
        try {
            switch (proxy.type) {
                case 'ss':
                    return this.ss(proxy);
                case 'ssr':
                    return this.ssr(proxy);
                case 'trojan':
                    return this.trojan(proxy);
                case 'vmess':
                    return this.vmess(proxy);
                case 'vless':
                    return this.vless(proxy);
                case 'http':
                case 'https':
                    return this.http(proxy);
                case 'socks5':
                    return this.socks5(proxy);
                case 'wireguard':
                    return this.wireguard(proxy);
                case 'snell':
                    return this.snell(proxy);
                case 'tuic':
                    return this.tuic(proxy);
                case 'hysteria':
                    return this.hysteria(proxy);
                case 'hysteria2':
                    return this.hysteria2(proxy);
                case 'anytls':
                    return this.anytls(proxy);
                default:
                    console.warn(`[LoonConverter] Unsupported proxy type: ${proxy.type}`);
                    return '';
            }
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
            result.appendIfPresent(`,tls-name=${proxy.sni}`, 'sni');
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
            const reality = proxy['reality-opts'];
            result.appendIfPresent(`,sni=${proxy.sni}`, 'sni');
            result.appendIfPresent(`,public-key="${reality['public-key']}"`, 'public-key');
            result.appendIfPresent(`,short-id=${reality['short-id']}`, 'short-id');
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
        // TLS profile (client-fingerprint → Loon tls-profile)
        if (proxy['client-fingerprint']) {
            const fpMap: Record<string, string> = {
                'chrome': 'chrome', 'ios': 'ios26', 'ios18': 'ios18'
            };
            const profile = fpMap[proxy['client-fingerprint']];
            if (profile) result.append(`,tls-profile=${profile}`);
        }
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
        const result = new Result(proxy);
        result.append(`${proxy.name}=wireguard`);
        result.appendIfPresent(`,interface-ip=${proxy.ip}`, 'ip');
        result.appendIfPresent(`,interface-ipv6=${proxy.ipv6}`, 'ipv6');
        result.appendIfPresent(
            `,private-key="${proxy['private-key'] || proxy.privateKey}"`,
            'private-key'
        );
        result.appendIfPresent(`,mtu=${proxy.mtu}`, 'mtu');
        // DNS: 区分 IPv4 (dns=) 和 IPv6 (dnsv6=)
        if (proxy.dns) {
            let dns: string | undefined;
            let dnsv6: string | undefined;
            if (Array.isArray(proxy.dns)) {
                const isIPv4 = (ip: string) => /^\d+\.\d+\.\d+\.\d+$/.test(ip);
                const isIPv6 = (ip: string) => /^[\da-fA-F:]+$/.test(ip) && ip.includes(':');
                dnsv6 = proxy.dns.find(isIPv6);
                dns = proxy.dns.find(isIPv4);
                if (!dns) dns = proxy.dns.find((i: string) => !isIPv4(i) && !isIPv6(i));
            } else {
                dns = String(proxy.dns);
            }
            if (dns) result.append(`,dns=${dns}`);
            if (dnsv6) result.append(`,dnsv6=${dnsv6}`);
        }
        result.appendIfPresent(
            `,keepalive=${proxy.keepalive || proxy['persistent-keepalive']}`,
            'keepalive'
        );

        const publicKey = proxy['public-key'] || proxy.publicKey;
        const allowedIps = proxy['allowed-ips'] || '0.0.0.0/0, ::/0';
        const reserved = proxy.reserved
            ? `,reserved=[${Array.isArray(proxy.reserved) ? proxy.reserved.join(',') : proxy.reserved}]`
            : '';
        const psk =
            proxy['pre-shared-key'] || proxy['preshared-key']
                ? `,preshared-key="${proxy['pre-shared-key'] || proxy['preshared-key']}"`
                : '';

        result.append(
            `,peers=[{public-key="${publicKey}",allowed-ips="${allowedIps}",endpoint=${proxy.server}:${proxy.port}${reserved}${psk}}]`
        );

        return result.toString();
    }

    private hysteria(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=hysteria,${proxy.server},${proxy.port},${proxy.auth || ''}`);
        result.appendIfPresent(`,up=${proxy.up}`, 'up');
        result.appendIfPresent(`,down=${proxy.down}`, 'down');
        result.appendIfPresent(`,sni=${proxy.sni}`, 'sni');
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
        result.appendIfPresent(`,"${proxy.password}"`, 'password');
        result.appendIfPresent(`,tls-name=${proxy.sni}`, 'sni');
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );
        if (proxy.obfs === 'salamander' && proxy['obfs-password']) {
            result.append(`,salamander-password=${proxy['obfs-password']}`);
        }
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private tuic(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=tuic,${proxy.server},${proxy.port},"${proxy.uuid}","${proxy.password}"`
        );
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );
        result.appendIfPresent(`,sni=${proxy.sni}`, 'sni');
        if (proxy.alpn) {
            const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
            if (alpn) result.append(`,alpn=${alpn}`);
        }
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private snell(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=snell,${proxy.server},${proxy.port},psk="${proxy.password}",version=${proxy.version || 4}`
        );
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
            result.appendIfPresent(`,tls-name=${proxy.sni}`, 'sni');
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
