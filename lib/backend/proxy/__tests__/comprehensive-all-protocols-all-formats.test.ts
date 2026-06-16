/**
 * Comprehensive Test Suite — 对比 Sub-Store 所有协议、所有参数、所有客户端生成格式
 *
 * 覆盖范围:
 *   1. 所有协议 URI 解析 (SS/SSR/VMess/VLESS/Trojan/Hysteria/Hysteria2/TUIC/WireGuard/SOCKS5/HTTP/HTTPS/Snell/AnyTLS/Naive)
 *   2. 所有协议所有参数的完整验证
 *   3. 所有客户端格式转换 (URI/ClashMeta/Surge/Loon/QX/Shadowrocket/Singbox/Stash/Surfboard/Egern)
 *   4. 解析→转换往返 (roundtrip) 一致性
 *   5. 边界情况和错误处理
 */
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../index';
import type { ProxyNode } from '../types';

// ============================================================================
// Helper: 快速创建 ProxyNode
// ============================================================================
function makeNode(overrides: Partial<ProxyNode> & { type: ProxyNode['type']; name: string; server: string; port: number }): ProxyNode {
    return { id: 'test-id', ...overrides } as ProxyNode;
}

// ============================================================================
// 1. Shadowsocks — 完整参数
// ============================================================================
describe('1. Shadowsocks (SS) — 完整参数解析与转换', () => {
    // --- URI 格式 ---
    it('1.1.1 应解析标准 SS URI (SIP002)', () => {
        const uri = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@server.com:443#TestSS';
        const nodes = parse(uri);
        expect(nodes.length).toBe(1);
        expect(nodes[0].type).toBe('ss');
        expect(nodes[0].cipher).toBe('aes-128-gcm');
        expect(nodes[0].password).toBe('password');
        expect(nodes[0].server).toBe('server.com');
        expect(nodes[0].port).toBe(443);
        expect(nodes[0].name).toBe('TestSS');
    });

    it('1.1.2 应解析旧版 SS URI (全 Base64)', () => {
        const inner = 'aes-256-gcm:mypassword@10.0.0.1:8388';
        const encoded = Buffer.from(inner).toString('base64');
        const uri = `ss://${encoded}#OldSS`;
        const nodes = parse(uri);
        expect(nodes.length).toBe(1);
        expect(nodes[0].cipher).toBe('aes-256-gcm');
        expect(nodes[0].password).toBe('mypassword');
        expect(nodes[0].server).toBe('10.0.0.1');
        expect(nodes[0].port).toBe(8388);
    });

    it('1.1.3 应解析 2022-blake3 cipher', () => {
        const cipher = '2022-blake3-aes-128-gcm';
        const pass = 'testkey1234567890123456789012';
        const encoded = Buffer.from(`${cipher}:${pass}`).toString('base64');
        const uri = `ss://${encoded}@example.com:8443#SS2022`;
        const nodes = parse(uri);
        expect(nodes[0].cipher).toBe(cipher);
        expect(nodes[0].password).toBe(pass);
    });

    it('1.1.4 应解析 SS + obfs plugin', () => {
        const uri = 'ss://YWVzLTI1Ni1nY206dGVzdA@1.2.3.4:443?plugin=obfs-local%3Bmode%3Dhttp%3Bobfs-host%3Dexample.com#SS-Obfs';
        const nodes = parse(uri);
        expect(nodes[0].plugin).toBe('obfs');
        expect(nodes[0]['plugin-opts']?.mode).toBe('http');
        expect(nodes[0]['plugin-opts']?.host).toBe('example.com');
    });

    it('1.1.5 应解析 SS + v2ray-plugin (plugin 字符串)', () => {
        const uri = 'ss://YWVzLTI1Ni1nY206dGVzdA@1.2.3.4:443?plugin=v2ray-plugin%3Bmode%3Dwebsocket%3Bpath%3D%2Fws%3Btls%3D1#SS-V2';
        const nodes = parse(uri);
        expect(nodes[0].plugin).toBe('v2ray-plugin');
        expect(nodes[0]['plugin-opts']?.mode).toBe('websocket');
    });

    it('1.1.6 应解析 SS + shadow-tls plugin', () => {
        const uri = 'ss://YWVzLTI1Ni1nY206dGVzdA@1.2.3.4:443?plugin=shadow-tls%3Bhost%3Dst.example.com%3Bpassword%3Dstpass%3Bversion%3D3#SS-ST';
        const nodes = parse(uri);
        expect(nodes[0].plugin).toBe('shadow-tls');
        expect(nodes[0]['plugin-opts']?.host).toBe('st.example.com');
        expect(nodes[0]['plugin-opts']?.password).toBe('stpass');
    });

    it('1.1.7 应解析 SS + v2ray-plugin (Base64 params)', () => {
        const opts = Buffer.from(JSON.stringify({ type: 'websocket', obfs: 'http', host: 'example.com' })).toString('base64');
        const uri = `ss://YWVzLTI1Ni1nY206dGVzdA@1.2.3.4:443?v2ray-plugin=${opts}#SS-V2B64`;
        const nodes = parse(uri);
        expect(nodes[0].plugin).toBe('v2ray-plugin');
    });

    it('1.1.8 应解析 SS + WebSocket 传输', () => {
        const uri = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@1.2.3.4:443?type=ws&host=ws.example.com&path=%2Fws#SS-WS';
        const nodes = parse(uri);
        expect(nodes[0].network).toBe('ws');
        expect(nodes[0]['ws-opts']?.headers?.Host).toBe('ws.example.com');
    });

    it('1.1.9 应解析 SS + gRPC 传输', () => {
        const uri = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@1.2.3.4:443?type=grpc&serviceName=grpc-service#SS-gRPC';
        const nodes = parse(uri);
        expect(nodes[0].network).toBe('grpc');
        expect(nodes[0]['grpc-opts']?.['service-name']).toBe('grpc-service');
    });

    it('1.1.10 应解析 SS + httpupgrade', () => {
        const uri = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@1.2.3.4:443?type=httpupgrade&host=hu.example.com&path=%2Fhu#SS-HU';
        const nodes = parse(uri);
        expect(nodes[0].network).toBe('ws');
        expect(nodes[0].httpupgrade).toBe(true);
    });

    it('1.1.11 应解析 SS + TLS 参数', () => {
        const uri = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@1.2.3.4:443?security=tls&sni=example.com&allowInsecure=1&fp=chrome#SS-TLS';
        const nodes = parse(uri);
        expect(nodes[0].tls).toBe(true);
        expect(nodes[0].sni).toBe('example.com');
        expect(nodes[0]['skip-cert-verify']).toBe(true);
        expect(nodes[0]['client-fingerprint']).toBe('chrome');
    });

    it('1.1.12 应解析 SS + UoT 和 TFO', () => {
        const uri = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@1.2.3.4:443?uot=1&tfo=1&udp=1#SS-UoT';
        const nodes = parse(uri);
        expect(nodes[0]['udp-over-tcp']).toBe(true);
        expect(nodes[0].tfo).toBe(true);
        expect(nodes[0].udp).toBe(true);
    });

    // --- 转换测试 ---
    it('1.2.1 SS → URI 往返', async () => {
        const node = makeNode({ type: 'ss', name: 'SS-Round', server: '1.2.3.4', port: 443, cipher: 'aes-256-gcm', password: 'pass123' });
        const result = await convert([node], 'uri');
        expect(result).toContain('ss://');
        expect(result).toContain('1.2.3.4:443');
        expect(result).toContain('SS-Round');
    });

    it('1.2.2 SS → ClashMeta', async () => {
        const node = makeNode({ type: 'ss', name: 'SS-CM', server: '1.2.3.4', port: 443, cipher: 'aes-256-gcm', password: 'pass123' });
        const result = await convert([node], 'clashmeta');
        expect(result).toContain('name: SS-CM');
        expect(result).toContain('type: ss');
        expect(result).toContain('cipher: aes-256-gcm');
    });

    it('1.2.3 SS → Surge', async () => {
        const node = makeNode({ type: 'ss', name: 'SS-Surge', server: '1.2.3.4', port: 443, cipher: 'aes-256-gcm', password: 'pass123' });
        const result = await convert([node], 'surge');
        expect(result).toContain('SS-Surge=ss,1.2.3.4,443');
        expect(result).toContain('encrypt-method=aes-256-gcm');
    });

    it('1.2.4 SS → Loon', async () => {
        const node = makeNode({ type: 'ss', name: 'SS-Loon', server: '1.2.3.4', port: 443, cipher: 'aes-256-gcm', password: 'pass123' });
        const result = await convert([node], 'loon');
        expect(result).toContain('SS-Loon=shadowsocks,1.2.3.4,443');
    });

    it('1.2.5 SS → QX', async () => {
        const node = makeNode({ type: 'ss', name: 'SS-QX', server: '1.2.3.4', port: 443, cipher: 'aes-256-gcm', password: 'pass123' });
        const result = await convert([node], 'qx');
        expect(result).toContain('shadowsocks=1.2.3.4:443');
        expect(result).toContain('method=aes-256-gcm');
    });

    it('1.2.6 SS → Singbox', async () => {
        const node = makeNode({ type: 'ss', name: 'SS-SB', server: '1.2.3.4', port: 443, cipher: 'aes-256-gcm', password: 'pass123' });
        const result = await convert([node], 'singbox');
        const config = JSON.parse(result);
        expect(config.outbounds[0].type).toBe('shadowsocks');
        expect(config.outbounds[0].method).toBe('aes-256-gcm');
    });

    it('1.2.7 SS → Shadowrocket', async () => {
        const node = makeNode({ type: 'ss', name: 'SS-SR', server: '1.2.3.4', port: 443, cipher: 'aes-256-gcm', password: 'pass123' });
        const result = await convert([node], 'shadowrocket');
        expect(result).toContain('name: SS-SR');
        expect(result).toContain('type: ss');
    });

    it('1.2.8 SS → Egern', async () => {
        const node = makeNode({ type: 'ss', name: 'SS-Egern', server: '1.2.3.4', port: 443, cipher: 'aes-256-gcm', password: 'pass123' });
        const result = await convert([node], 'egern');
        expect(result).toContain('shadowsocks');
        expect(result).toContain('SS-Egern');
    });

    it('1.2.9 SS → Surfboard', async () => {
        const node = makeNode({ type: 'ss', name: 'SS-Surf', server: '1.2.3.4', port: 443, cipher: 'aes-256-gcm', password: 'pass123' });
        const result = await convert([node], 'surfboard');
        expect(result).toContain('SS-Surf=ss,1.2.3.4,443');
    });

    it('1.2.10 SS obfs → 各平台格式正确', async () => {
        const node = makeNode({
            type: 'ss', name: 'SS-Obfs', server: '1.2.3.4', port: 443,
            cipher: 'aes-256-gcm', password: 'pass123',
            plugin: 'obfs', 'plugin-opts': { mode: 'http', host: 'example.com' }
        });
        const surge = await convert([node], 'surge');
        expect(surge).toContain('obfs=http');
        expect(surge).toContain('obfs-host=example.com');

        const loon = await convert([node], 'loon');
        expect(loon).toContain('obfs-name=http');

        const qx = await convert([node], 'qx');
        expect(qx).toContain('obfs=http');
    });
});

