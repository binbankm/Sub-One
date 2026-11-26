/**
 * Sub-One sing-box JSON Parser
 *
 * 解析 sing-box 出站配置 (outbounds) 为标准 ProxyNode[]
 */
import type { ProxyNode } from '../types';
import { isNotEmpty, parsePort, randomId } from '../utils';

const IGNORED_OUTBOUND_TYPES = new Set(['direct', 'block', 'dns', 'selector', 'urltest']);

function parseTls(outbound: Record<string, any>, node: ProxyNode): void {
    const tls = outbound.tls;
    if (!tls || typeof tls !== 'object' || tls.enabled === false) {
        return;
    }

    node.tls = true;
    if (tls.server_name) node.sni = tls.server_name;
    if (tls.insecure !== undefined) node['skip-cert-verify'] = !!tls.insecure;
    if (tls.disable_sni !== undefined) node['disable-sni'] = !!tls.disable_sni;

    if (Array.isArray(tls.alpn) && tls.alpn.length > 0) {
        node.alpn = tls.alpn;
    } else if (typeof tls.alpn === 'string' && tls.alpn) {
        node.alpn = [tls.alpn];
    }

    if (tls.utls?.enabled && tls.utls.fingerprint) {
        node['client-fingerprint'] = tls.utls.fingerprint;
    }

    if (tls.reality?.enabled) {
        node['reality-opts'] = {
            'public-key': tls.reality.public_key,
            ...(tls.reality.short_id ? { 'short-id': tls.reality.short_id } : {})
        };
    }

    if (tls.ech?.enabled) {
        const cfg = tls.ech.config ?? tls.ech.config_list;
        const echOpts: Record<string, any> = {};
        if (Array.isArray(cfg)) {
            echOpts['config-list'] = cfg;
        } else if (typeof cfg === 'string' && cfg) {
            echOpts['config-list'] = [cfg];
        }
        if (tls.ech.query_server_name) {
            echOpts['query-server-name'] = tls.ech.query_server_name;
        }
        if (Object.keys(echOpts).length > 0) {
            node['ech-opts'] = echOpts;
        }
    }

    if (tls.certificate_path) node.ca = tls.certificate_path;
    if (Array.isArray(tls.certificate) && tls.certificate.length > 0) {
        node['ca-str'] = tls.certificate.join('\n');
    } else if (typeof tls.certificate === 'string') {
        node['ca-str'] = tls.certificate;
    }
    if (tls.certificate_public_key_sha256) {
        node['tls-pubkey-sha256'] = Array.isArray(tls.certificate_public_key_sha256)
            ? tls.certificate_public_key_sha256[0]
            : tls.certificate_public_key_sha256;
    }
    if (Array.isArray(tls.certificate_sha256) && tls.certificate_sha256.length > 0) {
        const first = String(tls.certificate_sha256[0]);
        node['server-cert-fingerprint-sha256'] = /^[0-9a-f]{64}$/i.test(first)
            ? first
            : Buffer.from(first, 'base64').toString('hex');
    }
    if (tls.fragment) node['tls-fragment'] = true;
    if (tls.fragment_fallback_delay) node['tls-fragment-fallback-delay'] = tls.fragment_fallback_delay;
    if (tls.record_fragment) node['record-fragment'] = true;
}

