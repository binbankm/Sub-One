/**
 * Sub-One Shadowrocket Converter
 */
import yaml from 'js-yaml';

import type { ConvertOptions, ProxyNode } from '../types';
import { getWireGuardAddressWithCIDR } from '../utils';
import { BaseConverter } from './base';
import { isPresent } from './utils';

export class ShadowrocketConverter extends BaseConverter {
    name = 'Shadowrocket';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        // Shadowrocket can import Clash-like YAML
        const processedNodes = nodes.map((node) => this.processNode(node)).filter(Boolean);

        const config = {
            proxies: processedNodes
        };

        return yaml.dump(config, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false
        });
    }

    private processNode(proxy: ProxyNode): any {
        try {
            // Clone the node
            const node: any = JSON.parse(JSON.stringify(proxy));

            // Type-specific field mapping (Similar to Clash Meta but for Shadowrocket)
            if (node.type === 'ss') {
                if (!node.plugin && (node['shadow-tls-password'] || node['shadow-tls-sni'])) {
                    node.plugin = 'shadow-tls';
                    node['plugin-opts'] = {
                        host: node['shadow-tls-sni'] || node.sni || '',
                        password: node['shadow-tls-password'] || '',
                        version: node['shadow-tls-version'] ?? 3
                    };
                }
                delete node['shadow-tls-password'];
                delete node['shadow-tls-sni'];
                delete node['shadow-tls-version'];
            } else if (node.type === 'vmess') {
                if (isPresent(node, 'aead')) {
                    if (node.aead) node.alterId = 0;
                    delete node.aead;
                }
                const vmessCiphers = ['auto', 'aes-128-gcm', 'chacha20-poly1305', 'none', 'zero'];
                if (node.cipher && !vmessCiphers.includes(node.cipher)) {
                    node.cipher = 'auto';
                }
            } else if (node.type === 'vless') {
                node.cipher = 'none';
                // Reality 支持 (Shadowrocket)
                if (node['reality-opts']) {
                    const r = node['reality-opts'];
                    const realityOpts: Record<string, any> = {};
                    if (r['public-key']) realityOpts['public-key'] = r['public-key'];
                    if (r['short-id']) realityOpts['short-id'] = r['short-id'];
                    const spx = r['spider-x'] || r['_spider-x'];
                    if (spx) realityOpts['spider-x'] = spx;
                    if (r['support-x25519mlkem768'] !== undefined) {
                        realityOpts['support-x25519mlkem768'] = Boolean(r['support-x25519mlkem768']);
                    }
                    node['reality-opts'] = realityOpts;
                }
            } else if (node.type === 'tuic' || node.type === 'hysteria2') {
                if (node.type === 'hysteria2') {
                    if (node.auth && !node.password) node.password = node.auth;
                    if (node['server-ports'] && !node.ports) node.ports = node['server-ports'];
                }
                if (node.type === 'tuic') {
                    if (!node.token && !node.version) node.version = 5;
                }
                if (node.alpn) node.alpn = Array.isArray(node.alpn) ? node.alpn : [node.alpn];
                if (node.tfo && !node['fast-open']) node['fast-open'] = node.tfo;
                if (node.sni && !node.servername) node.servername = node.sni;
            } else if (node.type === 'hysteria') {
                if (node.auth && !node['auth-str']) node['auth-str'] = node.auth;
                if (node['server-ports'] && !node.ports) node.ports = node['server-ports'];
                if (node.sni && !node.servername) node.servername = node.sni;
            } else if (node.type === 'wireguard') {
                node.keepalive = node.keepalive ?? node['persistent-keepalive'];
                node['persistent-keepalive'] = node.keepalive;
                node['preshared-key'] = node['preshared-key'] ?? node['pre-shared-key'];
                node['pre-shared-key'] = node['preshared-key'];
                const ipv4 = getWireGuardAddressWithCIDR(proxy, 'ipv4');
                const ipv6 = getWireGuardAddressWithCIDR(proxy, 'ipv6');
                if (ipv4) node.ip = ipv4;
                if (ipv6) node.ipv6 = ipv6;
                const awgKeys = ['jc', 'jmin', 'jmax', 's1', 's2', 'h1', 'h2', 'h3', 'h4'] as const;
                const awgOpts: Record<string, any> = node['amnezia-wg-option'] ? { ...node['amnezia-wg-option'] } : {};
                for (const k of awgKeys) {
                    if (node[k] !== undefined && awgOpts[k] === undefined) {
                        awgOpts[k] = node[k];
                    }
                    delete node[k];
                }
                if (Object.keys(awgOpts).length > 0) {
                    node['amnezia-wg-option'] = awgOpts;
                }
            } else if (node.type === 'snell') {
                if (node.password && !node.psk) node.psk = node.password;
                if (node.psk && !node.password) node.password = node.psk;
                if (node.version != null && node.version < 3) {
                    delete node.udp;
                }
                if (node.plugin === 'shadow-tls' && node['plugin-opts']) {
                    node['obfs-opts'] = {
                        mode: 'shadow-tls',
                        host: node['plugin-opts'].host,
                        password: node['plugin-opts'].password,
                        version: node['plugin-opts'].version
                    };
                    if (node['plugin-opts'].alpn) {
                        node['obfs-opts'].alpn = node['plugin-opts'].alpn;
                    }
                    delete node.plugin;
                    delete node['plugin-opts'];
                }
            } else if (node.type === 'anytls') {
                // AnyTLS 天然启用 TLS，不需要显式输出 tls 字段
                delete node.tls;
                if (node.reuse != null && !node.reuse) {
                    node['disable-reuse'] = true;
                    delete node.reuse;
                }
                if (node.alpn) node.alpn = Array.isArray(node.alpn) ? node.alpn : [node.alpn];
                if (node.sni && !node.servername) {
                    node.servername = node.sni;
                    delete node.sni;
                }
            } else if (node.type === 'naive' || node.type === 'trusttunnel' || node.type === 'juicity') {
                if (node.alpn) node.alpn = Array.isArray(node.alpn) ? node.alpn : [node.alpn];
                if (node.sni && !node.servername) {
                    node.servername = node.sni;
                    delete node.sni;
                }
            }

            if (['trojan', 'tuic', 'hysteria', 'hysteria2', 'anytls', 'naive', 'trusttunnel', 'juicity'].includes(node.type)) {
                delete node.tls;
            }

            if (node['underlying-proxy']) {
                node['dialer-proxy'] = node['underlying-proxy'];
                delete node['underlying-proxy'];
            }

            if (!node['client-fingerprint'] && ['vmess', 'vless', 'trojan'].includes(node.type)) {
                node['client-fingerprint'] = 'chrome';
            }

            if (node['reality-opts'] && !node['client-fingerprint']) {
                node['client-fingerprint'] = 'chrome';
            }

            if (node['reality-opts']) {
                delete node['ech-opts'];
            } else if (node['ech-opts']) {
                const rawEch = node['ech-opts'] as Record<string, any>;
                const cfgList = rawEch['config-list'] ?? rawEch.config;
                const echOpts: Record<string, any> = {
                    enable: rawEch.enable ?? true
                };
                if (cfgList) {
                    echOpts['config-list'] = Array.isArray(cfgList) ? cfgList : [cfgList];
                }
                if (rawEch['query-server-name']) {
                    echOpts['query-server-name'] = rawEch['query-server-name'];
                }
                node['ech-opts'] = echOpts;
            }

            // Normalize splithttp to xhttp
            if (node.network === 'splithttp') {
                node.network = 'xhttp';
            }

            // Move SNI to servername for Clash YAML compatibility used by Shadowrocket
            if (node.sni) {
                if (!node.servername) node.servername = node.sni;
                delete node.sni;
            }

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

            // Cleanup internal or unsupported fields
            delete node.subName;
            delete node.id;
            delete node.resolved;
            if (!node.encryption || node.encryption === 'none') {
                delete node.encryption; // VLESS uses cipher: none when no VLESS encryption is set
            }

            if (node['tls-fingerprint']) {
                node.fingerprint = node['tls-fingerprint'];
            }
            delete node['tls-fingerprint'];

            // Remove fields starting with underscore (internal)
            for (const key in node) {
                if (key.startsWith('_') || node[key] === null) {
                    delete node[key];
                }
            }

            if (node.network === 'ws' && node['ws-opts']) {
                const wsOpts = node['ws-opts'];
                if (wsOpts['v2ray-http-upgrade'] !== undefined) delete wsOpts['v2ray-http-upgrade'];
                if (wsOpts['v2ray-http-upgrade-fast-open'] !== undefined) delete wsOpts['v2ray-http-upgrade-fast-open'];
            }
            if (node.httpupgrade !== undefined) delete node.httpupgrade;

            if (node.network === 'grpc' && node['grpc-opts']) {
                delete node['grpc-opts']['_grpc-type'];
                delete node['grpc-opts']['_grpc-authority'];
            }

            return node;
        } catch (e) {
            console.error(`[ShadowrocketConverter] Failed to process node ${proxy.name}:`, e);
            return null;
        }
    }
}