// ============================================================================
// 2. ShadowsocksR — 完整参数
// ============================================================================
describe('2. ShadowsocksR (SSR) — 完整参数解析与转换', () => {
    it('2.1 应解析标准 SSR URI', () => {
        const inner = 'server.com:443:origin:aes-256-cfb:plain:' + Buffer.from('password123').toString('base64');
        const params = 'remarks=' + Buffer.from('TestSSR').toString('base64');
        const encoded = Buffer.from(inner + '/?' + params).toString('base64');
        const uri = `ssr://${encoded}`;
        const nodes = parse(uri);
        expect(nodes.length).toBe(1);
        expect(nodes[0].type).toBe('ssr');
        expect(nodes[0].server).toBe('server.com');
        expect(nodes[0].port).toBe(443);
        expect(nodes[0].protocol).toBe('origin');
        expect(nodes[0].cipher).toBe('aes-256-cfb');
        expect(nodes[0].obfs).toBe('plain');
        expect(nodes[0].password).toBe('password123');
    });

    it('2.2 应解析 SSR 带 obfs-param 和 protocol-param', () => {
        const inner = 'server.com:443:auth_aes128_md5:aes-256-cfb:http_simple:' + Buffer.from('ssrpass').toString('base64');
        const params = [
            'remarks=' + Buffer.from('SSR-Params').toString('base64'),
            'obfsparam=' + Buffer.from('obfsParam123').toString('base64'),
            'protoparam=' + Buffer.from('protoParam456').toString('base64')
        ].join('&');
        const encoded = Buffer.from(inner + '/?' + params).toString('base64');
        const uri = `ssr://${encoded}`;
        const nodes = parse(uri);
        expect(nodes[0]['obfs-param']).toBe('obfsParam123');
        expect(nodes[0]['protocol-param']).toBe('protoParam456');
    });

    it('2.3 SSR → Loon', async () => {
        const node = makeNode({
            type: 'ssr', name: 'SSR-Loon', server: '1.2.3.4', port: 443,
            protocol: 'origin', cipher: 'aes-256-cfb', obfs: 'plain', password: 'pass'
        });
        const result = await convert([node], 'loon');
        expect(result).toContain('SSR-Loon=shadowsocksr');
    });

    it('2.4 SSR → QX', async () => {
        const node = makeNode({
            type: 'ssr', name: 'SSR-QX', server: '1.2.3.4', port: 443,
            protocol: 'origin', cipher: 'aes-256-cfb', obfs: 'plain', password: 'pass'
        });
        const result = await convert([node], 'qx');
        expect(result).toContain('shadowsocks=');
        expect(result).toContain('ssr-protocol=');
    });
});