function parseTransport(outbound: Record<string, any>, node: ProxyNode): void {
    const transport = outbound.transport;
    if (!transport || typeof transport !== 'object' || !transport.type) {
        return;
    }

    const tType = String(transport.type).toLowerCase();
    if (tType === 'ws') {
        node.network = 'ws';
        const wsOpts: Record<string, any> = {};
        if (transport.path) wsOpts.path = transport.path;
        if (transport.headers) wsOpts.headers = transport.headers;
        if (transport.max_early_data) wsOpts['max-early-data'] = transport.max_early_data;
        if (transport.early_data_header_name) {
            wsOpts['early-data-header-name'] = transport.early_data_header_name;
        }
        if (Object.keys(wsOpts).length > 0) node['ws-opts'] = wsOpts;
    } else if (tType === 'grpc') {
        node.network = 'grpc';
        if (transport.service_name) {
            node['grpc-opts'] = {
                'service-name': transport.service_name,
                'grpc-service-name': transport.service_name
            } as any;
        }
    } else if (tType === 'http') {
        node.network = 'h2';
        const h2Opts: Record<string, any> = {};
        if (transport.path) h2Opts.path = transport.path;
        if (transport.host) {
            h2Opts.host = Array.isArray(transport.host) ? transport.host : [transport.host];
        }
        if (Object.keys(h2Opts).length > 0) node['h2-opts'] = h2Opts;
    } else if (tType === 'httpupgrade') {
        node.network = 'httpupgrade';
        const huOpts: Record<string, any> = {};
        if (transport.path) huOpts.path = transport.path;
        if (transport.host) huOpts.host = transport.host;
        if (transport.headers) huOpts.headers = transport.headers;
        if (Object.keys(huOpts).length > 0) node['httpupgrade-opts'] = huOpts;
    } else if (tType === 'splithttp' || tType === 'xhttp') {
        node.network = 'xhttp';
        const xOpts: Record<string, any> = {};
        if (transport.mode) xOpts.mode = transport.mode;
        if (transport.path) xOpts.path = transport.path;
        if (transport.host) xOpts.host = transport.host;
        if (transport.headers) xOpts.headers = transport.headers;
        if (Object.keys(xOpts).length > 0) node['xhttp-opts'] = xOpts;
    } else if (tType === 'mkcp' || tType === 'kcp') {
        node.network = 'kcp';
        if (transport.header?.type) {
            node['kcp-opts'] = { 'header-type': transport.header.type };
        }
    } else if (tType === 'quic') {
        node.network = 'quic';
    }
}

