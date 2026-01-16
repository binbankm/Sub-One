
import { describe, it, expect } from 'vitest';
import { parseVmess } from '../vmess';
import { Base64 } from 'js-base64';

describe('VMess Parser', () => {
    it('should parse V2RayN JSON format (vmess://base64)', () => {
        const config = {
            v: '2',
            ps: 'VMess_Node',
            add: 'example.com',
            port: 443,
            id: 'uuid',
            aid: 0,
            scy: 'auto',
            net: 'ws',
            type: 'none',
            host: 'example.com',
            path: '/ws',
            tls: 'tls',
            sni: 'example.com'
        };
        const url = 'vmess://' + Base64.encode(JSON.stringify(config));
        const node = parseVmess(url);

        expect(node).not.toBeNull();
        expect(node?.type).toBe('vmess');
        expect(node?.name).toBe('VMess_Node');
        expect(node?.transport?.type).toBe('ws');
        expect(node?.transport?.headers?.Host).toBe('example.com');
        expect(node?.tls?.enabled).toBe(true);
    });

    it('should parse legacy V2RayN format (no tls)', () => {
        const config = {
            v: '2',
            ps: 'NoTLS',
            add: '1.2.3.4',
            port: 80,
            id: 'uuid',
            aid: 0,
            net: 'tcp',
            type: 'none'
        };
        const url = 'vmess://' + Base64.encode(JSON.stringify(config));
        const node = parseVmess(url);

        expect(node?.tls?.enabled).toBeFalsy();
    });
});
