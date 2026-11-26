import { describe, expect, it } from 'vitest';

import type { Env } from '../../types';
import { generateSecureToken, verifySecureToken } from '../auth';

function createMockEnv(): Env {
    const store = new Map<string, string>();
    return {
        SUB_ONE_KV: {
            get: async (key: string) => store.get(key) ?? null,
            put: async (key: string, val: string) => {
                store.set(key, val);
            },
            delete: async (key: string) => {
                store.delete(key);
            }
        }
    } as unknown as Env;
}

describe('Auth Session Token (generateSecureToken & verifySecureToken)', () => {
    it('should generate and verify a valid HMAC-signed session token', async () => {
        const env = createMockEnv();
        const token = await generateSecureToken(env, 'user-123', 'admin');
        const verified = await verifySecureToken(token, env);

        expect(verified.valid).toBe(true);
        expect(verified.userId).toBe('user-123');
        expect(verified.username).toBe('admin');
    });

    it('should reject tampered or malformed tokens', async () => {
        const env = createMockEnv();
        const token = await generateSecureToken(env, 'user-123', 'admin');
        const parts = token.split(':');
        const tampered = [...parts.slice(0, 4), '0'.repeat(64)].join(':');

        expect((await verifySecureToken(tampered, env)).valid).toBe(false);
        expect((await verifySecureToken('malformed', env)).valid).toBe(false);
        expect((await verifySecureToken('', env)).valid).toBe(false);
    });
});