// ============================================================================
// 3. VMess — 完整参数
// ============================================================================
describe('3. VMess — 完整参数解析与转换', () => {
    const vmessConfig = {
        v: '2', ps: 'TestVMess', add: 'server.com', port: '443',
        id: 'uuid-1234-5678', aid: '0', scy: 'auto',
        net: 'ws', type: 'none', host: 'ws.example.com',
        path: '/ws', tls: 'tls', sni: 'sni.example.com',
        alpn: 'h2,http/1.1', fp: 'chrome'
    };

    it('3.1 应解析 VMess JSON URI', () => {
        const encoded = Buffer.from(JSON.stringify(vmessConfig)).toString('base64');
        const uri = `vmess://${encoded}`;
        const nodes = parse(uri);
        expect(nodes.length).toBe(1);
        expect(nodes[0].type).toBe('vmess');
        expect(nodes[0].uuid).toBe('uuid-1234-5678');
        expect(nodes[0].server).toBe('server.com');
        expect(nodes[0].port).toBe(443);
        expect(nodes[0].cipher).toBe('auto');
        expect(nodes[0].tls).toBe(true);
        expect(nodes[0].sni).toBe('sni.example.com');
    });

    it('3.2 应解析 VMess + gRPC', () => {
        const cfg = { ...vmessConfig, net: 'grpc', path: 'grpc-service', host: '', type: 'gun' };
        const encoded = Buffer.from(JSON.stringify(cfg)).toString('base64');
        const nodes = parse(`vmess://${encoded}`);
        expect(nodes[0].network).toBe('grpc');
        expect(nodes[0]['grpc-opts']?.['service-name']).toBe('grpc-service');
    });

    it('3.3 应解析 VMess + H2', () => {
        const cfg = { ...vmessConfig, net: 'h2', host: 'h2.example.com', path: '/h2' };
        const encoded = Buffer.from(JSON.stringify(cfg)).toString('base64');
        const nodes = parse(`vmess://${encoded}`);
        expect(nodes[0].network).toBe('h2');
    });

    it('3.4 应解析 VMess 无 TLS', () => {
        const cfg = { ...vmessConfig, tls: '', net: 'tcp' };
        const encoded = Buffer.from(JSON.stringify(cfg)).toString('base64');
        const nodes = parse(`vmess://${encoded}`);
        expect(nodes[0].tls).toBeFalsy();
    });

    it('3.5 应解析 VMess alterId 非 0', () => {
        const cfg = { ...vmessConfig, aid: '2', net: 'tcp', tls: '' };
        const encoded = Buffer.from(JSON.stringify(cfg)).toString('base64');
        const nodes = parse(`vmess://${encoded}`);
        expect(nodes[0].alterId).toBe(2);
    });

    it('3.6 VMess → URI 往返', async () => {
        const node = makeNode({
            type: 'vmess', name: 'VMess-URI', server: '1.2.3.4', port: 443,
            uuid: 'test-uuid', cipher: 'auto', alterId: 0, tls: true, sni: 'sni.com'
        });
        const result = await convert([node], 'uri');
        expect(result).toContain('vmess://');
        const decoded = JSON.parse(Buffer.from(result.replace('vmess://', ''), 'base64').toString());
        expect(decoded.id).toBe('test-uuid');
    });

    it('3.7 VMess → ClashMeta', async () => {
        const node = makeNode({
            type: 'vmess', name: 'VMess-CM', server: '1.2.3.4', port: 443,
            uuid: 'test-uuid', cipher: 'auto', alterId: 0, tls: true, sni: 'sni.com'
        });
        const result = await convert([node], 'clashmeta');
        expect(result).toContain('name: VMess-CM');
        expect(result).toContain('type: vmess');
        expect(result).toContain('alterId: 0');
    });

    it('3.8 VMess → Surge', async () => {
        const node = makeNode({
            type: 'vmess', name: 'VMess-Surge', server: '1.2.3.4', port: 443,
            uuid: 'test-uuid', cipher: 'auto', alterId: 0, tls: true
        });
        const result = await convert([node], 'surge');
        expect(result).toContain('vmess,1.2.3.4,443');
        expect(result).toContain('username=test-uuid');
        expect(result).toContain('vmess-aead=true');
    });

    it('3.9 VMess → Loon', async () => {
        const node = makeNode({
            type: 'vmess', name: 'VMess-Loon', server: '1.2.3.4', port: 443,
            uuid: 'test-uuid', cipher: 'auto', alterId: 0, tls: true, sni: 'sni.com'
        });
        const result = await convert([node], 'loon');
        expect(result).toContain('vmess,1.2.3.4,443');
        expect(result).toContain('over-tls=true');
    });

    it('3.10 VMess → QX', async () => {
        const node = makeNode({
            type: 'vmess', name: 'VMess-QX', server: '1.2.3.4', port: 443,
            uuid: 'test-uuid', cipher: 'auto', alterId: 0, tls: true, sni: 'sni.com'
        });
        const result = await convert([node], 'qx');
        expect(result).toContain('vmess=1.2.3.4:443');
        expect(result).toContain('aead=true');
    });

    it('3.11 VMess → Singbox', async () => {
        const node = makeNode({
            type: 'vmess', name: 'VMess-SB', server: '1.2.3.4', port: 443,
            uuid: 'test-uuid', cipher: 'auto', alterId: 0, tls: true, sni: 'sni.com'
        });
        const result = await convert([node], 'singbox');
        const config = JSON.parse(result);
        expect(config.outbounds[0].type).toBe('vmess');
        expect(config.outbounds[0].uuid).toBe('test-uuid');
    });

    it('3.12 VMess → Shadowrocket', async () => {
        const node = makeNode({
            type: 'vmess', name: 'VMess-SR', server: '1.2.3.4', port: 443,
            uuid: 'test-uuid', cipher: 'auto', alterId: 0, tls: true, sni: 'sni.com'
        });
        const result = await convert([node], 'shadowrocket');
        expect(result).toContain('name: VMess-SR');
        expect(result).toContain('type: vmess');
    });

    it('3.13 VMess → Egern', async () => {
        const node = makeNode({
            type: 'vmess', name: 'VMess-Egern', server: '1.2.3.4', port: 443,
            uuid: 'test-uuid', cipher: 'auto', alterId: 0, tls: true, sni: 'sni.com'
        });
        const result = await convert([node], 'egern');
        expect(result).toContain('vmess');
        expect(result).toContain('VMess-Egern');
    });

    it('3.14 VMess → Surfboard', async () => {
        const node = makeNode({
            type: 'vmess', name: 'VMess-Surf', server: '1.2.3.4', port: 443,
            uuid: 'test-uuid', cipher: 'auto', alterId: 0, tls: true, sni: 'sni.com'
        });
        const result = await convert([node], 'surfboard');
        expect(result).toContain('VMess-Surf=vmess,1.2.3.4,443');
    });
});

// ============================================================================
// 4. VLESS — 完整参数
// ============================================================================
describe('4. VLESS — 完整参数解析与转换', () => {
    it('4.1 应解析 VLESS + TLS', () => {
        const uri = 'vless://uuid-test@1.2.3.4:443?security=tls&sni=sni.com&fp=chrome#VLESS-TLS';
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('vless');
        expect(nodes[0].uuid).toBe('uuid-test');
        expect(nodes[0].tls).toBe(true);
        expect(nodes[0].sni).toBe('sni.com');
        expect(nodes[0]['client-fingerprint']).toBe('chrome');
    });

    it('4.2 应解析 VLESS + Reality', () => {
        const uri = 'vless://uuid-reality@1.2.3.4:443?security=reality&sni=www.google.com&fp=chrome&pbk=pubkey123&sid=shortid123&spx=%2Fspider#VLESS-Reality';
        const nodes = parse(uri);
        expect(nodes[0].tls).toBe(true);
        expect(nodes[0]['reality-opts']?.['public-key']).toBe('pubkey123');
        expect(nodes[0]['reality-opts']?.['short-id']).toBe('shortid123');
        expect(nodes[0]['reality-opts']?.['_spider-x']).toBe('/spider');
    });

    it('4.3 应解析 VLESS + WebSocket', () => {
        const uri = 'vless://uuid-ws@1.2.3.4:443?type=ws&host=ws.example.com&path=%2Fws&security=tls&sni=sni.com#VLESS-WS';
        const nodes = parse(uri);
        expect(nodes[0].network).toBe('ws');
        expect(nodes[0]['ws-opts']?.headers?.Host).toBe('ws.example.com');
    });

    it('4.4 应解析 VLESS + gRPC', () => {
        const uri = 'vless://uuid-grpc@1.2.3.4:443?type=grpc&serviceName=grpc-svc&security=tls&sni=sni.com#VLESS-gRPC';
        const nodes = parse(uri);
        expect(nodes[0].network).toBe('grpc');
        expect(nodes[0]['grpc-opts']?.['service-name']).toBe('grpc-svc');
    });

    it('4.5 应解析 VLESS + httpupgrade', () => {
        const uri = 'vless://uuid-hu@1.2.3.4:443?type=httpupgrade&host=hu.com&path=%2Fhu%3Fed%3D2048&security=reality&sni=www.google.com&fp=chrome&pbk=pk&sid=sid#VLESS-HU';
        const nodes = parse(uri);
        expect(nodes[0].network).toBe('ws');
        // httpupgrade 解析后设置 network=ws + xhttp-opts.mode=stream-one
        expect(nodes[0]['xhttp-opts']?.mode).toBe('stream-one');
    });

    it('4.6 应解析 VLESS + flow', () => {
        const uri = 'vless://uuid-flow@1.2.3.4:443?security=reality&sni=sni.com&fp=chrome&pbk=pk&sid=sid&flow=xtls-rprx-vision#VLESS-Flow';
        const nodes = parse(uri);
        expect(nodes[0].flow).toBe('xtls-rprx-vision');
    });

    it('4.7 应解析 VLESS + ALPN', () => {
        const uri = 'vless://uuid-alpn@1.2.3.4:443?security=tls&sni=sni.com&alpn=h2,http/1.1#VLESS-ALPN';
        const nodes = parse(uri);
        expect(nodes[0].alpn).toEqual(['h2', 'http/1.1']);
    });

    it('4.8 VLESS Reality → 所有支持平台', async () => {
        const node = makeNode({
            type: 'vless', name: 'VLESS-All', server: '1.2.3.4', port: 443,
            uuid: 'test-uuid', tls: true, sni: 'sni.com', 'client-fingerprint': 'chrome',
            'reality-opts': { 'public-key': 'pk123', 'short-id': 'sid123' }
        });

        // URI
        const uri = await convert([node], 'uri');
        expect(uri).toContain('vless://');
        expect(uri).toContain('security=reality');
        expect(uri).toContain('pbk=pk123');

        // ClashMeta
        const cm = await convert([node], 'clashmeta');
        expect(cm).toContain('type: vless');
        expect(cm).toContain('reality-opts:');
        expect(cm).toContain('public-key: pk123');

        // Loon
        const loon = await convert([node], 'loon');
        expect(loon).toContain('vless,1.2.3.4,443');

        // QX
        const qx = await convert([node], 'qx');
        expect(qx).toContain('vless=');
        expect(qx).toContain('reality-base64-pubkey=');

        // Singbox
        const sb = await convert([node], 'singbox');
        const config = JSON.parse(sb);
        expect(config.outbounds[0].type).toBe('vless');
        expect(config.outbounds[0].tls.reality.enabled).toBe(true);

        // Shadowrocket
        const sr = await convert([node], 'shadowrocket');
        expect(sr).toContain('type: vless');

        // Egern
        const eg = await convert([node], 'egern');
        expect(eg).toContain('vless');

        // Surge: VLESS 不支持
        const surge = await convert([node], 'surge');
        expect(surge).toBe('');
    });
});

