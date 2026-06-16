/**
 * Sub-One Clash Converter
 */
import yaml from 'js-yaml';

import type { ConvertOptions, ProxyNode } from '../types';
import { BaseConverter } from './base';
import { isPresent } from './utils';

export class ClashConverter extends BaseConverter {
    name = 'Clash';
    protected isMeta = false;

    constructor(isMeta = false) {
        super();
        this.isMeta = isMeta;
        if (isMeta) this.name = 'ClashMeta';
    }

    async convert(nodes: ProxyNode[], options: ConvertOptions = {}): Promise<string> {
        const list = nodes
            .filter((node) => this.filterNode(node, options))
            .map((node) => this.processNode(node, options))
            .filter(Boolean);

        // 处理重复名称：为重复的节点名称添加序号后缀
        const nameCount = new Map<string, number>();
        const nameIndex = new Map<string, number>();

        // 先统计每个名称出现的次数
        list.forEach((node) => {
            const count = nameCount.get(node.name) || 0;
            nameCount.set(node.name, count + 1);
        });

        // 为重复的节点重命名
        list.forEach((node) => {
            if ((nameCount.get(node.name) || 0) > 1) {
                const index = (nameIndex.get(node.name) || 0) + 1;
                nameIndex.set(node.name, index);
                node.name = `${node.name}_${index}`;
            }
        });

        const config = {
            proxies: list
        };

        return yaml.dump(config, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false
        });
    }

    protected filterNode(proxy: ProxyNode, options: ConvertOptions): boolean {
        if (options.includeUnsupportedProxy) return true;

        const supportedTypes = this.isMeta
            ? [
                  'ss',
                  'ssr',
                  'vmess',
                  'vless',
                  'socks5',
                  'http',
                  'snell',
                  'trojan',
                  'wireguard',
                  'hysteria',
                  'hysteria2',
                  'tuic',
                  'anytls'
              ]
            : [
                  'ss',
                  'ssr',
                  'vmess',
                  'vless',
                  'socks5',
                  'http',
                  'snell',
                  'trojan',
                  'wireguard',
                  'anytls'
              ];

        if (!supportedTypes.includes(proxy.type)) return false;

        // Shadowsocks cipher validation
        if (proxy.type === 'ss') {
            const standardCiphers = [
                'aes-128-gcm',
                'aes-192-gcm',
                'aes-256-gcm',
                'aes-128-cfb',
                'aes-192-cfb',
                'aes-256-cfb',
                'aes-128-ctr',
                'aes-192-ctr',
                'aes-256-ctr',
                'rc4-md5',
                'chacha20-ietf',
                'xchacha20',
                'chacha20-ietf-poly1305',
                'xchacha20-ietf-poly1305'
            ];
            const metaCiphers = [
                ...standardCiphers,
                '2022-blake3-aes-128-gcm',
                '2022-blake3-aes-256-gcm',
                '2022-blake3-chacha20-poly1305',
                'none'
            ];

            if (this.isMeta) {
                if (!metaCiphers.includes(proxy.cipher || '')) return false;
            } else {
                if (!standardCiphers.includes(proxy.cipher || '')) return false;
            }
        }

        // VLESS Flow/Reality check for standard Clash
        if (!this.isMeta && proxy.type === 'vless' && (proxy.flow || proxy['reality-opts'])) {
            return false;
        }

        return true;
    }

    protected processNode(proxy: ProxyNode, _options: ConvertOptions): any {
        try {
            const node: any = JSON.parse(JSON.stringify(proxy));

            if (node.type === 'vmess') {
                if (isPresent(node, 'aead')) {
                    if (node.aead) node.alterId = 0;
                    delete node.aead;
                }
                // 确保 alterId 有默认值（现代 VMess 通常使用 AEAD，alterId 为 0）
                if (!isPresent(node, 'alterId')) {
                    node.alterId = 0;
                }
                const vmessCiphers = ['auto', 'aes-128-gcm', 'chacha20-poly1305', 'none', 'zero'];
                if (node.cipher && !vmessCiphers.includes(node.cipher)) {
                    node.cipher = 'auto';
                }
            } else if (node.type === 'ss') {
                if (isPresent(node, 'shadow-tls-password') && !isPresent(node, 'plugin')) {
                    node.plugin = 'shadow-tls';
                    node['plugin-opts'] = {
                        host: node['shadow-tls-sni'],
                        password: node['shadow-tls-password'],
                        version: node['shadow-tls-version']
                    };
                    delete node['shadow-tls-password'];
                    delete node['shadow-tls-sni'];
                    delete node['shadow-tls-version'];
                }
                if (isPresent(node, 'plugin-opts.mux') && node['plugin-opts']?.mux !== undefined) {
                    const v = String(node['plugin-opts'].mux).toLowerCase();
                    if (v === 'true' || v === '1') node['plugin-opts'].mux = true;
                    else if (v === 'false' || v === '0') node['plugin-opts'].mux = false;
                }
            } else if (node.type === 'vless') {
                node.cipher = 'none'; // VLESS always none in Clash Meta
                if (node['reality-opts']) {
                    node['reality-opts'] = {
                        'public-key': node['reality-opts']['public-key'],
                        'short-id': node['reality-opts']['short-id'],
                        'spider-x': node['reality-opts']['_spider-x'] || ''
                    };
                }
                if (node['ech-opts'] && node['ech-opts']['config-list']) {
                    node['ech-opts'] = {
                        'config-list': node['ech-opts']['config-list']
                    };
                }
                if (node['xhttp-opts']) {
                    const xopts: any = {};
                    const rawOpts = node['xhttp-opts'] as Record<string, any>;
                    if (rawOpts.mode) xopts.mode = rawOpts.mode;
                    if (rawOpts.path) xopts.path = rawOpts.path;
                    if (rawOpts.host) xopts.host = rawOpts.host;
                    if (rawOpts.headers) xopts.headers = rawOpts.headers;
                    if (rawOpts['download-settings']) xopts['download-settings'] = rawOpts['download-settings'];
                    if (Object.keys(xopts).length > 0) {
                        node['xhttp-opts'] = xopts;
                    }
                }
            } else if (node.type === 'wireguard') {
                node.keepalive = node.keepalive ?? node['persistent-keepalive'];
                node['persistent-keepalive'] = node.keepalive;
                node['preshared-key'] = node['preshared-key'] ?? node['pre-shared-key'];
                node['pre-shared-key'] = node['preshared-key'];
            } else if (node.type === 'hysteria') {
                if (node.auth && !node['auth-str']) node['auth-str'] = node.auth;
                if (!isPresent(node, 'sni') && node.peer) node.sni = node.peer;
            } else if (node.type === 'tuic' || node.type === 'hysteria2') {
                if (node.alpn) node.alpn = Array.isArray(node.alpn) ? node.alpn : [node.alpn];
                if (node.tfo && !node['fast-open']) node['fast-open'] = node.tfo;
                // TUIC v5: 无 token 时自动补 version=5
                if (
                    node.type === 'tuic' &&
                    (!node.token || node.token.length === 0) &&
                    !isPresent(node, 'version')
                ) {
                    node.version = 5;
                }
            } else if (node.type === 'anytls') {
                // AnyTLS 天然启用 TLS，不需要显式输出 tls 字段
                delete node.tls;
                // sni 映射到 servername
                if (node.sni && !node.servername) {
                    node.servername = node.sni;
                    delete node.sni;
                }
            }

            if (['trojan', 'tuic', 'hysteria', 'hysteria2', 'anytls', 'naive'].includes(node.type)) {
                delete node.tls;
            }

            if (node['client-fingerprint']) {
                node['client-fingerprint'] = node['client-fingerprint'];
            } else if (['vmess', 'vless', 'trojan'].includes(node.type)) {
                node['client-fingerprint'] = 'chrome';
            }

            if (node.sni) {
                node.servername = node.sni;
                delete node.sni;
            }

            // Transport adjustments
            if (node.network === 'ws') {
                node['ws-opts'] = node['ws-opts'] || {};
                const networkPath = node['ws-path'] || node['ws-opts'].path;
                if (networkPath) {
                    const edMatch = networkPath.match(/^(.*?)(?:\?ed=(\d+))?$/);
                    if (edMatch) {
                        node['ws-opts'].path = edMatch[1] || '/';
                        if (edMatch[2]) {
                            node['ws-opts']['early-data-header-name'] = 'Sec-WebSocket-Protocol';
                            node['ws-opts']['max-early-data'] = parseInt(edMatch[2], 10);
                        }
                    }
                }
                const host = node['ws-headers']?.Host || node['ws-opts']?.headers?.Host;
                if (host) {
                    node['ws-opts'].headers = node['ws-opts'].headers || {};
                    node['ws-opts'].headers.Host = host;
                }
            } else if (
                (node.type === 'vmess' || node.type === 'vless') &&
                node.network === 'http'
            ) {
                node['http-opts'] = node['http-opts'] || {};
                if (node['http-opts'].path && !Array.isArray(node['http-opts'].path)) {
                    node['http-opts'].path = [node['http-opts'].path];
                }
                if (
                    node['http-opts'].headers?.Host &&
                    !Array.isArray(node['http-opts'].headers.Host)
                ) {
                    node['http-opts'].headers.Host = [node['http-opts'].headers.Host];
                }
            } else if (
                (node.type === 'vmess' || node.type === 'vless') &&
                node.network === 'h2'
            ) {
                if (node['h2-opts']) {
                    // h2-opts.path: array → first element
                    const h2Path = node['h2-opts'].path;
                    if (isPresent(node, 'h2-opts.path') && Array.isArray(h2Path)) {
                        node['h2-opts'].path = h2Path[0];
                    }
                    // h2-opts.host: 从 headers.host 或 host 提取，输出为数组
                    const h2Host = node['h2-opts'].host ??
                        node['h2-opts'].headers?.host ??
                        node['h2-opts'].headers?.Host;
                    if (isPresent(node, 'h2-opts.host') || isPresent(node, 'h2-opts.headers.host') || isPresent(node, 'h2-opts.headers.Host')) {
                        node['h2-opts'].host = Array.isArray(h2Host) ? h2Host : [h2Host];
                    }
                    // 清理 headers.host/Host
                    if (node['h2-opts'].headers) {
                        delete node['h2-opts'].headers.host;
                        delete node['h2-opts'].headers.Host;
                        if (Object.keys(node['h2-opts'].headers).length === 0) {
                            delete node['h2-opts'].headers;
                        }
                    }
                }
            } else if (node.network === 'kcp') {
                // mKCP 传输层处理
                node['kcp-opts'] = node['kcp-opts'] || {};
                if (node.seed) node['kcp-opts'].seed = node.seed;
                if (node.headerType) {
                    node['kcp-opts']['header-type'] = node.headerType;
                    delete node.headerType;
                }
                if (node.seed) delete node.seed;
            } else if (node.network === 'quic') {
                // QUIC 传输层处理
                node['quic-opts'] = node['quic-opts'] || {};
                if (node.headerType) {
                    node['quic-opts']['header-type'] = node.headerType;
                    delete node.headerType;
                }
            }

            if (this.isMeta && node['underlying-proxy']) {
                node['dialer-proxy'] = node['underlying-proxy'];
                delete node['underlying-proxy'];
            }

            if (node['ip-version']) {
                const ipVersions: Record<string, string> = {
                    dual: 'dual',
                    'v4-only': 'ipv4',
                    'v6-only': 'ipv6',
                    'prefer-v4': 'ipv4-prefer',
                    'prefer-v6': 'ipv6-prefer'
                };
                node['ip-version'] = ipVersions[node['ip-version']] || node['ip-version'];
            }

            // Cleanup
            delete node.subName;
            delete node.id;
            delete node.resolved;

            if (node['tls-fingerprint']) {
                node.fingerprint = node['tls-fingerprint'];
            }
            delete node['tls-fingerprint'];

            for (const key in node) {
                if (key.startsWith('_') || node[key] === null) {
                    delete node[key];
                }
            }

            if (node.network === 'ws' && node['ws-opts']) {
                const wsOpts = node['ws-opts'];
                if (wsOpts['v2ray-http-upgrade'] !== undefined) delete wsOpts['v2ray-http-upgrade'];
                if (wsOpts['v2ray-http-upgrade-fast-open'] !== undefined) delete wsOpts['v2ray-http-upgrade-fast-open'];
                if (wsOpts['_v2ray-http-upgrade-ed'] !== undefined) delete wsOpts['_v2ray-http-upgrade-ed'];
            }
            if (node.httpupgrade !== undefined) delete node.httpupgrade;

            if (node.network === 'grpc' && node['grpc-opts']) {
                delete node['grpc-opts']['_grpc-type'];
                delete node['grpc-opts']['_grpc-authority'];
            }

            // === 按照 Clash 标准重新排序字段 ===
            // 确保输出的 YAML 符合 Clash 规范: name, type, server, port 在最前面
            const orderedNode: any = {
                name: node.name,
                type: node.type,
                server: node.server,
                port: node.port
            };

            // 按优先级添加其他字段
            const priorityFields = [
                // 认证信息
                'password',
                'uuid',
                'username',
                // 加密
                'cipher',
                'alterId',
                // TLS
                'tls',
                'servername',
                'alpn',
                'skip-cert-verify',
                'client-fingerprint',
                // 传输层
                'network',
                'flow',
                // Reality
                'reality-opts',
                // ECH (ClashMeta)
                'ech-opts',
                // WebSocket
                'ws-opts',
                'ws-path',
                'ws-headers',
                // gRPC
                'grpc-opts',
                'grpc-service-name',
                // HTTP
                'http-opts',
                // KCP
                'kcp-opts',
                // QUIC
                'quic-opts',
                // XHTTP/SplitHTTP (ClashMeta)
                'xhttp-opts',
                // 协议特定
                'auth',
                'auth-str',
                'obfs',
                'obfs-password',
                'obfs-opts',
                'up',
                'down',
                'up-mbps',
                'down-mbps',
                'plugin',
                'plugin-opts',
                'recv-window',
                'recv-window-conn',
                'disable-mtu-discovery',
                'fast-open',
                // TUIC
                'token',
                'congestion-controller',
                'udp-relay-mode',
                'reduce-rtt',
                'max-udp-relay-packet-size',
                // WireGuard
                'private-key',
                'public-key',
                'pre-shared-key',
                'reserved',
                'mtu',
                'ip',
                'ipv6',
                'peers',
                'keepalive',
                'persistent-keepalive',
                // Snell
                'version',
                // UDP/TCP
                'udp',
                'udp-relay',
                'tfo',
                'mptcp',
                // 其他
                'ip-version',
                'interface',
                'routing-mark',
                'dialer-proxy',
                'underlying-proxy',
                'test-url',
                'test-timeout'
            ];

            // 按优先顺序添加存在的字段
            for (const field of priorityFields) {
                if (node[field] !== undefined) {
                    orderedNode[field] = node[field];
                }
            }

            // 添加剩余字段（不在优先列表中的）
            for (const key in node) {
                if (orderedNode[key] === undefined && !key.startsWith('_')) {
                    orderedNode[key] = node[key];
                }
            }

            return orderedNode;
        } catch (e) {
            console.error(`[ClashConverter] Failed to process node ${proxy.name}:`, e);
            return null;
        }
    }
}
