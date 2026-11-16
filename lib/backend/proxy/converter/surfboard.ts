/**
 * Sub-One Surfboard Converter
 */
import type { ConvertOptions, ProxyNode } from '../types';
import { BaseConverter } from './base';
import { Result } from './utils';

export class SurfboardConverter extends BaseConverter {
    name = 'Surfboard';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const lines = nodes.map((node) => this.convertSingle(node)).filter(Boolean);
        return lines.join('\n');
    }

    private convertSingle(proxy: ProxyNode): string {
        try {
            // Clean name for Surfboard
            const safeName = proxy.name.replace(/=|,/g, '');
            const p = { ...proxy, name: safeName };

            switch (p.type) {
                case 'ss':
                    return this.ss(p);
                case 'trojan':
                    return this.trojan(p);
                case 'vmess':
                    return this.vmess(p);
                case 'http':
                case 'https':
                    return this.http(p);
                case 'socks5':
                    return this.socks5(p);
                case 'snell':
                    return this.snell(p);
                case 'tuic':
                    return this.tuic(p);
                case 'hysteria2':
                    return this.hysteria2(p);
                case 'wireguard':
                    return this.wireguard(p);
                case 'anytls':
                    return this.anytls(p);
                default:
                    console.warn(`[SurfboardConverter] Unsupported proxy type: ${p.type}`);
                    return '';
            }
        } catch (e) {
            console.error(
                `[SurfboardConverter] Failed to produce Surfboard config for ${proxy.name}:`,
                e
            );
            return '';
        }
    }

    private ss(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=ss,${proxy.server},${proxy.port},encrypt-method=${proxy.cipher}`
        );
        result.appendIfPresent(`,password=${proxy.password}`, 'password');

        if (proxy.plugin === 'obfs') {
            const opts = (proxy['plugin-opts'] || {}) as any;
            result.append(`,obfs=${opts.mode || 'http'}`);
            result.appendIfPresent(`,obfs-host=${opts.host}`, 'plugin-opts.host');
            result.appendIfPresent(`,obfs-uri=${opts.path}`, 'plugin-opts.path');
        }

        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        return result.toString();
    }

    private trojan(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=trojan,${proxy.server},${proxy.port},password=${proxy.password}`
        );
        this.appendTransport(result, proxy);
        result.appendIfPresent(`,tls=${!!proxy.tls}`, 'tls');
        result.appendIfPresent(`,sni=${proxy.sni}`, 'sni');
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );
        result.appendIfPresent(`,tfo=${proxy.tfo}`, 'tfo');
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        return result.toString();
    }

    private vmess(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=vmess,${proxy.server},${proxy.port},username=${proxy.uuid}`);
        this.appendTransport(result, proxy);
        result.append(`,vmess-aead=${proxy.aead !== undefined ? proxy.aead : proxy.alterId === 0}`);
        result.appendIfPresent(`,tls=${!!proxy.tls}`, 'tls');
        result.appendIfPresent(`,sni=${proxy.sni}`, 'sni');
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        return result.toString();
    }

    private http(proxy: ProxyNode): string {
        const result = new Result(proxy);
        const type = proxy.tls ? 'https' : 'http';
        result.append(`${proxy.name}=${type},${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,${proxy.username}`, 'username');
        result.appendIfPresent(`,${proxy.password}`, 'password');
        result.appendIfPresent(`,sni=${proxy.sni}`, 'sni');
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        return result.toString();
    }

    private socks5(proxy: ProxyNode): string {
        const result = new Result(proxy);
        const type = proxy.tls ? 'socks5-tls' : 'socks5';
        result.append(`${proxy.name}=${type},${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,${proxy.username}`, 'username');
        result.appendIfPresent(`,${proxy.password}`, 'password');
        result.appendIfPresent(`,sni=${proxy.sni}`, 'sni');
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        return result.toString();
    }

    private snell(proxy: ProxyNode): string {
        if (proxy.version != null && ![1, 2, 3, 4, 5].includes(Number(proxy.version))) {
            throw new Error(
                `[SurfboardConverter] Surfboard does not support Snell version ${proxy.version}`
            );
        }
        const result = new Result(proxy);
        result.append(`${proxy.name}=snell,${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,version=${proxy.version}`, 'version');
        const psk = proxy.psk || proxy.password;
        if (psk) {
            result.append(`,psk="${psk}"`);
        }
        if (proxy['obfs-opts']?.mode) {
            result.append(`,obfs=${proxy['obfs-opts'].mode}`);
            result.appendIfPresent(`,obfs-host=${proxy['obfs-opts'].host}`, 'obfs-opts.host');
            result.appendIfPresent(`,obfs-uri=${proxy['obfs-opts'].path}`, 'obfs-opts.path');
        }
        result.appendIfPresent(`,tfo=${proxy.tfo}`, 'tfo');
        if ((proxy.version ?? 0) >= 3) {
            result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        }
        result.appendIfPresent(`,reuse=${proxy.reuse}`, 'reuse');
        result.appendIfPresent(`,block-quic=${proxy['block-quic']}`, 'block-quic');
        return result.toString();
    }

    private tuic(proxy: ProxyNode): string {
        if (proxy.token && proxy.token.length > 0) {
            throw new Error(`[SurfboardConverter] Surfboard does not support TUIC v4`);
        }
        const result = new Result(proxy);
        result.append(`${proxy.name}=tuic-v5,${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,uuid=${proxy.uuid}`, 'uuid');
        if (proxy.password) {
            result.append(`,password="${proxy.password}"`);
        }
        if (proxy.alpn) {
            const alpnStr = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
            result.append(`,alpn="${alpnStr}"`);
        }
        if (proxy.ports) {
            result.append(`,port-hopping="${String(proxy.ports).replace(/,/g, ';')}"`);
        }
        if (proxy['hop-interval']) {
            result.append(`,port-hopping-interval=${proxy['hop-interval']}`);
        }
        this.appendTlsProxyParams(result, proxy);
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        return result.toString();
    }

    private hysteria2(proxy: ProxyNode): string {
        if (
            (proxy.obfs && proxy.obfs !== 'salamander') ||
            (proxy['obfs-password'] && proxy.obfs !== 'salamander')
        ) {
            throw new Error(`[SurfboardConverter] Surfboard Hysteria2 only supports salamander obfs`);
        }

        const result = new Result(proxy);
        result.append(`${proxy.name}=hysteria2,${proxy.server},${proxy.port}`);
        if (proxy.password) {
            result.append(`,password="${proxy.password}"`);
        }
        if (proxy.ports) {
            result.append(`,port-hopping="${String(proxy.ports).replace(/,/g, ';')}"`);
        }
        if (proxy['hop-interval']) {
            result.append(`,port-hopping-interval=${proxy['hop-interval']}`);
        }
        if (proxy['obfs-password']) {
            result.append(`,salamander-password="${proxy['obfs-password']}"`);
        }

        this.appendTlsProxyParams(result, proxy);

        const downVal = proxy['download-bandwidth'] || proxy['down-mbps'] || proxy.down;
        if (downVal) {
            const match = String(downVal).match(/\d+/);
            result.append(`,download-bandwidth=${match ? match[0] : 0}`);
        }

        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        result.appendIfPresent(`,block-quic=${proxy['block-quic']}`, 'block-quic');
        return result.toString();
    }

    private wireguard(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=wireguard`);
        const sectionName = proxy['section-name'] || proxy._sectionName || proxy.name;
        result.append(`,section-name=${sectionName}`);
        result.appendIfPresent(`,block-quic=${proxy['block-quic']}`, 'block-quic');
        return result.toString();
    }

    private appendTlsProxyParams(result: Result, proxy: ProxyNode, enabled = true) {
        if (!enabled) return;
        const fingerprint = proxy['tls-fingerprint'] || proxy['client-fingerprint'];
        if (fingerprint) {
            result.append(`,server-cert-fingerprint-sha256=${fingerprint}`);
        }
        if (proxy.sni) {
            result.append(`,sni="${proxy.sni}"`);
        }
        result.appendIfPresent(
            `,skip-cert-verify=${proxy['skip-cert-verify']}`,
            'skip-cert-verify'
        );
    }

    private anytls(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=anytls,${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,password="${proxy.password}"`, 'password');

        // TLS verification
        this.appendTlsProxyParams(result, proxy);

        // TFO
        result.appendIfPresent(`,tfo=${proxy.tfo}`, 'tfo');

        // UDP
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');

        // reuse
        result.appendIfPresent(`,reuse=${proxy['reuse']}`, 'reuse');

        result.appendIfPresent(`,block-quic=${proxy['block-quic']}`, 'block-quic');

        return result.toString();
    }

    private appendTransport(result: Result, proxy: ProxyNode) {
        if (proxy.network === 'ws') {
            result.append(`,ws=true`);
            const opts = (proxy['ws-opts'] || {}) as any;
            result.appendIfPresent(`,ws-path=${opts.path || '/'}`, 'ws-opts.path');
            if (opts.headers) {
                const headers = Object.entries(opts.headers)
                    .map(([k, v]) => `${k}:${k === 'Host' ? `"${v}"` : v}`)
                    .join('|');
                if (headers) result.append(`,ws-headers=${headers}`);
            }
        }
    }
}
