/**
 * Sub-One Surge Converter
 */
import type { ConvertOptions, ProxyNode } from '../types';
import { formatEndpoint, normalizeReserved, parseEndpoint } from '../utils';
import { BaseConverter } from './base';
import { Result, isPresent } from './utils';

const ipVersions: Record<string, string> = {
    dual: 'dual',
    ipv4: 'v4-only',
    ipv6: 'v6-only',
    'ipv4-prefer': 'prefer-v4',
    'ipv6-prefer': 'prefer-v6'
};

export class SurgeConverter extends BaseConverter {
    name = 'Surge';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const lines = nodes.map((node) => this.convertSingle(node, _options)).filter(Boolean);
        return lines.join('\n');
    }

    private convertSingle(proxy: ProxyNode, opts: ConvertOptions): string {
        try {
            // Clean name for Surge
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
                    return this.vless(p, opts);
                case 'http':
                case 'https':
                    return this.http(p);
                case 'socks5':
                    return this.socks5(p);
                case 'snell':
                    return this.snell(p);
                case 'tuic':
                    return this.tuic(p);
                case 'hysteria':
                    return this.hysteria(p);
                case 'hysteria2':
                    return this.hysteria2(p);
                case 'wireguard':
                    return this.wireguard(p);
                case 'ssh':
                    return this.ssh(p);
                case 'external':
                    return this.external(p);
                case 'anytls':
                    return this.anytls(p);
                case 'direct':
                case 'reject':
                    return `${p.name}=${p.type}`;
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
        result.append(
            `${proxy.name}=ss,${proxy.server},${proxy.port},encrypt-method=${proxy.cipher || 'none'}`
        );
        result.appendIfPresent(`,password="${proxy.password}"`, 'password');

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
        } else if (proxy.plugin === 'v2ray-plugin') {
            const opts = (proxy['plugin-opts'] || {}) as any;
            result.append(`,ws=true`);
            if (opts.path) result.append(`,ws-path=${opts.path}`);
            if (opts.host) result.append(`,ws-headers=Host:"${opts.host}"`);
            if (opts.tls) {
                result.append(`,tls=true`);
                if (opts.host) result.append(`,sni=${opts.host}`);
            }
        }

        this.appendCommon(result, proxy);
        return result.toString();
    }

    private trojan(proxy: ProxyNode): string {
        if (proxy['reality-opts']) {
            throw new Error('[SurgeConverter] Surge does not support Trojan with reality');
        }
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=trojan,${proxy.server},${proxy.port},password="${proxy.password}"`
        );
        this.appendTransport(result, proxy);
        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vmess(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=vmess,${proxy.server},${proxy.port},username=${proxy.uuid}`);
        this.appendTransport(result, proxy);
        result.append(`,vmess-aead=${proxy.aead !== undefined ? proxy.aead : proxy.alterId === 0}`);
        this.appendTLS(result, proxy);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private vless(proxy: ProxyNode, _opts?: ConvertOptions): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=vless,${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,username=${proxy.uuid}`, 'uuid');

        const ip_version = ipVersions[proxy['ip-version'] || ''] || proxy['ip-version'];
        result.appendIfPresent(`,ip-version=${ip_version}`, 'ip-version');

        const network = proxy.network || 'tcp';
        const reality = proxy['reality-opts'];

        if (network === 'ws') {
            this.appendTransport(result, proxy);
        } else if (network === 'grpc') {
            result.append(',grpc=true');
            const grpc = proxy['grpc-opts'] as any;
            if (grpc?.['service-name'] || grpc?.['grpc-service-name']) {
                result.append(`,grpc-service-name=${grpc['service-name'] || grpc['grpc-service-name']}`);
            }
        } else if (network === 'xhttp') {
            result.append(',xhttp=true');
            const xhttp = proxy['xhttp-opts'] as any;
            if (xhttp?.path) result.append(`,xhttp-path=${xhttp.path}`);
            if (xhttp?.host) result.append(`,xhttp-host=${xhttp.host}`);
            if (xhttp?.mode) result.append(`,xhttp-mode=${xhttp.mode}`);
        }

        if (proxy.flow) result.append(`,flow=${proxy.flow}`);
        if (proxy.encryption) result.append(`,encryption=${proxy.encryption}`);

        if (reality) {
            result.append(`,reality-public-key=${reality['public-key']}`);
            if (reality['short-id']) {
                result.append(`,reality-short-id=${reality['short-id']}`);
            }
            const spx = reality['_spider-x'] || reality['spider-x'];
            if (spx) {
                result.append(`,reality-spider-x=${spx}`);
            }
            result.appendIfPresent(`,sni="${proxy.sni}"`, 'sni');
            if (proxy['client-fingerprint']) {
                result.append(`,client-fingerprint=${proxy['client-fingerprint']}`);
            }
            if (proxy.alpn) {
                const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(';') : proxy.alpn;
                result.append(`,alpn=${alpn}`);
            }
        } else {
            result.appendIfPresent(`,tls=${!!proxy.tls}`, 'tls');
            this.appendTLS(result, proxy);
        }

        this.appendCommon(result, proxy);
        return result.toString();
    }

    private http(proxy: ProxyNode): string {
        const result = new Result(proxy);
        const type = proxy.type === 'https' || proxy.tls ? 'https' : 'http';
        result.append(`${proxy.name}=${type},${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,username="${proxy.username}"`, 'username');
        result.appendIfPresent(`,password="${proxy.password}"`, 'password');
        this.appendTLS(result, proxy, false);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private socks5(proxy: ProxyNode): string {
        const result = new Result(proxy);
        const type = proxy.tls ? 'socks5-tls' : 'socks5';
        result.append(`${proxy.name}=${type},${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,username="${proxy.username}"`, 'username');
        result.appendIfPresent(`,password="${proxy.password}"`, 'password');
        this.appendTLS(result, proxy, false);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private snell(proxy: ProxyNode): string {
        const result = new Result(proxy);
        const psk = proxy.psk || proxy.password;
        result.append(
            `${proxy.name}=snell,${proxy.server},${proxy.port},psk=${psk},version=${proxy.version || 3}`
        );
        if (Number(proxy.version) === 6) {
            if (proxy.mode) result.append(`,mode=${proxy.mode}`);
            if (proxy['quic-proxy-mode']) result.append(',quic-proxy-mode=true');
            if (proxy.userkey || proxy._userkey) result.append(`,userkey=${proxy.userkey || proxy._userkey}`);
        }
        const obfs = proxy['obfs-opts']?.mode || proxy.obfs;
        const obfsHost = proxy['obfs-opts']?.host || proxy['obfs-host'];
        const obfsUri = proxy['obfs-opts']?.path;
        if (obfs) {
            result.append(`,obfs=${obfs}`);
            if (obfsHost) {
                result.append(`,obfs-host=${obfsHost}`);
            }
            if (obfsUri) {
                result.append(`,obfs-uri=${obfsUri}`);
            }
        }
        if (proxy.reuse !== undefined) {
            result.append(`,reuse=${proxy.reuse}`);
        }
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private tuic(proxy: ProxyNode): string {
        const result = new Result(proxy);
        const type = !proxy.token || proxy.token.length === 0 ? 'tuic-v5' : 'tuic';
        result.append(`${proxy.name}=${type},${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,uuid=${proxy.uuid}`, 'uuid');
        const pass = proxy.password || proxy.token;
        if (pass) {
            result.append(`,password="${pass}"`);
        }
        result.appendIfPresent(`,token=${proxy.token}`, 'token');
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
        this.appendTLS(result, proxy, false);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private hysteria(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=external,exec=hysteria,args=client,args=-c,args=/path/to/config.json,local-port=0`
        );
        return result.toString();
    }

    private hysteria2(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=hysteria2,${proxy.server},${proxy.port}`
        );
        const pass = proxy.password || proxy.auth;
        if (pass) result.append(`,password="${pass}"`);
        const ports = proxy.ports || proxy['server-ports'];
        if (ports) {
            result.append(`,port-hopping="${String(ports).replace(/,/g, ';')}"`);
        }
        if (proxy['hop-interval']) {
            result.append(`,port-hopping-interval=${proxy['hop-interval']}`);
        }
        const upVal = proxy['upload-bandwidth'] || proxy['up-mbps'] || proxy.up;
        if (upVal) {
            const up = String(upVal).match(/\d+/)?.[0] || '0';
            result.append(`,upload-bandwidth=${up}`);
        }
        const downVal = proxy['download-bandwidth'] || proxy['down-mbps'] || proxy.down;
        if (downVal) {
            const down = String(downVal).match(/\d+/)?.[0] || '0';
            result.append(`,download-bandwidth=${down}`);
        }
        const obfsPassword =
            proxy['obfs-password'] ||
            (proxy.obfs && proxy.obfs !== 'salamander' && proxy.obfs !== 'gecko' ? proxy.obfs : undefined);
        if (proxy.obfs === 'gecko') {
            if (obfsPassword) result.append(`,gecko-password="${obfsPassword}"`);
        } else if (obfsPassword || proxy.obfs === 'salamander') {
            if (obfsPassword) result.append(`,salamander-password="${obfsPassword}"`);
        }
        this.appendTLS(result, proxy, false);
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private wireguard(proxy: ProxyNode): string {
        const p = { ...proxy };
        if (Array.isArray(p.peers) && p.peers.length > 0) {
            const peer = p.peers[0];
            if (peer.endpoint) {
                const ep = parseEndpoint(peer.endpoint);
                p.server = ep.server;
                p.port = ep.port ?? 51820;
            } else {
                if (peer.server) p.server = peer.server;
                if (peer.port) p.port = parseInt(String(peer.port), 10);
            }
            if ((peer as any).ip) p.ip = (peer as any).ip;
            if ((peer as any).ipv6) p.ipv6 = (peer as any).ipv6;
            p['public-key'] = p['public-key'] || peer['public-key'];
            p['preshared-key'] = p['preshared-key'] || peer['pre-shared-key'];
            p['allowed-ips'] = p['allowed-ips'] || peer['allowed-ips'];
            p.reserved = p.reserved || peer.reserved;
        }

        const result = new Result(p);
        const sectionName = p['section-name'] || p._sectionName || p.name;
        result.append(
            `# > WireGuard Proxy ${p.name}\n${p.name}=wireguard,section-name=${sectionName}`
        );
        this.appendCommon(result, p);

        const ipVersion = ipVersions[p['ip-version'] || ''] || p['ip-version'];

        result.append(
            `\n\n# > WireGuard Section ${p.name}\n[WireGuard ${sectionName}]\nprivate-key = ${p['private-key'] || p.privateKey}`
        );
        const selfIp = p['self-ip'] || p.ip;
        if (selfIp) result.append(`\nself-ip = ${selfIp}`);
        const selfIpV6 = p['self-ip-v6'] || p.ipv6;
        if (selfIpV6) result.append(`\nself-ip-v6 = ${selfIpV6}`);
        const dns = p['dns-server'] || p.dns;
        if (dns) {
            const dnsStr = Array.isArray(dns) ? dns.join(', ') : dns;
            result.append(`\ndns-server = ${dnsStr}`);
        }
        result.appendIfPresent(`\nmtu = ${p.mtu}`, 'mtu');
        if (ipVersion === 'prefer-v6') result.append('\nprefer-ipv6 = true');

        const allowedIps = Array.isArray(p['allowed-ips'])
            ? p['allowed-ips'].join(',')
            : p['allowed-ips'];
        const resNums = normalizeReserved(p.reserved);
        const reserved = resNums ? resNums.join('/') : (typeof p.reserved === 'string' ? p.reserved : '');
        const presharedKey = p['preshared-key'] || p['pre-shared-key'];

        const peerParts = [
            `public-key = ${p['public-key'] || p.publicKey}`,
            allowedIps ? `allowed-ips = "${allowedIps}"` : '',
            `endpoint = ${formatEndpoint(p.server, p.port)}`,
            p['persistent-keepalive'] || p.keepalive
                ? `keepalive = ${p['persistent-keepalive'] || p.keepalive}`
                : '',
            reserved ? `client-id = ${reserved}` : '',
            presharedKey ? `preshared-key = ${presharedKey}` : ''
        ].filter(Boolean);

        result.append(`\npeer = (${peerParts.join(', ')})`);

        return result.toString();
    }

    private ssh(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=ssh,${proxy.server},${proxy.port}`
        );
        result.appendIfPresent(`,username="${proxy.username}"`, 'username');
        result.appendIfPresent(`,password="${proxy.password}"`, 'password');
        const privateKey = proxy['keystore-private-key'] || proxy['private-key'] || proxy.privateKey;
        if (privateKey) {
            result.append(`,private-key="${privateKey}"`);
        }
        result.appendIfPresent(`,idle-timeout=${proxy['idle-timeout']}`, 'idle-timeout');
        result.appendIfPresent(
            `,server-fingerprint="${proxy['server-fingerprint']}"`,
            'server-fingerprint'
        );
        this.appendCommon(result, proxy);
        return result.toString();
    }

    private external(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(
            `${proxy.name}=external,exec=${proxy.exec || 'echo'},args=${(proxy.args || []).join(',args=')}`
        );
        return result.toString();
    }

    private anytls(proxy: ProxyNode): string {
        const result = new Result(proxy);
        result.append(`${proxy.name}=anytls,${proxy.server},${proxy.port}`);
        result.appendIfPresent(`,password="${proxy.password}"`, 'password');
        this.appendTLS(result, proxy, false);

        if (proxy.reuse !== undefined) {
            result.append(`,reuse=${proxy.reuse}`);
        }
        if (
            isPresent(proxy, 'idle-session-check-interval') &&
            Number.isInteger(proxy['idle-session-check-interval'])
        ) {
            result.append(`,idle-session-check-interval=${proxy['idle-session-check-interval']}`);
        }
        if (
            isPresent(proxy, 'idle-session-timeout') &&
            Number.isInteger(proxy['idle-session-timeout'])
        ) {
            result.append(`,idle-session-timeout=${proxy['idle-session-timeout']}`);
        }
        if (isPresent(proxy, 'max-stream-count') && Number.isInteger(proxy['max-stream-count'])) {
            result.append(`,max-stream-count=${proxy['max-stream-count']}`);
        }

        this.appendCommon(result, proxy);
        return result.toString();
    }

    private appendTransport(result: Result, proxy: ProxyNode) {
        if (proxy.network === 'ws' || proxy.network === 'httpupgrade') {
            result.append(`,ws=true`);
            if (proxy.network === 'httpupgrade') {
                result.append(',ws-http-upgrade=true');
            }
            const opts = ((proxy.network === 'httpupgrade' ? proxy['httpupgrade-opts'] : proxy['ws-opts']) || proxy['ws-opts'] || {}) as any;
            const wsPath = opts.path || proxy['ws-path'];
            if (wsPath) {
                result.append(`,ws-path=${wsPath}`);
            }
            if (opts.headers) {
                const headers = Object.entries(opts.headers)
                    .map(([k, v]) => `${k}:"${v}"`)
                    .join('|');
                if (headers) result.append(`,ws-headers=${headers}`);
            } else if (opts.host) {
                result.append(`,ws-headers=Host:"${opts.host}"`);
            }
        } else if (proxy.network === 'grpc') {
            result.append(',grpc=true');
            const grpc = proxy['grpc-opts'] as any;
            const serviceName =
                grpc?.['service-name'] || grpc?.['grpc-service-name'] || proxy['grpc-service-name'];
            if (serviceName) {
                result.append(`,grpc-service-name=${serviceName}`);
            }
        } else if (proxy.network === 'xhttp' || proxy.network === 'splithttp') {
            result.append(',xhttp=true');
            const xhttp = proxy['xhttp-opts'] as any;
            if (xhttp?.path) result.append(`,xhttp-path=${xhttp.path}`);
            if (xhttp?.host) result.append(`,xhttp-host=${xhttp.host}`);
            if (xhttp?.mode) result.append(`,xhttp-mode=${xhttp.mode}`);
        }
    }

    private appendTLS(result: Result, proxy: ProxyNode, includeTlsFlag: boolean = true) {
        if (proxy.tls && includeTlsFlag) {
            result.append(`,tls=true`);
        }
        if (proxy.tls || proxy.type === 'trojan' || proxy.type === 'anytls' || proxy.type === 'tuic' || proxy.type === 'hysteria2') {
            const sni = proxy.sni || proxy.servername;
            if (sni) result.append(`,sni=${sni}`);
            result.appendIfPresent(
                `,skip-cert-verify=${proxy['skip-cert-verify']}`,
                'skip-cert-verify'
            );
            const sha256 = proxy['tls-fingerprint'] || proxy['server-cert-fingerprint-sha256'];
            if (sha256) {
                result.append(`,server-cert-fingerprint-sha256=${sha256}`);
            }
            if (proxy['name-cert-verify']) {
                result.append(`,server-cert-verify-name="${proxy['name-cert-verify']}"`);
            }
            if (proxy.alpn) {
                const alpn = Array.isArray(proxy.alpn) ? proxy.alpn.join(',') : proxy.alpn;
                result.append(`,alpn=${alpn}`);
            }
            if (proxy['client-fingerprint']) {
                result.append(`,client-fingerprint=${proxy['client-fingerprint']}`);
            }
            if (proxy['reality-opts']) {
                const r = proxy['reality-opts'];
                if (r['public-key']) result.append(`,reality-public-key=${r['public-key']}`);
                if (r['short-id']) result.append(`,reality-short-id=${r['short-id']}`);
                const spx = r['_spider-x'] || r['spider-x'];
                if (spx) result.append(`,reality-spider-x=${spx}`);
            } else if (proxy['ech-opts']) {
                const rawEch = proxy['ech-opts'] as Record<string, any>;
                const cfg = rawEch.config ?? rawEch['config-list'];
                const echStr = Array.isArray(cfg) ? cfg[0] : cfg;
                if (echStr) {
                    result.append(`,ech-config=${echStr}`);
                }
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
        result.appendIfPresent(`,interface=${proxy['interface-name']}`, 'interface-name');
        const underlying = proxy['underlying-proxy'] || proxy['dialer-proxy'];
        if (underlying) {
            result.append(`,underlying-proxy=${underlying}`);
        }
        const blockQuic = proxy['block-quic'] ?? proxy.block_quic;
        if (blockQuic !== undefined) {
            result.append(`,block-quic=${blockQuic}`);
        }
    }
}
