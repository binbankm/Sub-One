/**
 * Sub-One Loon Converter
 */

import type { ProxyNode, ConvertOptions } from '../types';
import { BaseConverter } from './base';
import { Result, isPresent } from './utils';

const ipVersions: Record<string, string> = {
    dual: 'dual',
    ipv4: 'v4-only',
    ipv6: 'v6-only',
    'ipv4-prefer': 'prefer-v4',
    'ipv6-prefer': 'prefer-v6',
};

export class LoonConverter extends BaseConverter {
    name = 'Loon';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const lines = nodes.map(node => this.convertSingle(node, _options)).filter(Boolean);
        return lines.join('\n');
    }

    private convertSingle(proxy: ProxyNode, _opts: ConvertOptions): string {
        try {
            switch (proxy.type) {
                case 'ss': return this.ss(proxy);
                case 'ssr': return this.ssr(proxy);
                case 'trojan': return this.trojan(proxy);
                case 'vmess': return this.vmess(proxy);
                case 'vless': return this.vless(proxy);
                case 'http':
                case 'https': return this.http(proxy);
                case 'socks5': return this.socks5(proxy);
                case 'wireguard': return this.wireguard(proxy);
                case 'snell': return this.snell(proxy);
                case 'tuic': return this.tuic(proxy);
                case 'hysteria': return this.hysteria(proxy);
                case 'hysteria2': return this.hysteria2(proxy);
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
        result.append(`${proxy.name}=shadowsocks,${proxy.server},${proxy.port},${proxy.cipher},"${proxy.password}"`);

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
        result.append(`${proxy.name}=shadowsocksr,${proxy.server},${proxy.port},${proxy.cipher},"${proxy.password}"`);
        result.append(`,protocol=${proxy.protocol || 'origin'}`);
        result.appendIfPresent(`,protocol-param=${proxy['protocol-param']}`, 'protocol-param');
        result.appendIfPresent(`,obfs=${proxy.obfs || 'plain'}`, 'obfs');
        result.appendIfPresent(`,obfs-param=${proxy['obfs-param']}`, 'obfs-param');

        this.appendCommon(result, proxy);
        return result.toString();
    }

    private trojan(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=trojan,${proxy.server},${proxy.port},"${proxy.password}"`);

        if (proxy.network === 'ws') {
            result.append(`,transport=ws`);
            const wsOpts = (proxy['ws-opts'] || {}) as any;
            result.appendIfPresent(`,path=${wsOpts.path || '/'}`, 'ws-opts.path');
            result.appendIfPresent(`,host=${wsOpts.headers?.Host}`, 'ws-opts.headers.Host');
        }

        result.appendIfPresent(`,skip-cert-verify=${proxy['skip-cert-verify']}`, 'skip-cert-verify');
        result.appendIfPresent(`,tls-name=${proxy.sni}`, 'sni');
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vmess(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=vmess,${proxy.server},${proxy.port},${proxy.cipher || 'auto'},"${proxy.uuid}"`);
        this.appendTransport(result, proxy);
        result.appendIfPresent(`,over-tls=${!!proxy.tls}`, 'tls');
        result.appendIfPresent(`,skip-cert-verify=${proxy['skip-cert-verify']}`, 'skip-cert-verify');
        result.appendIfPresent(`,tls-name=${proxy.sni}`, 'sni');
        result.append(`,alterId=${proxy.aead ? 0 : (proxy.alterId || 0)}`);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vless(proxy: ProxyNode): string {
        if (proxy.encryption && proxy.encryption !== 'none') {
            throw new Error(`[LoonConverter] VLESS encryption is not supported: ${proxy.encryption}`);
        }
        const result = new Result(proxy);
        result.append(`${proxy.name}=vless,${proxy.server},${proxy.port},"${proxy.uuid}"`);
        this.appendTransport(result, proxy);
        result.appendIfPresent(`,over-tls=${!!proxy.tls}`, 'tls');
        result.appendIfPresent(`,skip-cert-verify=${proxy['skip-cert-verify']}`, 'skip-cert-verify');
        if (proxy.flow) result.append(`,flow=${proxy.flow}`);
        if (proxy['reality-opts']) {
            const reality = proxy['reality-opts'];
            result.append(`,public-key="${reality['public-key']}"`);
            result.appendIfPresent(`,short-id=${reality['short-id']}`, 'reality-opts.short-id');
            result.appendIfPresent(`,spider-x=${reality['_spider-x'] || reality['spider-x']}`, 'reality-opts.spider-x');
            result.appendIfPresent(`,sni=${proxy.sni}`, 'sni');
        } else {
            result.appendIfPresent(`,tls-name=${proxy.sni}`, 'sni');
            result.appendIfPresent(`,tls-cert-sha256=${proxy['tls-fingerprint']}`, 'tls-fingerprint');
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
        result.appendIfPresent(`,private-key="${proxy['private-key'] || proxy.privateKey}"`, 'private-key');
        result.appendIfPresent(`,mtu=${proxy.mtu}`, 'mtu');
        result.appendIfPresent(`,dns=${proxy.dns}`, 'dns');
        result.appendIfPresent(`,keepalive=${proxy.keepalive || proxy['persistent-keepalive']}`, 'keepalive');

        const publicKey = proxy['public-key'] || proxy.publicKey;
        const allowedIps = proxy['allowed-ips'] || '0.0.0.0/0, ::/0';
        const reserved = proxy.reserved ? `,reserved=[${Array.isArray(proxy.reserved) ? proxy.reserved.join(',') : proxy.reserved}]` : '';
        const psk = (proxy['pre-shared-key'] || proxy['preshared-key']) ? `,preshared-key="${proxy['pre-shared-key'] || proxy['preshared-key']}"` : '';

        result.append(`,peers=[{public-key="${publicKey}",allowed-ips="${allowedIps}",endpoint=${proxy.server}:${proxy.port}${reserved}${psk}}]`);

        return result.toString();
    }

    private hysteria(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=hysteria,${proxy.server},${proxy.port},${proxy.auth || ''}`);
        result.appendIfPresent(`,up=${proxy.up}`, 'up');
        result.appendIfPresent(`,down=${proxy.down}`, 'down');
        result.appendIfPresent(`,sni=${proxy.sni}`, 'sni');
        if (proxy.obfs) result.append(`,obfs=${proxy.obfs}`);
        result.appendIfPresent(`,skip-cert-verify=${proxy['skip-cert-verify']}`, 'skip-cert-verify');
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private hysteria2(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=Hysteria2,${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,"${proxy.password}"`, 'password');
        result.appendIfPresent(`,tls-name=${proxy.sni}`, 'sni');
        result.appendIfPresent(`,skip-cert-verify=${proxy['skip-cert-verify']}`, 'skip-cert-verify');
        if (proxy.obfs === 'salamander' && proxy['obfs-password']) {
            result.append(`,salamander-password=${proxy['obfs-password']}`);
        }
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private tuic(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=tuic,${proxy.server},${proxy.port},"${proxy.uuid}","${proxy.password}"`);
        result.appendIfPresent(`,skip-cert-verify=${proxy['skip-cert-verify']}`, 'skip-cert-verify');
        result.appendIfPresent(`,sni=${proxy.sni}`, 'sni');
        result.appendIfPresent(`,alpn=${proxy.alpn?.join(',') || 'h3'}`, 'alpn');
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private snell(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=snell,${proxy.server},${proxy.port},psk="${proxy.password}",version=${proxy.version || 4}`);
        return result.toString();
    }

    private appendTransport(result: Result, proxy: ProxyNode) {
        const network = proxy.network || 'tcp';
        if (network === 'ws') {
            result.append(`,transport=ws`);
            const wsOpts = (proxy['ws-opts'] || {}) as any;
            result.appendIfPresent(`,path=${wsOpts.path || '/'}`, 'ws-opts.path');
            result.appendIfPresent(`,host=${wsOpts.headers?.Host}`, 'ws-opts.headers.Host');
        } else if (network === 'http') {
            result.append(`,transport=http`);
            const opts = (proxy['http-opts'] || {}) as any;
            const path = Array.isArray(opts.path) ? opts.path[0] : (opts.path || '/');
            const host = Array.isArray(opts.headers?.Host) ? opts.headers.Host[0] : (opts.headers?.Host || '');
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