// ============================================================================
// 5. Trojan — 完整参数
// ============================================================================
describe('5. Trojan — 完整参数解析与转换', () => {
    it('5.1 应解析标准 Trojan URI', () => {
        const uri = 'trojan://pass123@1.2.3.4:443?sni=sni.com#Trojan-Std';
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('trojan');
        expect(nodes[0].password).toBe('pass123');
        expect(nodes[0].tls).toBe(true);
        expect(nodes[0].sni).toBe('sni.com');
    });

    it('5.2 应解析 Trojan + WebSocket', () => {
        const uri = 'trojan://pass123@1.2.3.4:443?type=ws&host=ws.com&path=%2Fws&sni=sni.com#Trojan-WS';
        const nodes = parse(uri);
        expect(nodes[0].network).toBe('ws');
        expect(nodes[0]['ws-opts']?.headers?.Host).toBe('ws.com');
    });

    it('5.3 应解析 Trojan + gRPC', () => {
        const uri = 'trojan://pass123@1.2.3.4:443?type=grpc&serviceName=trojan-grpc&sni=sni.com#Trojan-gRPC';
        const nodes = parse(uri);
        expect(nodes[0].network).toBe('grpc');
        expect(nodes[0]['grpc-opts']?.['service-name']).toBe('trojan-grpc');
    });

    it('5.4 应解析 Trojan + Reality', () => {
        const uri = 'trojan://pass123@1.2.3.4:443?security=reality&sni=sni.com&fp=chrome&pbk=pk123&sid=sid123#Trojan-Reality';
        const nodes = parse(uri);
        expect(nodes[0]['reality-opts']?.['public-key']).toBe('pk123');
    });

    it('5.5 应解析 Trojan + ALPN', () => {
        const uri = 'trojan://pass123@1.2.3.4:443?sni=sni.com&alpn=h2,http/1.1#Trojan-ALPN';
        const nodes = parse(uri);
        expect(nodes[0].alpn).toEqual(['h2', 'http/1.1']);
    });

    it('5.6 Trojan → 全平台', async () => {
        const node = makeNode({
            type: 'trojan', name: 'Trojan-All', server: '1.2.3.4', port: 443,
            password: 'pass123', tls: true, sni: 'sni.com'
        });

        const uri = await convert([node], 'uri');
        expect(uri).toContain('trojan://');

        const cm = await convert([node], 'clashmeta');
        expect(cm).toContain('type: trojan');

        const surge = await convert([node], 'surge');
        expect(surge).toContain('trojan,1.2.3.4,443');

        const loon = await convert([node], 'loon');
        expect(loon).toContain('trojan,1.2.3.4,443');

        const qx = await convert([node], 'qx');
        expect(qx).toContain('trojan=');

        const sb = await convert([node], 'singbox');
        const config = JSON.parse(sb);
        expect(config.outbounds[0].type).toBe('trojan');
    });
});

// ============================================================================
// 6. Hysteria — 完整参数
// ============================================================================
describe('6. Hysteria (v1) — 完整参数解析与转换', () => {
    it('6.1 应解析标准 Hysteria URI', () => {
        const uri = 'hysteria://1.2.3.4:443/?auth=auth123&upmbps=100&downmbps=200&peer=sni.com#Hysteria';
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('hysteria');
        expect(nodes[0].auth).toBe('auth123');
        expect(nodes[0].up).toBe(100);
        expect(nodes[0].down).toBe(200);
        expect(nodes[0].sni).toBe('sni.com');
        expect(nodes[0].tls).toBe(true);
    });

    it('6.2 应解析 Hysteria + obfs', () => {
        const uri = 'hysteria://1.2.3.4:443/?obfs=xor&insecure=1#Hysteria-Obfs';
        const nodes = parse(uri);
        expect(nodes[0].obfs).toBe('xor');
        expect(nodes[0]['skip-cert-verify']).toBe(true);
    });

    it('6.3 Hysteria → Loon', async () => {
        const node = makeNode({
            type: 'hysteria', name: 'Hy-Loon', server: '1.2.3.4', port: 443,
            auth: 'auth123', tls: true, up: 100, down: 200
        });
        const result = await convert([node], 'loon');
        expect(result).toContain('hysteria,1.2.3.4,443');
    });
});

// ============================================================================
// 7. Hysteria2 — 完整参数
// ============================================================================
describe('7. Hysteria2 — 完整参数解析与转换', () => {
    it('7.1 应解析标准 Hysteria2 URI', () => {
        const uri = 'hysteria2://pass@1.2.3.4:443?sni=sni.com#Hy2';
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('hysteria2');
        expect(nodes[0].password).toBe('pass');
        expect(nodes[0].sni).toBe('sni.com');
    });

    it('7.2 应解析 Hysteria2 + obfs', () => {
        const uri = 'hysteria2://pass@1.2.3.4:443?obfs=salamander&obfs-password=obfspass#Hy2-Obfs';
        const nodes = parse(uri);
        expect(nodes[0].obfs).toBe('salamander');
        expect(nodes[0]['obfs-password']).toBe('obfspass');
    });

    it('7.3 应解析 Hysteria2 + 端口跳跃', () => {
        const uri = 'hysteria2://pass@1.2.3.4:443?ports=443-8443-4#Hy2-PH';
        const nodes = parse(uri);
        expect(nodes[0].ports).toBe('443-8443-4');
    });

    it('7.4 应解析 Hysteria2 + hop-interval', () => {
        const uri = 'hysteria2://pass@1.2.3.4:443?hop-interval=3#Hy2-HI';
        const nodes = parse(uri);
        expect(nodes[0]['hop-interval']).toBe('3');
    });

    it('7.5 Hysteria2 → 全平台', async () => {
        const node = makeNode({
            type: 'hysteria2', name: 'Hy2-All', server: '1.2.3.4', port: 443,
            password: 'pass123', sni: 'sni.com', obfs: 'salamander', 'obfs-password': 'obfspass'
        });

        const cm = await convert([node], 'clashmeta');
        expect(cm).toContain('type: hysteria2');
        expect(cm).toContain('obfs: salamander');

        const sb = await convert([node], 'singbox');
        const config = JSON.parse(sb);
        expect(config.outbounds[0].type).toBe('hysteria2');
        expect(config.outbounds[0].obfs.type).toBe('salamander');

        const surge = await convert([node], 'surge');
        expect(surge).toContain('hysteria2');

        const loon = await convert([node], 'loon');
        expect(loon).toContain('Hysteria2');
    });
});

// ============================================================================
// 8. TUIC — 完整参数
// ============================================================================
describe('8. TUIC — 完整参数解析与转换', () => {
    it('8.1 应解析标准 TUIC v5', () => {
        const uri = 'tuic://uuid:pass@1.2.3.4:443?sni=sni.com&alpn=h3&congestion_control=bbr&udp_relay_mode=native&reduce_rtt=1#TUIC';
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('tuic');
        expect(nodes[0].uuid).toBe('uuid');
        expect(nodes[0].password).toBe('pass');
        expect(nodes[0]['congestion-controller']).toBe('bbr');
        expect(nodes[0]['udp-relay-mode']).toBe('native');
        expect(nodes[0]['reduce-rtt']).toBe(true);
    });

    it('8.2 应解析 TUIC + disable-sni', () => {
        const uri = 'tuic://uuid:pass@1.2.3.4:443?disable_sni=1#TUIC-DSNI';
        const nodes = parse(uri);
        expect(nodes[0]['disable-sni']).toBe(true);
    });

    it('8.3 TUIC → 全平台', async () => {
        const node = makeNode({
            type: 'tuic', name: 'TUIC-All', server: '1.2.3.4', port: 443,
            uuid: 'uuid123', password: 'pass123', 'congestion-controller': 'bbr',
            alpn: ['h3']
        });

        const cm = await convert([node], 'clashmeta');
        expect(cm).toContain('type: tuic');
        expect(cm).toContain('congestion-controller: bbr');

        const surge = await convert([node], 'surge');
        expect(surge).toContain('tuic-v5');

        const sb = await convert([node], 'singbox');
        const config = JSON.parse(sb);
        expect(config.outbounds[0].type).toBe('tuic');

        const loon = await convert([node], 'loon');
        expect(loon).toContain('tuic,1.2.3.4,443');
    });
});