function parseOutbound(outbound: Record<string, any>): ProxyNode | null {
    if (!outbound || typeof outbound !== 'object' || !outbound.type) return null;
    const rawType = String(outbound.type).toLowerCase();
    if (IGNORED_OUTBOUND_TYPES.has(rawType)) return null;

    const server = outbound.server || outbound.peers?.[0]?.server || outbound.peers?.[0]?.address;
    const port = parsePort(
        outbound.server_port || outbound.peers?.[0]?.server_port || outbound.peers?.[0]?.port || 0
    );
    const name = outbound.tag || `${rawType.toUpperCase()} ${server || 'node'}`;

    const base: ProxyNode = {
        id: randomId(),
        type: rawType as any,
        name: String(name),
        server: String(server || ''),
        port
    };

    if (outbound.tcp_fast_open) base.tfo = true;
    if (outbound.detour) base['dialer-proxy'] = String(outbound.detour);
    if (outbound.udp_over_tcp === true) {
        base.uot = true;
        base['udp-over-tcp'] = true;
    } else if (
        outbound.udp_over_tcp &&
        typeof outbound.udp_over_tcp === 'object' &&
        outbound.udp_over_tcp.enabled
    ) {
        base.uot = true;
        base['udp-over-tcp'] = true;
        if (outbound.udp_over_tcp.version !== undefined) {
            base['udp-over-tcp-version'] = outbound.udp_over_tcp.version;
        }
    }
    if (outbound.bind_interface) base['interface-name'] = String(outbound.bind_interface);
    if (outbound.routing_mark != null) base['routing-mark'] = outbound.routing_mark;
    if (outbound.domain_strategy) base['domain-strategy'] = outbound.domain_strategy;
    if (outbound.tcp_multi_path) base['tcp-multi-path'] = true;
    if (outbound.multiplex?.enabled) {
        base.smux = {
            enabled: true,
            ...(outbound.multiplex.protocol ? { protocol: outbound.multiplex.protocol } : {}),
            ...(outbound.multiplex.max_connections ? { 'max-connections': outbound.multiplex.max_connections } : {}),
            ...(outbound.multiplex.min_streams ? { 'min-streams': outbound.multiplex.min_streams } : {}),
            ...(outbound.multiplex.max_streams ? { 'max-streams': outbound.multiplex.max_streams } : {}),
            ...(outbound.multiplex.padding !== undefined ? { padding: !!outbound.multiplex.padding } : {}),
            ...(outbound.multiplex.brutal ? { brutal: outbound.multiplex.brutal } : {})
        };
    }

    switch (rawType) {
        case 'shadowsocks':
        case 'ss': {
            base.type = 'ss';
            base.cipher = outbound.method || 'none';
            base.password = outbound.password || '';
            if (outbound.plugin) {
                base.plugin = outbound.plugin;
                if (typeof outbound.plugin_opts === 'string') {
                    const optsObj: Record<string, any> = {};
                    for (const part of outbound.plugin_opts.split(';')) {
                        const eqIdx = part.indexOf('=');
                        if (eqIdx > 0) {
                            const k = part.slice(0, eqIdx).trim();
                            const v = part.slice(eqIdx + 1).trim();
                            optsObj[k] = v;
                        } else if (part.trim()) {
                            optsObj[part.trim()] = true;
                        }
                    }
                    base['plugin-opts'] = optsObj;
                } else if (outbound.plugin_opts) {
                    base['plugin-opts'] = outbound.plugin_opts;
                }
            }
            break;
        }
        case 'shadowsocksr':
        case 'ssr': {
            base.type = 'ssr';
            base.cipher = outbound.method;
            base.password = outbound.password;
            if (outbound.protocol) base.protocol = outbound.protocol;
            if (outbound.protocol_param) base['protocol-param'] = outbound.protocol_param;
            if (outbound.obfs) base.obfs = outbound.obfs;
            if (outbound.obfs_param) base['obfs-param'] = outbound.obfs_param;
            break;
        }
        case 'vmess': {
            base.type = 'vmess';
            base.uuid = outbound.uuid;
            base.cipher = outbound.security || 'auto';
            base.alterId = outbound.alter_id ?? 0;
            if (outbound.authenticated_length !== undefined) {
                base['authenticated-length'] = !!outbound.authenticated_length;
            }
            if (outbound.global_padding !== undefined) {
                base['global-padding'] = !!outbound.global_padding;
            }
            if (outbound.packet_encoding) base['packet-encoding'] = outbound.packet_encoding;
            parseTls(outbound, base);
            parseTransport(outbound, base);
            break;
        }
        case 'vless': {
            base.type = 'vless';
            base.uuid = outbound.uuid;
            if (outbound.flow) base.flow = outbound.flow;
            if (outbound.packet_encoding) base['packet-encoding'] = outbound.packet_encoding;
            parseTls(outbound, base);
            parseTransport(outbound, base);
            break;
        }
        case 'trojan': {
            base.type = 'trojan';
            base.password = outbound.password;
            parseTls(outbound, base);
            parseTransport(outbound, base);
            break;
        }
        case 'hysteria': {
            base.type = 'hysteria';
            if (outbound.auth_str || outbound.auth) base.auth = outbound.auth_str || outbound.auth;
            if (outbound.up_mbps) base.up = outbound.up_mbps;
            if (outbound.down_mbps) base.down = outbound.down_mbps;
            if (outbound.obfs) base.obfs = outbound.obfs;
            if (Array.isArray(outbound.server_ports) && outbound.server_ports.length > 0) {
                base.ports = outbound.server_ports.join(',').replace(/:/g, '-');
            }
            if (outbound.hop_interval) base['hop-interval'] = outbound.hop_interval;
            if (outbound.recv_window_conn) base['recv-window-conn'] = outbound.recv_window_conn;
            if (outbound.recv_window) base['recv-window'] = outbound.recv_window;
            parseTls(outbound, base);
            break;
        }
        case 'hysteria2': {
            base.type = 'hysteria2';
            base.password = outbound.password;
            if (outbound.up_mbps) base.up = outbound.up_mbps;
            if (outbound.down_mbps) base.down = outbound.down_mbps;
            if (outbound.obfs?.type) {
                base.obfs = outbound.obfs.type;
                if (outbound.obfs.password) base['obfs-password'] = outbound.obfs.password;
                if (outbound.obfs.min_packet_size) base['obfs-min-packet-size'] = outbound.obfs.min_packet_size;
                if (outbound.obfs.max_packet_size) base['obfs-max-packet-size'] = outbound.obfs.max_packet_size;
            }
            if (outbound.bbr_profile) base['bbr-profile'] = outbound.bbr_profile;
            if (outbound.disable_chrome_parrot) base['disable-chrome-parrot'] = true;
            if (Array.isArray(outbound.server_ports) && outbound.server_ports.length > 0) {
                base.ports = outbound.server_ports.join(',').replace(/:/g, '-');
            }
            if (outbound.hop_interval) base['hop-interval'] = outbound.hop_interval;
            parseTls(outbound, base);
            break;
        }
        case 'tuic': {
            base.type = 'tuic';
            base.uuid = outbound.uuid;
            if (outbound.password) base.password = outbound.password;
            if (outbound.congestion_control) {
                base['congestion-controller'] = outbound.congestion_control;
            }
            if (outbound.udp_relay_mode) base['udp-relay-mode'] = outbound.udp_relay_mode;
            if (outbound.zero_rtt_handshake) base['reduce-rtt'] = true;
            if (outbound.heartbeat) base['heartbeat-interval'] = outbound.heartbeat;
            if (outbound.udp_over_stream) base['udp-over-stream'] = true;
            parseTls(outbound, base);
            break;
        }
        case 'anytls': {
            base.type = 'anytls';
            base.password = outbound.password;
            if (outbound.client_metadata) base['client-metadata'] = outbound.client_metadata;
            if (outbound.disable_reuse !== undefined) base['disable-reuse'] = !!outbound.disable_reuse;
            if (outbound.idle_session_check_interval) {
                base['idle-session-check-interval'] = parseInt(
                    String(outbound.idle_session_check_interval),
                    10
                );
            }
            if (outbound.idle_session_timeout) {
                base['idle-session-timeout'] = parseInt(String(outbound.idle_session_timeout), 10);
            }
            if (outbound.min_idle_session !== undefined) {
                base['min-idle-session'] = outbound.min_idle_session;
            }
            if (Array.isArray(outbound.padding_scheme)) {
                base['padding-scheme'] = outbound.padding_scheme;
            }
            parseTls(outbound, base);
            break;
        }
        case 'wireguard': {
            base.type = 'wireguard';
            if (outbound.private_key) base['private-key'] = outbound.private_key;
            const pubKey = outbound.peer_public_key || outbound.peers?.[0]?.public_key;
            if (pubKey) base['public-key'] = pubKey;
            const psk = outbound.pre_shared_key || outbound.peers?.[0]?.pre_shared_key;
            if (psk) base['pre-shared-key'] = psk;
            if (outbound.reserved) base.reserved = outbound.reserved;
            if (outbound.mtu) base.mtu = outbound.mtu;
            const localAddrs = Array.isArray(outbound.local_address)
                ? outbound.local_address
                : Array.isArray(outbound.address)
                    ? outbound.address
                    : [];
            for (const addr of localAddrs) {
                if (String(addr).includes(':')) base.ipv6 = String(addr);
                else base.ip = String(addr);
            }
            if (Array.isArray(outbound.peers) && outbound.peers.length > 0) {
                base.peers = outbound.peers.map((p: any) => ({
                    server: p.server || p.address,
                    port: p.server_port || p.port,
                    'public-key': p.public_key,
                    'pre-shared-key': p.pre_shared_key,
                    'allowed-ips': p.allowed_ips,
                    reserved: p.reserved
                }));
            }
            break;
        }
        case 'naive': {
            base.type = 'naive';
            base.username = outbound.username;
            base.password = outbound.password;
            parseTls(outbound, base);
            break;
        }
        case 'socks':
        case 'socks5': {
            base.type = 'socks5';
            if (outbound.username) base.username = outbound.username;
            if (outbound.password) base.password = outbound.password;
            parseTls(outbound, base);
            break;
        }
        case 'http': {
            base.type = outbound.tls?.enabled ? 'https' : 'http';
            if (outbound.username) base.username = outbound.username;
            if (outbound.password) base.password = outbound.password;
            parseTls(outbound, base);
            break;
        }
        case 'snell': {
            base.type = 'snell';
            base.password = outbound.psk || outbound.password;
            base.psk = outbound.psk || outbound.password;
            if (outbound.version) base.version = outbound.version;
            if (outbound.mode) base.mode = outbound.mode;
            if (outbound.quic_proxy_mode !== undefined) base['quic-proxy-mode'] = !!outbound.quic_proxy_mode;
            if (outbound.userkey) base.userkey = outbound.userkey;
            if (outbound.reuse !== undefined) base.reuse = !!outbound.reuse;
            if (outbound.obfs_mode || outbound.obfs_host) {
                base.obfs = outbound.obfs_mode;
                base['obfs-host'] = outbound.obfs_host;
                base['obfs-opts'] = {
                    mode: outbound.obfs_mode,
                    host: outbound.obfs_host
                };
            }
            break;
        }
        case 'ssh': {
            base.type = 'ssh';
            if (outbound.user) base.username = outbound.user;
            if (outbound.password) base.password = outbound.password;
            if (outbound.private_key) base['private-key'] = outbound.private_key;
            if (outbound.private_key_path) base['private-key-path'] = outbound.private_key_path;
            if (outbound.private_key_passphrase) {
                base['private-key-passphrase'] = outbound.private_key_passphrase;
            }
            break;
        }
        default:
            return null;
    }

    if (!base.server && base.type !== 'wireguard') return null;
    return base;
}

