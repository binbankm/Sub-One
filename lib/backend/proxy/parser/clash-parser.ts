/**
 * Sub-One Clash Parser
 *
 * 将 Clash 配置格式转换为标准 ProxyNode 列表
 */
import yaml from 'js-yaml';

import type { NetworkType, ProxyNode, ProxyType } from '../types';
import { parseEndpoint, parsePort, randomId } from '../utils';

/**
 * 解析 Clash YAML 内容
 */
export function parseClash(content: string): ProxyNode[] {
    try {
        const doc = yaml.load(content) as any;
        if (!doc) return [];

        let proxies: any[] = [];
        if (Array.isArray(doc)) {
            // 情况 1：内容直接是一个节点数组
            proxies = doc;
        } else if (doc && Array.isArray(doc.proxies)) {
            // 情况 2：标准 Clash 配置文件
            proxies = doc.proxies;
        } else {
            return [];
        }

        return proxies
            .map((p: any) => parseClashNode(p))
            .filter((p: ProxyNode | null): p is ProxyNode => p !== null);
    } catch (e) {
        console.error('[parseClash] YAML parse error:', e);
        return [];
    }
}

/**
 * 将单个 Clash 代理项转换为 ProxyNode
 */
export function parseClashNode(p: any): ProxyNode | null {
    if (!p || !p.type) return null;

    const type = p.type.toLowerCase() as ProxyType;
    const normalizedType = normalizeType(type);
    const wgPeer = normalizedType === 'wireguard' ? p.peers?.[0] : undefined;
    const wgPeerEp = wgPeer?.endpoint ? parseEndpoint(wgPeer.endpoint) : undefined;
    const resolvedServer =
        p.server ||
        (normalizedType === 'wireguard' ? wgPeer?.server || wgPeerEp?.server : undefined) ||
        (['direct', 'reject'].includes(normalizedType) ? '127.0.0.1' : undefined);
    const resolvedPort =
        p.port ??
        (normalizedType === 'wireguard'
            ? wgPeer?.port || wgPeerEp?.port || 51820
            : normalizedType === 'mieru' && p['port-range']
              ? String(p['port-range']).split(/[-,]/)[0]
              : ['direct', 'reject'].includes(normalizedType)
                ? 0
                : undefined);

    if (!['direct', 'reject'].includes(normalizedType) && (!resolvedServer || !resolvedPort)) {
        return null;
    }

    const name = p.name || `${p.type} ${resolvedServer}:${resolvedPort}`;

    const node: Partial<ProxyNode> = {
        id: randomId(),
        type: normalizedType,
        name,
        server: resolvedServer,
        port: parsePort(resolvedPort),
        udp: p.udp !== false, // Clash 默认 true
        tfo: p.tfo || p['fast-open'] || false
    };

    // 1. TLS 通用处理
    const implicitTls = [
        'https',
        'trojan',
        'tuic',
        'hysteria',
        'hysteria2',
        'anytls',
        'naive',
        'trusttunnel'
    ].includes(normalizedType);
    node.tls =
        p.tls !== undefined
            ? Boolean(p.tls)
            : p.ssl !== undefined
              ? Boolean(p.ssl)
              : implicitTls;
    node.sni = p.servername || p.sni;
    node.alpn = p.alpn;
    node['skip-cert-verify'] = p['skip-cert-verify'] || p['allowInsecure'] || false;
    node['client-fingerprint'] = p['client-fingerprint'];
    if (p.fingerprint || p['server-cert-fingerprint']) {
        node['tls-fingerprint'] = p.fingerprint || p['server-cert-fingerprint'];
    }
    if (p['name-cert-verify']) node['name-cert-verify'] = p['name-cert-verify'];
    if (p['disable-sni'] !== undefined) node['disable-sni'] = Boolean(p['disable-sni']);
    if (p.ca) node.ca = p.ca;
    if (p['ca-str'] || p.ca_str) node['ca-str'] = p['ca-str'] || p.ca_str;
    if (p['jls-opts'] && typeof p['jls-opts'] === 'object') node['jls-opts'] = p['jls-opts'];

    // 各种别名映射
    if (p['dialer-proxy']) node['underlying-proxy'] = p['dialer-proxy'];
    if (p['benchmark-url']) node['test-url'] = p['benchmark-url'];
    if (p['benchmark-timeout']) node['test-timeout'] = p['benchmark-timeout'];
    if (p['ip-version']) node['ip-version'] = p['ip-version'];
    if (p.mptcp !== undefined) node.mptcp = Boolean(p.mptcp);
    if (p['interface-name'] || p.interface) node.interface = p['interface-name'] || p.interface;
    if (p['routing-mark'] !== undefined) node['routing-mark'] = p['routing-mark'];
    if (p['block-quic'] !== undefined) node['block-quic'] = p['block-quic'];
    if (p.smux && typeof p.smux === 'object') node.smux = p.smux;

    // ECH 处理
    if (p['ech-opts'] && typeof p['ech-opts'] === 'object') {
        const rawEch = p['ech-opts'];
        if (rawEch.enable !== false) {
            const cfgList = rawEch['config-list'] ?? rawEch.config;
            const queryServerName = rawEch['query-server-name'] ?? rawEch.query_server_name;
            const echOpts: Record<string, any> = {};
            if (cfgList) echOpts['config-list'] = Array.isArray(cfgList) ? cfgList : [cfgList];
            if (queryServerName) echOpts['query-server-name'] = queryServerName;
            if (Object.keys(echOpts).length > 0) {
                node['ech-opts'] = echOpts;
            }
        }
    }

    // 2. 传输层通用处理
    if (p.network) {
        const rawNet = p.network.toLowerCase();
        node.network = (rawNet === 'splithttp' ? 'xhttp' : rawNet) as NetworkType;

        // 传输层选项映射
        if (node.network === 'ws') {
            const wsOpts = p['ws-opts'] || {};
            node['ws-opts'] = {
                path: wsOpts.path || p['ws-path'] || '/',
                headers: wsOpts.headers || p['ws-headers'] || {},
                ...(wsOpts['max-early-data'] !== undefined ? { 'max-early-data': wsOpts['max-early-data'] } : {}),
                ...(wsOpts['early-data-header-name'] ? { 'early-data-header-name': wsOpts['early-data-header-name'] } : {}),
                ...(wsOpts['v2ray-http-upgrade'] !== undefined ? { 'v2ray-http-upgrade': wsOpts['v2ray-http-upgrade'] } : {})
            };
        } else if (node.network === 'httpupgrade') {
            const huOpts = p['httpupgrade-opts'] || p['ws-opts'] || {};
            node['httpupgrade-opts'] = {
                path: huOpts.path || '/',
                ...(huOpts.host ? { host: huOpts.host } : {}),
                ...(huOpts.headers ? { headers: huOpts.headers } : {})
            } as any;
        } else if (node.network === 'xhttp') {
            if (p['xhttp-opts']) {
                node['xhttp-opts'] = p['xhttp-opts'];
            }
        } else if (node.network === 'grpc') {
            const grpcOpts = p['grpc-opts'] || {};
            node['grpc-opts'] = {
                'grpc-service-name': grpcOpts['grpc-service-name'] || grpcOpts['service-name'] || ''
            } as any;
        } else if (['h2', 'http'].includes(node.network)) {
            const h2Opts = p['h2-opts'] || p['http-opts'] || {};
            node[`${node.network}-opts`] = {
                path: h2Opts.path || '/',
                ...(h2Opts.host ? { host: h2Opts.host } : {}),
                headers: h2Opts.headers || {}
            } as any;
        } else if (node.network === 'kcp') {
            const kcpOpts = p['kcp-opts'] || {};
            node['kcp-opts'] = {
                ...(kcpOpts['header-type'] ? { 'header-type': kcpOpts['header-type'] } : {}),
                ...(kcpOpts.seed ? { seed: kcpOpts.seed } : {})
            };
        } else if (node.network === 'quic') {
            const quicOpts = p['quic-opts'] || {};
            node['quic-opts'] = {
                ...(quicOpts['header-type'] ? { 'header-type': quicOpts['header-type'] } : {})
            };
        }
    }

    // 3. 协议特定字段处理
    switch (node.type) {
        case 'ss':
            node.cipher = p.cipher;
            node.password = p.password;
            node.plugin = p.plugin;
            node['plugin-opts'] = p['plugin-opts'];
            if (p['udp-over-tcp'] !== undefined) node['udp-over-tcp'] = Boolean(p['udp-over-tcp']);
            if (p['udp-over-tcp-version'] !== undefined) node['udp-over-tcp-version'] = p['udp-over-tcp-version'];
            break;

        case 'ssr':
            node.cipher = p.cipher;
            node.password = p.password;
            node.protocol = p.protocol;
            node.obfs = p.obfs;
            node['protocol-param'] = p['protocol-param'];
            node['obfs-param'] = p['obfs-param'];
            break;

        case 'vmess':
            node.uuid = p.uuid || p.id;
            node.alterId = p.alterId || p.aid || 0;
            node.cipher = p.cipher || 'auto';
            if (p.aead !== undefined) node.aead = Boolean(p.aead);
            if (p['authenticated-length'] !== undefined) node['authenticated-length'] = Boolean(p['authenticated-length']);
            if (p['global-padding'] !== undefined) node['global-padding'] = Boolean(p['global-padding']);
            if (p['packet-encoding'] != null) node['packet-encoding'] = String(p['packet-encoding']);
            if (p.xudp) {
                node.xudp = true;
                if (!node['packet-encoding']) node['packet-encoding'] = 'xudp';
            }
            if (p['packet-addr']) {
                node['packet-addr'] = true;
                if (!node['packet-encoding']) node['packet-encoding'] = 'packetaddr';
            }
            break;

        case 'vless':
            node.uuid = p.uuid || p.id;
            node.flow = p.flow;
            if (p.encryption && p.encryption !== 'none') node.encryption = p.encryption;
            if (p['tls-pubkey-sha256']) node['tls-pubkey-sha256'] = p['tls-pubkey-sha256'];
            // Reality 处理
            if (p['reality-opts']) {
                const r = p['reality-opts'];
                const realityOpts: Record<string, any> = {};
                if (r['public-key']) realityOpts['public-key'] = r['public-key'];
                if (r['short-id']) realityOpts['short-id'] = r['short-id'];
                const spx = r['spider-x'] || r['_spider-x'];
                if (spx) realityOpts['spider-x'] = spx;
                const mlkem = r['support-x25519mlkem768'] ?? r.support_x25519mlkem768 ?? p['support-x25519mlkem768'];
                if (mlkem !== undefined && ['1', 't', 'T', 'true', 'TRUE', 'True', true].includes(mlkem)) {
                    realityOpts['support-x25519mlkem768'] = true;
                }
                node['reality-opts'] = realityOpts;
            }
            if (p['packet-encoding'] != null) node['packet-encoding'] = String(p['packet-encoding']);
            if (p.xudp) {
                node.xudp = true;
                if (!node['packet-encoding']) node['packet-encoding'] = 'xudp';
            }
            if (p['packet-addr']) {
                node['packet-addr'] = true;
                if (!node['packet-encoding']) node['packet-encoding'] = 'packetaddr';
            }
            if (p['xhttp-opts']) {
                node['xhttp-opts'] = p['xhttp-opts'];
            }
            break;

        case 'trojan':
            node.password = p.password;
            if (p['reality-opts']) {
                const r = p['reality-opts'];
                const realityOpts: Record<string, any> = {};
                if (r['public-key']) realityOpts['public-key'] = r['public-key'];
                if (r['short-id']) realityOpts['short-id'] = r['short-id'];
                const spx = r['spider-x'] || r['_spider-x'];
                if (spx) realityOpts['spider-x'] = spx;
                const mlkem = r['support-x25519mlkem768'] ?? r.support_x25519mlkem768 ?? p['support-x25519mlkem768'];
                if (mlkem !== undefined && ['1', 't', 'T', 'true', 'TRUE', 'True', true].includes(mlkem)) {
                    realityOpts['support-x25519mlkem768'] = true;
                }
                node['reality-opts'] = realityOpts;
            }
            break;

        case 'hysteria':
            node.auth = p.auth || p['auth-str'];
            node.up = p.up;
            node.down = p.down;
            node.ports = p.ports;
            node['hop-interval'] = p['hop-interval'];
            if (p.protocol) node.protocol = p.protocol;
            if (p['recv-window-conn'] !== undefined) node['recv-window-conn'] = p['recv-window-conn'];
            if (p['recv-window'] !== undefined) node['recv-window'] = p['recv-window'];
            if (p['disable-mtu-discovery'] !== undefined) node['disable-mtu-discovery'] = Boolean(p['disable-mtu-discovery']);
            if (p.obfs) node.obfs = p.obfs;
            break;

        case 'snell':
            node.password = p.psk || p.password;
            node.version = p.version;
            if (p.mode) node.mode = p.mode;
            if (p['quic-proxy-mode'] !== undefined) node['quic-proxy-mode'] = Boolean(p['quic-proxy-mode']);
            if (p.userkey) node.userkey = p.userkey;
            if (p.reuse !== undefined) node.reuse = Boolean(p.reuse);
            if (p['obfs-opts']) {
                node['obfs-opts'] = p['obfs-opts'];
                node.obfs = p['obfs-opts'].mode;
            } else if (p.obfs) {
                node.obfs = p.obfs;
            }
            break;

        case 'anytls':
            node.password = p.password;
            node.tls = true; // AnyTLS 始终启用 TLS
            // session 相关参数
            if (p['idle-session-check-interval'] !== undefined)
                node['idle-session-check-interval'] = p['idle-session-check-interval'];
            if (p['idle-session-timeout'] !== undefined)
                node['idle-session-timeout'] = p['idle-session-timeout'];
            if (p['min-idle-session'] !== undefined)
                node['min-idle-session'] = p['min-idle-session'];
            if (p['max-stream-count'] !== undefined)
                node['max-stream-count'] = p['max-stream-count'];
            if (p['disable-reuse'] !== undefined) node['disable-reuse'] = Boolean(p['disable-reuse']);
            if (p['client-metadata']) node['client-metadata'] = p['client-metadata'];
            if (Array.isArray(p['padding-scheme'])) node['padding-scheme'] = p['padding-scheme'];
            if (p['restls-opts']) node['restls-opts'] = p['restls-opts'];
            break;

        case 'hysteria2':
            node.password = p.password || p.auth;
            node.up = p.up ?? p['up-mbps'] ?? p['up-speed'];
            node.down = p.down ?? p['down-mbps'] ?? p['down-speed'];
            node.ports = p.ports;
            node['hop-interval'] = p['hop-interval'];
            if (p['bbr-profile']) node['bbr-profile'] = p['bbr-profile'];
            if (p['disable-chrome-parrot'] !== undefined)
                node['disable-chrome-parrot'] = Boolean(p['disable-chrome-parrot']);
            if (p['initial-stream-receive-window'] !== undefined) {
                node['initial-stream-receive-window'] = p['initial-stream-receive-window'];
            }
            if (p['max-stream-receive-window'] !== undefined) {
                node['max-stream-receive-window'] = p['max-stream-receive-window'];
            }
            if (p['initial-connection-receive-window'] !== undefined) {
                node['initial-connection-receive-window'] = p['initial-connection-receive-window'];
            }
            if (p['max-connection-receive-window'] !== undefined) {
                node['max-connection-receive-window'] = p['max-connection-receive-window'];
            }
            if (p.cwnd !== undefined) node.cwnd = p.cwnd;
            if (p.ca) node.ca = p.ca;
            if (p['ca-str'] || p.ca_str) node['ca-str'] = p['ca-str'] || p.ca_str;
            if (p.obfs) {
                node.obfs = p.obfs;
                node['obfs-password'] = p['obfs-password'];
            }
            break;

        case 'tuic':
            node.uuid = p.uuid || p.id;
            node.password = p.password;
            node.token = p.token;
            node.version = p.version;
            node['congestion-controller'] = p['congestion-controller'];
            node['udp-relay-mode'] = p['udp-relay-mode'];
            node['reduce-rtt'] = p['reduce-rtt'];
            node['disable-sni'] = p['disable-sni'];
            node['heartbeat-interval'] = p['heartbeat-interval'];
            if (p['request-timeout'] !== undefined) node['request-timeout'] = p['request-timeout'];
            if (p['max-open-streams'] !== undefined) node['max-open-streams'] = p['max-open-streams'];
            if (p['max-udp-relay-packet-size'] !== undefined) {
                node['max-udp-relay-packet-size'] = p['max-udp-relay-packet-size'];
            }
            if (p['udp-over-stream'] !== undefined) node['udp-over-stream'] = Boolean(p['udp-over-stream']);
            if (p['udp-over-stream-version'] !== undefined) {
                node['udp-over-stream-version'] = p['udp-over-stream-version'];
            }
            break;

        case 'wireguard': {
            node['private-key'] = p['private-key'];
            node['public-key'] = p['public-key'];
            node['pre-shared-key'] = p['pre-shared-key'] || p['preshared-key'];
            node.ip = p.ip;
            node.ipv6 = p.ipv6;
            node.mtu = p.mtu;
            node.reserved = p.reserved;
            const ka = p['persistent-keepalive'] ?? p.keepalive;
            if (ka !== undefined) {
                node.keepalive = ka;
                const kaNum = typeof ka === 'number' ? ka : parseInt(String(ka).trim(), 10);
                if (Number.isInteger(kaNum)) {
                    node['persistent-keepalive'] = kaNum;
                }
            }
            node['allowed-ips'] = p['allowed-ips'];
            if (p['remote-dns-resolve'] !== undefined) {
                node['remote-dns-resolve'] = Boolean(p['remote-dns-resolve']);
            }
            if (p.dns) node.dns = p.dns;
            if (p['ip-stack']) node['ip-stack'] = p['ip-stack'];
            if (p['refresh-server-ip-interval'] !== undefined) {
                node['refresh-server-ip-interval'] = p['refresh-server-ip-interval'];
            }
            if (p['amnezia-wg-option']) node['amnezia-wg-option'] = p['amnezia-wg-option'];
            node.udp = true;
            if (Array.isArray(p.peers) && p.peers.length > 0) {
                node.peers = p.peers;
            }
            break;
        }

        case 'socks5':
        case 'http':
        case 'https':
            node.username = p.username;
            node.password = p.password;
            break;

        case 'ssh':
            node.username = p.username || p.user;
            node.password = p.password;
            if (p['private-key']) node['private-key'] = p['private-key'];
            if (p['private-key-passphrase'])
                node['private-key-passphrase'] = p['private-key-passphrase'];
            if (p['host-key']) node['host-key'] = p['host-key'];
            if (p['host-key-algorithms']) node['host-key-algorithms'] = p['host-key-algorithms'];
            break;

        case 'naive':
            node.username = p.username;
            node.password = p.password;
            node.tls = true;
            if (p['extra-headers']) node['extra-headers'] = p['extra-headers'];
            if (p.quic !== undefined) node.quic = Boolean(p.quic);
            break;

        case 'sudoku':
            if (p.key) node.key = p.key;
            if (p['aead-method']) node['aead-method'] = p['aead-method'];
            if (p['padding-min'] !== undefined) node['padding-min'] = p['padding-min'];
            if (p['padding-max'] !== undefined) node['padding-max'] = p['padding-max'];
            if (p['table-type']) node['table-type'] = p['table-type'];
            if (p['enable-pure-downlink'] !== undefined) node['enable-pure-downlink'] = Boolean(p['enable-pure-downlink']);
            if (p.multiplex !== undefined) node.multiplex = p.multiplex;
            if (p.httpmask) node.httpmask = p.httpmask;
            break;

        case 'trusttunnel':
            node.username = p.username;
            node.password = p.password;
            node.tls = true;
            if (p.quic !== undefined) node.quic = Boolean(p.quic);
            break;

        case 'mieru':
            node.username = p.username;
            node.password = p.password;
            if (p.transport) node.transport = p.transport;
            if (p.multiplexing) node.multiplexing = p.multiplexing;
            if (p['port-range']) node['port-range'] = p['port-range'];
            if (p['port-hopping']) node['port-hopping'] = p['port-hopping'];
            if (p['port-hopping-interval'] !== undefined) {
                node['port-hopping-interval'] = p['port-hopping-interval'];
            }
            break;
    }

    return node as ProxyNode;
}

/**
 * 标准化协议类型
 */
function normalizeType(type: string): ProxyType {
    const t = type.toLowerCase();
    if (t === 'shadowsocks') return 'ss';
    if (t === 'hy2') return 'hysteria2';
    return t as ProxyType;
}
