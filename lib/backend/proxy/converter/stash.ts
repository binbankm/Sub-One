/**
 * Sub-One Stash Converter
 */
import type { ConvertOptions, ProxyNode } from '../types';
import { ClashConverter } from './clash';

export class StashConverter extends ClashConverter {
    name = 'Stash';

    constructor() {
        super(true); // Stash is Clash Meta compatible
    }

    protected filterNode(proxy: ProxyNode, options: ConvertOptions): boolean {
        if (options.includeUnsupportedProxy) return true;

        const supportedTypes = [
            'ss',
            'ssr',
            'vmess',
            'socks5',
            'http',
            'snell',
            'trojan',
            'tuic',
            'vless',
            'wireguard',
            'hysteria',
            'hysteria2',
            'ssh',
            'juicity',
            'anytls'
        ];

        if (!supportedTypes.includes(proxy.type)) return false;

        // Shadowsocks cipher validation
        if (proxy.type === 'ss') {
            const stashCiphers = [
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
                'xchacha20-ietf-poly1305',
                '2022-blake3-aes-128-gcm',
                '2022-blake3-aes-256-gcm'
            ];
            if (!stashCiphers.includes(proxy.cipher || '')) return false;
        }

        // VLESS Flow/Reality check
        if (proxy.type === 'vless' && proxy['reality-opts']) {
            if (proxy.flow && !['xtls-rprx-vision'].includes(proxy.flow)) return false;
            // Stash has specific reality support requirements
        }

        if (proxy.type === 'snell' && (proxy.version ?? 0) >= 4) return false;

        return true;
    }

    protected processNode(proxy: ProxyNode): any {
        // Super class processNode expects specific types if configured but we just pass empty options
        const node = super.processNode(proxy, {});
        if (!node) return null;

        // Stash specific adjustments
        if (node.type === 'hysteria') {
            if (node.up) {
                node['up-speed'] = parseInt(String(node.up).match(/\d+/)?.[0] || '0');
                delete node.up;
            }
            if (node.down) {
                node['down-speed'] = parseInt(String(node.down).match(/\d+/)?.[0] || '0');
                delete node.down;
            }
        } else if (node.type === 'hysteria2') {
            if (node.password) {
                node.auth = node.password;
                delete node.password;
            }
            if (node.up) {
                node['up-speed'] = parseInt(String(node.up).match(/\d+/)?.[0] || '0');
                delete node.up;
            }
            if (node.down) {
                node['down-speed'] = parseInt(String(node.down).match(/\d+/)?.[0] || '0');
                delete node.down;
            }
        }

        if (node['test-url']) {
            node['benchmark-url'] = node['test-url'];
            delete node['test-url'];
        }
        if (node['test-timeout']) {
            node['benchmark-timeout'] = node['test-timeout'];
            delete node['test-timeout'];
        }

        if (node['tls-fingerprint']) {
            node['server-cert-fingerprint'] = node['tls-fingerprint'];
            delete node['tls-fingerprint'];
        }

        if (node['client-fingerprint']) {
            // Keep existing fingerprint
        } else if (['vmess', 'vless', 'trojan'].includes(node.type)) {
            node['client-fingerprint'] = 'chrome';
        }

        // Stash doesn't support dialer-proxy/underlying-proxy in standard node definition
        delete node['dialer-proxy'];
        delete node['underlying-proxy'];

        return node;
    }
}