/**
 * 解析 sing-box JSON 配置文本
 */
export function parseSingbox(content: string): ProxyNode[] {
    if (!isNotEmpty(content)) return [];
    try {
        const parsed = JSON.parse(content.replace(/^\uFEFF/, '').trim());
        const outbounds = Array.isArray(parsed)
            ? parsed
            : [
                ...(Array.isArray(parsed?.outbounds) ? parsed.outbounds : []),
                ...(Array.isArray(parsed?.endpoints) ? parsed.endpoints : [])
            ];

        const shadowTlsByTag = new Map<string, Record<string, any>>();
        for (const outbound of outbounds) {
            if (outbound && String(outbound.type).toLowerCase() === 'shadowtls' && outbound.tag) {
                shadowTlsByTag.set(String(outbound.tag), outbound);
            }
        }

        const nodes: ProxyNode[] = [];

        for (const outbound of outbounds) {
            if (!outbound || typeof outbound !== 'object') continue;
            const rawType = String(outbound.type || '').toLowerCase();
            if (rawType === 'shadowtls') continue;

            const node = parseOutbound(outbound);
            if (!node) continue;

            if (node.type === 'ss' && outbound.detour && shadowTlsByTag.has(String(outbound.detour))) {
                const st = shadowTlsByTag.get(String(outbound.detour))!;
                node.plugin = 'shadow-tls';
                node['plugin-opts'] = {
                    host: st.tls?.server_name || '',
                    password: st.password || '',
                    version: st.version ?? 3
                };
                if (st.tls?.utls?.fingerprint) {
                    node['client-fingerprint'] = st.tls.utls.fingerprint;
                }
                delete node['dialer-proxy'];
            }
            nodes.push(node);
        }

        return nodes;
    } catch (e) {
        console.error('[parseSingbox] Failed to parse sing-box JSON:', e);
        return [];
    }
}
