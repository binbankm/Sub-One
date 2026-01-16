import { describe, it, expect } from 'vitest';
import { toSingBox, nodeToSingBoxOutbound } from '../singbox-converter';
import { mockNodes, allNodes } from './mock-nodes';

describe('Sing-Box Converter', () => {
    it('should convert VMess correctly', () => {
        const result = nodeToSingBoxOutbound(mockNodes.vmess);
        expect(result).toBeDefined();
        if (!result) return;

        expect(result.type).toBe('vmess');
        expect(result.tag).toBe(mockNodes.vmess.name);
        expect(result.server).toBe(mockNodes.vmess.server);
        expect(result.server_port).toBe(mockNodes.vmess.port);
        expect(result.uuid).toBe(mockNodes.vmess.uuid);
        expect(result.tls?.enabled).toBe(true);
        expect(result.tls?.server_name).toBe(mockNodes.vmess.tls?.serverName);
        expect((result.transport as any)?.type).toBe('ws');
        expect((result.transport as any)?.path).toBe(mockNodes.vmess.transport?.path);
        expect((result.transport as any)?.headers).toEqual(mockNodes.vmess.transport?.headers);
    });

    it('should convert VLESS Reality correctly', () => {
        const result = nodeToSingBoxOutbound(mockNodes.vlessReality);
        expect(result).toBeDefined();
        if (!result) return;

        expect(result.type).toBe('vless');
        expect(result.flow).toBe(mockNodes.vlessReality.flow);
        expect(result.tls?.enabled).toBe(true);
        expect(result.tls?.reality?.enabled).toBe(true);
        expect(result.tls?.reality?.public_key).toBe(mockNodes.vlessReality.tls?.reality?.publicKey);
        expect(result.tls?.reality?.short_id).toBe(mockNodes.vlessReality.tls?.reality?.shortId);
    });

    it('should convert Hysteria2 correctly', () => {
        const result = nodeToSingBoxOutbound(mockNodes.hysteria2);
        expect(result).toBeDefined();
        if (!result) return;

        expect(result.type).toBe('hysteria2');
        expect(result.password).toBe(mockNodes.hysteria2.password);
        expect(result.tls?.enabled).toBe(true);
        expect(result.tls?.insecure).toBe(true);
        expect((result.obfs as any)?.type).toBe(mockNodes.hysteria2.obfs?.type);
        expect((result.obfs as any)?.password).toBe(mockNodes.hysteria2.obfs?.password);
    });

    it('should convert WireGuard correctly', () => {
        const result = nodeToSingBoxOutbound(mockNodes.wireguard);
        expect(result).toBeDefined();
        if (!result) return;

        expect(result.type).toBe('wireguard');
        expect(result.private_key).toBe(mockNodes.wireguard.privateKey);
        expect(result.peer_public_key).toBe(mockNodes.wireguard.publicKey);
        expect(result.pre_shared_key).toBe(mockNodes.wireguard.preSharedKey);
        expect(result.local_address).toEqual([mockNodes.wireguard.ip, mockNodes.wireguard.ipv6]);
        expect(result.mtu).toBe(mockNodes.wireguard.mtu);
    });

    it('should generate valid JSON config', () => {
        const jsonOutput = toSingBox(allNodes);
        const parsed = JSON.parse(jsonOutput);

        expect(parsed.outbounds).toBeDefined();
        expect(parsed.outbounds.length).toBeGreaterThanOrEqual(1); // 至少有一个节点被成功转换

        // Check if nodes are in outbounds
        const tags = parsed.outbounds.map((o: any) => o.tag);
        expect(tags).toContain(mockNodes.vmess.name);
        expect(tags).toContain(mockNodes.vlessReality.name);
        expect(tags).toContain(mockNodes.hysteria2.name);
    });
});
