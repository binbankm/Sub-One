import { describe, it, expect } from 'vitest';
import { parse } from '../index';

describe('ProxyUtils Protocol Detail Tests', () => {
    it('should parse Hysteria2 correctly', () => {
        const uri = 'hysteria2://pass@host:1234?insecure=1&obfs=salamander&obfs-password=obfspass&up=100&down=200#Hy2Node';
        const nodes = parse(uri);
        expect(nodes.length).toBe(1);
        const node = nodes[0];
        expect(node.type).toBe('hysteria2');
        expect(node.password).toBe('pass');
        expect(node.server).toBe('host');
        expect(node.port).toBe(1234);
        expect(node.obfs).toBe('salamander');
        expect(node['obfs-password']).toBe('obfspass');
        expect(node.up).toBe(100);
        expect(node.down).toBe(200);
        expect(node.name).toBe('Hy2Node');
    });

    it('should parse VLESS Reality correctly', () => {
        const uri = 'vless://uuid@host:443?security=reality&sni=sni.com&fp=chrome&pbk=pubkey&sid=shortid#RealityNode';
        const nodes = parse(uri);
        expect(nodes.length).toBe(1);
        const node = nodes[0];
        expect(node.type).toBe('vless');
        expect(node.tls).toBe(true);
        expect(node.sni).toBe('sni.com');
        expect(node['reality-opts']).toBeDefined();
        expect(node['reality-opts']?.['public-key']).toBe('pubkey');
        expect(node['reality-opts']?.['short-id']).toBe('shortid');
        expect(node.name).toBe('RealityNode');
    });

    it('should parse WireGuard correctly', () => {
        const uri = 'wireguard://privkey@host:51820?ip=10.0.0.1&mtu=1420&reserved=1,2,3#WGNode';
        const nodes = parse(uri);
        expect(nodes.length).toBe(1);
        const node = nodes[0];
        expect(node.type).toBe('wireguard');
        expect(node['private-key']).toBe('privkey');
        expect(node.ip).toBe('10.0.0.1');
        expect(node.mtu).toBe(1420);
        expect(node.reserved).toEqual([1, 2, 3]);
        expect(node.name).toBe('WGNode');
    });

    it('should parse TUIC correctly', () => {
        const uri = 'tuic://uuid:pass@host:443?congestion_control=bbr&alpn=h3#TUICNode';
        const nodes = parse(uri);
        expect(nodes.length).toBe(1);
        const node = nodes[0];
        expect(node.type).toBe('tuic');
        expect(node.uuid).toBe('uuid');
        expect(node.password).toBe('pass');
        expect(node['congestion-controller']).toBe('bbr');
        expect(node.alpn).toEqual(['h3']);
    });

    it('should parse AnyTLS correctly', () => {
        const uri = 'anytls://pass@host:443?sni=sni.com&fp=chrome&idle_timeout=60#AnyNode';
        const nodes = parse(uri);
        expect(nodes.length).toBe(1);
        const node = nodes[0];
        expect(node.type).toBe('anytls');
        expect(node.password).toBe('pass');
        expect(node.sni).toBe('sni.com');
        expect(node['client-fingerprint']).toBe('chrome');
        expect(node.idleTimeout).toBe(60);
        expect(node.name).toBe('AnyNode');
    });

    it('should parse Naive correctamente', () => {
        const uri = 'naive+https://user:pass@host:443?sni=sni.com&padding=true#NaiveNode';
        const nodes = parse(uri);
        expect(nodes.length).toBe(1);
        const node = nodes[0];
        expect(node.type).toBe('naive');
        expect(node.username).toBe('user');
        expect(node.password).toBe('pass');
        expect(node.sni).toBe('sni.com');
        expect(node.padding).toBe(true);
        expect(node.name).toBe('NaiveNode');
    });
});