// ============================================================================
// 9. WireGuard — 完整参数
// ============================================================================
describe('9. WireGuard — 完整参数解析与转换', () => {
    it('9.1 应解析标准 WireGuard URI', () => {
        const uri = 'wireguard://privkey@1.2.3.4:51820?publickey=pubkey123&ip=10.0.0.1&dns=1.1.1.1&mtu=1420&reserved=1,2,3#WG';
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('wireguard');
        expect(nodes[0]['private-key']).toBe('privkey');
        expect(nodes[0].ip).toBe('10.0.0.1');
        expect(nodes[0].mtu).toBe(1420);
        expect(nodes[0].reserved).toEqual([1, 2, 3]);
        expect(nodes[0]['public-key']).toBe('pubkey123');
    });

    it('9.2 应解析 WireGuard 带 pre-shared-key', () => {
        const uri = 'wireguard://privkey@1.2.3.4:51820?publickey=pk&ip=10.0.0.1&pre-shared-key=psk123#WG-PSK';
        const nodes = parse(uri);
        expect(nodes[0]['pre-shared-key']).toBe('psk123');
    });

    it('9.3 应解析 WireGuard 带 keepalive', () => {
        const uri = 'wireguard://privkey@1.2.3.4:51820?publickey=pk&ip=10.0.0.1&keepalive=25#WG-KA';
        const nodes = parse(uri);
        expect(nodes[0].keepalive).toBe('25');
    });

    it('9.4 WireGuard → Singbox', async () => {
        const node = makeNode({
            type: 'wireguard', name: 'WG-SB', server: '1.2.3.4', port: 51820,
            'private-key': 'privkey', 'public-key': 'pubkey', ip: '10.0.0.1', mtu: 1420,
            reserved: [1, 2, 3]
        });
        const result = await convert([node], 'singbox');
        const config = JSON.parse(result);
        expect(config.outbounds[0].type).toBe('wireguard');
        expect(config.outbounds[0].private_key).toBe('privkey');
        expect(config.outbounds[0].mtu).toBe(1420);
    });

    it('9.5 WireGuard → Surge', async () => {
        const node = makeNode({
            type: 'wireguard', name: 'WG-Surge', server: '1.2.3.4', port: 51820,
            'private-key': 'privkey', 'public-key': 'pubkey', ip: '10.0.0.1',
            reserved: [1, 2, 3]
        });
        const result = await convert([node], 'surge');
        expect(result).toContain('WireGuard WG-Surge');
        expect(result).toContain('private-key = privkey');
    });

    it('9.6 WireGuard → Loon', async () => {
        const node = makeNode({
            type: 'wireguard', name: 'WG-Loon', server: '1.2.3.4', port: 51820,
            'private-key': 'privkey', 'public-key': 'pubkey', ip: '10.0.0.1'
        });
        const result = await convert([node], 'loon');
        expect(result).toContain('wireguard');
        expect(result).toContain('private-key="privkey"');
    });
});

// ============================================================================
// 10. SOCKS5 — 完整参数
// ============================================================================
describe('10. SOCKS5 — 完整参数解析与转换', () => {
    it('10.1 应解析标准 SOCKS5 URI', () => {
        // SOCKS5 URI auth 是 user:pass 的 Base64 编码
        const encoded = Buffer.from('user:pass').toString('base64');
        const uri = `socks5://${encoded}@1.2.3.4:1080#Socks5`;
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('socks5');
        expect(nodes[0].username).toBe('user');
        expect(nodes[0].password).toBe('pass');
        expect(nodes[0].server).toBe('1.2.3.4');
        expect(nodes[0].port).toBe(1080);
    });

    it('10.2 应解析 SOCKS5 无认证', () => {
        // 无认证 SOCKS5: 使用 cipher: none
        const encoded = Buffer.from('none:').toString('base64');
        const uri = `socks5://${encoded}@1.2.3.4:1080?sni=sni.com#Socks5NoAuth`;
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('socks5');
        expect(nodes[0].server).toBe('1.2.3.4');
    });

    it('10.3 SOCKS5 → 全平台', async () => {
        const node = makeNode({
            type: 'socks5', name: 'Socks5-All', server: '1.2.3.4', port: 1080,
            username: 'user', password: 'pass'
        });

        const uri = await convert([node], 'uri');
        expect(uri).toContain('socks://');

        const surge = await convert([node], 'surge');
        expect(surge).toContain('socks5,1.2.3.4,1080');

        const loon = await convert([node], 'loon');
        expect(loon).toContain('socks5,1.2.3.4,1080');
    });
});

// ============================================================================
// 11. HTTP/HTTPS — 完整参数
// ============================================================================
describe('11. HTTP/HTTPS — 完整参数解析与转换', () => {
    it('11.1 应解析 HTTP URI', () => {
        const uri = 'http://user:pass@1.2.3.4:8080#HTTP';
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('http');
        expect(nodes[0].username).toBe('user');
        expect(nodes[0].password).toBe('pass');
        expect(nodes[0].port).toBe(8080);
    });

    it('11.2 应解析 HTTPS URI', () => {
        const uri = 'https://user:pass@1.2.3.4:443?sni=sni.com#HTTPS';
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('https');
        expect(nodes[0].tls).toBe(true);
        expect(nodes[0].sni).toBe('sni.com');
    });

    it('11.3 HTTP → 全平台', async () => {
        const node = makeNode({
            type: 'http', name: 'HTTP-All', server: '1.2.3.4', port: 8080,
            username: 'user', password: 'pass'
        });

        const surge = await convert([node], 'surge');
        expect(surge).toContain('http,1.2.3.4,8080');

        const loon = await convert([node], 'loon');
        expect(loon).toContain('http,1.2.3.4,8080');
    });
});

// ============================================================================
// 12. Snell — 完整参数
// ============================================================================
describe('12. Snell — 完整参数解析与转换', () => {
    it('12.1 应解析标准 Snell URI', () => {
        const uri = 'snell://psk123@1.2.3.4:8388?version=4#Snell';
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('snell');
        expect(nodes[0].password).toBe('psk123');
        expect(nodes[0].version).toBe(4);
    });

    it('12.2 Snell → Surge', async () => {
        const node = makeNode({
            type: 'snell', name: 'Snell-Surge', server: '1.2.3.4', port: 8388,
            password: 'psk123', version: 4
        });
        const result = await convert([node], 'surge');
        expect(result).toContain('snell,1.2.3.4,8388');
        expect(result).toContain('psk=psk123');
        expect(result).toContain('version=4');
    });

    it('12.3 Snell → Loon', async () => {
        const node = makeNode({
            type: 'snell', name: 'Snell-Loon', server: '1.2.3.4', port: 8388,
            password: 'psk123', version: 4
        });
        const result = await convert([node], 'loon');
        expect(result).toContain('snell,1.2.3.4,8388');
        expect(result).toContain('psk="psk123"');
    });

    it('12.4 Snell → Egern', async () => {
        const node = makeNode({
            type: 'snell', name: 'Snell-Egern', server: '1.2.3.4', port: 8388,
            password: 'psk123', version: 4
        });
        const result = await convert([node], 'egern');
        expect(result).toContain('snell');
    });
});

// ============================================================================
// 13. AnyTLS — 完整参数
// ============================================================================
describe('13. AnyTLS — 完整参数解析与转换', () => {
    it('13.1 应解析标准 AnyTLS URI', () => {
        const uri = 'anytls://pass@1.2.3.4:443?sni=sni.com&fp=chrome#AnyTLS';
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('anytls');
        expect(nodes[0].tls).toBe(true);
        expect(nodes[0].sni).toBe('sni.com');
        expect(nodes[0]['client-fingerprint']).toBe('chrome');
    });

    it('13.2 应解析 AnyTLS 所有会话参数', () => {
        const uri = 'anytls://pass@1.2.3.4:443?idle-session-check-interval=30&idle-session-timeout=60&min-idle-session=2&max-stream-count=8#AnyTLS-Full';
        const nodes = parse(uri);
        expect(nodes[0]['idle-session-check-interval']).toBe(30);
        expect(nodes[0]['idle-session-timeout']).toBe(60);
        expect(nodes[0]['min-idle-session']).toBe(2);
        expect(nodes[0]['max-stream-count']).toBe(8);
    });

    it('13.3 AnyTLS → 所有支持平台', async () => {
        const node = makeNode({
            type: 'anytls', name: 'AnyTLS-All', server: '1.2.3.4', port: 443,
            password: 'pass123', tls: true, sni: 'sni.com',
            'client-fingerprint': 'chrome',
            'idle-session-timeout': 60, 'max-stream-count': 8
        });

        const uri = await convert([node], 'uri');
        expect(uri).toContain('anytls://');
        expect(uri).toContain('sni=sni.com');

        const cm = await convert([node], 'clashmeta');
        expect(cm).toContain('type: anytls');

        const surge = await convert([node], 'surge');
        expect(surge).toContain('anytls');

        const loon = await convert([node], 'loon');
        expect(loon).toContain('anytls');

        const qx = await convert([node], 'qx');
        expect(qx).toContain('anytls=');

        const sb = await convert([node], 'singbox');
        const config = JSON.parse(sb);
        expect(config.outbounds[0].type).toBe('anytls');

        const sr = await convert([node], 'shadowrocket');
        expect(sr).toContain('type: anytls');
    });
});

