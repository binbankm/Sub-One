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
                case 'wireguard':
                    return this.wireguard(p);
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

    private wireguard(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=wireguard`);
        result.appendIfPresent(`,section-name=${proxy.name}`, 'name');
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
