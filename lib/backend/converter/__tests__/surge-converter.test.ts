import { describe, it, expect } from 'vitest';
import { toSurge, nodeToSurgeLine } from '../surge-converter';
import { mockNodes, allNodes } from './mock-nodes';

describe('Surge Converter', () => {
    it('should convert VMess correctly', () => {
        const line = nodeToSurgeLine(mockNodes.vmess);
        console.log('Surge VMess:', line);
        expect(line).toContain(`${mockNodes.vmess.name} = vmess`);
        expect(line).toContain(mockNodes.vmess.server);
        expect(line).toContain(mockNodes.vmess.port.toString());
        expect(line).toContain(`username=${mockNodes.vmess.uuid}`);
        // Check implementation details
        expect(line).toContain('tls=true');
        expect(line).toContain(`sni=${mockNodes.vmess.tls?.serverName}`);
        expect(line).toContain('ws=true');
        expect(line).toContain(`ws-path=${mockNodes.vmess.transport?.path}`);
    });

    it('should convert Hysteria2 correctly', () => {
        const line = nodeToSurgeLine(mockNodes.hysteria2);
        expect(line).toContain(`${mockNodes.hysteria2.name} = hysteria2`);
        expect(line).toContain(mockNodes.hysteria2.server);
        expect(line).toContain(`password=${mockNodes.hysteria2.password}`);
        expect(line).toContain(`sni=${mockNodes.hysteria2.tls?.serverName}`);
        expect(line).toContain('skip-cert-verify=true');
        expect(line).toContain(`obfs=${mockNodes.hysteria2.obfs?.type}`);
    });

    it('should convert TUIC correctly', () => {
        const line = nodeToSurgeLine(mockNodes.tuic);
        expect(line).toContain(`${mockNodes.tuic.name} = tuic`);
        expect(line).toContain(mockNodes.tuic.server);
        expect(line).toContain(`uuid=${mockNodes.tuic.uuid}`);
        expect(line).toContain(`password=${mockNodes.tuic.password}`);
        expect(line).toContain(`alpn=${mockNodes.tuic.tls?.alpn?.join(',')}`);
    });

    it('should handle VLESS as null (not supported)', () => {
        // Surge does not support VLESS
        const line = nodeToSurgeLine(mockNodes.vlessReality);
        expect(line).toBeNull();
    });

    it('should convert WireGuard to comment', () => {
        const line = nodeToSurgeLine(mockNodes.wireguard);
        expect(line).toContain('# WireGuard');
        expect(line).toContain('请在 [WireGuard');
    });

    it('should generate valid config content', () => {
        const output = toSurge(allNodes);
        expect(output).toContain('[Proxy]');
        expect(output).toContain(mockNodes.vmess.name);
        expect(output).toContain(mockNodes.hysteria2.name);
        // VLESS shouldn't be there
        expect(output).not.toContain(mockNodes.vlessReality.name + ' = vless');
    });
});
