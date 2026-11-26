import { describe, expect, it } from 'vitest';
import { convert, parse, process } from '../../index';
import { detectFormat } from '../../parser/format-detector';

describe('Full parse -> process -> convert Pipeline', () => {
    const sampleSingboxConfig = JSON.stringify({
        outbounds: [
            { type: 'direct', tag: 'direct' },
            { type: 'selector', tag: 'proxy', outbounds: ['HK-VLESS-Reality'] },
            {
                type: 'vless',
                tag: 'HK-VLESS-Reality',
                server: 'hk.example.com',
                server_port: 443,
                uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                flow: 'xtls-rprx-vision',
                packet_encoding: 'xudp',
                tls: {
                    enabled: true,
                    server_name: 'www.microsoft.com',
                    utls: { enabled: true, fingerprint: 'chrome' },
                    reality: {
                        enabled: true,
                        public_key: 'reality-pub-key-123',
                        short_id: 'abcd1234'
                    }
                }
            },
            {
                type: 'anytls',
                tag: 'JP-AnyTLS',
                server: 'jp.example.com',
                server_port: 8443,
                password: 'anytls-secret',
                idle_session_check_interval: '30s',
                idle_session_timeout: '60s',
                min_idle_session: 2,
                tls: {
                    enabled: true,
                    server_name: 'jp.example.com',
                    insecure: false
                }
            },
            {
                type: 'vless',
                tag: 'US-VLESS-ECH',
                server: 'us.example.com',
                server_port: 443,
                uuid: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
                tls: {
                    enabled: true,
                    server_name: 'us.example.com',
                    utls: { enabled: true, fingerprint: 'safari' },
                    ech: {
                        enabled: true,
                        config: ['AEj+DQBEAQAgAC...'],
                        query_server_name: 'ech.example.com'
                    }
                },
                transport: {
                    type: 'splithttp',
                    mode: 'auto',
                    path: '/xhttp',
                    host: 'cdn.example.com'
                }
            },
            {
                type: 'hysteria2',
                tag: 'SG-Hy2',
                server: 'sg.example.com',
                server_port: 443,
                password: 'hy2-password',
                up_mbps: 100,
                down_mbps: 200,
                obfs: { type: 'salamander', password: 'obfs-pass' },
                tls: {
                    enabled: true,
                    server_name: 'sg.example.com'
                }
            },
            {
                type: 'shadowsocks',
                tag: 'TW-SS-Duplicate',
                server: 'tw.example.com',
                server_port: 8388,
                method: '2022-blake3-aes-128-gcm',
                password: 'ss-password'
            },
            {
                type: 'shadowsocks',
                tag: 'TW-SS',
                server: 'tw.example.com',
                server_port: 8388,
                method: '2022-blake3-aes-128-gcm',
                password: 'ss-password'
            }
        ]
    });

    it('should detect and parse sing-box JSON outbounds accurately', () => {
        expect(detectFormat(sampleSingboxConfig)).toBe('singbox');

        const nodes = parse(sampleSingboxConfig);
        // direct and selector should be ignored; 6 proxy outbounds remain
        expect(nodes).toHaveLength(6);

        const realityNode = nodes.find((n) => n.name === 'HK-VLESS-Reality');
        expect(realityNode).toBeDefined();
        expect(realityNode?.type).toBe('vless');
        expect(realityNode?.['reality-opts']?.['public-key']).toBe('reality-pub-key-123');
        expect(realityNode?.['packet-encoding']).toBe('xudp');

        const anytlsNode = nodes.find((n) => n.name === 'JP-AnyTLS');
        expect(anytlsNode).toBeDefined();
        expect(anytlsNode?.type).toBe('anytls');
        expect(anytlsNode?.['min-idle-session']).toBe(2);

        const echNode = nodes.find((n) => n.name === 'US-VLESS-ECH');
        expect(echNode).toBeDefined();
        expect(echNode?.network).toBe('xhttp');
        expect(echNode?.['xhttp-opts']?.path).toBe('/xhttp');
        expect((echNode?.['ech-opts'] as any)?.['config-list']).toEqual(['AEj+DQBEAQAgAC...']);
        expect((echNode?.['ech-opts'] as any)?.['query-server-name']).toBe('ech.example.com');
    });

    it('should process nodes with filtering, dedupe, rename, prependSubName, and sort', async () => {
        const parsed = parse(sampleSingboxConfig);

        const processedAsc = await process(
            parsed,
            {
                dedupe: true,
                exclude: 'SG-Hy2',
                rename: 'HK-@香港 | \nJP-@日本 | ',
                prependSubName: true,
                sort: 'asc'
            },
            'MySub'
        );

        // SG-Hy2 excluded, TW-SS-Duplicate deduped (shorter TW-SS kept) -> 4 nodes
        expect(processedAsc).toHaveLength(4);
        const namesAsc = processedAsc.map((n) => n.name);
        expect(namesAsc).toEqual([...namesAsc].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
        expect(namesAsc.some((n) => n.startsWith('MySub - '))).toBe(true);
        expect(namesAsc.some((n) => n.includes('SG-Hy2'))).toBe(false);
        expect(namesAsc.some((n) => n.includes('TW-SS-Duplicate'))).toBe(false);

        const processedDesc = await process(parsed, { dedupe: true, sort: 'desc' });
        const namesDesc = processedDesc.map((n) => n.name);
        expect(namesDesc).toEqual(
            [...namesDesc].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
        );
    });

    it('should convert processed nodes to sing-box 1.12 format with ECH config & REALITY mutual exclusion', async () => {
        const nodes = parse(sampleSingboxConfig);
        const processed = await process(nodes, { dedupe: true });

        // Inject conflicting ech-opts onto Reality node to verify mutual exclusion
        const realityNode = processed.find((n) => n.name === 'HK-VLESS-Reality')!;
        realityNode['ech-opts'] = { 'config-list': ['should-be-ignored'] };

        const singboxOut = JSON.parse(await convert(processed, 'singbox'));
        const realityOut = singboxOut.outbounds.find((o: any) => o.tag === 'HK-VLESS-Reality');
        expect(realityOut.tls.reality.enabled).toBe(true);
        expect(realityOut.tls.ech).toBeUndefined();

        const echOut = singboxOut.outbounds.find((o: any) => o.tag === 'US-VLESS-ECH');
        expect(echOut.tls.ech).toEqual({
            enabled: true,
            config: ['AEj+DQBEAQAgAC...'],
            query_server_name: 'ech.example.com'
        });
        expect(echOut.transport.type).toBe('splithttp');
    });

    it('should roundtrip across ClashMeta, Loon, Surge, Egern, and URI', async () => {
        const nodes = await process(parse(sampleSingboxConfig), { dedupe: true, sort: 'asc' });

        const clashYaml = await convert(nodes, 'ClashMeta');
        expect(clashYaml).toContain('type: vless');
        expect(clashYaml).toContain('type: anytls');
        expect(clashYaml).toContain('type: hysteria2');

        const loonConf = await convert(nodes, 'Loon');
        expect(loonConf).toContain('=anytls,');
        expect(loonConf).toContain('=Hysteria2,');

        const surgeConf = await convert(nodes, 'Surge');
        expect(surgeConf).toContain('=hysteria2,');
        expect(surgeConf).toContain('=anytls,');

        const egernYaml = await convert(nodes, 'Egern');
        expect(egernYaml).toContain('"type":"anytls"');
        expect(egernYaml).toContain('"type":"vless"');

        const uriList = await convert(nodes, 'URI');
        const reparsed = parse(uriList);
        expect(reparsed.length).toBeGreaterThanOrEqual(4);
    });

    it('should support Surfboard VLESS + underlying-proxy, QX ws-opts.host fallback, and ClashMeta global ECH', async () => {
        const vlessWsNode = {
            id: 'sb-vless',
            type: 'vless' as const,
            name: 'SB-VLESS-WS',
            server: 'vless.example.com',
            port: 443,
            uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            network: 'ws' as const,
            tls: true,
            sni: 'vless.example.com',
            'ws-opts': { path: '/ws', host: 'cdn.example.com' },
            'underlying-proxy': 'RelayProxy',
            udp: true
        };

        const surfboardConf = await convert([vlessWsNode], 'Surfboard');
        expect(surfboardConf).toContain('SB-VLESS-WS=vless,vless.example.com,443,username=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
        expect(surfboardConf).toContain('ws=true');
        expect(surfboardConf).toContain('underlying-proxy=RelayProxy');

        const qxConf = await convert([vlessWsNode], 'QuantumultX');
        expect(qxConf).toContain('obfs-host=cdn.example.com');
        expect(qxConf).toContain('obfs-uri=/ws');

        const trojanEchNode = {
            id: 'tr-ech',
            type: 'trojan' as const,
            name: 'Trojan-ECH',
            server: 'tr.example.com',
            port: 443,
            password: 'pwd',
            tls: true,
            'ech-opts': { config: ['AEj+DQBEAQAgAC...'], 'query-server-name': 'dns.example.com' } as any
        };
        const clashYaml = await convert([trojanEchNode], 'ClashMeta');
        expect(clashYaml).toContain('ech-opts:');
        expect(clashYaml).toContain('enable: true');
        expect(clashYaml).toContain('config-list:');
        expect(clashYaml).toContain('query-server-name: dns.example.com');

        const rocketYaml = await convert([trojanEchNode], 'Shadowrocket');
        expect(rocketYaml).toContain('config-list:');
    });

    it('should support Loon XHTTP + boolean block-quic, Surge client-fingerprint, and Egern gRPC service-name fallback', async () => {
        const xhttpNode = {
            id: 'loon-xhttp',
            type: 'vless' as const,
            name: 'Loon-XHTTP',
            server: 'xhttp.example.com',
            port: 443,
            uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            network: 'xhttp' as const,
            tls: true,
            sni: 'xhttp.example.com',
            'xhttp-opts': { path: '/xh', host: 'cdn.example.com', mode: 'packet-up' },
            'block-quic': true as any,
            'client-fingerprint': 'apple-26'
        };

        const loonConf = await convert([xhttpNode], 'Loon');
        expect(loonConf).toContain('transport=xhttp');
        expect(loonConf).toContain('path=/xh');
        expect(loonConf).toContain('host=cdn.example.com');
        expect(loonConf).toContain('xhttp-mode=packet-up');
        expect(loonConf).toContain('block-quic=true');

        const surgeConf = await convert([xhttpNode], 'Surge');
        expect(surgeConf).toContain('client-fingerprint=apple-26');

        const grpcNode = {
            id: 'egern-grpc',
            type: 'vless' as const,
            name: 'Egern-gRPC',
            server: 'grpc.example.com',
            port: 443,
            uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            network: 'grpc' as const,
            tls: true,
            'grpc-opts': { 'service-name': 'my-grpc-svc' }
        };
        const egernYaml = await convert([grpcNode], 'Egern');
        expect(egernYaml).toContain('"service_name":"my-grpc-svc"');
    });
});

describe('2026 Protocol & Parameter Round-trip Coverage', () => {
    it('should detect and parse Surge config with [Proxy] header, positional auth, snell v6, and tuic-v5', async () => {
        const surgeConf = `
[Proxy]
HTTP-Pos = http, 1.2.3.4, 8080, myuser, mypass, underlying-proxy=Relay, block-quic=on, ip-version=v4-only
Snell-V6 = snell, snell.example.com, 443, psk=snell-psk, version=6, mode=unshaped, quic-proxy-mode=true, userkey=uk123, reuse=true
TUIC-V5 = tuic-v5, tuic.example.com, 443, uuid=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11, password="secret", disable-sni=true, reduce-rtt=true
Trojan-gRPC = trojan, tr.example.com, 443, password="trpwd", grpc=true, grpc-service-name=trsvc, sni=tr.example.com
`;
        expect(detectFormat(surgeConf)).toBe('surge');
        const nodes = parse(surgeConf);
        expect(nodes).toHaveLength(4);

        const httpNode = nodes.find((n) => n.name === 'HTTP-Pos');
        expect(httpNode?.username).toBe('myuser');
        expect(httpNode?.password).toBe('mypass');
        expect(httpNode?.['underlying-proxy']).toBe('Relay');
        expect(httpNode?.['block-quic']).toBe(true);
        expect(httpNode?.['ip-version']).toBe('ipv4');

        const snellNode = nodes.find((n) => n.name === 'Snell-V6');
        expect(snellNode?.version).toBe(6);
        expect(snellNode?.mode).toBe('unshaped');
        expect(snellNode?.['quic-proxy-mode']).toBe(true);
        expect(snellNode?.userkey).toBe('uk123');
        expect(snellNode?.reuse).toBe(true);

        const tuicNode = nodes.find((n) => n.name === 'TUIC-V5');
        expect(tuicNode?.version).toBe(5);
        expect(tuicNode?.['disable-sni']).toBe(true);
        expect(tuicNode?.['reduce-rtt']).toBe(true);

        const trNode = nodes.find((n) => n.name === 'Trojan-gRPC');
        expect(trNode?.network).toBe('grpc');
        expect(trNode?.['grpc-opts']?.['grpc-service-name']).toBe('trsvc');

        // Round-trip back to Surge, Singbox, and Loon
        const surgeOut = await convert(nodes, 'Surge');
        expect(surgeOut).toContain('quic-proxy-mode=true');
        expect(surgeOut).toContain('userkey=uk123');
        expect(surgeOut).toContain('disable-sni=true');
        expect(surgeOut).toContain('grpc=true,grpc-service-name=trsvc');

        const sbOut = JSON.parse(await convert([trNode!], 'Singbox'));
        expect(sbOut.outbounds[0].transport.type).toBe('grpc');
        expect(sbOut.outbounds[0].transport.service_name).toBe('trsvc');

        const loonOut = await convert([trNode!, tuicNode!, httpNode!], 'Loon');
        expect(loonOut).toContain('transport=grpc,path=trsvc');
        expect(loonOut).toContain('reduce-rtt=true,disable-sni=true');
        expect(loonOut).toContain('underlying-proxy=Relay');
    });

    it('should detect and parse Loon config with xhttp, positional auth, server-ports, server-dns, and ip-mode', () => {
        const loonConf = `
[Proxy]
Loon-XHTTP = vless, xh.example.com, 443, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", transport=xhttp, path=/xh, host=cdn.example.com, xhttp-mode=stream-one, over-tls=true, tls-name=xh.example.com, tls-pubkey-sha256=pkhash, block-quic=true, ip-mode=prefer-v6, server-dns="1.1.1.1,8.8.8.8", underlying-proxy=Chain
Loon-HTTP = https, http.example.com, 443, u1, "p1", tls-name=http.example.com
Loon-Hy2 = Hysteria2, hy2.example.com, 443, "hy2pass", server-ports="10000-20000", hop-interval=30, download-bandwidth=500, salamander-password=sal, tls-name=hy2.example.com
`;
        expect(detectFormat(loonConf)).toBe('loon');
        const nodes = parse(loonConf);
        expect(nodes).toHaveLength(3);

        const xhttp = nodes[0];
        expect(xhttp.network).toBe('xhttp');
        expect(xhttp['xhttp-opts']).toEqual({ path: '/xh', host: 'cdn.example.com', mode: 'stream-one' });
        expect(xhttp['tls-pubkey-sha256']).toBe('pkhash');
        expect(xhttp['block-quic']).toBe(true);
        expect(xhttp['ip-version']).toBe('ipv6-prefer');
        expect(xhttp['server-dns']).toEqual(['1.1.1.1', '8.8.8.8']);
        expect(xhttp['underlying-proxy']).toBe('Chain');

        const http = nodes[1];
        expect(http.type).toBe('https');
        expect(http.username).toBe('u1');
        expect(http.password).toBe('p1');

        const hy2 = nodes[2];
        expect(hy2.ports).toBe('10000-20000');
        expect(hy2['hop-interval']).toBe(30);
        expect(hy2.down).toBe('500');
        expect(hy2.obfs).toBe('salamander');
        expect(hy2['obfs-password']).toBe('sal');
    });

    it('should parse Clash ech-opts, sing-box endpoints, and filter by proto:ech / proto:xhttp', async () => {
        const clashYaml = `
proxies:
  - name: Clash-ECH
    type: vless
    server: ech.example.com
    port: 443
    uuid: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
    tls: true
    network: xhttp
    xhttp-opts:
      mode: auto
      path: /x
      host: h.example.com
    ech-opts:
      enable: true
      config-list:
        - AEj+DQBEAQAgAC...
      query-server-name: dns.example.com
  - name: Clash-Plain
    type: trojan
    server: tr.example.com
    port: 443
    password: pwd
`;
        expect(detectFormat(clashYaml)).toBe('clash');
        const clashNodes = parse(clashYaml);
        expect(clashNodes).toHaveLength(2);
        expect(clashNodes[0]['ech-opts']?.['query-server-name']).toBe('dns.example.com');
        expect(clashNodes[0].network).toBe('xhttp');

        const echOnly = await process(clashNodes, { includeRules: ['proto:ech'] });
        expect(echOnly).toHaveLength(1);
        expect(echOnly[0].name).toBe('Clash-ECH');

        const xhttpOnly = await process(clashNodes, { includeRules: ['proto:xhttp'] });
        expect(xhttpOnly).toHaveLength(1);
        expect(xhttpOnly[0].name).toBe('Clash-ECH');

        // sing-box 1.11+ endpoints + snell outbound
        const sbConfig = JSON.stringify({
            endpoints: [
                {
                    type: 'wireguard',
                    tag: 'SB-WG-Endpoint',
                    local_address: ['10.0.0.2/32'],
                    private_key: 'priv',
                    peers: [{ server: 'wg.example.com', port: 51820, public_key: 'pub', allowed_ips: ['0.0.0.0/0'] }]
                }
            ],
            outbounds: [
                {
                    type: 'snell',
                    tag: 'SB-Snell',
                    server: 'snell.example.com',
                    server_port: 443,
                    psk: 'psk1',
                    version: 6,
                    mode: 'unshaped',
                    quic_proxy_mode: true
                }
            ]
        });
        expect(detectFormat(sbConfig)).toBe('singbox');
        const sbNodes = parse(sbConfig);
        expect(sbNodes).toHaveLength(2);
        const wgEp = sbNodes.find((n) => n.name === 'SB-WG-Endpoint');
        const snellOb = sbNodes.find((n) => n.name === 'SB-Snell');
        expect(wgEp?.type).toBe('wireguard');
        expect(snellOb?.type).toBe('snell');
        expect(snellOb?.['quic-proxy-mode']).toBe(true);
    });

    it('should parse QX shadowsocksr and tls-pubkey-sha256', () => {
        const qxConf = `
shadowsocksr=ssr.example.com:8388,method=aes-256-cfb,password=pass,ssr-protocol=auth_aes128_md5,obfs=tls1.2_ticket_auth,tag=QX-SSR
vless=vl.example.com:443,method=none,password=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11,over-tls=true,tls-pubkey-sha256=pubhash,tag=QX-VLESS
`;
        expect(detectFormat(qxConf)).toBe('qx');
        const nodes = parse(qxConf);
        expect(nodes).toHaveLength(2);
        expect(nodes[0].type).toBe('ssr');
        expect(nodes[0].name).toBe('QX-SSR');
        expect(nodes[1]['tls-pubkey-sha256']).toBe('pubhash');
    });

    it('should parse full multi-section Surge/Loon .conf files and Surge WireGuard sections', async () => {
        const fullSurgeConf = `
[General]
loglevel = notify
skip-proxy = 127.0.0.1, 192.168.0.0/16
dns-server = 1.1.1.1, 8.8.8.8

[Proxy]
Surge-VLESS = vless, 1.2.3.4, 443, username=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11, reality-public-key=pbk1, reality-short-id=sid1, reality-spider-x=/spx, sni=www.example.com
Surge-WG = wireguard, section-name=WG1

[WireGuard WG1]
private-key = privKey123
self-ip = 10.0.0.2
dns-server = 1.1.1.1
mtu = 1420
peer = (public-key = pubKey456, allowed-ips = "0.0.0.0/0, ::/0", endpoint = [2001:db8::1]:51820, keepalive = 25, client-id = 1/2/3)

[Proxy Group]
Proxy = select, Surge-VLESS, Surge-WG, DIRECT

[Rule]
FINAL,Proxy
`;
        expect(detectFormat(fullSurgeConf)).toBe('surge');
        const surgeNodes = parse(fullSurgeConf);
        expect(surgeNodes).toHaveLength(2);

        const vl = surgeNodes.find((n) => n.name === 'Surge-VLESS')!;
        expect(vl['reality-opts']?.['spider-x']).toBe('/spx');
        expect(vl['reality-opts']?.['_spider-x']).toBe('/spx');

        const wg = surgeNodes.find((n) => n.name === 'Surge-WG')!;
        expect(wg.server).toBe('2001:db8::1');
        expect(wg.port).toBe(51820);
        expect(wg['private-key']).toBe('privKey123');
        expect(wg['public-key']).toBe('pubKey456');
        expect(wg.ip).toBe('10.0.0.2');
        expect(wg.reserved).toEqual([1, 2, 3]);

        // Re-convert WireGuard with IPv6 endpoint to Loon, Surge, sing-box
        const loonWg = await convert([wg], 'loon');
        expect(loonWg).toContain('endpoint=[2001:db8::1]:51820');
        const surgeWgOut = await convert([wg], 'surge');
        expect(surgeWgOut).toContain('endpoint = [2001:db8::1]:51820');
        const sbWgOut = JSON.parse(await convert([wg], 'singbox'));
        expect(sbWgOut.outbounds[0].peers[0].server).toBe('2001:db8::1');
        expect(sbWgOut.outbounds[0].peers[0].server_port).toBe(51820);
        // Re-parse Loon IPv6 WG
        const reparsedLoonWg = parse(loonWg);
        expect(reparsedLoonWg[0].server).toBe('2001:db8::1');
        expect(reparsedLoonWg[0].port).toBe(51820);

        const fullLoonConf = `
[General]
skip-proxy = 192.168.0.0/16, 10.0.0.0/8

[Proxy]
Loon-SS-Obfs = shadowsocks, 1.2.3.4, 443, aes-256-gcm, "pass", obfs-name=http, obfs-host=obfs.example.com, obfs-uri=/ws
Loon-AnyTLS = anytls, 1.2.3.5, 443, "secret", tls-name=any.example.com, underlying-proxy=Loon-SS-Obfs

[Rule]
FINAL,DIRECT
`;
        expect(detectFormat(fullLoonConf)).toBe('loon');
        const loonNodes = parse(fullLoonConf);
        expect(loonNodes).toHaveLength(2);
        expect(loonNodes[0].plugin).toBe('obfs');
        expect(loonNodes[0]['plugin-opts']).toEqual({ mode: 'http', host: 'obfs.example.com', path: '/ws' });
        expect(loonNodes[1]['underlying-proxy']).toBe('Loon-SS-Obfs');
        const loonAnyTlsOut = await convert([loonNodes[1]], 'loon');
        expect(loonAnyTlsOut).toContain('underlying-proxy=Loon-SS-Obfs');
    });

    it('should handle sing-box 1.11+ endpoints address/peers.address, Surfboard fingerprint, Clash fingerprint, and URI ech normalization', async () => {
        const sbEndpoint111 = JSON.stringify({
            endpoints: [
                {
                    type: 'wireguard',
                    tag: 'SB-111-WG',
                    address: ['10.0.0.5/32', 'fd00::5/128'],
                    private_key: 'priv111',
                    peers: [
                        {
                            address: 'wg111.example.com',
                            port: 51820,
                            public_key: 'pub111',
                            allowed_ips: ['0.0.0.0/0']
                        }
                    ]
                }
            ]
        });
        expect(detectFormat(sbEndpoint111)).toBe('singbox');
        const sbNodes = parse(sbEndpoint111);
        expect(sbNodes).toHaveLength(1);
        expect(sbNodes[0].server).toBe('wg111.example.com');
        expect(sbNodes[0].port).toBe(51820);
        expect(sbNodes[0].ip).toBe('10.0.0.5/32');
        expect(sbNodes[0].ipv6).toBe('fd00::5/128');

        // Surfboard should not put client-fingerprint into server-cert-fingerprint-sha256
        const vlessNode = parse('vless://a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11@1.2.3.4:443?security=tls&sni=example.com&fp=chrome&ech=1#VL-ECH');
        expect(vlessNode[0]._ech).toBe('1');
        const echFiltered = await process(vlessNode, { includeRules: ['proto:ech'] });
        expect(echFiltered).toHaveLength(1);
        const surfboardOut = await convert(vlessNode, 'surfboard');
        expect(surfboardOut).not.toContain('server-cert-fingerprint-sha256=chrome');

        // Clash fingerprint should map to tls-fingerprint, not client-fingerprint
        const clashCertFp = `
proxies:
  - name: Clash-CertFP
    type: trojan
    server: tr.example.com
    port: 443
    password: pass
    fingerprint: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
`;
        const clashNodes = parse(clashCertFp);
        expect(clashNodes[0]['tls-fingerprint']).toBe('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
        expect(clashNodes[0]['client-fingerprint']).toBeUndefined();
    });
});
