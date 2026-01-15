import { describe, it, expect } from 'vitest';
import { ProxyUtils } from '../proxy/index';
import { Proxy } from '../proxy/types';

describe('ProxyUtils.parse', () => {
    it('should parse SS URI', () => {
        const uri = 'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ@1.2.3.4:8388#TestNode';
        const proxies = ProxyUtils.parse(uri);
        expect(proxies).toHaveLength(1);
        expect(proxies[0].type).toBe('ss');
        expect(proxies[0].server).toBe('1.2.3.4');
        expect(proxies[0].port).toBe(8388);
        expect(proxies[0].cipher).toBe('aes-256-gcm');
        expect(proxies[0].password).toBe('password');
        expect(proxies[0].name).toBe('TestNode');
    });

    it('should parse VLESS URI with reality', () => {
        const uri = 'vless://uuid@server:443?security=reality&sni=sni.com&pbk=pubkey&sid=shortid&fp=chrome&type=grpc&serviceName=grpcservice#RealityNode';
        const proxies = ProxyUtils.parse(uri);
        expect(proxies).toHaveLength(1);
        expect(proxies[0].type).toBe('vless');
        expect(proxies[0].tls).toBe(true);
        expect(proxies[0].sni).toBe('sni.com');
        expect(proxies[0]['reality-opts']).toBeDefined();
        expect(proxies[0]['reality-opts']?.['public-key']).toBe('pubkey');
        expect(proxies[0].network).toBe('grpc');
        expect(proxies[0]['grpc-opts']?.['grpc-service-name']).toBe('grpcservice');
    });

    it('should parse Snell URI', () => {
        const uri = 'snell://psk123@5.6.7.8:8080?version=2&obfs=http#SnellNode';
        const proxies = ProxyUtils.parse(uri);
        expect(proxies).toHaveLength(1);
        expect(proxies[0].type).toBe('snell');
        expect(proxies[0].server).toBe('5.6.7.8');
        expect(proxies[0].psk).toBe('psk123');
        expect(proxies[0].version).toBe(2);
        expect(proxies[0].obfs).toBe('http');
    });

    it('should parse Hysteria2 URI', () => {
        const uri = 'hy2://pass@9.9.9.9:443?insecure=1&sni=hy2.com#Hy2Node';
        const proxies = ProxyUtils.parse(uri);
        expect(proxies).toHaveLength(1);
        expect(proxies[0].type).toBe('hysteria2');
        expect(proxies[0].password).toBe('pass');
        expect(proxies[0].sni).toBe('hy2.com');
        expect(proxies[0]['skip-cert-verify']).toBe(true);
    });

    it('should parse AnyTLS URI', () => {
        const uri = 'anytls://mypassword@server.com:443?sni=mysni&insecure=1#AnyTLSNode';
        const proxies = ProxyUtils.parse(uri);
        expect(proxies).toHaveLength(1);
        expect(proxies[0].type).toBe('anytls');
        expect(proxies[0].password).toBe('mypassword');
        expect(proxies[0].sni).toBe('mysni');
        expect(proxies[0]['skip-cert-verify']).toBe(true);
    });
});

describe('ProxyUtils.produce', () => {
    const testProxy: Proxy = {
        type: 'vless',
        name: 'ProduceTest',
        server: '1.1.1.1',
        port: 443,
        uuid: 'test-uuid',
        tls: true,
        sni: 'test.com',
        network: 'ws',
        'ws-opts': { path: '/ws' }
    };

    it('should produce Clash YAML', () => {
        const output = ProxyUtils.produce([testProxy], 'clashmeta') as string;
        expect(output).toContain('proxies:');
        expect(output).toContain('"type":"vless"');
    });

    it('should produce URI (Base64)', () => {
        const output = ProxyUtils.produce([testProxy], 'base64') as string;
        expect(typeof output).toBe('string');
        const { Base64 } = require('js-base64');
        const decoded = Base64.decode(output);
        expect(decoded).toContain('vless://');
        expect(decoded).toContain('ProduceTest');
        expect(decoded).toContain('type=ws');
        expect(decoded).toContain('path=%2Fws');
    });

    it('should produce Sing-Box JSON', () => {
        const output = ProxyUtils.produce([testProxy], 'singbox') as string;
        const json = JSON.parse(output);
        expect(json[0].type).toBe('vless');
        expect(json[0].uuid).toBe('test-uuid');
        expect(json[0].tls.enabled).toBe(true);
        expect(json[0].transport.type).toBe('ws');
        expect(json[0].transport.path).toBe('/ws');
    });
});

describe('ProxyUtils.process', () => {
    const proxies: Proxy[] = [
        { type: 'ss', name: 'Node 1', server: '1.1.1.1', port: 8388, password: 'p1', cipher: 'aes-256-gcm' },
        { type: 'ss', name: 'Node 2', server: '2.2.2.2', port: 8388, password: 'p2', cipher: 'aes-256-gcm' },
        { type: 'ss', name: 'Node 1', server: '1.1.1.1', port: 8388, password: 'p1', cipher: 'aes-256-gcm' } // Duplicate
    ];

    it('should deduplicate nodes', () => {
        const result = ProxyUtils.process(proxies, { dedupe: true });
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Node 1');
        expect(result[1].name).toBe('Node 2');
    });

    it('should rename nodes', () => {
        const result = ProxyUtils.process(proxies, { rename: 'Node==>Server' });
        expect(result[0].name).toBe('Server 1');
    });

    it('should filter nodes (include)', () => {
        const result = ProxyUtils.process(proxies, { include: 'Node 2' });
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Node 2');
    });

    it('should add prefix and suffix', () => {
        const result = ProxyUtils.process([proxies[0]], { prefix: '[PRO] ', suffix: ' (High)' });
        expect(result[0].name).toBe('[PRO] Node 1 (High)');
    });
});
