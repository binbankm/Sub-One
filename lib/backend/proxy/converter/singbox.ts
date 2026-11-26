/**
 * Sub-One Sing-box Converter
 */
import type { ConvertOptions, ProxyNode } from '../types';
import { getWireGuardAddressWithCIDR, normalizeReserved, parseEndpoint } from '../utils';
import { BaseConverter } from './base';
import { isPresent } from './utils';

export class SingboxConverter extends BaseConverter {
    name = 'Singbox';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const nameCount = new Map<string, number>();
        const nameIndex = new Map<string, number>();
        nodes.forEach((node) => {
            nameCount.set(node.name, (nameCount.get(node.name) || 0) + 1);
        });

        const dedupedNodes = nodes.map((node) => {
            if ((nameCount.get(node.name) || 0) > 1) {
                const idx = (nameIndex.get(node.name) || 0) + 1;
                nameIndex.set(node.name, idx);
                return { ...node, name: `${node.name}_${idx}` };
            }
            return node;
        });

        const outbounds = dedupedNodes.flatMap((node) => {
            const result = this.toOutbound(node);
            if (!result) return [];
            return Array.isArray(result) ? result : [result];
        });
        return JSON.stringify({ outbounds }, null, 2);
    }

    private toOutbound(node: ProxyNode): any {
        try {
            const typeMap: Record<string, string> = {
                ss: 'shadowsocks',
                ssr: 'shadowsocksr',
                shadowsocksr: 'shadowsocksr',
                socks5: 'socks',
                http: 'http',
                https: 'http',
                vmess: 'vmess',
                vless: 'vless',
                trojan: 'trojan',
                hysteria: 'hysteria',
                hysteria2: 'hysteria2',
                tuic: 'tuic',
                wireguard: 'wireguard',
                ssh: 'ssh',
                snell: 'snell',
                anytls: 'anytls',
                naive: 'http',
                direct: 'direct',
                reject: 'block'
            };

            const type = typeMap[node.type];
            if (!type) {
                console.warn(`[SingboxConverter] Unsupported type: ${node.type}`);
                return null;
            }

            const outbound: any = {
                type: type,
                tag: node.name,
                server: node.server,
                server_port: node.port
            };

            if (node.type === 'direct' || node.type === 'reject') {
                delete outbound.server;
                delete outbound.server_port;
            }

            switch (node.type) {
                case 'ss':
                    outbound.method = node.cipher;
                    outbound.password = node.password;
                    if (node.uot) outbound.udp_over_tcp = true;
                    if (node['udp-over-tcp']) {
                        outbound.udp_over_tcp = {
                            enabled: true,
                            version: (!node['udp-over-tcp-version'] || node['udp-over-tcp-version'] === 1) ? 1 : 2
                        };
                    }
                    if (node.plugin === 'obfs') {
                        outbound.plugin = 'obfs';
                        outbound.plugin_opts = `mode=${node['plugin-opts']?.mode || 'http'}${node['plugin-opts']?.host ? ';host=' + node['plugin-opts'].host : ''}`;
                    } else if (node.plugin === 'v2ray-plugin' && node['plugin-opts']) {
                        const opts = node['plugin-opts'] as Record<string, any>;
                        const parts: string[] = [`mode=${opts.mode || 'websocket'}`];
                        if (opts.host) parts.push(`host=${opts.host}`);
                        if (opts.path) parts.push(`path=${opts.path}`);
                        if (opts.tls) parts.push('tls');
                        outbound.plugin = 'v2ray-plugin';
                        outbound.plugin_opts = parts.join(';');
                    } else if (
                        node.plugin === 'shadow-tls' ||
                        (!node.plugin && (node['shadow-tls-password'] || node['shadow-tls-sni']))
                    ) {
                        // shadow-tls: 拆分为 shadowsocks + shadowtls 两个 outbound
                        const opts = (node['plugin-opts'] || {}) as any;
                        const stHost = opts.host || node['shadow-tls-sni'] || node.sni || '';
                        const stPassword = opts.password || node['shadow-tls-password'] || '';
                        const stVersion = opts.version ?? node['shadow-tls-version'] ?? 3;
                        const stTag = `${node.name}_shadowtls`;
                        outbound.detour = stTag;
                        if (node['udp-over-tcp'])
                            outbound.udp_over_tcp = {
                                enabled: true,
                                version: node['udp-over-tcp-version'] === 2 ? 2 : 1
                            };
                        const stOutbound: any = {
                            type: 'shadowtls',
                            tag: stTag,
                            server: node.server,
                            server_port: node.port,
                            version: stVersion,
                            password: stPassword,
                            tls: {
                                enabled: true,
                                server_name: stHost,
                                utls: {
                                    enabled: true,
                                    fingerprint: node['client-fingerprint'] || 'chrome'
                                }
                            }
                        };
                        // 返回数组：SS 本体在前，shadowtls 在后
                        // (通过在 convert() 的 flatMap 展开)
                        (outbound as any).__extra = stOutbound;
                    }
                    break;
                case 'ssr': {
                    outbound.method = node.cipher;
                    outbound.password = node.password;
                    if (node.protocol) outbound.protocol = node.protocol;
                    const ssrProtoParam = node['protocol-param'] || node.protocol_param;
                    if (ssrProtoParam) outbound.protocol_param = ssrProtoParam;
                    if (node.obfs) outbound.obfs = node.obfs;
                    const ssrObfsParam = node['obfs-param'] || node.obfs_param;
                    if (ssrObfsParam) outbound.obfs_param = ssrObfsParam;
                    break;
                }
                case 'ssh': {
                    if (node.username) outbound.user = node.username;
                    if (node.password) outbound.password = node.password;
                    const sshPrivateKey = node['private-key'] || node.privateKey;
                    if (sshPrivateKey) {
                        if (sshPrivateKey.includes('PRIVATE KEY')) {
                            outbound.private_key = sshPrivateKey;
                        } else {
                            outbound.private_key_path = sshPrivateKey;
                        }
                    }
                    if (node['private-key-passphrase'])
                        outbound.private_key_passphrase = node['private-key-passphrase'];
                    if (node['server-fingerprint']) {
                        outbound.host_key = [node['server-fingerprint']];
                        outbound.host_key_algorithms = [node['server-fingerprint'].split(' ')[0]];
                    }
                    if (node['host-key']) outbound.host_key = node['host-key'];
                    if (node['host-key-algorithms'])
                        outbound.host_key_algorithms = node['host-key-algorithms'];
                    break;
                }
                case 'naive':
                    outbound.username = node.username;
                    outbound.password = node.password;
                    // NaiveProxy 天然需要 TLS，删除 insecure（sing-box 不支持）
                    this.appendTLS(outbound, node);
                    if (outbound.tls?.insecure) delete outbound.tls.insecure;
                    // udp-over-tcp
                    if (node['udp-over-tcp'] || node.uot) {
                        if (typeof node['udp-over-tcp'] === 'object') {
                            outbound.udp_over_tcp = {
                                enabled: true,
                                version: (!node['udp-over-tcp-version'] || node['udp-over-tcp-version'] === 1) ? 1 : 2
                            };
                        } else {
                            outbound.udp_over_tcp = true;
                        }
                    }
                    // extra-headers
                    if (node['extra-headers']) outbound.extra_headers = node['extra-headers'];
                    // quic
                    if (node.quic) outbound.quic = true;
                    if (node['quic-congestion-control']) outbound.quic_congestion_control = node['quic-congestion-control'];
                    // fast-open
                    if (node['fast-open']) outbound.udp_fragment = true;
                    break;
                case 'vmess':
                    outbound.uuid = node.uuid;
                    outbound.security = node.cipher || 'auto';
                    outbound.alter_id = node.alterId || 0;
                    if (isPresent(node, 'aead')) outbound.authenticated_length = node.aead;
                    if (node['authenticated-length'] != null)
                        outbound.authenticated_length = !!node['authenticated-length'];
                    if (node['global-padding'] != null)
                        outbound.global_padding = !!node['global-padding'];
                    if (node['packet-encoding'] != null) {
                        const pe = String(node['packet-encoding']).trim().toLowerCase();
                        if (['xudp', 'packetaddr', ''].includes(pe)) {
                            outbound.packet_encoding = pe;
                        }
                    } else if (node.xudp) {
                        outbound.packet_encoding = 'xudp';
                    } else if (node['packet-addr']) {
                        outbound.packet_encoding = 'packetaddr';
                    }
                    if (node.tls || node['reality-opts']) this.appendTLS(outbound, node);
                    this.appendTransport(outbound, node);
                    break;
                case 'vless':
                    if (node.encryption && node.encryption !== 'none') {
                        throw new Error(
                            `[SingboxConverter] VLESS encryption is not supported: ${node.encryption}`
                        );
                    }
                    outbound.uuid = node.uuid;
                    if (node.flow) outbound.flow = node.flow;
                    if (node['packet-encoding'] != null) {
                        const pe = String(node['packet-encoding']).trim().toLowerCase();
                        if (['xudp', 'packetaddr', ''].includes(pe)) {
                            outbound.packet_encoding = pe;
                        }
                    } else if (node.xudp) {
                        outbound.packet_encoding = 'xudp';
                    } else if (node['packet-addr']) {
                        outbound.packet_encoding = 'packetaddr';
                    }
                    if (node.tls || node['reality-opts']) this.appendTLS(outbound, node);
                    this.appendTransport(outbound, node);
                    break;
                case 'trojan':
                    outbound.password = node.password;
                    this.appendTLS(outbound, node);
                    this.appendTransport(outbound, node);
                    break;
                case 'socks5':
                case 'http':
                case 'https':
                    if (node.username) outbound.username = node.username;
                    if (node.password) outbound.password = node.password;
                    if (node.type === 'https' || node.tls) this.appendTLS(outbound, node);
                    break;
                case 'hysteria':
                    outbound.auth_str = node['auth-str'] || node.auth_str || node.auth;
                    if (node.up || node['up-mbps']) {
                        outbound.up_mbps =
                            typeof node['up-mbps'] === 'number'
                                ? node['up-mbps']
                                : parseInt(String(node.up || '0').match(/\d+/)?.[0] || '0', 10);
                    }
                    if (node.down || node['down-mbps']) {
                        outbound.down_mbps =
                            typeof node['down-mbps'] === 'number'
                                ? node['down-mbps']
                                : parseInt(String(node.down || '0').match(/\d+/)?.[0] || '0', 10);
                    }
                    if (node.obfs) outbound.obfs = node.obfs;
                    if (node.ports || node['server-ports']) {
                        outbound.server_ports = String(node.ports || node['server-ports'])
                            .split(/\s*,\s*/)
                            .map((p) => {
                                const range = p.replace(/\s*-\s*/g, ':');
                                return range.includes(':') ? range : `${range}:${range}`;
                            });
                    }
                    if (node['hop-interval']) {
                        const hi = String(node['hop-interval']);
                        outbound.hop_interval = /^\d+$/.test(hi) ? `${hi}s` : hi;
                    }
                    if (node['recv-window-conn']) outbound.recv_window_conn = node['recv-window-conn'];
                    if (node['recv-window']) outbound.recv_window = node['recv-window'];
                    if (node['fast-open']) outbound.udp_fragment = true;
                    if (node['disable-mtu-discovery']) outbound.disable_mtu_discovery = true;
                    this.appendTLS(outbound, node);
                    break;
                case 'hysteria2':
                    outbound.password = node.password || node.auth;
                    {
                        const hy2ObfsPass =
                            node['obfs-password'] ||
                            (node.obfs && node.obfs !== 'salamander' && node.obfs !== 'gecko' ? node.obfs : undefined);
                        if (['salamander', 'gecko'].includes(node.obfs || '')) {
                            outbound.obfs = {
                                type: node.obfs,
                                password: hy2ObfsPass || ''
                            };
                            if (node.obfs === 'gecko') {
                                if (node['obfs-min-packet-size']) outbound.obfs.min_packet_size = node['obfs-min-packet-size'];
                                if (node['obfs-max-packet-size']) outbound.obfs.max_packet_size = Math.min(node['obfs-max-packet-size'], 2048);
                            }
                        } else if (hy2ObfsPass || node.obfs === 'salamander') {
                            outbound.obfs = {
                                type: 'salamander',
                                password: hy2ObfsPass || ''
                            };
                        }
                    }
                    if (node.up || node['up-mbps']) {
                        outbound.up_mbps =
                            typeof node['up-mbps'] === 'number'
                                ? node['up-mbps']
                                : parseInt(String(node.up || '0').match(/\d+/)?.[0] || '0', 10);
                    }
                    if (node.down || node['down-mbps']) {
                        outbound.down_mbps =
                            typeof node['down-mbps'] === 'number'
                                ? node['down-mbps']
                                : parseInt(String(node.down || '0').match(/\d+/)?.[0] || '0', 10);
                    }
                    // 端口跳跃
                    if (node.ports || node['server-ports']) {
                        outbound.server_ports = String(node.ports || node['server-ports'])
                            .split(/\s*,\s*/)
                            .map((p) => {
                                const range = p.replace(/\s*-\s*/g, ':');
                                return range.includes(':') ? range : `${range}:${range}`;
                            });
                    }
                    if (node['hop-interval']) {
                        const hi = String(node['hop-interval']);
                        outbound.hop_interval = /^\d+$/.test(hi) ? `${hi}s` : hi;
                    }
                    if (node['bbr-profile']) outbound.bbr_profile = node['bbr-profile'];
                    if (node['disable-chrome-parrot']) outbound.disable_chrome_parrot = true;
                    if (node['fast-open']) outbound.udp_fragment = true;
                    if (node['disable-mtu-discovery']) outbound.disable_mtu_discovery = true;
                    if (node.network && ['tcp', 'udp'].includes(node.network)) outbound.network = node.network;
                    this.appendTLS(outbound, node);
                    break;
                case 'tuic': {
                    outbound.uuid = node.uuid;
                    outbound.password = node.password || node.token;
                    const congestion = node['congestion-controller'] || node.congestion_control;
                    if (congestion && congestion !== 'cubic')
                        outbound.congestion_control = congestion;
                    const relayMode = node['udp-relay-mode'] || node.udp_relay_mode;
                    if (relayMode && relayMode !== 'native')
                        outbound.udp_relay_mode = relayMode;
                    if (node['reduce-rtt'] || node.zero_rtt_handshake) outbound.zero_rtt_handshake = true;
                    const hb = node['heartbeat-interval'] || node.heartbeat;
                    if (hb) {
                        const hi = String(hb);
                        outbound.heartbeat = /^\d+$/.test(hi) ? `${hi}ms` : hi;
                    }
                    if (node['udp-over-stream']) outbound.udp_over_stream = true;
                    if (node.network && ['tcp', 'udp'].includes(node.network)) outbound.network = node.network;
                    this.appendTLS(outbound, node);
                    break;
                }
                case 'wireguard': {
                    const localAddr: string[] = [];
                    const ipWithCidr = getWireGuardAddressWithCIDR(node, 'ipv4');
                    if (ipWithCidr) localAddr.push(ipWithCidr);
                    const ipv6WithCidr = getWireGuardAddressWithCIDR(node, 'ipv6');
                    if (ipv6WithCidr) localAddr.push(ipv6WithCidr);
                    outbound.local_address = localAddr;
                    outbound.private_key = node['private-key'] || node.privateKey;
                    // reserved 字段处理
                    const res = normalizeReserved(node.reserved);
                    if (res) outbound.reserved = res;
                    // mtu
                    if (node.mtu) outbound.mtu = node.mtu;
                    // 多 peers 结构 vs 单 peer 结构
                    const wgPeers = node.peers;
                    if (wgPeers && wgPeers.length > 0) {
                        outbound.peers = wgPeers.map((p: any) => {
                            const ep = p.endpoint ? parseEndpoint(p.endpoint) : undefined;
                            const peer: any = {
                                server: p.server || ep?.server || node.server,
                                server_port: parseInt(
                                    String(p.port || ep?.port || node.port),
                                    10
                                ),
                                public_key: p['public-key'] || p.publicKey,
                                allowed_ips: p['allowed-ips'] ||
                                    p.allowed_ips || ['0.0.0.0/0', '::/0']
                            };
                            const pRes = normalizeReserved(p.reserved);
                            if (pRes) peer.reserved = pRes;
                            if (p['pre-shared-key'] || p['preshared-key'])
                                peer.pre_shared_key = p['pre-shared-key'] || p['preshared-key'];
                            return peer;
                        });
                        delete outbound.server;
                        delete outbound.server_port;
                    } else {
                        // 单 peer 结构
                        const firstPeer = wgPeers && wgPeers.length === 1 ? wgPeers[0] : null;
                        const firstEp = firstPeer?.endpoint ? parseEndpoint(firstPeer.endpoint) : undefined;
                        if (!outbound.server && firstPeer) {
                            outbound.server = firstPeer.server || firstEp?.server;
                        }
                        if (!outbound.server_port && firstPeer) {
                            outbound.server_port = parseInt(
                                String(firstPeer.port || firstEp?.port || 51820),
                                10
                            );
                        }
                        outbound.peer_public_key =
                            node['public-key'] || node.publicKey || firstPeer?.['public-key'] || (firstPeer as any)?.publicKey;
                        const psk =
                            node['pre-shared-key'] || node['preshared-key'] || node.preshared_key || firstPeer?.['pre-shared-key'] || (firstPeer as any)?.['preshared-key'];
                        if (psk) outbound.pre_shared_key = psk;
                        if (!outbound.reserved && firstPeer?.reserved) {
                            const pRes = normalizeReserved(firstPeer.reserved);
                            if (pRes) outbound.reserved = pRes;
                        }
                    }
                    if (node.system) outbound.system = true;
                    break;
                }
                case 'snell': {
                    outbound.psk = node.psk || node.password;
                    outbound.version = node.version || 4;
                    if (node.userkey || node._userkey) outbound.userkey = node.userkey || node._userkey;
                    if (outbound.version === 6) {
                        if (node.mode) outbound.mode = node.mode;
                        if (node['quic-proxy-mode'] != null) outbound.quic_proxy_mode = !!node['quic-proxy-mode'];
                    } else {
                        const obfsMode = node['obfs-opts']?.mode || node.obfs;
                        const obfsHost = node['obfs-opts']?.host || node['obfs-host'];
                        if (obfsMode && obfsMode !== 'shadow-tls') outbound.obfs_mode = obfsMode;
                        if (obfsHost && obfsMode !== 'shadow-tls') outbound.obfs_host = obfsHost;
                    }
                    if (node.reuse && (outbound.version == null || outbound.version >= 4)) outbound.reuse = true;
                    break;
                }
                case 'anytls':
                    outbound.password = node.password;
                    if (node['client-metadata']) outbound.client_metadata = String(node['client-metadata']);
                    if (node['disable-reuse'] != null) outbound.disable_reuse = !!node['disable-reuse'];
                    if (node.reuse === false) outbound.disable_reuse = true;
                    // session 相关参数
                    if (node['idle-session-check-interval'] != null) {
                        const val = String(node['idle-session-check-interval']).trim();
                        if (/^\d+$/.test(val)) outbound.idle_session_check_interval = `${val}s`;
                        else if (/^\d+(?:ns|us|µs|ms|s|m|h)$/.test(val)) outbound.idle_session_check_interval = val;
                    }
                    if (node['idle-session-timeout'] != null) {
                        const val = String(node['idle-session-timeout']).trim();
                        if (/^\d+$/.test(val)) outbound.idle_session_timeout = `${val}s`;
                        else if (/^\d+(?:ns|us|µs|ms|s|m|h)$/.test(val)) outbound.idle_session_timeout = val;
                    }
                    if (/^\d+$/.test(String(node['min-idle-session'])))
                        outbound.min_idle_session = parseInt(String(node['min-idle-session']), 10);
                    if (Array.isArray(node['padding-scheme'] || node.padding_scheme)) {
                        outbound.padding_scheme = node['padding-scheme'] || node.padding_scheme;
                    }
                    this.appendTLS(outbound, node);
                    break;
            }

            // Multiplex (smux)
            const mux = node.smux || node.multiplex;
            if (mux && typeof mux === 'object' && mux.enabled && ['ss', 'vmess', 'vless', 'trojan'].includes(node.type)) {
                const multiplex: Record<string, any> = {
                    enabled: true,
                    protocol: mux.protocol || 'h2mux'
                };
                if (mux['max-connections'] || mux.max_connections) {
                    multiplex.max_connections = mux['max-connections'] || mux.max_connections;
                }
                if (mux['min-streams'] || mux.min_streams) {
                    multiplex.min_streams = mux['min-streams'] || mux.min_streams;
                }
                if (mux['max-streams'] || mux.max_streams) {
                    multiplex.max_streams = mux['max-streams'] || mux.max_streams;
                }
                if (mux.padding !== undefined) multiplex.padding = !!mux.padding;
                if (mux.brutal) multiplex.brutal = mux.brutal;
                outbound.multiplex = multiplex;
            }

            // Common & Dialer opts
            if (node.tfo) outbound.tcp_fast_open = true;
            if (node['interface-name'] || node.interface) {
                outbound.bind_interface = node['interface-name'] || node.interface;
            }
            if (node['routing-mark'] != null) outbound.routing_mark = node['routing-mark'];
            if (node['domain-strategy'] || node.domain_strategy) {
                outbound.domain_strategy = node['domain-strategy'] || node.domain_strategy;
            }
            if (node['tcp-multi-path'] || node.mptcp) outbound.tcp_multi_path = true;
            if (node['udp-fragment']) outbound.udp_fragment = true;
            if (node['underlying-proxy'] || node['dialer-proxy'])
                outbound.detour =
                    outbound.detour || node['underlying-proxy'] || node['dialer-proxy'];

            // shadow-tls 双 outbound 拆分
            if ((outbound as any).__extra) {
                const extra = (outbound as any).__extra;
                delete (outbound as any).__extra;
                return [outbound, extra];
            }

            return outbound;
        } catch (e) {
            console.error(`[SingboxConverter] Error converting ${node.name}:`, e);
            return null;
        }
    }

    private appendTLS(outbound: any, node: ProxyNode) {
        const tls: any = {
            enabled: true,
            server_name: node.sni || node.servername || node.server,
            insecure: node['skip-cert-verify'] || false,
            alpn: Array.isArray(node.alpn) ? node.alpn : node.alpn ? [node.alpn] : undefined
        };

        if (node['client-fingerprint'] && !['hysteria', 'hysteria2', 'tuic'].includes(node.type)) {
            tls.utls = { enabled: true, fingerprint: node['client-fingerprint'] };
        }

        if (node['reality-opts']) {
            tls.reality = {
                enabled: true,
                public_key: node['reality-opts']['public-key'],
                short_id: node['reality-opts']['short-id']
            };
            if (!tls.utls) {
                tls.utls = { enabled: true, fingerprint: 'chrome' };
            }
        } else if (node['ech-opts']) {
            // sing-box 1.11/1.12 中 REALITY 与标准 TLS ECH 互斥
            const ech = node['ech-opts'] as Record<string, any>;
            const echConfig = ech.config ?? ech['config-list'];
            const configArray = Array.isArray(echConfig)
                ? echConfig
                : typeof echConfig === 'string' && echConfig
                    ? [echConfig]
                    : undefined;
            const queryServerName = ech['query-server-name'] ?? ech.query_server_name;

            if ((configArray && configArray.length > 0) || queryServerName) {
                tls.ech = {
                    enabled: true,
                    ...(configArray && configArray.length > 0 ? { config: configArray } : {}),
                    ...(queryServerName ? { query_server_name: queryServerName } : {})
                };
            }
        }

        const sha256Fingerprint = node['server-cert-fingerprint-sha256'] || node['tls-fingerprint'] || node.fingerprint;
        if (sha256Fingerprint && !node.ca && !node['ca-str'] && !node.ca_str) {
            const hex = String(sha256Fingerprint).trim().replace(/:/g, '');
            if (/^[0-9a-f]{64}$/i.test(hex)) {
                tls.certificate_sha256 = [Buffer.from(hex, 'hex').toString('base64')];
            }
        }
        if (node['tls-pubkey-sha256']) {
            tls.certificate_public_key_sha256 = Array.isArray(node['tls-pubkey-sha256'])
                ? node['tls-pubkey-sha256']
                : [node['tls-pubkey-sha256']];
        }

        if (node.ca) tls.certificate_path = String(node.ca);
        if (node.ca_str) tls.certificate = [String(node.ca_str)];
        if (node['ca-str']) tls.certificate = [String(node['ca-str'])];
        if (node['disable-sni']) tls.disable_sni = true;
        if (node['tls-fragment'] || node.tls_fragment) tls.fragment = true;
        if (node['tls-fragment-fallback-delay']) {
            tls.fragment_fallback_delay = String(node['tls-fragment-fallback-delay']);
        }
        if (node['record-fragment'] || node.record_fragment) tls.record_fragment = true;

        outbound.tls = tls;
    }

    private appendTransport(outbound: any, node: ProxyNode) {
        if (!node.network || node.network === 'tcp') return;

        const transport: any = { type: node.network };
        if (
            node.network === 'httpupgrade' ||
            ((node as any).httpupgrade && node['xhttp-opts']?.mode !== 'stream-one')
        ) {
            transport.type = 'httpupgrade';
            const opts = (node['httpupgrade-opts'] || node['ws-opts'] || {}) as any;
            transport.path = opts.path || node['ws-path'] || '/';
            const host = opts.host || opts.headers?.Host || node['ws-headers']?.Host;
            if (host) transport.host = host;
            const headers = { ...opts.headers };
            delete headers.Host;
            delete headers.host;
            if (Object.keys(headers).length > 0) transport.headers = headers;
        } else if (node.network === 'ws') {
            transport.path = node['ws-path'] || node['ws-opts']?.path || '/';
            transport.headers = node['ws-headers'] || node['ws-opts']?.headers || {};
            if (node['ws-opts']?.['max-early-data']) {
                transport.max_early_data = node['ws-opts']['max-early-data'];
                transport.early_data_header_name =
                    node['ws-opts']['early-data-header-name'] || 'Sec-WebSocket-Protocol';
            }
        } else if (node.network === 'grpc') {
            transport.service_name =
                node['grpc-service-name'] ||
                node['grpc-opts']?.['service-name'] ||
                node['grpc-opts']?.['grpc-service-name'] ||
                '';
            transport.idle_timeout = (node['grpc-opts'] as any)?.idle_timeout || '15s';
        } else if (node.network === 'h2' || node.network === 'http') {
            transport.type = 'http';
            transport.path = node['h2-opts']?.path || node['http-opts']?.path || '/';
            const rawHost = node['h2-opts']?.host ?? node['http-opts']?.headers?.Host;
            transport.host = Array.isArray(rawHost) ? rawHost : rawHost ? [String(rawHost)] : [];
        } else if (node.network === 'xhttp' || node.network === 'splithttp') {
            transport.type = 'splithttp';
            const xopts = node['xhttp-opts'] as Record<string, any>;
            if (xopts) {
                if (xopts.mode) transport.mode = xopts.mode;
                if (xopts.path) transport.path = xopts.path;
                if (xopts.host) transport.host = xopts.host;
                if (xopts.headers) transport.headers = xopts.headers;
            }
        } else if (node.network === 'kcp') {
            transport.type = 'mkcp';
            const kopts = node['kcp-opts'] || {};
            if (kopts['header-type'] || node.headerType) {
                transport.header = { type: kopts['header-type'] || node.headerType || 'none' };
            }
        } else if (node.network === 'quic') {
            transport.type = 'quic';
        }

        outbound.transport = transport;
    }
}
