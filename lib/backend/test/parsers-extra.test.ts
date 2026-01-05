import { describe, it, expect } from 'vitest';
import { SubscriptionParser } from '../subscription-parser';
import { buildNodeUrl } from '../url-builder';
import { encodeBase64 } from '../converter/base64';
import { ShadowsocksNode, ShadowsocksRNode, SnellNode } from '../../shared/types';

describe('Additional Parsers (SIP008, SSR)', () => {
    const parser = new SubscriptionParser();

    describe('SIP008 (Shadowsocks JSON)', () => {
        it('should parse SIP008 JSON content correctly', () => {
            const sip008Content = JSON.stringify({
                version: 1,
                servers: [
                    {
                        remarks: "Test SIP008",
                        server: "1.2.3.4",
                        server_port: 8388,
                        method: "aes-256-gcm",
                        password: "test-password",
                        plugin: "obfs-local",
                        plugin_opts: "obfs=http;obfs-host=www.google.com"
                    }
                ]
            });

            const nodes = parser.parse(sip008Content);
            expect(nodes.length).toBe(1);
            const ssNode = nodes[0] as ShadowsocksNode;
            expect(ssNode.name).toBe('Test SIP008');
            expect(ssNode.server).toBe('1.2.3.4');
            expect(ssNode.port).toBe(8388);
            expect(ssNode.cipher).toBe('aes-256-gcm');
            expect(ssNode.password).toBe('test-password');
        });

        it('should parse VMess-style Shadowsocks JSON correctly', () => {
            const ssData = {
                ps: "VMess Style SS",
                add: "5.6.7.8",
                port: 8443,
                scy: "chacha20-poly1305",
                id: "uuid-pass"
            };
            const vmessStyleSS = "ss://" + encodeBase64(JSON.stringify(ssData));

            const nodes = parser.parse(vmessStyleSS);
            expect(nodes.length).toBe(1);
            const ssNode = nodes[0] as ShadowsocksNode;
            expect(ssNode.name).toBe('VMess Style SS');
            expect(ssNode.server).toBe('5.6.7.8');
            expect(ssNode.port).toBe(8443);
            expect(ssNode.cipher).toBe('chacha20-poly1305');
            expect(ssNode.password).toBe('uuid-pass');
        });
    });

    describe('SSR (ShadowsocksR)', () => {
        it('should parse and rebuild SSR URL correctly', () => {
            const password = 'testpass';
            const remarks = 'SSR测试节点';
            const protoparam = 'param1';
            const obfsparam = 'param2';

            const ssrMainPart = `1.2.3.4:8388:auth_aes128_md5:aes-128-cfb:tls1.2_ticket_auth:${encodeBase64(password)}`;
            const ssrQuery = `?remarks=${encodeBase64(remarks)}&protoparam=${encodeBase64(protoparam)}&obfsparam=${encodeBase64(obfsparam)}`;
            const ssrUrl = `ssr://${encodeBase64(ssrMainPart + ssrQuery)}`;

            const nodes = parser.parse(ssrUrl);
            expect(nodes.length).toBe(1);
            const node = nodes[0] as ShadowsocksRNode;
            expect(node.type).toBe('ssr');
            expect(node.name).toBe(remarks);
            expect(node.server).toBe('1.2.3.4');
            expect(node.port).toBe(8388);
            expect(node.protocol).toBe('auth_aes128_md5');
            expect(node.cipher).toBe('aes-128-cfb');
            expect(node.obfs).toBe('tls1.2_ticket_auth');
            expect(node.password).toBe(password);
            expect(node.protocolParam).toBe(protoparam);
            expect(node.obfsParam).toBe(obfsparam);

            // Test Rebuild
            const rebuilt = buildNodeUrl(nodes[0]);
            expect(rebuilt.startsWith('ssr://')).toBe(true);

            const nodes2 = parser.parse(rebuilt);
            expect(nodes2[0].name).toBe(remarks);
            expect(nodes2[0].server).toBe('1.2.3.4');
        });
    });

    describe('Snell', () => {
        it('should parse and rebuild Snell URL correctly', () => {
            const snellUrl = 'snell://1.2.3.4:1234?psk=mypass&version=2&obfs=http&host=google.com#TestSnell';
            const nodes = parser.parse(snellUrl);

            expect(nodes.length).toBe(1);
            const node = nodes[0] as SnellNode; // Changed from 'as any'
            expect(node.type).toBe('snell');
            expect(node.server).toBe('1.2.3.4');
            expect(node.port).toBe(1234);
            expect(node.password).toBe('mypass');
            expect(node.version).toBe('2');
            expect(node.obfs?.type).toBe('http'); // Fixed obfs access
            expect(node.obfs?.host).toBe('google.com');
            expect(node.name).toBe('TestSnell');

            // Test Rebuild
            const rebuilt = buildNodeUrl(nodes[0]);
            expect(rebuilt).toContain('snell://');
            expect(rebuilt).toContain('psk=mypass');

            const nodes2 = parser.parse(rebuilt);
            expect((nodes2[0] as SnellNode).password).toBe('mypass');
        });
    });
});
