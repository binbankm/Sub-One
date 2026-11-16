import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index';
import { convert } from '../converter/index';
import { normalizeProxyNode } from '../parser/normalizer';
import yaml from 'js-yaml';
import type { ProxyNode } from '../types';

describe('Sub-Store Parity & Modern VLESS Reality Enhancements', () => {
    const UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const PUBKEY = 'W1q2E3r4T5y6U7i8O9p0A1s2D3f4G5h6J7k8L9z0X1c=';
    const SHORT_ID = '1a2b3c4d';

    describe('1. VLESS Reality URI Parsing with Modern Parameters', () => {
        it('should parse VLESS Reality with support-x25519mlkem768=true, packetEncoding=xudp, flow=xtls-rprx-vision', () => {
            const uri = `vless://${UUID}@vless.example.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=dest.example.com&fp=chrome&pbk=${encodeURIComponent(PUBKEY)}&sid=${SHORT_ID}&spx=%2F&type=tcp&headerType=none&support-x25519mlkem768=true&packetEncoding=xudp#Reality-Node-1`;
            const nodes = parse(uri);

            expect(nodes).toHaveLength(1);
            const node = nodes[0];

            expect(node.type).toBe('vless');
            expect(node.server).toBe('vless.example.com');
            expect(node.port).toBe(443);
            expect(node.uuid).toBe(UUID);
            expect(node.flow).toBe('xtls-rprx-vision');
            expect(node.tls).toBe(true);
            expect(node.sni).toBe('dest.example.com');
            expect(node['client-fingerprint']).toBe('chrome');
            expect(node['packet-encoding']).toBe('xudp');
            expect(node['reality-opts']).toBeDefined();
            expect(node['reality-opts']?.['public-key']).toBe(PUBKEY);
            expect(node['reality-opts']?.['short-id']).toBe(SHORT_ID);
            expect(node['reality-opts']?.['spider-x']).toBe('/');
            expect(node['reality-opts']?.['support-x25519mlkem768']).toBe(true);
        });

        it('should support various truthy representations for support-x25519mlkem768', () => {
            const cases = ['1', 't', 'T', 'true', 'TRUE', 'True'];
            for (const val of cases) {
                const uri = `vless://${UUID}@example.com:443?security=reality&pbk=${encodeURIComponent(PUBKEY)}&sid=${SHORT_ID}&support-x25519mlkem768=${val}#Node`;
                const [node] = parse(uri);
                expect(node['reality-opts']?.['support-x25519mlkem768']).toBe(true);
            }
        });

        it('should NOT set support-x25519mlkem768 when omitted or false', () => {
            const uriOmitted = `vless://${UUID}@example.com:443?security=reality&pbk=${encodeURIComponent(PUBKEY)}&sid=${SHORT_ID}#Node`;
            const [node1] = parse(uriOmitted);
            expect(node1['reality-opts']?.['support-x25519mlkem768']).toBeUndefined();

            const uriFalse = `vless://${UUID}@example.com:443?security=reality&pbk=${encodeURIComponent(PUBKEY)}&sid=${SHORT_ID}&support-x25519mlkem768=false#Node`;
            const [node2] = parse(uriFalse);
            expect(node2['reality-opts']?.['support-x25519mlkem768']).toBeUndefined();
        });

        it('should correctly parse packetEncoding values (xudp, packet, none)', () => {
            const uriXudp = `vless://${UUID}@example.com:443?packetEncoding=xudp#XUDP`;
            const [nodeXudp] = parse(uriXudp);
            expect(nodeXudp['packet-encoding']).toBe('xudp');

            const uriPacket = `vless://${UUID}@example.com:443?packetEncoding=packet#Packet`;
            const [nodePacket] = parse(uriPacket);
            expect(nodePacket['packet-encoding']).toBe('packetaddr');

            const uriNone = `vless://${UUID}@example.com:443?packetEncoding=none#None`;
            const [nodeNone] = parse(uriNone);
            expect(nodeNone['packet-encoding']).toBe('');
        });

        it('should support legacy xudp=1 and packet-addr=1 flags', () => {
            const uriXudpFlag = `vless://${UUID}@example.com:443?xudp=1#XUDP-Flag`;
            const [node1] = parse(uriXudpFlag);
            expect(node1['packet-encoding']).toBe('xudp');

            const uriPacketAddrFlag = `vless://${UUID}@example.com:443?packet-addr=1#PA-Flag`;
            const [node2] = parse(uriPacketAddrFlag);
            expect(node2['packet-encoding']).toBe('packetaddr');
        });
    });

    describe('2. Client Conversions for VLESS Reality with ML-KEM & PacketEncoding', () => {
        const baseNode: ProxyNode = {
            id: 'test-node-1',
            name: 'Reality-Node-1',
            type: 'vless',
            server: 'vless.example.com',
            port: 443,
            uuid: UUID,
            cipher: 'none',
            flow: 'xtls-rprx-vision',
            tls: true,
            sni: 'dest.example.com',
            'client-fingerprint': 'chrome',
            'packet-encoding': 'xudp',
            'reality-opts': {
                'public-key': PUBKEY,
                'short-id': SHORT_ID,
                'spider-x': '/',
                'support-x25519mlkem768': true
            }
        };

        it('2.1 ClashMeta / Mihomo: exports support-x25519mlkem768 and packet-encoding in YAML', async () => {
            const cmYaml = await convert([baseNode], 'clashmeta');
            const parsed = yaml.load(cmYaml) as any;
            expect(parsed.proxies).toHaveLength(1);

            const p = parsed.proxies[0];
            expect(p.type).toBe('vless');
            expect(p.server).toBe('vless.example.com');
            expect(p.port).toBe(443);
            expect(p.uuid).toBe(UUID);
            expect(p.flow).toBe('xtls-rprx-vision');
            expect(p.servername).toBe('dest.example.com');
            expect(p['client-fingerprint']).toBe('chrome');
            expect(p['packet-encoding']).toBe('xudp');
            expect(p['reality-opts']).toBeDefined();
            expect(p['reality-opts']['public-key']).toBe(PUBKEY);
            expect(p['reality-opts']['short-id']).toBe(SHORT_ID);
            expect(p['reality-opts']['spider-x']).toBe('/');
            expect(p['reality-opts']['support-x25519mlkem768']).toBe(true);

            // Re-parsing the ClashMeta YAML back into ProxyNode
            const reparsed = parse(cmYaml);
            expect(reparsed[0]['reality-opts']?.['support-x25519mlkem768']).toBe(true);
            expect(reparsed[0]['packet-encoding']).toBe('xudp');
        });

        it('2.2 Singbox: exports packet_encoding and reality tls settings', async () => {
            const sbJson = await convert([baseNode], 'singbox');
            const parsed = JSON.parse(sbJson);
            expect(parsed.outbounds).toHaveLength(1);

            const ob = parsed.outbounds[0];
            expect(ob.type).toBe('vless');
            expect(ob.server).toBe('vless.example.com');
            expect(ob.server_port).toBe(443);
            expect(ob.uuid).toBe(UUID);
            expect(ob.flow).toBe('xtls-rprx-vision');
            expect(ob.packet_encoding).toBe('xudp');
            expect(ob.tls.enabled).toBe(true);
            expect(ob.tls.reality.enabled).toBe(true);
            expect(ob.tls.reality.public_key).toBe(PUBKEY);
            expect(ob.tls.reality.short_id).toBe(SHORT_ID);
            expect(ob.tls.utls.enabled).toBe(true);
        });

        it('2.3 URI Roundtrip: retains support-x25519mlkem768=true and packetEncoding=xudp', async () => {
            const uri = await convert([baseNode], 'uri');
            expect(uri).toContain('vless://');
            expect(uri).toContain(`support-x25519mlkem768=true`);
            expect(uri).toContain(`packetEncoding=xudp`);
            expect(uri).toContain(`flow=xtls-rprx-vision`);
            expect(uri).toContain(`security=reality`);
            expect(uri).toContain(`sid=${SHORT_ID}`);

            // Parse back and verify exact preservation
            const [reparsed] = parse(uri);
            expect(reparsed.type).toBe('vless');
            expect(reparsed.flow).toBe('xtls-rprx-vision');
            expect(reparsed['packet-encoding']).toBe('xudp');
            expect(reparsed['reality-opts']?.['public-key']).toBe(PUBKEY);
            expect(reparsed['reality-opts']?.['short-id']).toBe(SHORT_ID);
            expect(reparsed['reality-opts']?.['spider-x']).toBe('/');
            expect(reparsed['reality-opts']?.['support-x25519mlkem768']).toBe(true);
        });

        it('2.4 Loon: maps support-x25519mlkem768 to tls-profile=chrome147 and exports Reality params', async () => {
            const loonOutput = await convert([baseNode], 'loon');
            expect(loonOutput).toContain('vless,vless.example.com,443');
            expect(loonOutput).toContain(`public-key="${PUBKEY}"`);
            expect(loonOutput).toContain(`short-id=${SHORT_ID}`);
            expect(loonOutput).toContain(`flow=xtls-rprx-vision`);
            expect(loonOutput).toContain('tls-profile=chrome147');

            // Safari/iOS fingerprint maps to safari-ios-26
            const safariNode: ProxyNode = {
                ...baseNode,
                'client-fingerprint': 'safari'
            };
            const safariLoon = await convert([safariNode], 'loon');
            expect(safariLoon).toContain('tls-profile=safari-ios-26');

            // Loon Re-parsing restores support-x25519mlkem768=true
            const [reparsedLoon] = parse(loonOutput);
            expect(reparsedLoon['reality-opts']?.['support-x25519mlkem768']).toBe(true);
        });

        it('2.5 Surge: exports valid VLESS line natively (without includeUnsupportedProxy)', async () => {
            const surgeOutput = await convert([baseNode], 'surge');
            expect(surgeOutput).toContain('Reality-Node-1=vless,vless.example.com,443');
            expect(surgeOutput).toContain(`username=${UUID}`);
            expect(surgeOutput).toContain('flow=xtls-rprx-vision');
            expect(surgeOutput).toContain(`reality-public-key=${PUBKEY}`);
            expect(surgeOutput).toContain(`reality-short-id=${SHORT_ID}`);
            expect(surgeOutput).toContain('sni="dest.example.com"');

            // Re-parsing Surge VLESS
            const [reparsedSurge] = parse(surgeOutput);
            expect(reparsedSurge.type).toBe('vless');
            expect(reparsedSurge.uuid).toBe(UUID);
            expect(reparsedSurge.flow).toBe('xtls-rprx-vision');
            expect(reparsedSurge['reality-opts']?.['public-key']).toBe(PUBKEY);
            expect(reparsedSurge['reality-opts']?.['short-id']).toBe(SHORT_ID);
        });

        it('2.6 Quantumult X: exports reality-base64-pubkey, vless-flow, and hex-encoded tls-alpn', async () => {
            const qxNode: ProxyNode = {
                ...baseNode,
                alpn: ['h2', 'http/1.1']
            };
            const qxOutput = await convert([qxNode], 'qx');
            expect(qxOutput).toContain(`vless=vless.example.com:443`);
            expect(qxOutput).toContain(`password=${UUID}`);
            expect(qxOutput).toContain(`reality-base64-pubkey=${PUBKEY}`);
            expect(qxOutput).toContain(`reality-hex-shortid=${SHORT_ID}`);
            expect(qxOutput).toContain(`vless-flow=xtls-rprx-vision`);
            expect(qxOutput).toContain(`obfs=over-tls`);
            // QX expects length-prefixed hex byte string: h2 -> 026832, http/1.1 -> 08687474702f312e31
            expect(qxOutput).toContain(`tls-alpn=02683208687474702f312e31`);

            // Re-parsing QX VLESS
            const [reparsedQx] = parse(qxOutput);
            expect(reparsedQx.type).toBe('vless');
            expect(reparsedQx.uuid).toBe(UUID);
            expect(reparsedQx.flow).toBe('xtls-rprx-vision');
            expect(reparsedQx['reality-opts']?.['public-key']).toBe(PUBKEY);
            expect(reparsedQx['reality-opts']?.['short-id']).toBe(SHORT_ID);
        });

        it('2.7 Shadowrocket: preserves support-x25519mlkem768 in reality-opts', async () => {
            const srYaml = await convert([baseNode], 'shadowrocket');
            const parsed = yaml.load(srYaml) as any;
            const p = parsed.proxies[0];
            expect(p['reality-opts']?.['support-x25519mlkem768']).toBe(true);
            expect(p['packet-encoding']).toBe('xudp');
        });

        it('2.8 Stash: inherits ClashMeta reality-opts with support-x25519mlkem768', async () => {
            const stashYaml = await convert([baseNode], 'stash');
            const parsed = yaml.load(stashYaml) as any;
            const p = parsed.proxies[0];
            expect(p['reality-opts']?.['support-x25519mlkem768']).toBe(true);
            expect(p['packet-encoding']).toBe('xudp');
        });

        it('2.9 Egern: uses user_id, transport.tls.reality, and flow', async () => {
            const egernOutput = await convert([baseNode], 'egern');
            expect(egernOutput).toContain('"type":"vless"');
            expect(egernOutput).toContain(`"user_id":"${UUID}"`);
            expect(egernOutput).not.toContain(`"uuid":"${UUID}"`);
            expect(egernOutput).toContain(`"flow":"xtls-rprx-vision"`);
            expect(egernOutput).toContain(`"public_key":"${PUBKEY}"`);
            expect(egernOutput).toContain(`"short_id":"${SHORT_ID}"`);
        });
    });

    describe('3. Edge Cases & Roundtripping', () => {
        it('should correctly format IPv6 servers in VLESS URI without duplicate brackets', async () => {
            const ipv6Node: ProxyNode = {
                id: 'ipv6-test',
                name: 'VLESS IPv6',
                type: 'vless',
                server: '2001:db8::1',
                port: 443,
                uuid: UUID,
                tls: true,
                'reality-opts': {
                    'public-key': PUBKEY,
                    'short-id': SHORT_ID,
                    'support-x25519mlkem768': true
                }
            };

            const uri = await convert([ipv6Node], 'uri');
            expect(uri).toContain(`vless://${UUID}@[2001:db8::1]:443`);

            const [reparsed] = parse(uri);
            expect(reparsed.server).toBe('2001:db8::1');
            expect(reparsed['reality-opts']?.['support-x25519mlkem768']).toBe(true);
        });

        it('should handle already-bracketed IPv6 servers without double bracketing in URI', async () => {
            const bracketedNode: ProxyNode = {
                id: 'bracketed-test',
                name: 'Bracketed IPv6',
                type: 'trojan',
                server: '[2001:db8::1]',
                port: 443,
                password: 'secret',
                tls: true
            };
            const uri = await convert([bracketedNode], 'uri');
            expect(uri).toContain('trojan://secret@[2001:db8::1]:443');
            expect(uri).not.toContain('[[2001:db8::1]]');
        });

        it('should parse Surge VLESS lines with gRPC and support-x25519mlkem768', () => {
            const surgeLine = `Surge-VLESS=vless,vless.example.com,443,username=${UUID},grpc=true,grpc-service-name=grpc-tun,reality-public-key=${PUBKEY},reality-short-id=${SHORT_ID},support-x25519mlkem768=true,sni=dest.com`;
            const [node] = parse(surgeLine);
            expect(node.type).toBe('vless');
            expect(node.network).toBe('grpc');
            expect(node['grpc-opts']?.['grpc-service-name']).toBe('grpc-tun');
            expect(node['reality-opts']?.['public-key']).toBe(PUBKEY);
            expect(node['reality-opts']?.['short-id']).toBe(SHORT_ID);
            expect(node['reality-opts']?.['support-x25519mlkem768']).toBe(true);
            expect(node['packet-encoding']).toBe('xudp');
        });

        it('should default VLESS URI packetEncoding to xudp when omitted (Sub-Store parity)', () => {
            const plainUri = `vless://${UUID}@example.com:443?security=reality&pbk=${encodeURIComponent(PUBKEY)}&sid=${SHORT_ID}#Plain-VLESS`;
            const [node] = parse(plainUri);
            expect(node['packet-encoding']).toBe('xudp');
        });

        it('should preserve hop-interval range (min and max) from Mihomo/ClashMeta', () => {
            const nodeWithRangeHop: ProxyNode = {
                id: 'hop-test',
                name: 'Hop Test',
                type: 'hysteria2',
                server: '1.2.3.4',
                port: 443,
                'hop-interval': '10-30' as any
            };

            const normalized = normalizeProxyNode(nodeWithRangeHop);
            expect(normalized['hop-interval']).toBe(10);
            expect(normalized['hop-interval-max']).toBe(30);
        });

        it('should handle Trojan with Reality and support-x25519mlkem768', async () => {
            const trojanUri = `trojan://secretpassword@trojan.example.com:443?security=reality&sni=sni.example.com&pbk=${encodeURIComponent(PUBKEY)}&sid=${SHORT_ID}&support-x25519mlkem768=true#Trojan-Reality`;
            const [node] = parse(trojanUri);
            expect(node.type).toBe('trojan');
            expect(node['reality-opts']?.['support-x25519mlkem768']).toBe(true);

            const cm = await convert([node], 'clashmeta');
            const parsed = yaml.load(cm) as any;
            expect(parsed.proxies[0]['reality-opts']['support-x25519mlkem768']).toBe(true);

            const roundtripUri = await convert([node], 'uri');
            expect(roundtripUri).toContain('support-x25519mlkem768=true');
        });
    });
});
