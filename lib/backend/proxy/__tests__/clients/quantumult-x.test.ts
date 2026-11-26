import { describe, expect, it } from 'vitest';
import { convert, parse } from '../../index';

describe('Quantumult X Spec Full Coverage (parse <-> convert)', () => {
    it('should parse and convert IPv6 server endpoints and hex-encoded tls-alpn', async () => {
        const line =
            'vless=[2001:db8::1]:443, method=none, password=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11, obfs=over-tls, obfs-host=www.bing.com, tls-verification=true, tls-alpn=02683208687474702f312e31, reality-base64-pubkey=pbk123, reality-hex-shortid=abcd, vless-flow=xtls-rprx-vision, udp-relay=true, tag=IPv6-VLESS';
        const nodes = parse(line);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].server).toBe('2001:db8::1');
        expect(nodes[0].port).toBe(443);
        expect(nodes[0].sni).toBe('www.bing.com');
        expect(nodes[0]['skip-cert-verify']).toBe(false);
        expect(nodes[0].alpn).toEqual(['h2', 'http/1.1']);
        expect(nodes[0].flow).toBe('xtls-rprx-vision');

        const out = await convert(nodes, 'QuantumultX');
        expect(out).toContain('vless=[2001:db8::1]:443,');
        expect(out).toContain('tls-alpn=02683208687474702f312e31');
        expect(out).toContain('reality-base64-pubkey=pbk123');
        expect(out).toContain('reality-hex-shortid=abcd');
        expect(out).toContain('vless-flow=xtls-rprx-vision');
    });

    it('should round-trip Shadowsocks with obfs=http and obfs=wss (v2ray-plugin)', async () => {
        const ssHttp =
            'shadowsocks=1.2.3.4:80, method=aes-128-gcm, password=pwd, obfs=http, obfs-host=bing.com, obfs-uri=/test, udp-over-tcp=sp.v2, tag=SS-HTTP';
        const parsedHttp = parse(ssHttp);
        expect(parsedHttp[0].plugin).toBe('obfs');
        expect(parsedHttp[0]['plugin-opts']).toEqual({ mode: 'http', host: 'bing.com', path: '/test' });
        expect(parsedHttp[0]['udp-over-tcp-version']).toBe(2);

        const outHttp = await convert(parsedHttp, 'QuantumultX');
        expect(outHttp).toContain('obfs=http,obfs-host=bing.com,obfs-uri=/test');
        expect(outHttp).toContain('udp-over-tcp=sp.v2');

        const ssWss =
            'shadowsocks=1.2.3.4:443, method=2022-blake3-aes-128-gcm, password=pwd, obfs=wss, obfs-host=cdn.com, obfs-uri=/ws, tls-host=cdn.com, tag=SS-WSS';
        const parsedWss = parse(ssWss);
        expect(parsedWss[0].plugin).toBe('v2ray-plugin');
        expect(parsedWss[0]['plugin-opts']).toEqual({
            mode: 'websocket',
            tls: true,
            host: 'cdn.com',
            path: '/ws'
        });

        const outWss = await convert(parsedWss, 'QuantumultX');
        expect(outWss).toContain('obfs=wss,obfs-host=cdn.com,obfs-uri=/ws');
    });

    it('should parse and convert AnyTLS with Reality and TLS options', async () => {
        const anytlsLine =
            'anytls=any.example.com:443, password=apass, over-tls=true, tls-host=www.apple.com, tls-verification=false, reality-base64-pubkey=pbk-any, reality-hex-shortid=1234, fast-open=true, udp-relay=true, tag=AnyTLS-QX';
        const nodes = parse(anytlsLine);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].type).toBe('anytls');
        expect(nodes[0]['reality-opts']).toEqual({ 'public-key': 'pbk-any', 'short-id': '1234' });
        expect(nodes[0]['skip-cert-verify']).toBe(true);

        const out = await convert(nodes, 'QuantumultX');
        expect(out).toContain('anytls=any.example.com:443,password=apass,over-tls=true');
        expect(out).toContain('reality-base64-pubkey=pbk-any,reality-hex-shortid=1234');
        expect(out).not.toContain('udp-over-tcp=');
    });

    it('should parse and convert Quantumult X TF Hysteria2 with salamander, port-hopping, and bandwidth', async () => {
        const hy2Line =
            'hysteria2=hy2.example.com:443, password=pwd, salamander-password=obfskey, port-hopping=20000-50000, tls-host=sni.example.com, tls-verification=false, up=100, down=500, udp-relay=true, tag=My-Hy2';
        const nodes = parse(hy2Line);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].type).toBe('hysteria2');
        expect(nodes[0].password).toBe('pwd');
        expect(nodes[0].obfs).toBe('salamander');
        expect(nodes[0]['obfs-password']).toBe('obfskey');
        expect(nodes[0].ports).toBe('20000-50000');
        expect(nodes[0].up).toBe('100');
        expect(nodes[0].down).toBe('500');
        expect(nodes[0]['skip-cert-verify']).toBe(true);

        const out = await convert(nodes, 'QuantumultX');
        expect(out).toContain('hysteria2=hy2.example.com:443,password=pwd');
        expect(out).toContain('salamander-password=obfskey');
        expect(out).toContain('port-hopping=20000-50000');
        expect(out).toContain('up=100,down=500');
        expect(out).toContain('tls-host=sni.example.com');
        expect(out).toContain('tls-verification=false');
        expect(out).toContain('tag=My-Hy2');
    });

    it('should round-trip SSR with ssr-protocol, ssr-protocol-param, obfs, and obfs-param', async () => {
        const ssrLine =
            'shadowsocks=ssr.example.com:8388, method=aes-256-cfb, password=pwd, ssr-protocol=auth_aes128_md5, ssr-protocol-param=123:abc, obfs=tls1.2_ticket_auth, obfs-param=bing.com, tag=SSR-QX';
        const nodes = parse(ssrLine);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].type).toBe('ssr');
        expect(nodes[0].protocol).toBe('auth_aes128_md5');
        expect(nodes[0]['protocol-param']).toBe('123:abc');
        expect(nodes[0].obfs).toBe('tls1.2_ticket_auth');
        expect(nodes[0]['obfs-param']).toBe('bing.com');

        const out = await convert(nodes, 'QuantumultX');
        expect(out).toContain('ssr-protocol=auth_aes128_md5,ssr-protocol-param=123:abc');
        expect(out).toContain('obfs=tls1.2_ticket_auth,obfs-param=bing.com');
    });
});
