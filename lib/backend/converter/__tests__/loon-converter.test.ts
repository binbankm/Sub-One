import { describe, it, expect } from 'vitest';
import { toLoon, nodeToLoonLine } from '../loon-converter';
import { mockNodes, allNodes } from './mock-nodes';

describe('Loon Converter', () => {
    it('should convert VMess correctly', () => {
        const line = nodeToLoonLine(mockNodes.vmess);
        console.log('Loon VMess:', line);
        expect(line).toContain(`${mockNodes.vmess.name} = vmess`);
        expect(line).toContain(mockNodes.vmess.server);
        expect(line).toContain(`"${mockNodes.vmess.uuid}"`);
        expect(line).toContain('over-tls=true');
        expect(line).toContain(`tls-name=${mockNodes.vmess.tls?.serverName}`);
        expect(line).toContain('transport=ws');
        expect(line).toContain(`path=${mockNodes.vmess.transport?.path}`);
    });

    it('should convert VLESS Reality correctly', () => {
        const line = nodeToLoonLine(mockNodes.vlessReality);
        expect(line).toContain(`${mockNodes.vlessReality.name} = vless`);
        expect(line).toContain(`"${mockNodes.vlessReality.uuid}"`);
        expect(line).toContain('over-tls=true');
        expect(line).toContain(`reality-pbk=${mockNodes.vlessReality.tls?.reality?.publicKey}`);
        expect(line).toContain(`reality-sid=${mockNodes.vlessReality.tls?.reality?.shortId}`);
    });

    it('should convert Hysteria2 correctly', () => {
        const line = nodeToLoonLine(mockNodes.hysteria2);
        expect(line).toContain(`${mockNodes.hysteria2.name} = hysteria2`);
        expect(line).toContain(`"${mockNodes.hysteria2.password}"`);
        expect(line).toContain(`sni=${mockNodes.hysteria2.tls?.serverName}`);
        expect(line).toContain('skip-cert-verify=true');
        expect(line).toContain(`obfs=${mockNodes.hysteria2.obfs?.type}`);
    });

    it('should convert SSR correctly', () => {
        const line = nodeToLoonLine(mockNodes.ssr);
        expect(line).toContain(`${mockNodes.ssr.name} = shadowsocksr`);
        expect(line).toContain(mockNodes.ssr.protocol);
        expect(line).toContain(mockNodes.ssr.obfs);
        expect(line).toContain(`protocol-param="${mockNodes.ssr.protocolParam}"`);
    });

    it('should convert WireGuard correctly', () => {
        const line = nodeToLoonLine(mockNodes.wireguard);
        expect(line).toContain(`${mockNodes.wireguard.name} = wireguard`);
        expect(line).toContain(`private-key="${mockNodes.wireguard.privateKey}"`);
        expect(line).toContain(`public-key="${mockNodes.wireguard.publicKey}"`);
    });

    it('should generate valid config content', () => {
        const output = toLoon(allNodes);
        expect(output).toContain('[Proxy]');
        expect(output).toContain(mockNodes.vmess.name);
        expect(output).toContain(mockNodes.vlessReality.name);
    });
});