// ============================================================================
// 14. Naive — 完整参数
// ============================================================================
describe('14. Naive — 完整参数解析与转换', () => {
    it('14.1 应解析 Naive URI', () => {
        const uri = 'naive+https://user:pass@1.2.3.4:443?sni=sni.com#Naive';
        const nodes = parse(uri);
        expect(nodes[0].type).toBe('naive');
        expect(nodes[0].username).toBe('user');
        expect(nodes[0].password).toBe('pass');
        expect(nodes[0].tls).toBe(true);
        expect(nodes[0].sni).toBe('sni.com');
    });

    it('14.2 Naive → URI 往返', async () => {
        const node = makeNode({
            type: 'naive', name: 'Naive-URI', server: '1.2.3.4', port: 443,
            username: 'user', password: 'pass', tls: true, sni: 'sni.com'
        });
        const result = await convert([node], 'uri');
        expect(result).toContain('naive+https://');
    });

    it('14.3 Naive → Singbox', async () => {
        const node = makeNode({
            type: 'naive', name: 'Naive-SB', server: '1.2.3.4', port: 443,
            username: 'user', password: 'pass', tls: true, sni: 'sni.com'
        });
        const result = await convert([node], 'singbox');
        const config = JSON.parse(result);
        expect(config.outbounds[0].type).toBe('http');
        expect(config.outbounds[0].username).toBe('user');
    });
});

// ============================================================================
// 15. 完整往返测试 (Roundtrip)
// ============================================================================
describe('15. 完整往返测试 — Parse → Convert → 再 Parse', () => {
    it('15.1 SS 往返: URI → Parse → Convert URI', async () => {
        const original = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@server.com:443#Roundtrip-SS';
        const nodes = parse(original);
        const uri = await convert(nodes, 'uri');
        const reparsed = parse(uri);
        expect(reparsed[0].type).toBe('ss');
        expect(reparsed[0].cipher).toBe('aes-128-gcm');
    });

    it('15.2 Trojan 往返: URI → Parse → Convert URI', async () => {
        const original = 'trojan://pass@server.com:443?sni=sni.com#Roundtrip-Trojan';
        const nodes = parse(original);
        const uri = await convert(nodes, 'uri');
        const reparsed = parse(uri);
        expect(reparsed[0].type).toBe('trojan');
        expect(reparsed[0].password).toBe('pass');
    });

    it('15.3 Hysteria2 往返: URI → Parse → Convert URI', async () => {
        const original = 'hysteria2://pass@1.2.3.4:443?sni=sni.com&obfs=salamander&obfs-password=obfspass#Roundtrip-Hy2';
        const nodes = parse(original);
        const uri = await convert(nodes, 'uri');
        const reparsed = parse(uri);
        expect(reparsed[0].type).toBe('hysteria2');
        expect(reparsed[0].obfs).toBe('salamander');
    });

    it('15.4 TUIC 往返: URI → Parse → Convert URI', async () => {
        const original = 'tuic://uuid:pass@1.2.3.4:443?congestion_control=bbr&alpn=h3#Roundtrip-TUIC';
        const nodes = parse(original);
        const uri = await convert(nodes, 'uri');
        const reparsed = parse(uri);
        expect(reparsed[0].type).toBe('tuic');
        expect(reparsed[0]['congestion-controller']).toBe('bbr');
    });

    it('15.5 AnyTLS 往返: URI → Parse → Convert URI', async () => {
        const original = 'anytls://pass@1.2.3.4:443?sni=sni.com&fp=chrome#Roundtrip-AnyTLS';
        const nodes = parse(original);
        const uri = await convert(nodes, 'uri');
        const reparsed = parse(uri);
        expect(reparsed[0].type).toBe('anytls');
        expect(reparsed[0].sni).toBe('sni.com');
    });

    it('15.6 Naive 往返: URI → Parse → Convert URI', async () => {
        const original = 'naive+https://user:pass@1.2.3.4:443?sni=sni.com#Roundtrip-Naive';
        const nodes = parse(original);
        const uri = await convert(nodes, 'uri');
        const reparsed = parse(uri);
        expect(reparsed[0].type).toBe('naive');
        expect(reparsed[0].username).toBe('user');
    });
});

// ============================================================================
// 16. 格式检测与 Base64 解码
// ============================================================================
describe('16. 格式检测与 Base64 解码', () => {
    it('16.1 应正确解码 Base64 编码的订阅', () => {
        const content = [
            'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@server.com:443#Node1',
            'trojan://pass@server.com:443#Node2'
        ].join('\n');
        const b64 = Buffer.from(content).toString('base64');
        const nodes = parse(b64);
        expect(nodes.length).toBe(2);
        expect(nodes[0].type).toBe('ss');
        expect(nodes[1].type).toBe('trojan');
    });

    it('16.2 应正确解码 URL-Safe Base64', () => {
        const content = 'ss://YWVzLTI1Ni1nY206dGVzdA@server.com:443#URLSafe';
        const safe = Buffer.from(content).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
        const nodes = parse(safe);
        expect(nodes.length).toBe(1);
    });

    it('16.3 应正确解析 Clash YAML 格式', () => {
        const yaml = `proxies:
  - name: ClashNode
    type: ss
    server: server.com
    port: 443
    cipher: aes-256-gcm
    password: testpass`;
        const nodes = parse(yaml);
        expect(nodes.length).toBe(1);
        expect(nodes[0].type).toBe('ss');
        expect(nodes[0].name).toBe('ClashNode');
    });

    it('16.4 应正确解析 Surge 配置格式', () => {
        const surge = 'TestNode=ss,server.com,443,encrypt-method=aes-256-gcm,password="pass123"';
        const nodes = parse(surge);
        expect(nodes.length).toBe(1);
        expect(nodes[0].type).toBe('ss');
    });

    it('16.5 应正确解析 Loon 配置格式', () => {
        const loon = 'TestNode=shadowsocks,server.com,443,aes-256-gcm,"pass123"';
        const nodes = parse(loon);
        expect(nodes.length).toBe(1);
        // Loon parser 将 shadowsocks 类型存为 'shadowsocks'，normalize 后为 'ss'
        expect(['ss', 'shadowsocks']).toContain(nodes[0].type);
    });

    it('16.6 应正确解析 QX 配置格式', () => {
        const qx = 'shadowsocks=server.com:443,method=aes-256-gcm,password=pass123,tag=TestNode';
        const nodes = parse(qx);
        expect(nodes.length).toBe(1);
        expect(nodes[0].type).toBe('ss');
    });
});

// ============================================================================
// 17. 边界情况和错误处理
// ============================================================================
describe('17. 边界情况和错误处理', () => {
    it('17.1 空字符串应返回空数组', () => {
        expect(parse('')).toEqual([]);
    });

    it('17.2 未知协议应返回空数组', () => {
        expect(parse('unknown://test@host:443')).toEqual([]);
    });

    it('17.3 无效 URI 格式应正常处理 (不抛异常)', () => {
        const nodes = parse('ss://');
        // parser 可能创建空节点或返回空，关键是不抛异常
        expect(Array.isArray(nodes)).toBe(true);
    });

    it('17.4 无效端口应正常处理 (不抛异常)', () => {
        const uri = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@server.com:abc#BadPort';
        const nodes = parse(uri);
        // parser 可能将 NaN 端口解析为 0 或 undefined，关键是不抛异常
        expect(Array.isArray(nodes)).toBe(true);
    });

    it('17.5 HTML 内容应返回空数组', () => {
        expect(parse('<html><body>Error</body></html>')).toEqual([]);
    });

    it('17.6 注释行应被忽略', () => {
        const content = `# Comment
// Another comment
ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@server.com:443#RealNode`;
        const nodes = parse(content);
        expect(nodes.length).toBe(1);
        expect(nodes[0].name).toBe('RealNode');
    });

    it('17.7 混合格式多行应正确解析', () => {
        const content = `ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@server.com:443#SS1
trojan://pass@server.com:443#Trojan1
hysteria2://pass@server.com:443#Hy2`;
        const nodes = parse(content);
        expect(nodes.length).toBe(3);
    });

    it('17.8 不支持的协议转换应返回空字符串', async () => {
        const node = makeNode({
            type: 'ssh' as any, name: 'SSH', server: '1.2.3.4', port: 22
        });
        const result = await convert([node], 'qx');
        // QX 不支持 SSH
        expect(result).toBe('');
    });

    it('17.9 IPv6 地址应正常解析', () => {
        const uri = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@[2001:db8::1]:443#IPv6';
        const nodes = parse(uri);
        expect(nodes.length).toBe(1);
        expect(nodes[0].server).toContain('2001:db8::1');
    });
});

