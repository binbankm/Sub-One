/**
 * Sub-One URI Converter
 */

import { Base64 } from 'js-base64';
import type { ProxyNode, ConvertOptions } from '../types';
import { BaseConverter } from './base';

export class URIConverter extends BaseConverter {
    name = 'URI';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const uris = nodes.map(node => this.convertSingle(node)).filter(Boolean);
        return uris.join('\n');
    }

    public convertSingle(node: ProxyNode): string {
        try {
            const p = { ...node };
            if (p.server && p.server.includes(':')) {
                p.server = `[${p.server}]`;
            }

            switch (p.type) {
                case 'ss': return this.ss(p);
                case 'ssr': return this.ssr(p);
                case 'vmess': return this.vmess(p);
                case 'vless': return this.vless(p);
                case 'trojan': return this.trojan(p);
                case 'hysteria': return this.hysteria(p);
                case 'hysteria2': return this.hysteria2(p);
                case 'tuic': return this.tuic(p);
                case 'wireguard': return this.wireguard(p);
                case 'socks5': return this.socks5(p);
                case 'http':
                case 'https': return this.http(p);
                case 'anytls': return this.anytls(p);
                case 'naive': return this.naive(p);
                default: return '';
            }
        } catch (e) {
            console.error(`[URIConverter] Failed to produce URI for ${node.name}:`, e);
            return '';
        }
    }

    private ss(node: ProxyNode): string {
        const is2022 = node.cipher?.startsWith('2022-blake3-');
        const userinfo = is2022
            ? `${encodeURIComponent(node.cipher || '')}:${encodeURIComponent(node.password || '')}`
            : Base64.encode(`${node.cipher || ''}:${node.password || ''}`, true);

        let uri = `ss://${userinfo}@${node.server}:${node.port}`;
        const params = new URLSearchParams();

        if (node.plugin) {
            const opts = (node['plugin-opts'] || {}) as any;
            let pluginStr = '';
            if (node.plugin === 'obfs') {
                pluginStr = `simple-obfs;obfs=${opts.mode}${opts.host ? ';obfs-host=' + opts.host : ''}`;
            } else if (node.plugin === 'v2ray-plugin') {
                pluginStr = `v2ray-plugin;obfs=${opts.mode}${opts.host ? ';obfs-host' + opts.host : ''}${opts.tls ? ';tls' : ''}`;
            } else if (node.plugin === 'shadow-tls') {
                pluginStr = `shadow-tls;host=${opts.host};password=${opts.password};version=${opts.version}`;
            }
            if (pluginStr) params.set('plugin', pluginStr);
        }

        if (node['udp-over-tcp']) params.set('uot', '1');
        if (node.tfo) params.set('tfo', '1');

        this.appendTransportParams(params, node);
        this.appendTLSParams(params, node);

        const query = params.toString();
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `${uri}${query ? '?' + query : ''}${hash}`;
    }

    private ssr(node: ProxyNode): string {
        const main = `${node.server}:${node.port}:${node.protocol || 'origin'}:${node.cipher}:${node.obfs || 'plain'}:${Base64.encode(node.password || '', true)}`;
        const params = new URLSearchParams();
        params.set('remarks', Base64.encode(node.name || '', true));
        if (node['obfs-param']) params.set('obfsparam', Base64.encode(node['obfs-param'], true));
        if (node['protocol-param']) params.set('protoparam', Base64.encode(node['protocol-param'], true));

        const full = `${main}/?${params.toString()}`;
        return `ssr://${Base64.encode(full, true)}`;
    }

    private vmess(node: ProxyNode): string {
        const config: any = {
            v: '2',
            ps: node.name,
            add: node.server.replace(/[\[\]]/g, ''),
            port: String(node.port),
            id: node.uuid,
            aid: String(node.alterId || 0),
            scy: node.cipher || 'auto',
            net: node.network || 'tcp',
            type: 'none',
            host: '',
            path: '',
            tls: node.tls ? 'tls' : '',
            sni: node.sni || '',
            alpn: Array.isArray(node.alpn) ? node.alpn.join(',') : (node.alpn || ''),
            fp: node['client-fingerprint'] || ''
        };

        if (node.network === 'ws') {
            const opts = (node['ws-opts'] || {}) as any;
            config.path = node['ws-path'] || opts.path || '/';
            config.host = node['ws-headers']?.Host || opts.headers?.Host || '';
        } else if (node.network === 'grpc') {
            const opts = (node['grpc-opts'] || {}) as any;
            config.path = node['grpc-service-name'] || opts['service-name'] || '';
            config.type = opts['_grpc-type'] || 'gun';
            config.host = opts['_grpc-authority'] || '';
        } else if (node.network === 'http') {
            const opts = (node['http-opts'] || {}) as any;
            config.type = 'http';
            config.path = opts.path?.[0] || '/';
            config.host = opts.headers?.Host?.[0] || '';
        }

        return `vmess://${Base64.encode(JSON.stringify(config), true)}`;
    }

    private vless(node: ProxyNode): string {
        const params = new URLSearchParams();
        this.appendVLESSParams(params, node);
        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `vless://${node.uuid}@${node.server}:${node.port}${queryString}${hash}`;
    }

    private trojan(node: ProxyNode): string {
        const params = new URLSearchParams();
        params.set('sni', node.sni || node.server.replace(/[\[\]]/g, ''));
        if (node['skip-cert-verify']) params.set('allowInsecure', '1');
        this.appendTransportParams(params, node);
        this.appendTLSParams(params, node);
        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `trojan://${node.password}@${node.server}:${node.port}${queryString}${hash}`;
    }

    private hysteria(node: ProxyNode): string {
        const params = new URLSearchParams();
        if (node.auth) params.set('auth', node.auth);
        if (node.up) params.set('upmbps', String(node.up));
        if (node.down) params.set('downmbps', String(node.down));
        if (node.sni) params.set('peer', node.sni);
        if (node.obfs) params.set('obfsParam', node.obfs);
        if (node['skip-cert-verify']) params.set('insecure', '1');
        if (node.tfo) params.set('fastopen', '1');
        if (node.ports) params.set('mport', String(node.ports));
        if (node.alpn) params.set('alpn', Array.isArray(node.alpn) ? node.alpn[0] : node.alpn);

        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `hysteria://${node.server}:${node.port}${queryString}${hash}`;
    }

    private hysteria2(node: ProxyNode): string {
        const params = new URLSearchParams();
        if (node.sni) params.set('sni', node.sni);
        if (node.alpn) params.set('alpn', Array.isArray(node.alpn) ? node.alpn[0] : node.alpn);
        if (node.obfs) {
            params.set('obfs', node.obfs);
            if (node['obfs-password']) params.set('obfs-password', node['obfs-password']);
        }
        if (node['skip-cert-verify']) params.set('insecure', '1');
        if (node.tfo) params.set('fastopen', '1');
        if (node.ports) params.set('mport', String(node.ports));
        if (node['tls-fingerprint']) params.set('pinSHA256', node['tls-fingerprint']);

        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;

        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `hysteria2://${encodeURIComponent(node.password || '')}@${node.server}:${node.port}${queryString}${hash}`;
    }

    private tuic(node: ProxyNode): string {
        const params = new URLSearchParams();
        if (node.sni) params.set('sni', node.sni);
        if (node.alpn) params.set('alpn', Array.isArray(node.alpn) ? node.alpn[0] : node.alpn);
        if (node['skip-cert-verify']) params.set('allow_insecure', '1');
        if (node.tfo) params.set('fast_open', '1');
        if (node['congestion-controller']) params.set('congestion_control', node['congestion-controller']);

        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `tuic://${node.uuid || ''}:${node.password || ''}@${node.server}:${node.port}${queryString}${hash}`;
    }

    private wireguard(node: ProxyNode): string {
        const params = new URLSearchParams();
        params.set('publickey', node['public-key'] || node.publicKey || '');
        if (node.ip) params.set('address', node.ip);
        if (node.mtu) params.set('mtu', String(node.mtu));
        const psk = node['pre-shared-key'] || node['preshared-key'];
        if (psk) params.set('presharedkey', psk);

        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `wireguard://${node['private-key'] || node.privateKey}@${node.server}:${node.port}${queryString}${hash}`;
    }

    private socks5(node: ProxyNode): string {
        const auth = node.username ? Base64.encode(`${node.username}:${node.password || ''}`, true) : '';
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `socks://${auth ? auth + '@' : ''}${node.server}:${node.port}${hash}`;
    }

    private http(node: ProxyNode): string {
        const auth = node.username ? `${node.username}:${node.password || ''}@` : '';
        const scheme = node.type === 'https' || node.tls ? 'https' : 'http';
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `${scheme}://${auth}${node.server}:${node.port}${hash}`;
    }

    private anytls(node: ProxyNode): string {
        const params = new URLSearchParams();
        this.appendVLESSParams(params, { ...node, uuid: node.password });
        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `anytls://${node.password}@${node.server}:${node.port}${queryString}${hash}`;
    }

    private naive(node: ProxyNode): string {
        const params = new URLSearchParams();
        if (node.sni) params.set('sni', node.sni);
        const auth = node.username ? `${encodeURIComponent(node.username)}:${encodeURIComponent(node.password || '')}@` : '';
        const scheme = node.tls === false ? 'naive+http' : 'naive+https';
        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `${scheme}://${auth}${node.server}:${node.port}${queryString}${hash}`;
    }

    private appendTransportParams(params: URLSearchParams, node: ProxyNode) {
        if (!node.network) return;
        params.set('type', node.network);
        const opts = (node[`${node.network}-opts`] || {}) as any;
        if (opts) {
            if (opts.path) params.set('path', Array.isArray(opts.path) ? opts.path[0] : opts.path);
            if (opts.headers?.Host) params.set('host', Array.isArray(opts.headers.Host) ? opts.headers.Host[0] : opts.headers.Host);
            if (node.network === 'grpc') {
                if (opts['service-name']) params.set('serviceName', opts['service-name']);
                if (opts['_grpc-type']) params.set('mode', opts['_grpc-type']);
                if (opts['_grpc-authority']) params.set('authority', opts['_grpc-authority']);
            } else if (node.network === 'kcp') {
                // mKCP 特殊参数
                if (opts.seed) params.set('seed', opts.seed);
                if (opts['header-type']) params.set('headerType', opts['header-type']);
            } else if (node.network === 'quic') {
                // QUIC 特殊参数
                if (opts.security) params.set('quicSecurity', opts.security);
                if (opts.key) params.set('key', opts.key);
                if (opts['header-type']) params.set('headerType', opts['header-type']);
            }
        }

        // 兼容旧版本的简化写法
        if (node.network === 'kcp') {
            if (node.seed && !opts?.seed) params.set('seed', node.seed);
            if (node.headerType && !opts?.['header-type']) params.set('headerType', node.headerType);
        }
    }

    private appendTLSParams(params: URLSearchParams, node: ProxyNode) {
        if (!node.tls) return;
        params.set('security', node['reality-opts'] ? 'reality' : 'tls');
        if (node.sni) params.set('sni', node.sni);
        if (node['client-fingerprint']) params.set('fp', node['client-fingerprint']);
        if (node.alpn) params.set('alpn', Array.isArray(node.alpn) ? node.alpn.join(',') : node.alpn);
        if (node['reality-opts']) {
            const r = node['reality-opts'];
            if (r['public-key']) params.set('pbk', r['public-key']);
            if (r['short-id']) params.set('sid', r['short-id']);
            if (r['_spider-x']) params.set('spx', r['_spider-x']);
        }
    }

    private appendVLESSParams(params: URLSearchParams, node: ProxyNode) {
        this.appendTransportParams(params, node);
        this.appendTLSParams(params, node);
        if (node.flow) params.set('flow', node.flow);
        if (node.encryption) params.set('encryption', node.encryption);
        if (node['skip-cert-verify']) params.set('allowInsecure', '1');
    }
}
