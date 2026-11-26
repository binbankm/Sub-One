import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../../index';
import type { ProxyNode } from '../../types';

describe('Deep-Dive Cross-Client Edge Cases & Round-Trips', () => {
    it('ClashMeta: should parse Trojan/TUIC/Hy2 with implicit TLS and WireGuard with peer-only server/port', async () => {
        const clashYaml = `
proxies:
  - name: implicit-trojan
    type: trojan
    server: tr.example.com
    port: 443
    password: pwd
    sni: tr.example.com
  - name: implicit-hy2
    type: hysteria2
    server: hy2.example.com
    port: 443
    password: hpwd
  - name: peer-only-wg
    type: wireguard
    private-key: priv123
    ip: 10.0.0.2
    ip-cidr: 32
    peers:
      - server: wg.example.com
        port: 51820
        public-key: pub123
`;
        const nodes = parse(clashYaml);
        expect(nodes).toHaveLength(3);
        expect(nodes[0].tls).toBe(true);
        expect(nodes[1].tls).toBe(true);
        expect(nodes[2].server).toBe('wg.example.com');
        expect(nodes[2].port).toBe(51820);

        // Converting Trojan from Clash (implicit TLS) to QX should retain tls-host
        const qxOut = await convert([nodes[0]], 'QuantumultX');
        expect(qxOut).toContain('tls-host=tr.example.com');

        // Converting WireGuard to ClashMeta should not leak ip-cidr
        const clashOut = await convert([nodes[2]], 'ClashMeta');
        const reparsed = yaml.load(clashOut) as { proxies: any[] };
        expect(reparsed.proxies[0].ip).toBe('10.0.0.2/32');
        expect(reparsed.proxies[0]['ip-cidr']).toBeUndefined();
    });

    it('Singbox: should map tls-fingerprint to certificate_sha256 (not pubkey), normalize http host array, deduplicate tags, and parse udp_over_tcp objects', async () => {
        const sha256Hex = 'a'.repeat(64);
        const nodes: ProxyNode[] = [
            {
                id: '1',
                name: 'dup-node',
                type: 'vless',
                server: 'v1.example.com',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                tls: true,
                'tls-fingerprint': sha256Hex,
                network: 'http',
                'http-opts': {
                    path: '/h',
                    headers: { Host: 'cdn.example.com' }
                }
            },
            {
                id: '2',
                name: 'dup-node',
                type: 'ss',
                server: 's1.example.com',
                port: 8388,
                cipher: 'aes-128-gcm',
                password: 'pwd',
                'shadow-tls-password': 'stpw',
                'shadow-tls-sni': 'www.apple.com',
                'shadow-tls-version': 3
            }
        ];

        const sbJson = await convert(nodes, 'Singbox');
        const parsed = JSON.parse(sbJson);
        expect(parsed.outbounds).toHaveLength(3);
        expect(parsed.outbounds[0].tag).toBe('dup-node_1');
        expect(parsed.outbounds[0].tls.certificate_sha256).toHaveLength(1);
        expect(parsed.outbounds[0].tls.certificate_public_key_sha256).toBeUndefined();
        expect(parsed.outbounds[0].transport.host).toEqual(['cdn.example.com']);
        expect(parsed.outbounds[1].tag).toBe('dup-node_2');
        expect(parsed.outbounds[1].detour).toBe('dup-node_2_shadowtls');
        expect(parsed.outbounds[2].tag).toBe('dup-node_2_shadowtls');

        // Parse udp_over_tcp disabled vs enabled v2
        const sbInput = JSON.stringify({
            outbounds: [
                {
                    type: 'shadowsocks',
                    tag: 'ss-uot-off',
                    server: '1.1.1.1',
                    server_port: 8388,
                    method: 'aes-128-gcm',
                    password: 'p',
                    udp_over_tcp: { enabled: false }
                },
                {
                    type: 'shadowsocks',
                    tag: 'ss-uot-v2',
                    server: '1.1.1.2',
                    server_port: 8388,
                    method: 'aes-128-gcm',
                    password: 'p',
                    udp_over_tcp: { enabled: true, version: 2 }
                }
            ]
        });
        const reparsed = parse(sbInput);
        expect(reparsed[0].uot).toBeUndefined();
        expect(reparsed[0]['udp-over-tcp']).toBeUndefined();
        expect(reparsed[1].uot).toBe(true);
        expect(reparsed[1]['udp-over-tcp']).toBe(true);
        expect(reparsed[1]['udp-over-tcp-version']).toBe(2);
    });

    it('Surge: should not treat SS obfs=http as HTTP transport, should emit dialer-proxy as underlying-proxy, and not duplicate ws-path on httpupgrade', async () => {
        const surgeLine =
            'SS-Obfs = ss, 1.2.3.4, 8388, encrypt-method=aes-128-gcm, password=pwd, obfs=http, obfs-host=bing.com';
        const ssNodes = parse(surgeLine);
        expect(ssNodes).toHaveLength(1);
        expect(ssNodes[0].plugin).toBe('obfs');
        expect(ssNodes[0].network).toBeUndefined();
        expect(ssNodes[0]['http-opts']).toBeUndefined();

        const huNode: ProxyNode = {
            id: 'hu',
            name: 'VMess-HU',
            type: 'vmess',
            server: 'hu.example.com',
            port: 443,
            uuid: '11111111-1111-1111-1111-111111111111',
            tls: true,
            network: 'httpupgrade',
            'httpupgrade-opts': { path: '/hu', host: 'hu.example.com' },
            'ws-opts': { path: '/old-ws' },
            'dialer-proxy': 'Relay'
        };
        const surgeOut = await convert([huNode], 'Surge');
        expect(surgeOut.match(/ws-path=/g)).toHaveLength(1);
        expect(surgeOut).toContain('ws-path=/hu');
        expect(surgeOut).toContain('underlying-proxy=Relay');
    });

    it('Loon: should preserve WireGuard persistent-keepalive & privateKey, VLESS servername, and WSS obfs TLS', async () => {
        const loonLine =
            '"Loon, Node" = vmess, 1.2.3.4, 443, aes-128-gcm, "11111111-1111-1111-1111-111111111111", obfs=wss, host=cdn.example.com, path=/ws';
        const parsed = parse(loonLine);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].name).toBe('Loon, Node');
        expect(parsed[0].tls).toBe(true);
        expect(parsed[0].obfs).toBeUndefined();

        const wgNode: ProxyNode = {
            id: 'wg',
            name: 'WG-Test',
            type: 'wireguard',
            server: 'wg.example.com',
            port: 51820,
            privateKey: 'priv-alias',
            'public-key': 'pub-key',
            ip: '10.0.0.2',
            'persistent-keepalive': 25
        };
        const loonWg = await convert([wgNode], 'Loon');
        expect(loonWg).toContain('private-key="priv-alias"');
        expect(loonWg).toContain('keepalive=25');

        const vlessNode: ProxyNode = {
            id: 'vl',
            name: 'VL-SNI',
            type: 'vless',
            server: 'v.example.com',
            port: 443,
            uuid: '11111111-1111-1111-1111-111111111111',
            tls: true,
            servername: 'sni.example.com'
        };
        const loonVl = await convert([vlessNode], 'Loon');
        expect(loonVl).toContain('tls-name=sni.example.com');
    });

    it('URI & Egern: should encode Trojan special password, preserve httpupgrade host, and deduplicate Egern names', async () => {
        const nodes: ProxyNode[] = [
            {
                id: 'tr',
                name: 'Trojan-Special',
                type: 'trojan',
                server: 'tr.example.com',
                port: 443,
                password: 'p@ss/w:d',
                servername: 'sni.example.com',
                network: 'httpupgrade',
                'httpupgrade-opts': { path: '/hu', host: 'cdn.example.com' }
            },
            {
                id: 'tr2',
                name: 'Trojan-Special',
                type: 'trojan',
                server: 'tr2.example.com',
                port: 443,
                password: 'pwd',
                network: 'ws',
                'ws-opts': { path: '/ws', headers: { host: 'lower.example.com' } as any }
            }
        ];

        const uriOut = await convert([nodes[0]], 'URI');
        expect(uriOut).toContain('trojan://p%40ss%2Fw%3Ad@tr.example.com:443');
        expect(uriOut).toContain('sni=sni.example.com');
        expect(uriOut).toContain('type=httpupgrade');
        expect(uriOut).toContain('host=cdn.example.com');

        const egernOut = await convert(nodes, 'Egern');
        const egernParsed = yaml.load(egernOut) as { proxies: any[] };
        expect(egernParsed.proxies[0].name).toBe('Trojan-Special_1');
        expect(egernParsed.proxies[1].name).toBe('Trojan-Special_2');
        expect(egernParsed.proxies[1].transport.ws.headers).toEqual({ Host: 'lower.example.com' });
    });

    it('Quantumult X: should quote multi-range port-hopping, retain Trojan implicit TLS, filter unsupported transports, and handle literal % in tag', async () => {
        const hy2Multi: ProxyNode = {
            id: 'hy2m',
            name: 'Hy2-Multi',
            type: 'hysteria2',
            server: 'hy2.example.com',
            port: 443,
            password: 'pwd',
            ports: '20000-30000;40000-50000'
        };
        const trojanImplicit: ProxyNode = {
            id: 'tri',
            name: 'Trojan-Implicit',
            type: 'trojan',
            server: 'tr.example.com',
            port: 443,
            password: 'pwd',
            sni: 'sni.example.com'
        };
        const vlessGrpc: ProxyNode = {
            id: 'vg',
            name: 'VLESS-gRPC',
            type: 'vless',
            server: 'v.example.com',
            port: 443,
            uuid: '11111111-1111-1111-1111-111111111111',
            tls: true,
            network: 'grpc',
            'grpc-opts': { 'grpc-service-name': 'mygrpc' }
        };
        const vmessXhttp: ProxyNode = {
            id: 'vx',
            name: 'VMess-XHTTP',
            type: 'vmess',
            server: 'v.example.com',
            port: 443,
            uuid: '11111111-1111-1111-1111-111111111111',
            tls: true,
            network: 'xhttp'
        };

        const qxOut = await convert([hy2Multi, trojanImplicit, vlessGrpc, vmessXhttp], 'QuantumultX');
        const lines = qxOut.split('\n').filter(Boolean);
        expect(lines).toHaveLength(2);
        expect(lines[0]).toContain('port-hopping="20000-30000,40000-50000"');
        expect(lines[1]).toContain('over-tls=true');
        expect(lines[1]).toContain('tls-host=sni.example.com');

        const reparsed = parse(lines[0]);
        expect(reparsed).toHaveLength(1);
        expect(reparsed[0].ports).toBe('20000-30000,40000-50000');

        const pctTag = parse('shadowsocks=1.2.3.4:8388, method=aes-128-gcm, password=pwd, tag=Node 100%');
        expect(pctTag).toHaveLength(1);
        expect(pctTag[0].name).toBe('Node 100%');
    });

    it('Singbox: should assign unique ids, parse ss plugin_opts strings, extract WG peer public-key, and emit pubkey sha256 array', async () => {
        const sbInput = JSON.stringify({
            endpoints: [
                {
                    type: 'wireguard',
                    tag: 'wg-ep',
                    address: ['10.0.0.2/32'],
                    private_key: 'priv',
                    peers: [{ address: 'wg.example.com', port: 51820, public_key: 'peer-pub' }]
                }
            ],
            outbounds: [
                {
                    type: 'shadowsocks',
                    tag: 'ss-v2ray',
                    server: '1.2.3.4',
                    server_port: 443,
                    method: 'aes-128-gcm',
                    password: 'pwd',
                    plugin: 'v2ray-plugin',
                    plugin_opts: 'mode=websocket;host=cdn.example.com;path=/ws;tls'
                },
                {
                    type: 'vless',
                    tag: 'vl-pin',
                    server: 'v.example.com',
                    server_port: 443,
                    uuid: '11111111-1111-1111-1111-111111111111',
                    tls: {
                        enabled: true,
                        certificate_public_key_sha256: ['pinBase64==']
                    },
                    transport: { type: 'grpc', service_name: 'svc' }
                }
            ]
        });

        const parsed = parse(sbInput);
        expect(parsed).toHaveLength(3);
        expect(parsed[0].id).toBeTruthy();
        expect(parsed[1].id).toBeTruthy();
        expect(parsed[0].id).not.toBe(parsed[1].id);
        expect(parsed[0]['plugin-opts']).toEqual({
            mode: 'websocket',
            host: 'cdn.example.com',
            path: '/ws',
            tls: true
        });
        expect(parsed[1]['tls-pubkey-sha256']).toBe('pinBase64==');
        expect(parsed[2]['public-key']).toBe('peer-pub');

        const sbOut = JSON.parse(await convert([parsed[1]], 'Singbox'));
        expect(sbOut.outbounds[0].tls.certificate_public_key_sha256).toEqual(['pinBase64==']);
    });

    it('ClashMeta & URI: should parse IPv6 WG endpoint, Stash Hy2 aliases, lowercase ws host, and grpc-service-name to URI', async () => {
        const clashYaml = `
proxies:
  - name: wg-v6
    type: wireguard
    private-key: priv
    ip: 10.0.0.2
    peers:
      - endpoint: "[2001:db8::1]:51820"
        public-key: pub
  - name: hy2-stash
    type: hysteria2
    server: hy2.example.com
    port: 443
    auth: stash-auth
    up-speed: 50
    down-speed: 200
  - name: vl-grpc
    type: vless
    server: v.example.com
    port: 443
    uuid: 11111111-1111-1111-1111-111111111111
    tls: true
    network: grpc
    grpc-opts:
      grpc-service-name: clash-svc
  - name: vm-lower-ws
    type: vmess
    server: vm.example.com
    port: 443
    uuid: 11111111-1111-1111-1111-111111111111
    tls: true
    network: ws
    ws-opts:
      path: /ws
      headers:
        host: lower.example.com
`;
        const nodes = parse(clashYaml);
        expect(nodes).toHaveLength(4);
        expect(nodes[0].server).toBe('2001:db8::1');
        expect(nodes[0].port).toBe(51820);
        expect(nodes[1].password).toBe('stash-auth');
        expect(nodes[1].up).toBe(50);
        expect(nodes[1].down).toBe(200);

        const uriOut = await convert([nodes[2], nodes[3]], 'URI');
        expect(uriOut).toContain('serviceName=clash-svc');
        const vmessB64 = uriOut.split('\n')[1].replace('vmess://', '');
        const vmessJson = JSON.parse(Buffer.from(vmessB64, 'base64').toString('utf8'));
        expect(vmessJson.host).toBe('lower.example.com');

        const clashOut = await convert([nodes[3]], 'ClashMeta');
        const reparsedClash = yaml.load(clashOut) as { proxies: any[] };
        expect(reparsedClash.proxies[0]['ws-opts'].headers).toEqual({ Host: 'lower.example.com' });
    });

    it('SIP008: should normalize simple-obfs/obfs-local plugin and string plugin_opts', () => {
        const sip008 = JSON.stringify({
            version: 1,
            servers: [
                {
                    id: '1',
                    remarks: 'SIP-Obfs',
                    server: '1.2.3.4',
                    server_port: 8388,
                    method: 'aes-128-gcm',
                    password: 'pw',
                    plugin: 'obfs-local',
                    plugin_opts: 'obfs=http;obfs-host=www.bing.com',
                    udp_over_tcp: true
                }
            ]
        });
        const nodes = parse(sip008);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].plugin).toBe('obfs');
        expect(nodes[0]['plugin-opts']).toEqual({ mode: 'http', host: 'www.bing.com' });
        expect(nodes[0]['udp-over-tcp']).toBe(true);
    });
});
