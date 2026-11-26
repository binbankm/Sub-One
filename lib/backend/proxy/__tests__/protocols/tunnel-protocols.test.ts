import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../../index';

describe('Protocol Spec: Tunnel & Emerging Protocols (Mieru / Naive / SSH / Juicity / Sudoku / TrustTunnel / SOCKS5 / HTTP)', () => {
    it('should parse and convert Mieru, Naive, SSH, Juicity, Sudoku, TrustTunnel, SOCKS5, and HTTPS', async () => {
        const uris = [
            'mieru://u1:p1@m.example.com:2012#Mieru1',
            'naive+https://u2:p2@n.example.com:443?sni=n.example.com#Naive1',
            'ssh://root:pw@ssh.example.com:22#SSH1',
            'juicity://11111111-1111-1111-1111-111111111111:jpw@j.example.com:443?sni=j.example.com#Juicity1',
            'sudoku://key1@s.example.com:443?table-type=prefer_ascii#Sudoku1',
            'tt://u3:p3@tt.example.com:443?sni=tt.example.com&alpn=h2#TT1',
            'socks://dXNlcjpwYXNz@sk.example.com:1080#SOCKS1',
            'https://hu:hp@h.example.com:443#HTTPS1'
        ].join('\n');

        const nodes = parse(uris);
        expect(nodes.map((n) => n.type)).toEqual([
            'mieru',
            'naive',
            'ssh',
            'juicity',
            'sudoku',
            'trusttunnel',
            'socks5',
            'https'
        ]);

        const clash = yaml.load(await convert(nodes, 'ClashMeta')) as { proxies: any[] };
        expect(clash.proxies.some((p) => p.type === 'mieru')).toBe(true);
        expect(clash.proxies.some((p) => p.type === 'sudoku')).toBe(true);
        expect(clash.proxies.some((p) => p.type === 'trusttunnel')).toBe(true);
        expect(clash.proxies.some((p) => p.type === 'ssh' && p.user === 'root')).toBe(true);

        const sr = yaml.load(await convert(nodes, 'Shadowrocket')) as { proxies: any[] };
        expect(sr.proxies).toHaveLength(8);
    });
});
