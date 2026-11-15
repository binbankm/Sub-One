/**
 * Sub-One Clash Parser
 *
 * 将 Clash 配置格式转换为标准 ProxyNode 列表
 */
import yaml from 'js-yaml';

import type { NetworkType, ProxyNode, ProxyType } from '../types';
import { parsePort, randomId } from '../utils';

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
    if (!p || !p.type || !p.server || !p.port) return null;

    const type = p.type.toLowerCase() as ProxyType;
    const name = p.name || `${p.type} ${p.server}:${p.port}`;

    const node: Partial<ProxyNode> = {
        id: randomId(),
        type: normalizeType(type),
        name,
        server: p.server,
        port: parsePort(p.port),
        udp: p.udp !== false, // Clash 默认 true
        tfo: p.tfo || p['fast-open'] || false
    };

    // 1. TLS 通用处理
    node.tls = p.tls || p.ssl || p.type === 'https' || false;
    node.sni = p.servername || p.sni;
    node.alpn = p.alpn;
    node['skip-cert-verify'] = p['skip-cert-verify'] || p['allowInsecure'] || false;
    node['client-fingerprint'] =
        p['client-fingerprint'] || p.fingerprint || p['server-cert-fingerprint'];

    // 各种别名映射
    if (p['dialer-proxy']) node['underlying-proxy'] = p['dialer-proxy'];
    if (p['benchmark-url']) node['test-url'] = p['benchmark-url'];
    if (p['benchmark-timeout']) node['test-timeout'] = p['benchmark-timeout'];

    // 2. 传输层通用处理
    if (p.network) {
        node.network = p.network.toLowerCase() as NetworkType;

        // 传输层选项映射
        if (node.network === 'ws') {
            const wsOpts = p['ws-opts'] || {};
            node['ws-opts'] = {
                path: wsOpts.path || p['ws-path'] || '/',
                headers: wsOpts.headers || p['ws-headers'] || {}
            };
        } else if (node.network === 'grpc') {
            const grpcOpts = p['grpc-opts'] || {};
            node['grpc-opts'] = {
                'grpc-service-name': grpcOpts['grpc-service-name'] || ''
            } as any;
        } else if (['h2', 'http'].includes(node.network)) {
            const h2Opts = p['h2-opts'] || p['http-opts'] || {};
            node[`${node.network}-opts`] = {
                path: h2Opts.path || '/',
                headers: h2Opts.headers || {}
            } as any;
        }
    }

    // 3. 协议特定字段处理
    switch (node.type) {
        case 'ss':
            node.cipher = p.cipher;
            node.password = p.password;
            node.plugin = p.plugin;
            node['plugin-opts'] = p['plugin-opts'];
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
            break;

        case 'vless':
            node.uuid = p.uuid || p.id;
            node.flow = p.flow;
            if (p['tls-pubkey-sha256']) node['tls-pubkey-sha256'] = p['tls-pubkey-sha256'];
            // Reality 处理
            if (p['reality-opts']) {
                node['reality-opts'] = {
                    'public-key': p['reality-opts']['public-key'],
                    'short-id': p['reality-opts']['short-id'],
                    'spider-x': p['reality-opts']['spider-x'] || p['reality-opts']['_spider-x'] || ''
                };
            }
            if (p['xhttp-opts']) {
                node['xhttp-opts'] = p['xhttp-opts'];
            }
            break;

        case 'trojan':
            node.password = p.password;
            if (p['reality-opts']) {
                node['reality-opts'] = {
                    'public-key': p['reality-opts']['public-key'],
                    'short-id': p['reality-opts']['short-id'],
                    'spider-x': p['reality-opts']['spider-x'] || p['reality-opts']['_spider-x'] || ''
                };
            }
            break;

        case 'hysteria':
            node.auth = p.auth || p['auth-str'];
            node.up = p.up;
            node.down = p.down;
            node.ports = p.ports;
            node['hop-interval'] = p['hop-interval'];
            if (p.obfs) node.obfs = p.obfs;
            break;

        case 'snell':
            node.password = p.psk || p.password;
            node.version = p.version;
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
            break;

        case 'hysteria2':
            node.password = p.password;
            node.up = p.up;
            node.down = p.down;
            node.ports = p.ports;
            node['hop-interval'] = p['hop-interval'];
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
            node.dns = p['remote-dns-resolve'] || p.dns;
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
