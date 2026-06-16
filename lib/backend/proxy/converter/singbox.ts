/**
 * Sub-One Sing-box Converter
 */
import type { ConvertOptions, ProxyNode } from '../types';
import { BaseConverter } from './base';
import { isPresent } from './utils';

export class SingboxConverter extends BaseConverter {
    name = 'Singbox';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const outbounds = nodes.flatMap((node) => {
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

            switch (node.type) {
                case 'ss':
                    outbound.method = node.cipher;
                    outbound.password = node.password;
                    if (node.plugin === 'obfs') {
                        outbound.plugin = 'obfs';
                        outbound.plugin_opts = `mode=${node['plugin-opts']?.mode || 'http'}${node['plugin-opts']?.host ? ';host=' + node['plugin-opts'].host : ''}`;
                    } else if (node.plugin === 'shadow-tls') {
                        // shadow-tls: 拆分为 shadowsocks + shadowtls 两个 outbound
                        const opts = (node['plugin-opts'] || {}) as any;
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
                            version: opts.version || 3,
                            password: opts.password,
                            tls: {
                                enabled: true,
                                server_name: opts.host,
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
                case 'ssh':
                    if (node.username) outbound.user = node.username;
                    if (node.password) outbound.password = node.password;
                    if (node['private-key'] || node.privateKey)
                        outbound.private_key_path = node['private-key'] || node.privateKey;
                    if (node['private-key-passphrase'])
                        outbound.private_key_passphrase = node['private-key-passphrase'];
                    if (node['server-fingerprint']) {
                        outbound.host_key = [node['server-fingerprint']];
                        outbound.host_key_algorithms = [node['server-fingerprint'].split(' ')[0]];
                    }
                    if (node['host-key']) outbound.host_key = node['host-key'];
                    if (node['host-key-algorithms'])
                        outbound.host_key_algorithms = node['host-key-algorithms'];
                    delete outbound.server;
                    delete outbound.server_port;
                    outbound.server = node.server;
                    outbound.server_port = node.port;
                    break;
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
                    this.appendTLS(outbound, node);
                    this.appendTransport(outbound, node);
                    break;
                case 'vless':
                    if (node.encryption && node.encryption !== 'none') {
                        throw new Error(
                            `[SingboxConverter] VLESS encryption is not supported: ${node.encryption}`
                        );
                    }
                    outbound.uuid = node.uuid;
                    outbound.flow = node.flow || '';
                    this.appendTLS(outbound, node);
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
                    outbound.auth_str = node['auth-str'] || node.auth;
                    outbound.up_mbps = node.up;
                    outbound.down_mbps = node.down;
                    if (node.obfs) outbound.obfs = { type: 'salamander', password: node.obfs };
                    if (node['recv-window-conn']) outbound.recv_window_conn = node['recv-window-conn'];
                    if (node['recv-window']) outbound.recv_window = node['recv-window'];
                    if (node['fast-open']) outbound.udp_fragment = true;
                    if (node['disable-mtu-discovery']) outbound.disable_mtu_discovery = true;
                    this.appendTLS(outbound, node);
                    break;
                case 'hysteria2':
                    outbound.password = node.password;
                    if (node.obfs)
                        outbound.obfs = {
                            type: 'salamander',
                            password: node['obfs-password'] || node.obfs
                        };
                    // 端口跳跃
                    if (node.ports) {
                        outbound.server_ports = String(node.ports)
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
                    if (node['fast-open']) outbound.udp_fragment = true;
                    if (node['disable-mtu-discovery']) outbound.disable_mtu_discovery = true;
                    this.appendTLS(outbound, node);
                    break;
                case 'tuic':
                    outbound.uuid = node.uuid;
                    outbound.password = node.password;
                    if (node['congestion-controller'] && node['congestion-controller'] !== 'cubic')
                        outbound.congestion_control = node['congestion-controller'];
                    if (node['udp-relay-mode'] && node['udp-relay-mode'] !== 'native')
                        outbound.udp_relay_mode = node['udp-relay-mode'];
                    if (node['reduce-rtt']) outbound.zero_rtt_handshake = true;
                    if (node['heartbeat-interval'])
                        outbound.heartbeat = `${node['heartbeat-interval']}ms`;
                    this.appendTLS(outbound, node);
                    break;
                case 'wireguard': {
                    const localAddr: string[] = [];
                    if (node.ip) {
                        localAddr.push(/\//.test(node.ip) ? node.ip : `${node.ip}/32`);
                    }
                    if (node.ipv6) {
                        localAddr.push(/\//.test(node.ipv6) ? node.ipv6 : `${node.ipv6}/128`);
                    }
                    outbound.local_address = localAddr;
                    outbound.private_key = node['private-key'] || node.privateKey;
                    // reserved 字段处理
                    if (typeof node.reserved === 'string') {
                        outbound.reserved = node.reserved;
                    } else if (Array.isArray(node.reserved)) {
                        outbound.reserved = [...node.reserved];
                    }
                    // mtu
                    if (node.mtu) outbound.mtu = node.mtu;
                    // 多 peers 结构
                    const wgPeers = node.peers;
                    if (wgPeers && wgPeers.length > 0) {
                        outbound.peers = wgPeers.map((p: any) => {
                            const peer: any = {
                                server:
                                    p.server ||
                                    (p.endpoint ? p.endpoint.split(':')[0] : node.server),
                                server_port: parseInt(
                                    String(
                                        p.port ||
                                            (p.endpoint ? p.endpoint.split(':')[1] : node.port)
                                    ),
                                    10
                                ),
                                public_key: p['public-key'],
                                allowed_ips: p['allowed-ips'] ||
                                    p.allowed_ips || ['0.0.0.0/0', '::/0']
                            };
                            if (typeof p.reserved === 'string') {
                                peer.reserved = [p.reserved];
                            } else if (Array.isArray(p.reserved)) {
                                peer.reserved = [...p.reserved];
                            }
                            if (p['pre-shared-key']) peer.pre_shared_key = p['pre-shared-key'];
                            return peer;
                        });
                    } else {
                        // 单 peer 简化结构
                        outbound.peer_public_key = node['public-key'] || node.publicKey;
                        if (node['pre-shared-key'] || node['preshared-key'])
                            outbound.pre_shared_key =
                                node['pre-shared-key'] || node['preshared-key'];
                    }
                    break;
                }
                case 'anytls':
                    outbound.password = node.password;
                    // session 相关参数
                    if (/^\d+$/.test(String(node['idle-session-check-interval'])))
                        outbound.idle_session_check_interval = `${node['idle-session-check-interval']}s`;
                    if (/^\d+$/.test(String(node['idle-session-timeout'])))
                        outbound.idle_session_timeout = `${node['idle-session-timeout']}s`;
                    if (/^\d+$/.test(String(node['min-idle-session'])))
                        outbound.min_idle_session = parseInt(String(node['min-idle-session']), 10);
                    this.appendTLS(outbound, node);
                    break;
            }

            // Common opts
            if (node.tfo) outbound.tcp_fast_open = true;
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
            server_name: node.sni || node.server,
            insecure: node['skip-cert-verify'] || false,
            alpn: Array.isArray(node.alpn) ? node.alpn : node.alpn ? [node.alpn] : undefined
        };

        if (node['client-fingerprint']) {
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
        }

        if (node['ech-opts']) {
            const ech = node['ech-opts'];
            if (ech['config-list'] && ech['config-list'].length > 0) {
                tls.ech = {
                    enabled: true,
                    config_list: ech['config-list']
                };
            }
        }

        if (node['client-fingerprint'] && !['hysteria', 'hysteria2', 'tuic'].includes(node.type)) {
            tls.utls = {
                enabled: true,
                fingerprint: node['client-fingerprint']
            };
        }

        if (node['tls-fingerprint']) {
            tls.certificate_public_key_sha256 = node['tls-fingerprint'];
        }

        outbound.tls = tls;
    }

    private appendTransport(outbound: any, node: ProxyNode) {
        if (!node.network || node.network === 'tcp') return;

        const transport: any = { type: node.network };
        if (node.network === 'ws') {
            transport.path = node['ws-path'] || node['ws-opts']?.path || '/';
            transport.headers = node['ws-headers'] || node['ws-opts']?.headers || {};
            if (node['ws-opts']?.['max-early-data']) {
                transport.max_early_data = node['ws-opts']['max-early-data'];
                transport.early_data_header_name =
                    node['ws-opts']['early-data-header-name'] || 'Sec-WebSocket-Protocol';
            }
        } else if (node.network === 'grpc') {
            transport.service_name =
                node['grpc-service-name'] || node['grpc-opts']?.['service-name'] || '';
            transport.idle_timeout = (node['grpc-opts'] as any)?.idle_timeout || '15s';
        } else if (node.network === 'h2' || node.network === 'http') {
            transport.type = 'http';
            transport.path = node['h2-opts']?.path || node['http-opts']?.path || '/';
            transport.host = node['h2-opts']?.host || node['http-opts']?.headers?.Host || [];
        } else if (node.network === 'xhttp' || node.network === 'splithttp') {
            transport.type = 'splithttp';
            const xopts = node['xhttp-opts'] as Record<string, any>;
            if (xopts) {
                if (xopts.mode) transport.mode = xopts.mode;
                if (xopts.path) transport.path = xopts.path;
                if (xopts.host) transport.host = xopts.host;
                if (xopts.headers) transport.headers = xopts.headers;
            }
        }

        outbound.transport = transport;
    }
}
