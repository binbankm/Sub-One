
import { describe, it, expect } from 'vitest';
import { parseTrojan } from '../trojan';

describe('Trojan Parser', () => {
    it('should parse standard Trojan url', () => {
        const url = 'trojan://password@example.com:443?security=tls&sni=example.com&type=tcp#Trojan';
        const node = parseTrojan(url);

        expect(node).not.toBeNull();
        expect(node?.type).toBe('trojan');
        expect(node?.password).toBe('password');
        expect(node?.tls?.enabled).toBe(true);
        expect(node?.tls?.serverName).toBe('example.com');
    });

    it('should handle trojan-go ws', () => {
        const url = 'trojan://password@example.com:443?type=ws&path=/trojan&host=example.com#Trojan-WS';
        const node = parseTrojan(url);

        expect(node?.transport?.type).toBe('ws');
        expect(node?.transport?.path).toBe('/trojan');
    });
});
