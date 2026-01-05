import { describe, it, expect } from 'vitest';
import { parseNodeUrl } from '../parsers/index';
import { toClash } from '../converter/clash-converter';
import { toSingBox } from '../converter/singbox-converter';
import { toSurge } from '../converter/surge-converter';
import { toLoon } from '../converter/loon-converter';
import { toQuantumultX } from '../converter/quantumultx-converter';
import { ProxyNode, VlessNode, VmessNode, Hysteria2Node, AnyTLSNode, SingBoxOutbound } from '../../shared/types';

describe('New Parser & Converter Architecture', () => {

    // --- Test Data ---
    const vlessRealityUrl = 'vless://uuid-1234@example.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=example.com&fp=chrome&pbk=76543210&sid=1234&spx=%2F&type=tcp&headerType=none#Test_VLESS_Reality';
    const vmessBase64Url = 'vmess://eyJ2IjoiMiIsInBzIjoiVGVzdF9WTWVzcyIsImFkZCI6IjguOC44LjgiLCJwb3J0IjoiNDQzIiwiaWQiOiJ1dWlkLTU2NzgiLCJhaWQiOiIwIiwic2N5IjoiYXV0byIsIm5ldCI6IndzIiwidHlwZSI6Im5vbmUiLCJob3N0IjoiaG9zdC5jb20iLCJwYXRoIjoiL3BhdGgiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJzbmkuY29tIn0=';
    const hysteria2Url = 'hysteria2://password@2.2.2.2:8443?insecure=1&obfs=salamander&obfs-password=obfspass&sni=hy2.com#Test_Hy2';
    const trojanUrl = 'trojan://password@3.3.3.3:443?security=tls&type=ws&path=%2Ftrojan&host=trojan.com&sni=trojan.com#Test_Trojan';
    const anytlsUrl = 'anytls://mypass@1.1.1.1:443?sni=example.com&insecure=1&idle_timeout=30#Test_AnyTLS';

    describe('Parsers', () => {
        it('should parse VLESS Reality correctly', () => {
            const node = parseNodeUrl(vlessRealityUrl);
            expect(node).not.toBeNull();
            if (!node) return;
            expect(node.type).toBe('vless');
            expect(node.name).toBe('Test_VLESS_Reality');
            expect(node.server).toBe('example.com');
            const vless = node as VlessNode;
            expect(vless.flow).toBe('xtls-rprx-vision');
            expect(vless.tls?.reality?.enabled).toBe(true);
            expect(vless.tls?.reality?.publicKey).toBe('76543210');
            expect(vless.tls?.reality?.shortId).toBe('1234');
        });

        it('should parse VMess Base64 correctly', () => {
            const node = parseNodeUrl(vmessBase64Url);
            expect(node).not.toBeNull();
            if (!node) return;
            expect(node.type).toBe('vmess');
            expect(node.name).toBe('Test_VMess');
            expect(node.server).toBe('8.8.8.8');
            const vmess = node as VmessNode;
            expect(vmess.uuid).toBe('uuid-5678');
            expect(vmess.transport?.type).toBe('ws');
            expect(vmess.transport?.headers?.Host).toBe('host.com');
            expect(vmess.tls?.enabled).toBe(true);
            expect(vmess.tls?.serverName).toBe('sni.com');
        });

        it('should parse Hysteria 2 correctly', () => {
            const node = parseNodeUrl(hysteria2Url);
            expect(node).not.toBeNull();
            if (!node) return;
            expect(node.type).toBe('hysteria2');
            const hy2 = node as Hysteria2Node;
            expect(hy2.password).toBe('password');
            expect(hy2.obfs?.type).toBe('salamander');
            expect(hy2.tls?.insecure).toBe(true);
        });

        it('should parse AnyTLS correctly', () => {
            const node = parseNodeUrl(anytlsUrl);
            expect(node).not.toBeNull();
            if (!node) return;
            expect(node.type).toBe('anytls');
            const anytls = node as AnyTLSNode;
            expect(anytls.password).toBe('mypass');
            expect(anytls.tls?.serverName).toBe('example.com');
            expect(anytls.idleTimeout).toBe(30);
        });
    });

    describe('Converters', () => {
        let nodes: ProxyNode[] = [];

        // Parse all before testing conversion
        const urls = [vlessRealityUrl, vmessBase64Url, hysteria2Url, trojanUrl, anytlsUrl];

        it('should prepare nodes', () => {
            nodes = urls.map(u => parseNodeUrl(u)).filter((n): n is ProxyNode => n !== null);
            expect(nodes.length).toBe(5);
        });

        it('should convert to Clash Meta', () => {
            const config = toClash(nodes);
            // expect(config).toMatch(/proxies:/);
            expect(config).toMatch(/name:\s*"?Test_VLESS_Reality"?/);
            expect(config).toMatch(/type:\s*vless/);
            expect(config).toMatch(/reality-opts/);
            expect(config).toMatch(/public-key:\s*['"]?76543210['"]?/);
            expect(config).toMatch(/short-id:\s*['"]?1234['"]?/);
        });

        it('should convert to Sing-Box', () => {
            const configStr = toSingBox(nodes);
            const config = JSON.parse(configStr);
            expect(config.outbounds).toBeDefined();

            const vlessOut = (config.outbounds as SingBoxOutbound[]).find(o => o.tag === 'Test_VLESS_Reality');
            expect(vlessOut).toBeDefined();
            if (!vlessOut) return;
            expect(vlessOut.type).toBe('vless');
            expect(vlessOut.tls?.reality?.enabled).toBe(true);
            expect(vlessOut.tls?.reality?.public_key).toBe('76543210');

            const hy2Out = (config.outbounds as SingBoxOutbound[]).find(o => o.tag === 'Test_Hy2');
            expect(hy2Out).toBeDefined();
            if (!hy2Out) return;
            const obfs = hy2Out.obfs;
            expect(typeof obfs === 'object' ? obfs?.type : '').toBe('salamander');

            const anytlsOut = (config.outbounds as SingBoxOutbound[]).find(o => o.tag === 'Test_AnyTLS');
            expect(anytlsOut).toBeDefined();
            if (!anytlsOut) return;
            expect(anytlsOut.type).toBe('anytls');
            expect(anytlsOut.idle_timeout).toBe(30);
        });

        it('should convert to Surge', () => {
            const config = toSurge(nodes);
            expect(config).toMatch(/Test_VMess\s*=\s*vmess/);
            expect(config).toMatch(/Test_Hy2\s*=\s*hysteria2/);
            expect(config).toMatch(/Test_Trojan\s*=\s*trojan/);
        });

        it('should convert to Loon', () => {
            const config = toLoon(nodes);
            expect(config).toMatch(/Test_VLESS_Reality\s*=\s*VLESS/);
            expect(config).toMatch(/public-key:76543210/);
            expect(config).toMatch(/Test_Hy2\s*=\s*Hysteria2/);
        });

        it('should convert to QuantumultX', () => {
            const config = toQuantumultX(nodes);
            expect(config).toMatch(/vmess=8\.8\.8\.8:443/);
            expect(config).toMatch(/trojan=3\.3\.3\.3:443/);
            expect(config).not.toMatch(/hysteria2=/);
        });

    });
});
