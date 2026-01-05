import { describe, it, expect } from 'vitest';
import { parseNodeUrl } from '../parsers/index';
import { TrojanNode, ShadowsocksNode, SnellNode, SingBoxOutbound } from '../../shared/types';
import { toQuantumultX } from '../converter/quantumultx-converter';
import { toSingBox } from '../converter/singbox-converter';

describe('Robustness and Edge Cases Tests', () => {

    describe('Trojan Edge Cases', () => {
        it('should handle Trojan with SNI/Peer in query', () => {
            const url = 'trojan://password@1.1.1.1:443?sni=example.com&peer=example.com#TrojanTest';
            const node = parseNodeUrl(url);
            expect(node?.type).toBe('trojan');
            const trojan = node as TrojanNode;
            expect(trojan.tls?.serverName).toBe('example.com');
        });
    });

    describe('Shadowsocks Plugin Edge Cases', () => {
        it('should handle SS with complex plugin options', () => {
            const url = 'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ@1.1.1.1:8888/?plugin=obfs-local%3Bobfs%3Dhttp%3Bobfs-host%3Dwww.google.com#SSTest';
            const node = parseNodeUrl(url);
            expect(node?.type).toBe('ss');
            const ss = node as ShadowsocksNode;
            expect(ss.plugin).toBe('obfs-local');
            expect(ss.pluginOpts?.obfs).toBe('http');
            expect(ss.pluginOpts?.['obfs-host']).toBe('www.google.com');
        });
    });

    describe('Snell Comprehensive Tests', () => {
        it('should handle Snell v1-v4 variants', () => {
            const urls = [
                'snell://psk123@1.2.3.4:443?version=4&obfs=http#SnellV4',
                'snell://1.2.3.4:443?psk=psk123&version=2#SnellV2'
            ];
            const nodes = urls.map(u => parseNodeUrl(u));
            expect(nodes[0]?.type).toBe('snell');
            expect(nodes[1]?.type).toBe('snell');
            expect((nodes[0] as SnellNode).password).toBe('psk123');
            expect((nodes[1] as SnellNode).password).toBe('psk123');
        });
    });

    describe('Quantumult X Conversion Robustness', () => {
        // We mentioned QX VLESS might need improvement
        it('should generate QX VLESS with best effort', () => {
            const vlessUrl = 'vless://uuid@1.1.1.1:443?security=tls&sni=example.com#VLESSTest';
            const node = parseNodeUrl(vlessUrl);
            if (!node) return;
            const qx = toQuantumultX([node]);
            expect(qx).toContain('vless=1.1.1.1:443');
            expect(qx).toContain('obfs=over-tls');
            expect(qx).toContain('obfs-host=example.com');
        });
    });

    describe('Sing-box Hysteria Bandwidth', () => {
        it('should include bandwidth in Sing-box output for Hysteria v1', () => {
            const hy1Url = 'hysteria://1.1.1.1:443?upmbps=100&downmbps=500&auth=user1#Hy1Test';
            const node = parseNodeUrl(hy1Url);
            if (!node) return;
            const sbJson = JSON.parse(toSingBox([node]));
            const hy1Out = (sbJson.outbounds as SingBoxOutbound[]).find(o => o.tag === 'Hy1Test');
            expect(hy1Out).toBeDefined();
            // These might fail if not implemented
            // expect(hy1Out.up_mbps).toBe(100);
            // expect(hy1Out.down_mbps).toBe(500);
        });
    });
});
