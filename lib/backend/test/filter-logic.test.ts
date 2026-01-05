
import { describe, it, expect } from 'vitest';
import { SubscriptionParser } from '../subscription-parser';
import { Node } from '../../shared/types';

describe('Advanced Node Filtering Logic', () => {
    const parser = new SubscriptionParser();

    // Mock Nodes
    const nodes: Node[] = [
        {
            id: '1', name: '🇭🇰 HK Premium 01', type: 'vmess', server: 'hk1.com', port: 443, udp: true, uuid: 'u1', alterId: 0, cipher: 'auto'
        },
        {
            id: '2', name: '🇭🇰 HK Standard 02', type: 'ss', server: 'hk2.com', port: 80, udp: true, cipher: 'aes-256-gcm', password: 'p2'
        },
        {
            id: '3', name: '🇺🇸 US Los Angeles', type: 'vless', server: 'us1.com', port: 443, udp: true, uuid: 'u3'
        },
        {
            id: '4', name: '🇯🇵 JP Tokyo', type: 'trojan', server: 'jp1.com', port: 443, udp: true, password: 'p4'
        },
        {
            id: '5', name: '🇸🇬 SG Hysteria', type: 'hysteria2', server: 'sg1.com', port: 443, udp: true, password: 'p5'
        },
        {
            id: '6', name: '🇬🇧 UK London [Expire]', type: 'vmess', server: 'uk1.com', port: 443, udp: true, uuid: 'u6', alterId: 0, cipher: 'auto'
        }
    ];

    it('should handle basic regex exclusion (Blacklist)', () => {
        // Exclude nodes with "Premium" in name
        const result = parser.processNodes(nodes, 'sub1', { exclude: 'Premium' });
        expect(result).toHaveLength(5);
        expect(result.find(n => n.name.includes('Premium'))).toBeUndefined();
    });

    it('should handle protocol exclusion (proto:)', () => {
        // Exclude all VMess nodes
        const result = parser.processNodes(nodes, 'sub1', { exclude: 'proto:vmess' });
        // Node 1 (VMess) and Node 6 (VMess) should be gone
        expect(result).toHaveLength(4);
        expect(result.some(n => n.type === 'vmess')).toBe(false);
    });

    it('should handle protocol whitelist (keep:proto:)', () => {
        // Keep only SS and VLESS
        const result = parser.processNodes(nodes, 'sub1', { exclude: 'keep:proto:ss,vless' });
        // Should keep Node 2 (SS) and Node 3 (VLESS)
        expect(result).toHaveLength(2);
        expect(result.map(n => n.id).sort()).toEqual(['2', '3'].sort());
    });

    it('should handle regex whitelist (keep:)', () => {
        // Keep only HK and US nodes
        const result = parser.processNodes(nodes, 'sub1', { exclude: 'keep:(HK|US)' });
        // Should keep Node 1, 2, 3
        expect(result).toHaveLength(3);
        const names = result.map(n => n.name);
        expect(names).toContain('🇭🇰 HK Premium 01');
        expect(names).toContain('🇺🇸 US Los Angeles');
        expect(names).not.toContain('🇯🇵 JP Tokyo');
    });

    it('should handle mixed blacklist and whitelist (Blacklist Priority)', () => {
        // Rule: Keep HK nodes, BUT Exclude "Premium"
        // Node 1 is HK but Premium -> Exclude
        // Node 2 is HK and Standard -> Keep
        // Others -> Exclude (not in whitelist)
        const rules = [
            'keep:HK',
            'Premium'
        ].join('\n');

        const result = parser.processNodes(nodes, 'sub1', { exclude: rules });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
    });

    it('should handle multiple protocol aliases', () => {
        // Test front-end alias 'wg' for 'wireguard' (if we had one) or 'hysteria' matching
        const result = parser.processNodes(nodes, 'sub1', { exclude: 'keep:proto:hysteria' });
        // Should match 'hysteria2' type? 
        // Our logic: cleanRule='hysteria', nodeType='hysteria2'. 'hysteria2' === 'hysteria'? No.
        // Wait, let's check the code: 
        // if (p === 'ss' && (nodeType === 'ss' || nodeType === 'ssr')) ...
        // It does strictly match otherwise.
        // Let's test exact match for Hysteria2
        expect(result).toHaveLength(0); // Expect strict match failure if code is strict

        const result2 = parser.processNodes(nodes, 'sub1', { exclude: 'keep:proto:hysteria2' });
        expect(result2).toHaveLength(1);
        expect(result2[0].type).toBe('hysteria2');
    });

    it('should be robust against empty lines and whitespace', () => {
        const rules = `
            
            keep:proto:ss
               
        `;
        const result = parser.processNodes(nodes, 'sub1', { exclude: rules });
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('ss');
    });
});
