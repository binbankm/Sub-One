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
                case 'vless':
                    return this.vless(p);
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
                case 'direct':
                    return `${p.name}=direct`;
                case 'reject':
                    return `${p.name}=reject`;
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
        } else if (proxy.plugin === 'shadow-tls' && proxy['plugin-opts']) {
            const opts = proxy['plugin-opts'] as any;
            if (opts.password) result.append(`,shadow-tls-password=${opts.password}`);
            if (opts.host) result.append(`,shadow-tls-sni=${opts.host}`);
            if (opts.version) result.append(`,shadow-tls-version=${opts.version}`);
        } else if (proxy['shadow-tls-password']) {
            result.append(`,shadow-tls-password=${proxy['shadow-tls-password']}`);
            if (proxy['shadow-tls-sni']) result.append(`,shadow-tls-sni=${proxy['shadow-tls-sni']}`);
            if (proxy['shadow-tls-version']) result.append(`,shadow-tls-version=${proxy['shadow-tls-version']}`);
        }

        if (proxy['udp-over-tcp'] || proxy.uot) {
            result.append(',udp-over-tcp=true');
        }
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vless(proxy: ProxyNode): string {
        if (proxy['reality-opts']) {
            throw new Error('[SurfboardConverter] Surfboard does not support VLESS Reality');
        }
        const result = new Result(proxy);
        result.append(`${proxy.name}=vless,${proxy.server},${proxy.port},username=${proxy.uuid}`);
        this.appendTransport(result, proxy);
        result.appendIfPresent(`,tls=${!!proxy.tls}`, 'tls');
        this.appendTlsProxyParams(result, proxy, !!proxy.tls);
        result.appendIfPresent(`,tfo=${proxy.tfo}`, 'tfo');
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private trojan(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=trojan,${proxy.server},${proxy.port},password=${proxy.password}`
        );
        this.appendTransport(result, proxy);
        const tlsEnabled = proxy.tls !== false;
        result.appendIfPresent(`,tls=${!!proxy.tls}`, 'tls');
        this.appendTlsProxyParams(result, proxy, tlsEnabled);
        result.appendIfPresent(`,tfo=${proxy.tfo}`, 'tfo');
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vmess(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=vmess,${proxy.server},${proxy.port},username=${proxy.uuid}`);
        this.appendTransport(result, proxy);
        result.append(`,vmess-aead=${proxy.aead !== undefined ? proxy.aead : proxy.alterId === 0}`);
        result.appendIfPresent(`,tls=${!!proxy.tls}`, 'tls');
        this.appendTlsProxyParams(result, proxy, !!proxy.tls);
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        this.appendCommon(result, proxy);
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
        this.appendCommon(result, proxy);
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
        this.appendCommon(result, proxy);
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
        this.appendCommon(result, proxy);
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
        const ports = proxy.ports || proxy['server-ports'];
        if (ports) {
            result.append(`,port-hopping="${String(ports).replace(/,/g, ';')}"`);
        }
        if (proxy['hop-interval']) {
            result.append(`,port-hopping-interval=${proxy['hop-interval']}`);
        }
        if (proxy['congestion-controller']) {
            result.append(`,congestion-controller=${proxy['congestion-controller']}`);
        }
        if (proxy['udp-relay-mode']) {
            result.append(`,udp-relay-mode=${proxy['udp-relay-mode']}`);
        }
        if (proxy['reduce-rtt']) {
            result.append(',reduce-rtt=true');
        }
        if (proxy['disable-sni']) {
            result.append(',disable-sni=true');
        }
        this.appendTlsProxyParams(result, proxy);
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private hysteria2(proxy: ProxyNode): string {
        if (
            (proxy.obfs && !['salamander', 'gecko'].includes(proxy.obfs)) ||
            (proxy['obfs-password'] && proxy.obfs && !['salamander', 'gecko'].includes(proxy.obfs))
        ) {
            throw new Error(`[SurfboardConverter] Surfboard Hysteria2 only supports salamander and gecko obfs`);
        }

        const result = new Result(proxy);
        result.append(`${proxy.name}=hysteria2,${proxy.server},${proxy.port}`);
        const authPass = proxy.password || proxy.auth;
        if (authPass) {
            result.append(`,password="${authPass}"`);
        }
        const ports = proxy.ports || proxy['server-ports'];
        if (ports) {
            result.append(`,port-hopping="${String(ports).replace(/,/g, ';')}"`);
        }
        if (proxy['hop-interval']) {
            result.append(`,port-hopping-interval=${proxy['hop-interval']}`);
        }
        if (proxy['obfs-password']) {
            const obfsKey = proxy.obfs === 'gecko' ? 'gecko-password' : 'salamander-password';
            result.append(`,${obfsKey}="${proxy['obfs-password']}"`);
        }

        this.appendTlsProxyParams(result, proxy);

        const downVal = proxy['download-bandwidth'] || proxy['down-mbps'] || proxy.down;
        if (downVal) {
            const match = String(downVal).match(/\d+/);
            result.append(`,download-bandwidth=${match ? match[0] : 0}`);
        }
        if (proxy.ecn) {
            result.append(',ecn=true');
        }

        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private wireguard(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=wireguard`);
        const sectionName = proxy['section-name'] || proxy._sectionName || proxy.name;
        result.append(`,section-name=${sectionName}`);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private appendTlsProxyParams(result: Result, proxy: ProxyNode, enabled = true) {
        if (!enabled) return;
        const fingerprint = proxy['tls-fingerprint'] || proxy['server-cert-fingerprint-sha256'];
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
        if (proxy.reuse !== undefined) {
            result.append(`,reuse=${proxy.reuse}`);
        } else if (proxy['disable-reuse'] !== undefined) {
            result.append(`,reuse=${!proxy['disable-reuse']}`);
        }
        result.appendIfPresent(
            `,idle-session-check-interval=${proxy['idle-session-check-interval']}`,
            'idle-session-check-interval'
        );
        result.appendIfPresent(
            `,idle-session-timeout=${proxy['idle-session-timeout']}`,
            'idle-session-timeout'
        );
        result.appendIfPresent(
            `,min-idle-session=${proxy['min-idle-session']}`,
            'min-idle-session'
        );

        this.appendCommon(result, proxy);

        return result.toString();
    }

    private appendCommon(result: Result, proxy: ProxyNode) {
        const underlying = proxy['underlying-proxy'] || proxy['dialer-proxy'];
        if (underlying) {
            result.append(`,underlying-proxy=${underlying}`);
        }
        result.appendIfPresent(`,block-quic=${proxy['block-quic']}`, 'block-quic');
    }

    private appendTransport(result: Result, proxy: ProxyNode) {
        if (proxy.network === 'ws') {
            result.append(`,ws=true`);
            const opts = (proxy['ws-opts'] || {}) as any;
            const wsPath = opts.path || proxy['ws-path'];
            if (wsPath) result.append(`,ws-path=${wsPath}`);
            const rawHeaders = opts.headers || proxy['ws-headers'];
            if (rawHeaders) {
                const headers = Object.entries(rawHeaders)
                    .map(([k, v]) => `${k}:${k === 'Host' ? `"${v}"` : v}`)
                    .join('|');
                if (headers) result.append(`,ws-headers=${headers}`);
            } else if (opts.host) {
                result.append(`,ws-headers=Host:"${opts.host}"`);
            }
        }
    }
}
