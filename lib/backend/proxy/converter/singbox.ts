/**
 * Sub-One Sing-box Converter
 */

import type { ProxyNode, ConvertOptions } from '../types';
import { BaseConverter } from './base';
import { isPresent } from './utils';

export class SingboxConverter extends BaseConverter {
    name = 'Singbox';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        const outbounds = nodes.map(node => this.toOutbound(node)).filter(Boolean);
        return JSON.stringify(outbounds, null, 2);
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
                naive: 'http', // naive maps to http with certain opts usually
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
                        outbound.plugin = 'shadow-tls';
                        outbound.plugin_opts = `host=${node['plugin-opts']?.host};password=${node['plugin-opts']?.password};version=${node['plugin-opts']?.version || 3}`;
                    }
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
                        throw new Error(`[SingboxConverter] VLESS encryption is not supported: ${node.encryption}`);
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
                    outbound.auth_str = node.auth;
                    outbound.up_mbps = node.up;
                    outbound.down_mbps = node.down;
                    if (node.obfs) outbound.obfs = { type: 'salamander', password: node.obfs };
                    this.appendTLS(outbound, node);
                    break;
                case 'hysteria2':
                    outbound.password = node.password;
                    if (node.obfs) outbound.obfs = { type: 'salamander', password: node['obfs-password'] || node.obfs };
                    this.appendTLS(outbound, node);
                    break;
                case 'tuic':
                    outbound.uuid = node.uuid;
                    outbound.password = node.password;
                    outbound.congestion_control = node['congestion-controller'] || 'cubic';
                    outbound.udp_relay_mode = node['udp-relay-mode'] || 'quic';
                    outbound.zero_rtt_handshake = !!node['reduce-rtt'];
                    this.appendTLS(outbound, node);
                    break;
                case 'wireguard':
                    outbound.local_address = Array.isArray(node.ip) ? node.ip : [node.ip].filter(Boolean);
                    if (node.ipv6) outbound.local_address.push(node.ipv6);
                    outbound.private_key = node['private-key'] || node.privateKey;
                    outbound.peer_public_key = node['public-key'] || node.publicKey;
                    outbound.pre_shared_key = node['pre-shared-key'] || node['preshared-key'];
                    outbound.mtu = node.mtu || 1420;
                    outbound.reserved = node.reserved;
                    break;
            }

            // Common opts
            if (node.tfo) outbound.tcp_fast_open = true;
            if (node['underlying-proxy'] || node['dialer-proxy']) outbound.detour = node['underlying-proxy'] || node['dialer-proxy'];

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
            alpn: Array.isArray(node.alpn) ? node.alpn : (node.alpn ? [node.alpn] : undefined)
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
                transport.early_data_header_name = node['ws-opts']['early-data-header-name'] || 'Sec-WebSocket-Protocol';
            }
        } else if (node.network === 'grpc') {
            transport.service_name = node['grpc-service-name'] || node['grpc-opts']?.['service-name'] || '';
            transport.idle_timeout = (node['grpc-opts'] as any)?.idle_timeout || '15s';
        } else if (node.network === 'h2' || node.network === 'http') {
            transport.type = 'http';
            transport.path = node['h2-opts']?.path || node['http-opts']?.path || '/';
            transport.host = node['h2-opts']?.host || node['http-opts']?.headers?.Host || [];
        }

        outbound.transport = transport;
    }
}