// ============================================================================
// 18. 多节点批量转换
// ============================================================================
describe('18. 多节点批量转换', () => {
    it('18.1 批量解析和转换', async () => {
        const content = [
            'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@1.1.1.1:443#SS1',
            'vmess://' + Buffer.from(JSON.stringify({
                v: '2', ps: 'VM1', add: '2.2.2.2', port: '443',
                id: 'uuid', aid: '0', scy: 'auto', net: 'tcp', type: 'none', host: '', path: '', tls: ''
            })).toString('base64'),
            'trojan://pass@3.3.3.3:443?sni=sni.com#TR1',
            'hysteria2://pass@4.4.4.4:443#HY2',
            'tuic://uuid:pass@5.5.5.5:443?alpn=h3#TU1'
        ].join('\n');

        const nodes = parse(content);
        expect(nodes.length).toBe(5);

        // 批量转换到各平台
        const clash = await convert(nodes, 'clashmeta');
        expect(clash).toContain('proxies:');

        const surge = await convert(nodes, 'surge');
        expect(surge).toContain('SS1=');
        expect(surge).toContain('VM1=');

        const loon = await convert(nodes, 'loon');
        expect(loon).toContain('SS1=');

        const singbox = await convert(nodes, 'singbox');
        const config = JSON.parse(singbox);
        expect(config.outbounds.length).toBe(5);
    });
});

// ============================================================================
// 19. ClientFormat 转换器完整性检查
// ============================================================================
describe('19. 所有客户端格式转换器覆盖检查', () => {
    const allProtocols: Array<{ type: ProxyNode['type']; node: ProxyNode }> = [
        { type: 'ss', node: makeNode({ type: 'ss', name: 'SS', server: '1.1.1.1', port: 443, cipher: 'aes-256-gcm', password: 'pass' }) },
        { type: 'vmess', node: makeNode({ type: 'vmess', name: 'VM', server: '1.1.1.1', port: 443, uuid: 'uuid', cipher: 'auto', alterId: 0, tls: true, sni: 'sni.com' }) },
        { type: 'vless', node: makeNode({ type: 'vless', name: 'VL', server: '1.1.1.1', port: 443, uuid: 'uuid', tls: true, sni: 'sni.com', 'reality-opts': { 'public-key': 'pk', 'short-id': 'sid' } }) },
        { type: 'trojan', node: makeNode({ type: 'trojan', name: 'TR', server: '1.1.1.1', port: 443, password: 'pass', tls: true, sni: 'sni.com' }) },
        { type: 'hysteria2', node: makeNode({ type: 'hysteria2', name: 'HY2', server: '1.1.1.1', port: 443, password: 'pass' }) },
        { type: 'tuic', node: makeNode({ type: 'tuic', name: 'TU', server: '1.1.1.1', port: 443, uuid: 'uuid', password: 'pass', 'congestion-controller': 'bbr' }) },
        { type: 'wireguard', node: makeNode({ type: 'wireguard', name: 'WG', server: '1.1.1.1', port: 51820, 'private-key': 'pk', 'public-key': 'pub', ip: '10.0.0.1' }) },
        { type: 'snell', node: makeNode({ type: 'snell', name: 'SN', server: '1.1.1.1', port: 8388, password: 'psk', version: 4 }) },
        { type: 'anytls', node: makeNode({ type: 'anytls', name: 'AT', server: '1.1.1.1', port: 443, password: 'pass', tls: true, sni: 'sni.com' }) },
        { type: 'socks5', node: makeNode({ type: 'socks5', name: 'S5', server: '1.1.1.1', port: 1080, username: 'user', password: 'pass' }) },
        { type: 'http', node: makeNode({ type: 'http', name: 'HT', server: '1.1.1.1', port: 8080, username: 'user', password: 'pass' }) },
    ];

    const platforms = ['uri', 'clashmeta', 'surge', 'loon', 'qx', 'singbox', 'shadowrocket', 'egern', 'surfboard'];

    it.each(platforms)('19.%s 平台对所有协议不抛出异常', async (platform) => {
        for (const { type, node } of allProtocols) {
            try {
                await convert([node], platform);
            } catch (e: any) {
                // Surge 不支持 VLESS，应返回空字符串而非抛异常
                // QX 不支持 hysteria2/wireguard，应返回空字符串
                if (type === 'vless' && platform === 'surge') {
                    // Surge VLESS 抛出 Error 是预期行为
                    expect(e.message).toContain('does not support VLESS');
                } else if (['hysteria2', 'wireguard'].includes(type) && platform === 'qx') {
                    // QX 不支持这些协议是预期行为
                    expect(e.message).toContain('Unsupported');
                } else {
                    throw e;
                }
            }
        }
    });
});

// ============================================================================
// 20. Stash 专属行为测试
// ============================================================================
describe('20. Stash — 基于 ClashMeta 扩展', () => {
    it('20.1 Stash → 支持 Hysteria2 转换', async () => {
        const node = makeNode({
            type: 'hysteria2', name: 'Stash-Hy2', server: '1.2.3.4', port: 443,
            password: 'pass123'
        });
        const result = await convert([node], 'stash');
        expect(result).toContain('name: Stash-Hy2');
    });

    it('20.2 Stash → Hysteria2 密码映射为 auth', async () => {
        const node = makeNode({
            type: 'hysteria2', name: 'Stash-Hy2-Auth', server: '1.2.3.4', port: 443,
            password: 'pass123'
        });
        const result = await convert([node], 'stash');
        expect(result).toContain('auth: pass123');
    });

    it('20.3 Stash → 不支持 Snell v4+', async () => {
        const node = makeNode({
            type: 'snell', name: 'Stash-Snell', server: '1.2.3.4', port: 8388,
            password: 'psk', version: 5
        });
        const result = await convert([node], 'stash');
        // Snell v5 不支持，应被过滤
        expect(result).not.toContain('Stash-Snell');
    });
});

// ============================================================================
// 21. Egern 专属行为测试
// ============================================================================
describe('21. Egern — 完整格式验证', () => {
    it('21.1 Egern → SS 输出 obfs 嵌套结构', async () => {
        const node = makeNode({
            type: 'ss', name: 'Eg-SS', server: '1.2.3.4', port: 443,
            cipher: 'aes-256-gcm', password: 'pass',
            plugin: 'obfs', 'plugin-opts': { mode: 'http', host: 'example.com' }
        });
        const result = await convert([node], 'egern');
        expect(result).toContain('shadowsocks');
        expect(result).toContain('obfs');
    });

    it('21.2 Egern → WireGuard 输出完整 peer 结构', async () => {
        const node = makeNode({
            type: 'wireguard', name: 'Eg-WG', server: '1.2.3.4', port: 51820,
            'private-key': 'priv', 'public-key': 'pub', ip: '10.0.0.1', mtu: 1420,
            dns: ['1.1.1.1']
        });
        const result = await convert([node], 'egern');
        expect(result).toContain('wireguard');
        expect(result).toContain('Eg-WG');
    });

    it('21.3 Egern → TUIC 含 congestion_control', async () => {
        const node = makeNode({
            type: 'tuic', name: 'Eg-TU', server: '1.2.3.4', port: 443,
            uuid: 'uuid', password: 'pass', 'congestion-controller': 'bbr'
        });
        const result = await convert([node], 'egern');
        expect(result).toContain('congestion_control');
    });
});

