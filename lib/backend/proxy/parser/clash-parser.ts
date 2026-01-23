/**
 * Sub-One Clash Parser
 * 
 * 将 Clash 配置格式转换为标准 ProxyNode 列表
 */

import yaml from 'js-yaml';
import type { ProxyNode, ProxyType, NetworkType } from '../types';
import { randomId, parsePort } from '../utils';

/**
 * 解析 Clash YAML 内容
 */
export function parseClash(content: string): ProxyNode[] {
    try {
        const doc = yaml.load(content) as any;
        if (!doc || !Array.isArray(doc.proxies)) {
            return [];
        }

        return doc.proxies
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
        tfo: p.tfo || p['fast-open'] || false,
    };

    // 1. TLS 通用处理
    node.tls = p.tls || p.ssl || (p.type === 'https') || false;
    node.sni = p.servername || p.sni;
    node.alpn = p.alpn;
    node['skip-cert-verify'] = p['skip-cert-verify'] || p['allowInsecure'] || false;
    node['client-fingerprint'] = p['client-fingerprint'] || p.fingerprint || p['server-cert-fingerprint'];

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
                headers: wsOpts.headers || p['ws-headers'] || {},
            };
        } else if (node.network === 'grpc') {
            const grpcOpts = p['grpc-opts'] || {};
            node['grpc-opts'] = {
                'grpc-service-name': grpcOpts['grpc-service-name'] || '',
            } as any;
        } else if (['h2', 'http'].includes(node.network)) {
            const h2Opts = (p['h2-opts'] || p['http-opts'] || {});
            node[`${node.network}-opts`] = {
                path: h2Opts.path || '/',
                headers: h2Opts.headers || {},
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
            // Reality 处理
            if (p['reality-opts']) {
                node['reality-opts'] = {
                    'public-key': p['reality-opts']['public-key'],
                    'short-id': p['reality-opts']['short-id'],
                };
            }
            break;

        case 'trojan':
            node.password = p.password;
            break;

        case 'hysteria2':
            node.password = p.password;
            if (p.obfs) {
                node.obfs = p.obfs;
                node['obfs-password'] = p['obfs-password'];
            }
            break;

        case 'tuic':
            node.uuid = p.uuid || p.id;
            node.password = p.password;
            node['congestion-controller'] = p['congestion-controller'];
            node['udp-relay-mode'] = p['udp-relay-mode'];
            break;

        case 'wireguard':
            node['private-key'] = p['private-key'];
            node.ip = p.ip;
            node.ipv6 = p.ipv6;
            node.mtu = p.mtu;
            node.reserved = p.reserved;
            node.udp = true;
            break;

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
