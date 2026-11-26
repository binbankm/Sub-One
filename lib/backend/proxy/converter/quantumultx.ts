/**
 * Sub-One Quantumult X Converter
 */
import { Buffer } from 'buffer';
import type { ConvertOptions, ProxyNode } from '../types';
import { formatEndpoint } from '../utils';
import { BaseConverter } from './base';
import { Result } from './utils';

function encodeQxAlpn(alpn: string | string[]): string | undefined {
    const protocols = (Array.isArray(alpn) ? alpn : `${alpn}`.split(','))
        .map((p) => `${p}`.trim())
        .filter(Boolean);

    if (protocols.length === 1 && /^[0-9a-fA-F]{4,}$/.test(protocols[0]) && protocols[0].length % 2 === 0) {
        return protocols[0];
    }

    return (
        protocols
            .map((protocol) => {
                const bytes = Buffer.from(protocol, 'utf8');
                if (bytes.length > 255) return '';
                return `${bytes.length.toString(16).padStart(2, '0')}${bytes.toString('hex')}`;
            })
            .join('') || undefined
    );
}

export class QuantumultXConverter extends BaseConverter {
    name = 'Quantumult X';

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
                case 'anytls':
                    result = this.anytls(proxy);
                    break;
                case 'hysteria2':
                    result = this.hysteria2(proxy);
                    break;
                case 'http':
                case 'https':
                    result = this.http(proxy);
                    break;
                case 'socks5':
                    result = this.socks5(proxy);
                    break;
                default:
                    console.warn(`[QXConverter] Unsupported proxy type: ${proxy.type}`);
                    return '';
            }

            if (!result) return '';
            if (proxy['reality-opts']) {
                if (proxy['reality-opts']['public-key']) {
                    result += `,reality-base64-pubkey=${proxy['reality-opts']['public-key']}`;
                }
                if (proxy['reality-opts']['short-id']) {
                    result += `,reality-hex-shortid=${proxy['reality-opts']['short-id']}`;
                }
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
        result.append(
            `shadowsocks=${formatEndpoint(proxy.server, proxy.port)},method=${proxy.cipher || 'none'},password=${proxy.password}`
        );

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
        result.append(
            `shadowsocks=${formatEndpoint(proxy.server, proxy.port)},method=${proxy.cipher},password=${proxy.password}`
        );
        result.append(`,ssr-protocol=${proxy.protocol || 'origin'}`);
        result.appendIfPresent(`,ssr-protocol-param=${proxy['protocol-param']}`, 'protocol-param');
        result.appendIfPresent(`,obfs=${proxy.obfs || 'plain'}`, 'obfs');
        result.appendIfPresent(`,obfs-param=${proxy['obfs-param']}`, 'obfs-param');
        this.appendCommon(result, proxy);
        this.appendUOT(result, proxy);
        return result.toString();
    }

    private trojan(proxy: ProxyNode): string {
        const net = proxy.network?.trim().toLowerCase();
        if (net && !['tcp', 'ws'].includes(net)) {
            throw new Error(`[QXConverter] Trojan does not support transport: ${proxy.network}`);
        }
        const tlsEnabled = proxy.tls !== false;
        const result = new Result(proxy);
        result.append(`trojan=${formatEndpoint(proxy.server, proxy.port)},password=${proxy.password}`);

        if (net === 'ws') {
            result.append(`,obfs=${tlsEnabled ? 'wss' : 'ws'}`);
            const wsOpts = (proxy['ws-opts'] || {}) as any;
            result.appendIfPresent(`,obfs-uri=${wsOpts.path || '/'}`, 'ws-opts.path');
            const wsHost = wsOpts.headers?.Host || wsOpts.headers?.host || wsOpts.host;
            if (wsHost) {
                result.append(`,obfs-host=${Array.isArray(wsHost) ? wsHost[0] : wsHost}`);
            }
        } else if (tlsEnabled) {
            result.append(`,over-tls=true`);
        }

        this.appendTLS(result, { ...proxy, tls: tlsEnabled });
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vmess(proxy: ProxyNode): string {
        const net = proxy.network?.trim().toLowerCase();
        if (net && !['tcp', 'ws', 'http'].includes(net)) {
            throw new Error(`[QXConverter] VMess does not support transport: ${proxy.network}`);
        }
        const result = new Result(proxy);
        result.append(
            `vmess=${formatEndpoint(proxy.server, proxy.port)},method=${proxy.cipher === 'auto' ? 'chacha20-ietf-poly1305' : proxy.cipher || 'none'},password=${proxy.uuid}`
        );

        if (net === 'ws') {
            result.append(`,obfs=${proxy.tls ? 'wss' : 'ws'}`);
        } else if (net === 'http') {
            result.append(`,obfs=http`);
        } else if (proxy.tls || proxy['reality-opts']) {
            result.append(`,obfs=over-tls`);
        }

        // 只在 ws/http 传输时才读对应的 opts，避免 tcp 节点错误带入 ws 路径/Host
        const netForOpts = net === 'ws' || net === 'http' ? net : null;
        const opts = netForOpts ? ((proxy[`${netForOpts}-opts`] || {}) as any) : {};
        if (opts.path)
            result.append(`,obfs-uri=${Array.isArray(opts.path) ? opts.path[0] : opts.path}`);
        const vmessHost = opts.headers?.Host || opts.headers?.host || opts.host;
        if (vmessHost)
            result.append(
                `,obfs-host=${Array.isArray(vmessHost) ? vmessHost[0] : vmessHost}`
            );

        this.appendTLS(result, proxy);
        result.append(`,aead=${proxy.aead !== undefined ? proxy.aead : proxy.alterId === 0}`);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vless(proxy: ProxyNode): string {
        if (proxy.encryption && proxy.encryption !== 'none') {
            throw new Error(`[QXConverter] VLESS encryption is not supported: ${proxy.encryption}`);
        }
        const net = proxy.network?.trim().toLowerCase();
        if (net && !['tcp', 'ws', 'h2', 'http'].includes(net)) {
            throw new Error(`[QXConverter] VLESS does not support transport: ${proxy.network}`);
        }
        const result = new Result(proxy);
        result.append(`vless=${formatEndpoint(proxy.server, proxy.port)},method=none,password=${proxy.uuid}`);

        if (net === 'ws') {
            result.append(`,obfs=${proxy.tls ? 'wss' : 'ws'}`);
        } else if (net === 'h2') {
            result.append(`,obfs=${proxy.tls ? 'h2-tls' : 'h2'}`);
        } else if (net === 'http') {
            result.append(`,obfs=http`);
        } else if (proxy.tls || proxy['reality-opts']) {
            result.append(`,obfs=over-tls`);
        }

        // 只在 ws/http 传输时才读对应的 opts
        const netForVlessOpts = net === 'ws' || net === 'http' || net === 'h2' ? net : null;
        const vlessOpts = netForVlessOpts ? ((proxy[`${netForVlessOpts}-opts`] || {}) as any) : {};
        if (vlessOpts.path)
            result.append(
                `,obfs-uri=${Array.isArray(vlessOpts.path) ? vlessOpts.path[0] : vlessOpts.path}`
            );
        const vlessHost = vlessOpts.headers?.Host || vlessOpts.headers?.host || vlessOpts.host;
        if (vlessHost)
            result.append(
                `,obfs-host=${Array.isArray(vlessHost) ? vlessHost[0] : vlessHost}`
            );

        this.appendTLS(result, proxy);
        if (proxy.flow) result.append(`,vless-flow=${proxy.flow}`);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private http(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`http=${formatEndpoint(proxy.server, proxy.port)}`);
        result.appendIfPresent(`,username=${proxy.username}`, 'username');
        result.appendIfPresent(`,password=${proxy.password}`, 'password');
        if (proxy.tls || proxy.type === 'https') result.append(`,over-tls=true`);
        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private socks5(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`socks5=${formatEndpoint(proxy.server, proxy.port)}`);
        result.appendIfPresent(`,username=${proxy.username}`, 'username');
        result.appendIfPresent(`,password=${proxy.password}`, 'password');
        if (proxy.tls) result.append(`,over-tls=true`);
        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private anytls(proxy: ProxyNode): string {
        const network = proxy.network?.trim().toLowerCase();
        if (network && network !== 'tcp') {
            throw new Error(
                `[QXConverter] Does not support AnyTLS with transport ${proxy.network}`,
            );
        }

        const result = new Result(proxy);
        result.append(`anytls=${formatEndpoint(proxy.server, proxy.port)}`);
        result.append(`,password=${proxy.password}`);

        // AnyTLS 强制 TLS
        result.append(`,over-tls=true`);
        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);

        return result.toString();
    }

    private hysteria2(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`hysteria2=${formatEndpoint(proxy.server, proxy.port)}`);
        const pass = proxy.password || proxy.auth;
        if (pass) result.append(`,password=${pass}`);

        const obfsPassword =
            proxy['obfs-password'] ||
            (proxy.obfs && proxy.obfs !== 'salamander' && proxy.obfs !== 'gecko' ? proxy.obfs : undefined);
        if (obfsPassword) {
            result.append(`,salamander-password=${obfsPassword}`);
        }

        const ports = proxy.ports || proxy['server-ports'];
        if (ports) {
            const normalizedPorts = String(ports).replace(/;/g, ',');
            result.append(
                normalizedPorts.includes(',')
                    ? `,port-hopping="${normalizedPorts}"`
                    : `,port-hopping=${normalizedPorts}`
            );
        }

        const upVal = proxy['upload-bandwidth'] || proxy['up-mbps'] || proxy.up;
        if (upVal) {
            const up = String(upVal).match(/\d+/)?.[0];
            if (up) result.append(`,up=${up}`);
        }
        const downVal = proxy['download-bandwidth'] || proxy['down-mbps'] || proxy.down;
        if (downVal) {
            const down = String(downVal).match(/\d+/)?.[0];
            if (down) result.append(`,down=${down}`);
        }

        this.appendTLS(result, { ...proxy, tls: true });
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private appendTLS(result: Result, proxy: ProxyNode) {
        if (!proxy.tls && proxy.type !== 'https' && !proxy['reality-opts']) return;
        const sni = proxy.sni || proxy.servername;
        if (sni) result.append(`,tls-host=${sni}`);
        if (proxy['name-cert-verify']) {
            result.append(`,tls-verification=${proxy['name-cert-verify']}`);
        } else if (proxy['skip-cert-verify'] !== undefined) {
            result.append(`,tls-verification=${!proxy['skip-cert-verify']}`);
        }
        result.appendIfPresent(`,tls-cert-sha256=${proxy['tls-fingerprint']}`, 'tls-fingerprint');
        result.appendIfPresent(
            `,tls-pubkey-sha256=${proxy['tls-pubkey-sha256']}`,
            'tls-pubkey-sha256'
        );
        if (proxy['tls-alpn']) {
            result.append(`,tls-alpn=${proxy['tls-alpn']}`);
        } else if (proxy.alpn) {
            const encoded = encodeQxAlpn(proxy.alpn);
            if (encoded) result.append(`,tls-alpn=${encoded}`);
        }
        if (proxy['tls-no-session-ticket']) result.append(`,tls-no-session-ticket=true`);
        if (proxy['tls-no-session-reuse']) result.append(`,tls-no-session-reuse=true`);
    }

    private appendCommon(result: Result, proxy: ProxyNode) {
        result.appendIfPresent(`,fast-open=${proxy.tfo}`, 'tfo');
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        result.appendIfPresent(`,server_check_url=${proxy['test-url']}`, 'test-url');
    }

    private appendUOT(result: Result, proxy: ProxyNode) {
        if (proxy._ssr_python_uot) {
            result.append(`,udp-over-tcp=true`);
        } else if (proxy['udp-over-tcp'] || proxy.uot) {
            const ver = proxy['udp-over-tcp-version'] === 2 ? 2 : 1;
            result.append(`,udp-over-tcp=sp.v${ver}`);
        }
    }
}
