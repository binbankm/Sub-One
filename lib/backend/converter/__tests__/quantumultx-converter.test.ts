import { describe, it, expect } from 'vitest';
import { toQuantumultX, nodeToQuantumultXLine } from '../quantumultx-converter';
import { mockNodes, allNodes } from './mock-nodes';

describe('QuantumultX Converter', () => {
    it('should convert VMess correctly', () => {
        const line = nodeToQuantumultXLine(mockNodes.vmess);
        console.log('VMess Output:', line);
        expect(line).toContain(`tag=${mockNodes.vmess.name}`);
        expect(line).toContain('vmess=');
        expect(line).toContain(mockNodes.vmess.server);
        expect(line).toContain(`password=${mockNodes.vmess.uuid}`);
        expect(line).toContain('over-tls=true');
        expect(line).toContain(`tls-host=${mockNodes.vmess.tls?.serverName}`);
        expect(line).toContain('obfs=ws');
        expect(line).toContain(`obfs-uri=${mockNodes.vmess.transport?.path}`);
    });

    it('should convert VLESS correctly', () => {
        const line = nodeToQuantumultXLine(mockNodes.vlessReality);
        // Note: QX VLESS support might be basic, check implementation
        // Our converter has: vless=...
        expect(line).toContain(`tag=${mockNodes.vlessReality.name}`);
        expect(line).toContain('vless=');
        expect(line).toContain(mockNodes.vlessReality.server);
    });

    it('should convert SSR correctly', () => {
        const line = nodeToQuantumultXLine(mockNodes.ssr);
        expect(line).toContain(`tag=${mockNodes.ssr.name}`);
        expect(line).toContain('shadowsocks=');
        expect(line).toContain(`ssr-protocol=${mockNodes.ssr.protocol}`);
        expect(line).toContain(`obfs=${mockNodes.ssr.obfs}`);
        expect(line).toContain(`ssr-protocol-param=${mockNodes.ssr.protocolParam}`);
    });

    it('should handle Unsupported protocols as null', () => {
        expect(nodeToQuantumultXLine(mockNodes.hysteria2)).toBeNull();
        expect(nodeToQuantumultXLine(mockNodes.tuic)).toBeNull();
        expect(nodeToQuantumultXLine(mockNodes.wireguard)).toBeNull();
    });

    it('should generate valid config content', () => {
        const output = toQuantumultX(allNodes);
        expect(output).toContain('[server_local]');
        expect(output).toContain(mockNodes.vmess.name);
        // Should not contain unsupported protocols
        expect(output).not.toContain(mockNodes.hysteria2.name);
    });
});
