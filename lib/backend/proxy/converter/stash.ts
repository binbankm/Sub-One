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
            'https',
            'snell',
            'trojan',
            'tuic',
            'vless',
            'wireguard',
            'hysteria',
            'hysteria2',
            'ssh',
            'juicity',
            'anytls',
            'mieru',
            'naive',
            'direct',
            'reject'
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
                '2022-blake3-aes-256-gcm',
                '2022-blake3-chacha20-poly1305',
                'none',
                'plain'
            ];
            if (!stashCiphers.includes(proxy.cipher || '')) return false;
        }

        // VLESS Flow/Reality check
        if (proxy.type === 'vless' && proxy['reality-opts']) {
            if (proxy.flow && !['xtls-rprx-vision'].includes(proxy.flow)) return false;
            // Stash has specific reality support requirements
        }

        if (proxy.type === 'snell' && (proxy.version ?? 0) >= 4) return false;

        // AnyTLS 不支持非 tcp 传输层或 reality
        if (
            proxy.type === 'anytls' &&
            proxy.network &&
            (!['tcp'].includes(proxy.network) ||
                (['tcp'].includes(proxy.network) && proxy['reality-opts']))
        ) {
            return false;
        }

        return true;
    }

    protected processNode(proxy: ProxyNode, options: ConvertOptions = {}): any {
        const node = super.processNode(proxy, options);
        if (!node) return null;

        // Stash specific adjustments
        if (node.type === 'hysteria' || node.type === 'hysteria2') {
            if (node.type === 'hysteria2' && node.password) {
                node.auth = node.password;
                delete node.password;
            }
            const upVal = node.up ?? node['up-mbps'];
            if (upVal !== undefined) {
                node['up-speed'] = parseInt(String(upVal).match(/\d+/)?.[0] || '0', 10);
                delete node.up;
                delete node['up-mbps'];
            }
            const downVal = node.down ?? node['down-mbps'];
            if (downVal !== undefined) {
                node['down-speed'] = parseInt(String(downVal).match(/\d+/)?.[0] || '0', 10);
                delete node.down;
                delete node['down-mbps'];
            }
        } else if (node.type === 'juicity') {
            if (node.alpn) node.alpn = Array.isArray(node.alpn) ? node.alpn : [node.alpn];
            if (node.sni && !node.servername) {
                node.servername = node.sni;
                delete node.sni;
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

        const certFp = node['tls-fingerprint'] || node.fingerprint;
        if (certFp) {
            node['server-cert-fingerprint'] = certFp;
            delete node['tls-fingerprint'];
            delete node.fingerprint;
        }

        if (!node['client-fingerprint'] && ['vmess', 'vless', 'trojan'].includes(node.type)) {
            node['client-fingerprint'] = 'chrome';
        }

        if (node.type === 'vless' && node.sni) {
            if (!node.servername) node.servername = node.sni;
            delete node.sni;
        }

        if (node.type === 'tuic') {
            if (!node.token && !node.version) node.version = 5;
            if (!node.alpn) node.alpn = ['h3'];
        }

        if (['trojan', 'tuic', 'hysteria', 'hysteria2', 'juicity', 'anytls', 'naive'].includes(node.type)) {
            delete node.tls;
        }

        if (node['underlying-proxy']) {
            node['dialer-proxy'] = node['underlying-proxy'];
            delete node['underlying-proxy'];
        }

        return node;
    }
}
