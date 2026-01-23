/**
 * Sub-One Surge Converter
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

export class SurgeConverter extends BaseConverter {
    name = 'Surge';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const lines = nodes.map(node => this.convertSingle(node, _options)).filter(Boolean);
        return lines.join('\n');
    }

    private convertSingle(proxy: ProxyNode, opts: ConvertOptions): string {
        try {
            // Clean name for Surge
            const safeName = proxy.name.replace(/=|,/g, '');
            const p = { ...proxy, name: safeName };

            switch (p.type) {
                case 'ss': return this.ss(p);
                case 'trojan': return this.trojan(p);
                case 'vmess': return this.vmess(p);
                case 'vless': return this.vless(p);
                case 'http':
                case 'https': return this.http(p);
                case 'socks5': return this.socks5(p);
                case 'snell': return this.snell(p);
                case 'tuic': return this.tuic(p);
                case 'hysteria': return this.hysteria(p);
                case 'hysteria2': return this.hysteria2(p);
                case 'wireguard': return this.wireguard(p);
                case 'ssh': return this.ssh(p);
                case 'external': return this.external(p);
                case 'direct':
                case 'reject': return `${p.name}=${p.type}`;
                default:
                    if (opts.includeUnsupportedProxy) {
                        return this.anytls(p);
                    }
                    console.warn(`[SurgeConverter] Unsupported proxy type: ${p.type}`);
                    return '';
            }
        } catch (e) {
            console.error(`[SurgeConverter] Failed to produce Surge config for ${proxy.name}:`, e);
            return '';
        }
    }

    private ss(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=ss,${proxy.server},${proxy.port},encrypt-method=${proxy.cipher || 'none'}`);
        result.appendIfPresent(`,password=\"${proxy.password}\"`, 'password');

        if (proxy.plugin === 'obfs') {
            const opts = (proxy['plugin-opts'] || {}) as any;
            result.append(`,obfs=${opts.mode || 'http'}`);
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

    private trojan(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=trojan,${proxy.server},${proxy.port},password=\"${proxy.password}\"`);
        this.appendTransport(result, proxy);
        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vmess(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=vmess,${proxy.server},${proxy.port},username=${proxy.uuid}`);
        this.appendTransport(result, proxy);
        result.append(`,vmess-aead=${proxy.aead !== undefined ? proxy.aead : (proxy.alterId === 0)}`);
        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vless(_proxy: ProxyNode): string {
        return '';
    }

    private http(proxy: ProxyNode): string {
        const result = new Result(proxy);
        const type = proxy.type === 'https' || proxy.tls ? 'https' : 'http';
        result.append(`${proxy.name}=${type},${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,username=\"${proxy.username}\"`, 'username');
        result.appendIfPresent(`,password=\"${proxy.password}\"`, 'password');
        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private socks5(proxy: ProxyNode): string {
        const result = new Result(proxy);
        const type = proxy.tls ? 'socks5-tls' : 'socks5';
        result.append(`${proxy.name}=${type},${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,username=\"${proxy.username}\"`, 'username');
        result.appendIfPresent(`,password=\"${proxy.password}\"`, 'password');
        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private snell(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=snell,${proxy.server},${proxy.port},psk=${proxy.password},version=${proxy.version || 3}`);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private tuic(proxy: ProxyNode): string {
        const result = new Result(proxy);
        const type = (!proxy.token || proxy.token.length === 0) ? 'tuic-v5' : 'tuic';
        result.append(`${proxy.name}=${type},${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,uuid=${proxy.uuid}`, 'uuid');
        result.appendIfPresent(`,password=\"${proxy.password}\"`, 'password');
        result.appendIfPresent(`,token=${proxy.token}`, 'token');
        if (proxy.alpn) {
            result.append(`,alpn=${Array.isArray(proxy.alpn) ? proxy.alpn[0] : proxy.alpn}`);
        }
        if (proxy.ports) {
            result.append(`,port-hopping=\"${String(proxy.ports).replace(/,/g, ';')}\"`);
        }
        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private hysteria(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=external,exec=hysteria,args=client,args=-c,args=/path/to/config.json,local-port=0`);
        return result.toString();
    }

    private hysteria2(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=hysteria2,${proxy.server},${proxy.port},password=\"${proxy.password}\"`);
        if (proxy.ports) {
            result.append(`,port-hopping=\"${String(proxy.ports).replace(/,/g, ';')}\"`);
        }
        if (proxy.down) {
            const down = String(proxy.down).match(/\d+/)?.[0] || '0';
            result.append(`,download-bandwidth=${down}`);
        }
        this.appendTLS(result, proxy);
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
            }
            if ((peer as any).ip) p.ip = (peer as any).ip;
            if ((peer as any).ipv6) p.ipv6 = (peer as any).ipv6;
            p['public-key'] = peer['public-key'];
            p['preshared-key'] = peer['pre-shared-key'];
            p['allowed-ips'] = peer['allowed-ips'];
            p.reserved = peer.reserved;
        }

        const result = new Result(p);
        const sectionName = p.name;
        result.append(`# > WireGuard Proxy ${p.name}\n# ${p.name}=wireguard,section-name=${sectionName}`);
        this.appendCommon(result, p);

        const ipVersion = ipVersions[p['ip-version'] || ''] || p['ip-version'];

        result.append(`\n\n# > WireGuard Section ${p.name}\n[WireGuard ${sectionName}]\nprivate-key = ${p['private-key'] || p.privateKey}`);
        if (p.ip) result.append(`\nself-ip = ${p.ip}`);
        if (p.ipv6) result.append(`\nself-ip-v6 = ${p.ipv6}`);
        if (p.dns) {
            const dns = Array.isArray(p.dns) ? p.dns.join(', ') : p.dns;
            result.append(`\ndns-server = ${dns}`);
        }
        result.appendIfPresent(`\nmtu = ${p.mtu}`, 'mtu');
        if (ipVersion === 'prefer-v6') result.append('\nprefer-ipv6 = true');

        const allowedIps = Array.isArray(p['allowed-ips']) ? p['allowed-ips'].join(',') : p['allowed-ips'];
        const reserved = Array.isArray(p.reserved) ? p.reserved.join('/') : p.reserved;
        const presharedKey = p['preshared-key'] || p['pre-shared-key'];

        const peerParts = [
            `public-key = ${p['public-key'] || p.publicKey}`,
            allowedIps ? `allowed-ips = \"${allowedIps}\"` : '',
            `endpoint = ${p.server}:${p.port}`,
            (p['persistent-keepalive'] || p.keepalive) ? `keepalive = ${p['persistent-keepalive'] || p.keepalive}` : '',
            reserved ? `client-id = ${reserved}` : '',
            presharedKey ? `preshared-key = ${presharedKey}` : ''
        ].filter(Boolean);

        result.append(`\npeer = (${peerParts.join(', ')})`);

        return result.toString();
    }

    private ssh(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=ssh,${proxy.server},${proxy.port},username=\"${proxy.username}\",password=\"${proxy.password}\"`);
        result.appendIfPresent(`,server-fingerprint=\"${proxy['server-fingerprint']}\"`, 'server-fingerprint');
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private external(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=external,exec=${proxy.exec || 'echo'},args=${(proxy.args || []).join(',args=')}`);
        return result.toString();
    }

    private anytls(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=anytls,${proxy.server},${proxy.port},password=\"${proxy.password}\"`);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private appendTransport(result: Result, proxy: ProxyNode) {
        if (proxy.network === 'ws') {
            result.append(`,ws=true`);
            const opts = (proxy['ws-opts'] || {}) as any;
            result.appendIfPresent(`,ws-path=${opts.path || '/'}`, 'ws-opts.path');
            if (opts.headers) {
                const headers = Object.entries(opts.headers)
                    .map(([k, v]) => `${k}:\"${v}\"`)
                    .join('|');
                if (headers) result.append(`,ws-headers=${headers}`);
            }
        }
    }

    private appendTLS(result: Result, proxy: ProxyNode) {
        if (proxy.tls) {
            result.append(`,tls=true`);
            result.appendIfPresent(`,sni=${proxy.sni}`, 'sni');
            result.appendIfPresent(`,skip-cert-verify=${proxy['skip-cert-verify']}`, 'skip-cert-verify');
            if (proxy['tls-fingerprint']) {
                result.append(`,server-cert-fingerprint-sha256=${proxy['tls-fingerprint']}`);
            }
        }
    }

    private appendCommon(result: Result, proxy: ProxyNode) {
        result.appendIfPresent(`,tfo=${proxy.tfo}`, 'tfo');
        result.appendIfPresent(`,udp-relay=${proxy.udp}`, 'udp');
        if (proxy['ip-version']) {
            const val = ipVersions[proxy['ip-version']] || proxy['ip-version'];
            result.append(`,ip-version=${val}`);
        }
        result.appendIfPresent(`,test-url=${proxy['test-url']}`, 'test-url');
        result.appendIfPresent(`,underlying-proxy=${proxy['underlying-proxy'] || proxy['dialer-proxy']}`, 'underlying-proxy');
    }
}
