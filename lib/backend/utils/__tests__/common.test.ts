import { describe, expect, it, vi } from 'vitest';

import { formatBytes, isSafePublicUrl, parseUserInfoHeader, safeFetch } from '../common';

describe('Backend Common Utilities & SSRF Guard', () => {
    it('isSafePublicUrl should block private, loopback, link-local, DNS rebinding, and encoded IPs', () => {
        const unsafe = [
            '',
            'ftp://example.com/file',
            'http://localhost:8080',
            'http://sub.localhost/test',
            'http://router.local',
            'http://metadata.internal',
            'http://127.0.0.1/admin',
            'http://127.0.0.1.nip.io/admin',
            'http://10.0.0.1/api',
            'http://192.168.1.1/',
            'http://172.16.0.1/',
            'http://169.254.169.254/latest/meta-data/',
            'http://[::1]:8080/',
            'http://[fe80::1]/',
            'http://[fd00::1]/',
            'http://2130706433/',
            'http://0x7f000001/',
            'http://0177.0.0.1/'
        ];
        for (const u of unsafe) {
            expect(isSafePublicUrl(u), `Expected unsafe: ${u}`).toBe(false);
        }

        expect(isSafePublicUrl('https://sub.example.com/api/v1?token=123')).toBe(true);
        expect(isSafePublicUrl('http://1.1.1.1/sub')).toBe(true);
    });

    it('safeFetch should block unsafe initial URLs and unsafe redirect targets', async () => {
        await expect(safeFetch('http://127.0.0.1:8080/secret')).rejects.toThrow('Forbidden or unsafe URL');

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
            new Response(null, {
                status: 302,
                headers: { location: 'http://169.254.169.254/latest/meta-data/' }
            })
        );
        await expect(safeFetch('https://example.com/redirect')).rejects.toThrow('Forbidden or unsafe URL');
        fetchSpy.mockRestore();
    });

    it('parseUserInfoHeader and formatBytes should parse valid inputs', () => {
        expect(parseUserInfoHeader('upload=1024; download=2048; total=1048576; expire=1700000000')).toEqual({
            upload: 1024,
            download: 2048,
            total: 1048576,
            expire: 1700000000
        });
        expect(parseUserInfoHeader(null)).toBeNull();
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(1024).trim()).toBe('1 KB');
    });
});
