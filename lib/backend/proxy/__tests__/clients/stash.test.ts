import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { StashConverter } from '../../converter/stash';
import type { ProxyNode } from '../../types';

const makeNode = (
    partial: Partial<ProxyNode> & Pick<ProxyNode, 'name' | 'type' | 'server' | 'port'>
): ProxyNode => ({
    ...partial,
    id: partial.id ?? partial.name
});

describe('StashConverter', () => {
    const converter = new StashConverter();

    it('should convert Hysteria2, TUIC, VLESS Reality+XHTTP, AnyTLS, Juicity, Mieru, and SSH', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'stash-hy2',
                type: 'hysteria2',
                server: 'hy2.example.com',
                port: 443,
                password: 'hy2-password',
                'up-mbps': 50,
                'down-mbps': 200,
                obfs: 'gecko',
                'obfs-password': 'gecko-pass',
                'test-url': 'http://cp.cloudflare.com',
                'test-timeout': 3000
            }),
            makeNode({
                name: 'stash-tuic',
                type: 'tuic',
                server: 'tuic.example.com',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                password: 'tpw',
                'congestion-controller': 'bbr'
            }),
            makeNode({
                name: 'stash-vless',
                type: 'vless',
                server: 'v.example.com',
                port: 443,
                uuid: '22222222-2222-2222-2222-222222222222',
                flow: 'xtls-rprx-vision',
                sni: 'v.example.com',
                'tls-fingerprint': 'aa:bb:cc',
                'reality-opts': {
                    'public-key': 'pub',
                    'short-id': 'ab',
                    'support-x25519mlkem768': true
                },
                'ech-opts': { config: 'should-be-removed' }
            }),
            makeNode({
                name: 'stash-anytls',
                type: 'anytls',
                server: 'a.example.com',
                port: 443,
                password: 'apw',
                tls: true,
                sni: 'a.example.com'
            }),
            makeNode({
                name: 'stash-juicity',
                type: 'juicity',
                server: 'j.example.com',
                port: 443,
                uuid: '33333333-3333-3333-3333-333333333333',
                password: 'jpw',
                tls: true,
                sni: 'j.example.com',
                alpn: 'h3' as unknown as string[]
            }),
            makeNode({
                name: 'stash-mieru',
                type: 'mieru',
                server: 'm.example.com',
                port: 2012,
                username: 'u1',
                password: 'p1',
                transport: 'TCP'
            }),
            makeNode({
                name: 'stash-ssh',
                type: 'ssh',
                server: 'ssh.example.com',
                port: 22,
                username: 'root',
                'private-key': 'priv-key'
            })
        ];

        const out = await converter.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] };
        expect(parsed.proxies).toHaveLength(7);

        const [hy2, tuic, vless, anytls, juicity, mieru, ssh] = parsed.proxies;
        expect(hy2.auth).toBe('hy2-password');
        expect(hy2.password).toBeUndefined();
        expect(hy2['up-speed']).toBe(50);
        expect(hy2['down-speed']).toBe(200);
        expect(hy2['benchmark-url']).toBe('http://cp.cloudflare.com');
        expect(hy2['benchmark-timeout']).toBe(3000);
        expect(hy2.tls).toBeUndefined();

        expect(tuic.version).toBe(5);
        expect(tuic.alpn).toEqual(['h3']);
        expect(tuic.tls).toBeUndefined();

        expect(vless.servername).toBe('v.example.com');
        expect(vless['server-cert-fingerprint']).toBe('aa:bb:cc');
        expect(vless['client-fingerprint']).toBe('chrome');
        expect(vless['ech-opts']).toBeUndefined();
        expect(vless['reality-opts']['support-x25519mlkem768']).toBe(true);

        expect(anytls.tls).toBeUndefined();
        expect(anytls.servername).toBe('a.example.com');

        expect(juicity.tls).toBeUndefined();
        expect(juicity.alpn).toEqual(['h3']);
        expect(juicity.servername).toBe('j.example.com');

        expect(mieru.type).toBe('mieru');
        expect(ssh.user).toBe('root');
    });

    it('should filter unsupported Snell v4+, non-TCP AnyTLS, and unsupported protocols by default', async () => {
        const nodes: ProxyNode[] = [
            makeNode({ name: 'snell-v5', type: 'snell', server: '1.1.1.1', port: 1000, psk: 'psk', version: 5 }),
            makeNode({ name: 'snell-v3', type: 'snell', server: '1.1.1.1', port: 1001, psk: 'psk', version: 3 }),
            makeNode({ name: 'anytls-ws', type: 'anytls', server: '1.1.1.1', port: 443, password: 'pw', network: 'ws' }),
            makeNode({ name: 'ss-2022-chacha', type: 'ss', server: '1.1.1.1', port: 443, cipher: '2022-blake3-chacha20-poly1305', password: 'pw' }),
            makeNode({ name: 'https-node', type: 'https', server: '1.1.1.1', port: 443, username: 'u', password: 'p' })
        ];

        const out = await converter.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] };
        expect(parsed.proxies.map((p) => p.name)).toEqual(['snell-v3', 'ss-2022-chacha', 'https-node']);
        expect(parsed.proxies[2].type).toBe('http');
        expect(parsed.proxies[2].tls).toBe(true);
    });
});
