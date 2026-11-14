import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../users';

describe('User Authentication & Password Hashing', () => {
    it('generates pbkdf2 hash format with random salt', async () => {
        const password = 'mySecretPassword123!';
        const hash1 = await hashPassword(password);
        const hash2 = await hashPassword(password);

        expect(hash1.startsWith('pbkdf2:')).toBe(true);
        expect(hash2.startsWith('pbkdf2:')).toBe(true);
        // Salt ensures two hashes of identical passwords are distinct
        expect(hash1).not.toBe(hash2);
    });

    it('verifies correct password against pbkdf2 hash', async () => {
        const password = 'CorrectPassword#456';
        const hash = await hashPassword(password);

        const isMatch = await verifyPassword(password, hash);
        expect(isMatch).toBe(true);

        const isWrong = await verifyPassword('WrongPassword', hash);
        expect(isWrong).toBe(false);
    });

    it('verifies legacy SHA-256 hash for backward compatibility', async () => {
        const password = 'admin';
        // Compute raw SHA-256 hash of 'admin':
        // echo -n 'admin' | shasum -a 256 -> 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
        const legacyHash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

        const isMatch = await verifyPassword(password, legacyHash);
        expect(isMatch).toBe(true);

        const isWrong = await verifyPassword('wrong-password', legacyHash);
        expect(isWrong).toBe(false);
    });
});
