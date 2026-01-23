/**
 * Sub-One Shadowrocket Converter
 */

import type { ProxyNode, ConvertOptions } from '../types';
import { BaseConverter } from './base';
import { isPresent } from './utils';
import yaml from 'js-yaml';

export class ShadowrocketConverter extends BaseConverter {
    name = 'Shadowrocket';

    async convert(nodes: ProxyNode[], _options: ConvertOptions = {}): Promise<string> {
        // Shadowrocket can import Clash-like YAML
        const processedNodes = nodes.map(node => this.processNode(node)).filter(Boolean);

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
            if (node.type === 'vmess') {
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
            } else if (node.type === 'tuic' || node.type === 'hysteria2') {
                if (node.alpn) node.alpn = Array.isArray(node.alpn) ? node.alpn : [node.alpn];
                if (node.tfo && !node['fast-open']) node['fast-open'] = node.tfo;
                if (node.sni && !node.servername) node.servername = node.sni;
            } else if (node.type === 'hysteria') {
                if (node.auth && !node['auth-str']) node['auth-str'] = node.auth;
                if (node.sni && !node.servername) node.servername = node.sni;
            } else if (node.type === 'wireguard') {
                node.keepalive = node.keepalive ?? node['persistent-keepalive'];
                node['persistent-keepalive'] = node.keepalive;
                node['preshared-key'] = node['preshared-key'] ?? node['pre-shared-key'];
                node['pre-shared-key'] = node['preshared-key'];
            }

            if (node['client-fingerprint']) {
                node['client-fingerprint'] = node['client-fingerprint'];
            } else if (['vmess', 'vless', 'trojan'].includes(node.type)) {
                node['client-fingerprint'] = 'chrome';
            }

            // Move SNI to servername for Clash YAML compatibility used by Shadowrocket
            if (node.sni && !node.servername) {
                node.servername = node.sni;
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
            delete node.encryption; // VLESS uses cipher: none instead

            // Remove fields starting with underscore (internal)
            for (const key in node) {
                if (key.startsWith('_') || node[key] === null) {
                    delete node[key];
                }
            }

            return node;
        } catch (e) {
            console.error(`[ShadowrocketConverter] Failed to process node ${proxy.name}:`, e);
            return null;
        }
    }
}