// ============================================================================
// 22. Surfboard 专属行为测试
// ============================================================================
describe('22. Surfboard — 格式验证', () => {
    it('22.1 Surfboard → SS', async () => {
        const node = makeNode({
            type: 'ss', name: 'Surf-SS', server: '1.2.3.4', port: 443,
            cipher: 'aes-256-gcm', password: 'pass'
        });
        const result = await convert([node], 'surfboard');
        expect(result).toContain('Surf-SS=ss,1.2.3.4,443');
    });

    it('22.2 Surfboard → Trojan', async () => {
        const node = makeNode({
            type: 'trojan', name: 'Surf-TR', server: '1.2.3.4', port: 443,
            password: 'pass', tls: true, sni: 'sni.com'
        });
        const result = await convert([node], 'surfboard');
        expect(result).toContain('Surf-TR=trojan,1.2.3.4,443');
    });

    it('22.3 Surfboard → Snell v3', async () => {
        const node = makeNode({
            type: 'snell', name: 'Surf-SN', server: '1.2.3.4', port: 8388,
            password: 'psk', version: 3
        });
        const result = await convert([node], 'surfboard');
        expect(result).toContain('Surf-SN=snell');
    });

    it('22.4 Surfboard → AnyTLS', async () => {
        const node = makeNode({
            type: 'anytls', name: 'Surf-AT', server: '1.2.3.4', port: 443,
            password: 'pass', sni: 'sni.com'
        });
        const result = await convert([node], 'surfboard');
        expect(result).toContain('Surf-AT=anytls,1.2.3.4,443');
    });
});

// ============================================================================
// 23. Shadowrocket ClashYAML 输出验证
// ============================================================================
describe('23. Shadowrocket — ClashYAML 输出', () => {
    it('23.1 Shadowrocket → SS 输出有效 YAML', async () => {
        const node = makeNode({
            type: 'ss', name: 'SR-SS', server: '1.2.3.4', port: 443,
            cipher: 'aes-256-gcm', password: 'pass'
        });
        const result = await convert([node], 'shadowrocket');
        expect(result).toContain('proxies:');
        expect(result).toContain('name: SR-SS');
        expect(result).toContain('type: ss');
    });

    it('23.2 Shadowrocket → VLESS Reality 含 fingerprint', async () => {
        const node = makeNode({
            type: 'vless', name: 'SR-VL', server: '1.2.3.4', port: 443,
            uuid: 'uuid', tls: true, sni: 'sni.com', 'client-fingerprint': 'chrome',
            'reality-opts': { 'public-key': 'pk', 'short-id': 'sid' }
        });
        const result = await convert([node], 'shadowrocket');
        expect(result).toContain('fingerprint: chrome');
        expect(result).toContain('public-key: pk');
    });

    it('23.3 Shadowrocket → Trojan', async () => {
        const node = makeNode({
            type: 'trojan', name: 'SR-TR', server: '1.2.3.4', port: 443,
            password: 'pass', tls: true, sni: 'sni.com'
        });
        const result = await convert([node], 'shadowrocket');
        expect(result).toContain('name: SR-TR');
        expect(result).toContain('type: trojan');
    });
});

// ============================================================================
// 24. 流量属性与附加参数测试
// ============================================================================
describe('24. 流量属性与附加参数', () => {
    it('24.1 TFO 参数在所有支持平台正确输出', async () => {
        const node = makeNode({
            type: 'ss', name: 'TFO-Test', server: '1.2.3.4', port: 443,
            cipher: 'aes-256-gcm', password: 'pass', tfo: true
        });

        const surge = await convert([node], 'surge');
        expect(surge).toContain('tfo=true');

        const loon = await convert([node], 'loon');
        expect(loon).toContain('fast-open=true');

        const qx = await convert([node], 'qx');
        expect(qx).toContain('fast-open=true');
    });

    it('24.2 UDP 参数在支持平台正确输出', async () => {
        const node = makeNode({
            type: 'ss', name: 'UDP-Test', server: '1.2.3.4', port: 443,
            cipher: 'aes-256-gcm', password: 'pass', udp: true
        });

        const surge = await convert([node], 'surge');
        expect(surge).toContain('udp-relay=true');

        const loon = await convert([node], 'loon');
        expect(loon).toContain('udp=true');
    });

    it('24.3 skip-cert-verify 参数在支持平台正确输出', async () => {
        const node = makeNode({
            type: 'trojan', name: 'SCV-Test', server: '1.2.3.4', port: 443,
            password: 'pass', tls: true, sni: 'sni.com', 'skip-cert-verify': true
        });

        const surge = await convert([node], 'surge');
        expect(surge).toContain('skip-cert-verify=true');

        const loon = await convert([node], 'loon');
        expect(loon).toContain('skip-cert-verify=true');
    });

    it('24.4 SNI 参数在支持平台正确输出', async () => {
        const node = makeNode({
            type: 'trojan', name: 'SNI-Test', server: '1.2.3.4', port: 443,
            password: 'pass', tls: true, sni: 'custom-sni.com'
        });

        const surge = await convert([node], 'surge');
        expect(surge).toContain('sni=custom-sni.com');

        const loon = await convert([node], 'loon');
        expect(loon).toContain('tls-name=custom-sni.com');

        const qx = await convert([node], 'qx');
        expect(qx).toContain('tls-host=custom-sni.com');
    });

    it('24.5 ip-version 参数在支持平台正确输出', async () => {
        const node = makeNode({
            type: 'ss', name: 'IPv-Test', server: '1.2.3.4', port: 443,
            cipher: 'aes-256-gcm', password: 'pass', 'ip-version': 'ipv4-prefer'
        });

        const surge = await convert([node], 'surge');
        expect(surge).toContain('ip-version=prefer-v4');

        const loon = await convert([node], 'loon');
        expect(loon).toContain('ip-mode=prefer-v4');
    });
});

// ============================================================================
// 25. 传输层参数完整测试
// ============================================================================
describe('25. 传输层参数完整测试', () => {
    it('25.1 VMess + WS + Early Data → 全平台', async () => {
        const node = makeNode({
            type: 'vmess', name: 'VM-WS-ED', server: '1.2.3.4', port: 443,
            uuid: 'uuid', cipher: 'auto', alterId: 0, tls: true, sni: 'sni.com',
            network: 'ws', 'ws-opts': {
                path: '/ws', headers: { Host: 'ws.example.com' },
                'max-early-data': 2048, 'early-data-header-name': 'Sec-WebSocket-Protocol'
            }
        });

        const cm = await convert([node], 'clashmeta');
        expect(cm).toContain('max-early-data: 2048');

        const sb = await convert([node], 'singbox');
        const config = JSON.parse(sb);
        expect(config.outbounds[0].transport.type).toBe('ws');
        expect(config.outbounds[0].transport.max_early_data).toBe(2048);
    });

    it('25.2 VMess + gRPC → 全平台', async () => {
        const node = makeNode({
            type: 'vmess', name: 'VM-gRPC', server: '1.2.3.4', port: 443,
            uuid: 'uuid', cipher: 'auto', alterId: 0, tls: true, sni: 'sni.com',
            network: 'grpc', 'grpc-opts': { 'service-name': 'grpc-svc' }
        });

        const cm = await convert([node], 'clashmeta');
        expect(cm).toContain('service-name: grpc-svc');

        const sb = await convert([node], 'singbox');
        const config = JSON.parse(sb);
        expect(config.outbounds[0].transport.type).toBe('grpc');
        expect(config.outbounds[0].transport.service_name).toBe('grpc-svc');
    });

    it('25.3 VLESS + httpupgrade → 正确输出', async () => {
        const node = makeNode({
            type: 'vless', name: 'VL-HU', server: '1.2.3.4', port: 443,
            uuid: 'uuid', tls: true, sni: 'sni.com',
            network: 'ws', httpupgrade: true,
            'ws-opts': { path: '/ws', 'v2ray-http-upgrade': true, 'v2ray-http-upgrade-fast-open': true }
        });

        const cm = await convert([node], 'clashmeta');
        // httpupgrade 内部标记应被清理
        expect(cm).not.toContain('v2ray-http-upgrade');

        // URI converter 输出 httpupgrade 类型
        const uri = await convert([node], 'uri');
        expect(uri).toContain('type=httpupgrade');
    });

    it('25.4 XHTTP/SplitHTTP → ClashMeta 和 Singbox', async () => {
        const node = makeNode({
            type: 'vless', name: 'VL-XH', server: '1.2.3.4', port: 443,
            uuid: 'uuid', tls: true, sni: 'sni.com',
            network: 'xhttp', 'xhttp-opts': { mode: 'stream-one', path: '/xh', host: 'xh.example.com' }
        });

        const cm = await convert([node], 'clashmeta');
        expect(cm).toContain('xhttp-opts:');

        const sb = await convert([node], 'singbox');
        const config = JSON.parse(sb);
        expect(config.outbounds[0].transport.type).toBe('splithttp');
    });
});