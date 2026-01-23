/**
 * Sub-One Quantumult X Converter
 */

import type { ProxyNode, ConvertOptions } from '../types';
import { BaseConverter } from './base';
import { Result } from './utils';

export class QuantumultXConverter extends BaseConverter {
    name = 'Quantumult X';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const lines = nodes.map(node => this.convertSingle(node, _options)).filter(Boolean);
        return lines.join('\n');
    }

    private convertSingle(proxy: ProxyNode, _opts: ConvertOptions): string {
        try {
            let result = '';
            switch (proxy.type) {
                case 'ss': result = this.ss(proxy); break;
                case 'ssr': result = this.ssr(proxy); break;
                case 'trojan': result = this.trojan(proxy); break;
                case 'vmess': result = this.vmess(proxy); break;
                case 'vless': result = this.vless(proxy); break;
                case 'http':
                case 'https': result = this.http(proxy); break;
                case 'socks5': result = this.socks5(proxy); break;
                default:
                    console.warn(`[QXConverter] Unsupported proxy type: ${proxy.type}`);
                    return '';
            }

            // Reality support (appended to any type that support it in QX)
            if (proxy['reality-opts']) {
                const r = proxy['reality-opts'];
                if (r['public-key']) result += `,reality-base64-pubkey=${r['public-key']}`;
                if (r['short-id']) result += `,reality-hex-shortid=${r['short-id']}`;
            }

            result += `,tag=${proxy.name}`;

            return result;
        } catch (e) {
            console.error(`[QXConverter] Failed to produce QX config for ${proxy.name}:`, e);
            return '';
        }
    }

    private ss(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`shadowsocks=${proxy.server}:${proxy.port},method=${proxy.cipher || 'none'},password=${proxy.password}`);

        if (proxy.plugin === 'obfs') {
            const opts = (proxy['plugin-opts'] || {}) as any;
            result.append(`,obfs=${opts.mode || 'http'}`);
        } else if (proxy.plugin === 'v2ray-plugin') {
            const opts = (proxy['plugin-opts'] || {}) as any;
            result.append(`,obfs=${opts.tls ? 'wss' : 'ws'}`);
        }

        const pOpts = (proxy['plugin-opts'] || {}) as any;
        if (pOpts.host) result.append(`,obfs-host=${pOpts.host}`);
        if (pOpts.path) result.append(`,obfs-uri=${pOpts.path}`);

        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        this.appendUOT(result, proxy);
        return result.toString();
    }

    private ssr(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`shadowsocks=${proxy.server}:${proxy.port},method=${proxy.cipher},password=${proxy.password}`);
        result.append(`,ssr-protocol=${proxy.protocol || 'origin'}`);
        result.appendIfPresent(`,ssr-protocol-param=${proxy['protocol-param']}`, 'protocol-param');
        result.appendIfPresent(`,obfs=${proxy.obfs || 'plain'}`, 'obfs');
        result.appendIfPresent(`,obfs-param=${proxy['obfs-param']}`, 'obfs-param');
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private trojan(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`trojan=${proxy.server}:${proxy.port},password=${proxy.password}`);

        if (proxy.network === 'ws') {
            result.append(`,obfs=${proxy.tls ? 'wss' : 'ws'}`);
            const wsOpts = (proxy['ws-opts'] || {}) as any;
            result.appendIfPresent(`,obfs-uri=${wsOpts.path || '/'}`, 'ws-opts.path');
            result.appendIfPresent(`,obfs-host=${wsOpts.headers?.Host}`, 'ws-opts.headers.Host');
        } else if (proxy.tls) {
            result.append(`,over-tls=true`);
        }

        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vmess(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`vmess=${proxy.server}:${proxy.port},method=${proxy.cipher === 'auto' ? 'chacha20-ietf-poly1305' : (proxy.cipher || 'none')},password=${proxy.uuid}`);

        if (proxy.network === 'ws') {
            result.append(`,obfs=${proxy.tls ? 'wss' : 'ws'}`);
        } else if (proxy.network === 'http') {
            result.append(`,obfs=http`);
        } else if (proxy.tls) {
            result.append(`,obfs=over-tls`);
        }

        const opts = (proxy[`${proxy.network || 'ws'}-opts`] || {}) as any;
        if (opts) {
            if (opts.path) result.append(`,obfs-uri=${Array.isArray(opts.path) ? opts.path[0] : opts.path}`);
            if (opts.headers?.Host) result.append(`,obfs-host=${Array.isArray(opts.headers.Host) ? opts.headers.Host[0] : opts.headers.Host}`);
        }

        this.appendTLS(result, proxy);
        result.append(`,aead=${proxy.aead !== undefined ? proxy.aead : (proxy.alterId === 0)}`);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vless(proxy: ProxyNode): string {
        if (proxy.encryption && proxy.encryption !== 'none') {
            throw new Error(`[QXConverter] VLESS encryption is not supported: ${proxy.encryption}`);
        }
        const result = new Result(proxy);
        result.append(`vless=${proxy.server}:${proxy.port},method=none,password=${proxy.uuid}`);

        if (proxy.network === 'ws') {
            result.append(`,obfs=${proxy.tls ? 'wss' : 'ws'}`);
        } else if (proxy.network === 'http') {
            result.append(`,obfs=http`);
        } else if (proxy.tls) {
            result.append(`,obfs=over-tls`);
        }

        const opts = (proxy[`${proxy.network || 'ws'}-opts`] || {}) as any;
        if (opts) {
            if (opts.path) result.append(`,obfs-uri=${Array.isArray(opts.path) ? opts.path[0] : opts.path}`);
            if (opts.headers?.Host) result.append(`,obfs-host=${Array.isArray(opts.headers.Host) ? opts.headers.Host[0] : opts.headers.Host}`);
        }

        this.appendTLS(result, proxy);
        if (proxy.flow) result.append(`,vless-flow=${proxy.flow}`);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private http(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`http=${proxy.server}:${proxy.port}`);
        result.appendIfPresent(`,username=${proxy.username}`, 'username');
        result.appendIfPresent(`,password=${proxy.password}`, 'password');
        if (proxy.tls) result.append(`,over-tls=true`);
        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private socks5(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`socks5=${proxy.server}:${proxy.port}`);
        result.appendIfPresent(`,username=${proxy.username}`, 'username');
        result.appendIfPresent(`,password=${proxy.password}`, 'password');
        if (proxy.tls) result.append(`,over-tls=true`);
        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private appendTLS(result: Result, proxy: ProxyNode) {
        if (!proxy.tls) return;
        result.appendIfPresent(`,tls-host=${proxy.sni}`, 'sni');
        result.appendIfPresent(`,tls-verification=${!proxy['skip-cert-verify']}`, 'skip-cert-verify');
        result.appendIfPresent(`,tls-cert-sha256=${proxy['tls-fingerprint']}`, 'tls-fingerprint');
        result.appendIfPresent(`,tls-pubkey-sha256=${proxy['tls-pubkey-sha256']}`, 'tls-pubkey-sha256');
        if (proxy.alpn) result.append(`,tls-alpn=${proxy.alpn.join(',')}`);
        if (proxy['tls-no-session-ticket']) result.append(`,tls-no-session-ticket=true`);
        if (proxy['tls-no-session-reuse']) result.append(`,tls-no-session-reuse=true`);
    }

    private appendCommon(result: Result, proxy: ProxyNode) {
        result.appendIfPresent(`,fast-open=${proxy.tfo}`, 'tfo');
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        result.appendIfPresent(`,server_check_url=${proxy['test-url']}`, 'test-url');
    }

    private appendUOT(result: Result, proxy: ProxyNode) {
        if (proxy['udp-over-tcp']) {
            const ver = proxy['udp-over-tcp-version'] || 1;
            result.append(`,udp-over-tcp=sp.v${ver}`);
        }
    }
}
