import { describe, it } from 'vitest';
import { parseNodeUrl } from '../parsers/index';
import { buildNodeUrl } from '../url-builder';
import * as crypto from 'node:crypto';

if (typeof global !== 'undefined' && !global.crypto) {
    (global as any).crypto = crypto;
}

describe('VLESS Debug', () => {
    it('should parse and rebuild correctly', () => {
        const source = 'vless://28149cfe-2fae-47e9-8af4-a81a34890d2c@160.191.29.51:64760?sni=apple.com&fp=chrome&allowInsecure=1&pbk=N14RTyjxj34hx8hqmuJFSwfbFvcWuwomgIND39gcFwo&sid=b38c62c2&flow=xtls-rprx-vision&security=reality#%F0%9F%87%AE%F0%9F%87%B3%20IN-Host';

        const node = parseNodeUrl(source);
        console.log('Parsed Node:', JSON.stringify(node, null, 2));

        if (node) {
            const built = buildNodeUrl(node);
            const output = `Parsed Node:\n${JSON.stringify(node, null, 2)}\n\nBuilt URL:\n${built}`;
            import('fs').then(fs => fs.writeFileSync('debug-vless-output.txt', output));
        }
    });
});
