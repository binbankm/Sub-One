import { describe, expect, it } from 'vitest';

import { normalizeProxyNode } from '../../parser/normalizer';
import type { ProxyNode } from '../../types';

const makeNode = (
    partial: Partial<ProxyNode> & Pick<ProxyNode, 'name' | 'type' | 'server' | 'port'>
): ProxyNode => ({
    ...partial,
    id: partial.id ?? ''
});

describe('Proxy Node Normalizer (normalizeProxyNode)', () => {
    it('should assign unique id, clean IPv6 brackets, lowercase cipher, and validate port', () => {
        const node = normalizeProxyNode(
            makeNode({
                name: '  ',
                type: 'ss',
                server: ' [2001:db8::1] ',
                port: '8388' as unknown as number,
                cipher: 'AES-256-GCM',
                password: 12345 as unknown as string
            })
        );
        expect(node.id).toBeTruthy();
        expect(node.server).toBe('2001:db8::1');
        expect(node.port).toBe(8388);
        expect(node.cipher).toBe('aes-256-gcm');
        expect(node.password).toBe('12345');
        expect(node.name).toBe('SS 2001:db8::1:8388');
    });

    it('should set implicit TLS defaults and unify sni/alpn/underlying-proxy aliases', () => {
        const implicitProtocols = [
            'trojan',
            'hysteria',
            'hysteria2',
            'tuic',
            'https',
            'anytls',
            'naive',
            'juicity',
            'trusttunnel'
        ] as const;

        for (const proto of implicitProtocols) {
            const n = normalizeProxyNode(
                makeNode({
                    name: `n-${proto}`,
                    type: proto,
                    server: 'example.com',
                    port: 443,
                    servername: 'sni.example.com',
                    alpn: 'h2, http/1.1' as unknown as string[],
                    'dialer-proxy': 'Relay'
                })
            );
            expect(n.tls).toBe(true);
            expect(n.sni).toBe('sni.example.com');
            expect(n.alpn).toEqual(['h2', 'http/1.1']);
            expect(n['underlying-proxy']).toBe('Relay');
        }
    });

    it('should normalize ech-opts, ws-path/ws-headers, splithttp->xhttp, hop-interval range, and wireguard reserved', () => {
        const wsNode = normalizeProxyNode(
            makeNode({
                name: 'vmess-ws',
                type: 'vmess',
                server: 'v.example.com',
                port: 443,
                network: 'ws',
                'ws-path': 'chat',
                'ws-opts': { headers: { host: 'lower.example.com' } as any }
            })
        );
        expect(wsNode['ws-opts']?.path).toBe('/chat');
        expect(wsNode['ws-opts']?.headers).toEqual({ Host: 'lower.example.com' });
        expect((wsNode as any)['ws-path']).toBeUndefined();

        const xhttpNode = normalizeProxyNode(
            makeNode({
                name: 'vless-xhttp',
                type: 'vless',
                server: 'x.example.com',
                port: 443,
                tls: true,
                'xhttp-opts': { path: 'xhttp', mode: 'auto' },
                'ech-opts': { config: 'ech-b64', query_server_name: 'dns.example.com' } as any
            })
        );
        expect(xhttpNode.network).toBe('xhttp');
        expect(xhttpNode['xhttp-opts']?.path).toBe('/xhttp');
        expect(xhttpNode['ech-opts']).toEqual({
            'config-list': ['ech-b64'],
            'query-server-name': 'dns.example.com'
        });

        const hy2Node = normalizeProxyNode(
            makeNode({
                name: 'hy2-hop',
                type: 'hysteria2',
                server: 'h.example.com',
                port: 443,
                'hop-interval': '10 - 30' as unknown as number
            })
        );
        expect(hy2Node['hop-interval']).toBe(10);
        expect(hy2Node['hop-interval-max']).toBe(30);

        const wgNode = normalizeProxyNode(
            makeNode({
                name: 'wg',
                type: 'wireguard',
                server: 'w.example.com',
                port: 51820,
                reserved: '1,2,3',
                peers: [{ server: 'w.example.com', port: 51820, 'public-key': 'pub', reserved: '4,5,6' }]
            })
        );
        expect(wgNode.reserved).toEqual([1, 2, 3]);
        expect(wgNode.peers?.[0].reserved).toEqual([4, 5, 6]);
    });
});
