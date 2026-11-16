/**
 * Sub-One URI Converter
 */
import { Base64 } from 'js-base64';

import type { ConvertOptions, ProxyNode } from '../types';
import { getWireGuardAddressWithCIDR, normalizeReserved } from '../utils';
import { BaseConverter } from './base';

export class URIConverter extends BaseConverter {
    name = 'URI';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const uris = nodes.map((node) => this.convertSingle(node)).filter(Boolean);
        return uris.join('\n');
    }

    public convertSingle(node: ProxyNode): string {
        try {
            const p = { ...node };
            if (p.server && p.server.includes(':') && !p.server.startsWith('[')) {
                p.server = `[${p.server}]`;
            }

            switch (p.type) {
                case 'ss':
                    return this.ss(p);
                case 'ssr':
                    return this.ssr(p);
                case 'vmess':
                    return this.vmess(p);
                case 'vless':
                    return this.vless(p);
                case 'trojan':
                    return this.trojan(p);
                case 'hysteria':
                    return this.hysteria(p);
                case 'hysteria2':
                    return this.hysteria2(p);
                case 'tuic':
                    return this.tuic(p);
                case 'wireguard':
                    return this.wireguard(p);
                case 'socks5':
                    return this.socks5(p);
                case 'http':
                case 'https':
                    return this.http(p);
                case 'anytls':
                    return this.anytls(p);
                case 'snell':
                    return this.snell(p);
                case 'naive':
                    return this.naive(p);
                default:
                    return '';
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

        const uri = `ss://${userinfo}@${node.server}:${node.port}`;
        const params = new URLSearchParams();

        if (node.plugin) {
            const opts = (node['plugin-opts'] || {}) as any;
            let pluginStr = '';
            if (node.plugin === 'obfs') {
                pluginStr = `simple-obfs;obfs=${opts.mode}${opts.host ? ';obfs-host=' + opts.host : ''}`;
            } else if (node.plugin === 'v2ray-plugin') {
                pluginStr = `v2ray-plugin;obfs=${opts.mode}${opts.host ? ';obfs-host=' + opts.host : ''}${opts.path ? ';path=' + opts.path : ''}${opts.tls ? ';tls' : ''}`;
            } else if (node.plugin === 'shadow-tls') {
                pluginStr = `shadow-tls;host=${opts.host};password=${opts.password};version=${opts.version}`;
            } else if (node.plugin === 'restls' || node.plugin === 'restls-plugin') {
                pluginStr = `restls;host=${opts.host};password=${opts.password}${opts['version-hint'] ? ';version-hint=' + opts['version-hint'] : ''}${opts['restls-script'] ? ';restls-script=' + opts['restls-script'] : ''}`;
            }
            if (pluginStr) params.set('plugin', pluginStr);
        }

        if (node['udp-over-tcp'] || node.uot) params.set('uot', '1');
        if (node.tfo) params.set('tfo', '1');
        if (node.udp !== undefined) params.set('udp', node.udp ? '1' : '0');

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
        if (node['protocol-param'])
            params.set('protoparam', Base64.encode(node['protocol-param'], true));

        const full = `${main}/?${params.toString()}`;
        return `ssr://${Base64.encode(full, true)}`;
    }

    private vmess(node: ProxyNode): string {
        const config: any = {
            v: '2',
            ps: node.name,
            add: node.server.replace(/[\][]/g, ''),
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
            alpn: Array.isArray(node.alpn) ? node.alpn.join(',') : node.alpn || '',
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
        } else if (node.network === 'xhttp' || node.network === 'splithttp') {
            config.net = 'xhttp';
            const opts = (node['xhttp-opts'] || {}) as any;
            config.path = opts.path || '/';
            config.host = opts.host || '';
        }

        return `vmess://${Base64.encode(JSON.stringify(config), true)}`;
    }

    private vless(node: ProxyNode): string {
        const params = new URLSearchParams();
        this.appendVLESSParams(params, node);
        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        const server = node.server.includes(':') && !node.server.startsWith('[') ? `[${node.server}]` : node.server;
        return `vless://${node.uuid}@${server}:${node.port}${queryString}${hash}`;
    }

    private trojan(node: ProxyNode): string {
        const params = new URLSearchParams();
        params.set('sni', node.sni || node.server.replace(/[\][]/g, ''));
        if (node['skip-cert-verify']) params.set('allowInsecure', '1');
        if (node.udp !== undefined) params.set('udp', node.udp ? '1' : '0');
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
        if (node['hop-interval']) params.set('hop-interval', String(node['hop-interval']));
        if (node.alpn) params.set('alpn', Array.isArray(node.alpn) ? node.alpn[0] : node.alpn);
        if (node.udp !== undefined) params.set('udp', node.udp ? '1' : '0');

        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `hysteria://${node.server}:${node.port}${queryString}${hash}`;
    }

    private hysteria2(node: ProxyNode): string {
        const params = new URLSearchParams();
        const sni = node.sni || node.servername;
        if (sni) params.set('sni', sni);
        if (node.alpn) params.set('alpn', Array.isArray(node.alpn) ? node.alpn[0] : node.alpn);
        if (node.obfs || node['obfs-password']) {
            params.set('obfs', node.obfs || 'salamander');
            if (node['obfs-password']) params.set('obfs-password', node['obfs-password']);
        }
        if (node['skip-cert-verify']) params.set('insecure', '1');
        if (node.tfo) params.set('fastopen', '1');
        if (node.ports) params.set('mport', String(node.ports));
        const pass = node.password || node.auth || '';
        const ports = node.ports || node['server-ports'];
        if (ports) params.set('mport', String(ports));
        if (node['tls-fingerprint']) params.set('pinSHA256', node['tls-fingerprint']);
        if (node['hop-interval']) params.set('hop-interval', String(node['hop-interval']));
        if (node.keepalive) params.set('keepalive', String(node.keepalive));
        if (node.udp !== undefined) params.set('udp', node.udp ? '1' : '0');
        if (node.up || node['up-mbps']) params.set('up', String(node['up-mbps'] || node.up));
        if (node.down || node['down-mbps']) params.set('down', String(node['down-mbps'] || node.down));
        const down = node['download-bandwidth'] || node['down-mbps'] || node.down;
        if (down) params.set('down', String(down));

        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;

        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `hysteria2://${encodeURIComponent(node.password || '')}@${node.server}:${node.port}${queryString}${hash}`;
        return `hysteria2://${encodeURIComponent(pass)}@${node.server}:${node.port}${queryString}${hash}`;
    }

    private tuic(node: ProxyNode): string {
        const params = new URLSearchParams();
        const sni = node.sni || node.servername;
        if (sni) params.set('sni', sni);
        if (node.alpn) params.set('alpn', Array.isArray(node.alpn) ? node.alpn[0] : node.alpn);
        if (node['skip-cert-verify']) params.set('allow_insecure', '1');
        if (node.tfo) params.set('fast_open', '1');
        if (node['congestion-controller'])
            params.set('congestion_control', node['congestion-controller']);
        const congestion = node['congestion-controller'] || node.congestion_control;
        if (congestion)
            params.set('congestion_control', congestion);
        if (node['disable-sni']) params.set('disable_sni', '1');
        if (node['reduce-rtt']) params.set('reduce_rtt', '1');
        if (node['udp-relay-mode']) params.set('udp_relay_mode', node['udp-relay-mode']);
        if (node['heartbeat-interval'])
            params.set('heartbeat_interval', String(node['heartbeat-interval']));
        const rtt = node['reduce-rtt'] || node.zero_rtt_handshake;
        if (rtt) params.set('reduce_rtt', '1');
        const relay = node['udp-relay-mode'] || node.udp_relay_mode;
        if (relay) params.set('udp_relay_mode', relay);
        const hb = node['heartbeat-interval'] || node.heartbeat;
        if (hb)
            params.set('heartbeat_interval', String(hb));
        if (node['max-udp-relay-packet-size'])
            params.set('max_udp_relay_packet_size', String(node['max-udp-relay-packet-size']));
        if (node['max-open-streams'])
            params.set('max_open_streams', String(node['max-open-streams']));
        if (node.udp !== undefined) params.set('udp', node.udp ? '1' : '0');

        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        const pass = node.password || node.token || '';
        const auth =
            !node.uuid && node.token
                ? encodeURIComponent(node.token)
                : `${node.uuid || ''}:${pass}`;
        return `tuic://${auth}@${node.server}:${node.port}${queryString}${hash}`;
    }

    private wireguard(node: ProxyNode): string {
        const params = new URLSearchParams();
        const peer = Array.isArray(node.peers) && node.peers.length > 0 ? node.peers[0] : undefined;
        const pubKey = node['public-key'] || node.publicKey || peer?.['public-key'] || '';
        if (pubKey) params.set('publickey', pubKey);
        // 地址带 CIDR 后缀，同时支持 IPv4 + IPv6
        const wireguardIPv4 = getWireGuardAddressWithCIDR(node, 'ipv4');
        const wireguardIPv6 = getWireGuardAddressWithCIDR(node, 'ipv6');
        if (wireguardIPv4 && wireguardIPv6) {
            params.set('address', `${wireguardIPv4},${wireguardIPv6}`);
        } else if (wireguardIPv4) {
            params.set('address', wireguardIPv4);
        } else if (wireguardIPv6) {
            params.set('address', wireguardIPv6);
        }
        if (node.mtu) params.set('mtu', String(node.mtu));
        const psk =
            node['pre-shared-key'] || node['preshared-key'] || peer?.['pre-shared-key'];
        if (psk) params.set('presharedkey', psk);
        const resNums = normalizeReserved(node.reserved ?? peer?.reserved);
        if (resNums) {
            params.set('reserved', resNums.join(','));
        }
        const keepalive =
            node['persistent-keepalive'] || node.keepalive;
        if (keepalive)
            params.set('keepalive', String(keepalive));
        const rawAllowed = node['allowed-ips'] || peer?.['allowed-ips'];
        if (rawAllowed && rawAllowed.length > 0) {
            params.set('allowed', Array.isArray(rawAllowed) ? rawAllowed.join(',') : rawAllowed);
        }
        if (node.dns) {
            const dnsStr = Array.isArray(node.dns) ? node.dns.join(',') : node.dns;
            params.set('dns', dnsStr);
        }

        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        const server =
            node.server || peer?.server || (peer?.endpoint ? peer.endpoint.split(':')[0] : '');
        const port =
            node.port || peer?.port || (peer?.endpoint ? parseInt(peer.endpoint.split(':')[1], 10) : 51820);
        return `wireguard://${encodeURIComponent(node['private-key'] || node.privateKey || '')}@${server}:${port}${queryString}${hash}`;
    }

    private socks5(node: ProxyNode): string {
        const auth = node.username
            ? Base64.encode(`${node.username}:${node.password || ''}`, true)
            : '';
        const params = new URLSearchParams();
        if (node.tls) params.set('tls', '1');
        if (node.sni) params.set('sni', node.sni);
        if (node['skip-cert-verify']) params.set('skip-cert-verify', 'true');
        if (node.udp !== undefined) params.set('udp', node.udp ? '1' : '0');
        const query = params.toString() ? `?${params.toString()}` : '';
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `socks://${auth ? auth + '@' : ''}${node.server}:${node.port}${query}${hash}`;
    }

    private http(node: ProxyNode): string {
        const auth = node.username ? `${node.username}:${node.password || ''}@` : '';
        const scheme = node.type === 'https' || node.tls ? 'https' : 'http';
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `${scheme}://${auth}${node.server}:${node.port}${hash}`;
    }

    private anytls(node: ProxyNode): string {
        const params = new URLSearchParams();
        const sni = node.sni || node.servername;
        if (sni) params.set('sni', sni);
        if (node['client-fingerprint']) params.set('fp', node['client-fingerprint']);
        if (node.alpn) params.set('alpn', Array.isArray(node.alpn) ? node.alpn[0] : node.alpn);
        if (node['skip-cert-verify']) params.set('insecure', '1');
        if (node.udp !== undefined) params.set('udp', node.udp ? '1' : '0');
        if (node['idle-session-check-interval'] !== undefined)
            params.set('idle-session-check-interval', String(node['idle-session-check-interval']));
        if (node['idle-session-timeout'] !== undefined)
            params.set('idle-session-timeout', String(node['idle-session-timeout']));
        if (node['min-idle-session'] !== undefined)
            params.set('min-idle-session', String(node['min-idle-session']));
        if (node['max-stream-count'] !== undefined)
            params.set('max-stream-count', String(node['max-stream-count']));
        if (node['reality-opts']) {
            if (node['reality-opts']['public-key']) params.set('pbk', node['reality-opts']['public-key']);
            if (node['reality-opts']['short-id']) params.set('sid', node['reality-opts']['short-id']);
        }
        if (node['tls-fingerprint']) params.set('pinsha256', node['tls-fingerprint']);
        if (node['tls-pubkey-sha256']) params.set('tls-pubkey-sha256', node['tls-pubkey-sha256']);
        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `anytls://${encodeURIComponent(node.password || '')}@${node.server}:${node.port}${queryString}${hash}`;
    }

    private naive(node: ProxyNode): string {
        const params = new URLSearchParams();
        if (node.sni) params.set('sni', node.sni);
        const auth = node.username
            ? `${encodeURIComponent(node.username)}:${encodeURIComponent(node.password || '')}@`
            : '';
        const scheme = node.tls === false ? 'naive+http' : 'naive+https';
        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `${scheme}://${auth}${node.server}:${node.port}${queryString}${hash}`;
    }

    private snell(node: ProxyNode): string {
        const params = new URLSearchParams();
        params.set('version', String(node.version || 4));
        const psk = node.psk || node.password || '';
        const obfs = node['obfs-opts']?.mode || node.obfs;
        const obfsHost = node['obfs-opts']?.host || node['obfs-host'];
        if (obfs) params.set('obfs', obfs);
        if (obfsHost) params.set('host', obfsHost);
        if (node.mode) params.set('mode', node.mode);
        if (node.reuse !== undefined) params.set('reuse', node.reuse ? '1' : '0');
        if (node.tfo) params.set('tfo', '1');
        if (node.udp !== undefined) params.set('udp', node.udp ? '1' : '0');
        let queryString = params.toString();
        if (queryString) queryString = '?' + queryString;
        const hash = node.name ? `#${encodeURIComponent(String(node.name))}` : '';
        return `snell://${encodeURIComponent(psk)}@${node.server}:${node.port}${queryString}${hash}`;
    }

    private appendTransportParams(params: URLSearchParams, node: ProxyNode) {
        if (!node.network) return;

        const networkType =
            (node as any).httpupgrade && node['xhttp-opts']?.mode !== 'stream-one'
                ? 'httpupgrade'
                : node.network;
        params.set('type', networkType);
        const opts = (node[`${node.network}-opts`] || {}) as any;
        if (opts) {
            if (opts.path) params.set('path', Array.isArray(opts.path) ? opts.path[0] : opts.path);
            if (opts.headers?.Host)
                params.set(
                    'host',
                    Array.isArray(opts.headers.Host) ? opts.headers.Host[0] : opts.headers.Host
                );
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

        const xopts = node['xhttp-opts'] as Record<string, any>;
        if (xopts && Object.keys(xopts).length > 0) {
            if (xopts.mode) params.set('mode', xopts.mode);
            if (xopts.path) params.set('path', Array.isArray(xopts.path) ? xopts.path[0] : xopts.path);
            if (xopts.host) params.set('host', Array.isArray(xopts.host) ? xopts.host[0] : xopts.host);
        }

        if ((node as any).httpupgrade && opts) {
            const edValue = opts['_v2ray-http-upgrade-ed'] || (node['ws-opts'] as any)?.['_v2ray-http-upgrade-ed'];
            if (edValue) {
                const basePath = opts.path || '/';
                const sep = basePath.includes('?') ? '&' : '?';
                params.set('path', `${basePath}${sep}ed=${edValue}`);
            }
        }

        // 兼容旧版本的简化写法
        if (node.network === 'kcp') {
            if (node.seed && !opts?.seed) params.set('seed', node.seed);
            if (node.headerType && !opts?.['header-type'])
                params.set('headerType', node.headerType);
        }
    }

    private appendTLSParams(params: URLSearchParams, node: ProxyNode) {
        if (!node.tls && !node['reality-opts']) return;
        params.set('security', node['reality-opts'] ? 'reality' : 'tls');
        const sni = node.sni || node.servername;
        if (sni) params.set('sni', sni);
        if (node['client-fingerprint']) params.set('fp', node['client-fingerprint']);
        if (node.alpn)
            params.set('alpn', Array.isArray(node.alpn) ? node.alpn.join(',') : node.alpn);
        if (node['reality-opts']) {
            const r = node['reality-opts'];
            if (r['public-key']) params.set('pbk', r['public-key']);
            if (r['short-id']) params.set('sid', r['short-id']);
            const spx = r['spider-x'] || r['_spider-x'];
            if (spx) params.set('spx', spx);
            if (r['support-x25519mlkem768']) {
                params.set('support-x25519mlkem768', 'true');
            }
        }
        if (node.flow) params.set('flow', node.flow);
        if (node['ech-opts']) {
            const ech = node['ech-opts'];
            if (ech['config-list'] && ech['config-list'].length > 0) {
                params.set('ech', '1');
                // config-list 编码到 extra 字段
            } else if (ech._dns) {
                params.set('ech', '1');
            }
        }
        if (node._echConfigList) {
            params.set('ech', node._echConfigList);
        }
        // skip-cert-verify 通用处理
        if (node['skip-cert-verify']) params.set('allowInsecure', '1');
    }

    private appendVLESSParams(params: URLSearchParams, node: ProxyNode) {
        // 1. security (Reality / TLS / None)
        if (node['reality-opts']) {
            params.set('security', 'reality');
        } else if (node.tls) {
            params.set('security', 'tls');
        } else {
            params.set('security', 'none');
        }

        // 2. transport type
        let vlessType = node.network || 'tcp';
        if (node.network === 'httpupgrade' || (node as any).httpupgrade || (node.network === 'ws' && (node['ws-opts'] as any)?.['v2ray-http-upgrade'])) {
            vlessType = node['xhttp-opts']?.mode === 'stream-one' ? 'ws' : 'httpupgrade';
        } else if (node.network === 'http') {
            vlessType = 'tcp';
        } else if (node.network === 'h2') {
            vlessType = 'http';
        }
        params.set('type', vlessType);
        if (node.network === 'http') {
            params.set('headerType', 'http');
        }

        // Transport options
        if (node.network === 'ws' && node['ws-opts']) {
            const wsOpts = node['ws-opts'] as Record<string, any>;
            let p = node['ws-path'] || wsOpts.path || '/';
            if (wsOpts['max-early-data']) {
                const sep = p.includes('?') ? '&' : '?';
                p = `${p}${sep}ed=${wsOpts['max-early-data']}`;
            }
            params.set('path', p);
            const h = node['ws-headers']?.Host || wsOpts.headers?.Host;
            if (h) params.set('host', Array.isArray(h) ? h[0] : h);
        } else if (node.network === 'grpc') {
            const opts = (node['grpc-opts'] || {}) as any;
            const sn = node['grpc-service-name'] || opts['service-name'];
            if (sn) params.set('serviceName', sn);
            if (opts['_grpc-type']) params.set('mode', opts['_grpc-type']);
            if (opts['_grpc-authority']) params.set('authority', opts['_grpc-authority']);
        } else if (node.network === 'kcp') {
            const opts = (node['kcp-opts'] || {}) as any;
            if (opts.seed || node.seed) params.set('seed', opts.seed || node.seed);
            if (opts['header-type'] || node.headerType) params.set('headerType', opts['header-type'] || node.headerType);
        } else if (node.network === 'quic') {
            const opts = (node['quic-opts'] || {}) as any;
            if (opts.security) params.set('quicSecurity', opts.security);
            if (opts.key) params.set('key', opts.key);
            if (opts['header-type']) params.set('headerType', opts['header-type']);
        }

        const xopts = node['xhttp-opts'] as Record<string, any>;
        if (xopts && Object.keys(xopts).length > 0) {
            if (xopts.mode) params.set('mode', xopts.mode);
            if (xopts.path) params.set('path', Array.isArray(xopts.path) ? xopts.path[0] : xopts.path);
            if (xopts.host) params.set('host', Array.isArray(xopts.host) ? xopts.host[0] : xopts.host);
        }

        // 3. packetEncoding (Sub-Store parity: emit packetEncoding and omit udp=1 when packetEncoding is resolved)
        let canonicalPacketEncoding: string | undefined;
        if (node['packet-encoding'] != null) {
            canonicalPacketEncoding = `${node['packet-encoding']}`.trim().toLowerCase();
        } else if (node.xudp) {
            canonicalPacketEncoding = 'xudp';
        } else if (node['packet-addr']) {
            canonicalPacketEncoding = 'packetaddr';
        }

        if (canonicalPacketEncoding === 'none') {
            params.set('packetEncoding', 'none');
        } else if (canonicalPacketEncoding === 'packetaddr' || canonicalPacketEncoding === 'packet') {
            params.set('packetEncoding', 'packet');
        } else if (canonicalPacketEncoding === 'xudp') {
            params.set('packetEncoding', 'xudp');
        } else if (node.udp !== undefined) {
            params.set('udp', node.udp ? '1' : '0');
        }

        // 4. alpn
        if (node.alpn) {
            params.set('alpn', Array.isArray(node.alpn) ? node.alpn.join(',') : node.alpn);
        }

        // 5. allowInsecure
        if (node['skip-cert-verify']) {
            params.set('allowInsecure', '1');
        }

        // 6. pcs / tls-fingerprint
        if (node._pcs) {
            params.set('pcs', node._pcs);
        } else if (node['tls-fingerprint']) {
            params.set('pcs', node['tls-fingerprint']);
        }

        // 7. vcn
        const certNames = Array.isArray(node._vcn) ? node._vcn.join(',') : node['name-cert-verify'];
        if (certNames) {
            params.set('vcn', certNames);
        }

        // 8. ech
        if (node._echConfigList) {
            params.set('ech', node._echConfigList);
        } else if (node['ech-opts']?.['config-list']?.length) {
            params.set('ech', '1');
        }

        // 9. h2
        if (node._h2) {
            params.set('h2', '1');
        }

        // 10. sni
        const sni = node.sni || node.servername;
        if (sni) {
            params.set('sni', sni);
        }

        // 11. client-fingerprint
        if (node['client-fingerprint']) {
            params.set('fp', node['client-fingerprint']);
        }

        // 12. flow
        if (node.flow) {
            params.set('flow', node.flow);
        }

        // 13. Reality sid, spx, pbk, support-x25519mlkem768
        if (node['reality-opts']) {
            const r = node['reality-opts'];
            if (r['short-id']) params.set('sid', r['short-id']);
            const spx = r['spider-x'] || r['_spider-x'];
            if (spx) params.set('spx', spx);
            if (r['public-key']) params.set('pbk', r['public-key']);
            if (r['support-x25519mlkem768']) {
                params.set('support-x25519mlkem768', 'true');
            }
        }

        // 14. extra / mode / pqv
        if (node._mode && !params.has('mode')) {
            params.set('mode', node._mode);
        }
        if (node._extra) {
            const extra = typeof node._extra === 'string' ? node._extra : JSON.stringify(node._extra);
            params.set('extra', extra);
        }
        if (node._pqv) {
            params.set('pqv', node._pqv);
        }

        // 15. encryption
        params.set('encryption', node.encryption || 'none');
    }
}
