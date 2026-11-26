import { KV_KEY_SECRET } from '../config/constants';
import { StorageFactory } from '../services/storage';
import { getStorageBackendInfo } from '../services/storage-backend';
import { Env } from '../types';

export const COOKIE_NAME = 'auth_session';
export const SESSION_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// 内存缓存 Secret，避免频繁读取 KV
let cachedSecret: string | null = null;

/**
 * 获取或生成应用密钥
 * 优先使用内存缓存，其次 KV 存储，最后自动生成并保存
 */
async function getAppSecret(env: Env): Promise<string> {
    if (cachedSecret) return cachedSecret;

    try {
        const info = await getStorageBackendInfo(env);
        const storage = StorageFactory.create(env, info.current);

        let secret = await storage.get<string>(KV_KEY_SECRET);

        if (!secret) {
            // 生成强随机密钥 (64 hex characters)
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            secret = Array.from(array)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

            // 持久化保存
            await storage.put(KV_KEY_SECRET, secret);
            console.log('[Auth] Generated and stored new application secret');
        }

        cachedSecret = secret;
        return secret;
    } catch (e) {
        console.error('[Auth] Failed to get/init app secret:', e);
        // 降级策略：如果 KV 挂了，使用内存生成的临时密钥（但这会导致重启后 Token 失效）
        // 或者是为了避免完全不可用，这里返回一个基于时间的临时值（不推荐），
        // 最好是抛出异常，但在 Serverless 环境为了容错，我们生成一个临时值。
        // 注意：这意味着每次 Worker 重启，所有用户掉线。
        if (!cachedSecret) {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            cachedSecret = Array.from(array)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
        }
        return cachedSecret!;
    }
}

/**
 * 生成签名密钥对象
 */
async function getCryptoKey(secret: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    return await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

/**
 * 生成安全的会话Token（带HMAC签名）
 * 格式：encodedUserId:encodedUsername:timestamp:random:signature
 */
export async function generateSecureToken(
    env: Env,
    userId: string,
    username: string
): Promise<string> {
    const timestamp = Date.now();
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const random = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    const message = `${encodeURIComponent(userId)}:${encodeURIComponent(username)}:${timestamp}:${random}`;

    const secret = await getAppSecret(env);
    const key = await getCryptoKey(secret);

    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));

    const sigHex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    return `${message}:${sigHex}`;
}

function hexToUint8Array(hex: string): Uint8Array | null {
    if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
        return null;
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

/**
 * 验证Token签名并返回用户信息
 */
export async function verifySecureToken(
    token: string,
    env: Env
): Promise<{ valid: boolean; userId?: string; username?: string }> {
    try {
        const parts = token.split(':');
        const secret = await getAppSecret(env);
        const key = await getCryptoKey(secret);
        const encoder = new TextEncoder();

        // 格式：userId:username:timestamp:random:signature（5部分）
        if (parts.length === 5) {
            const [encodedUserId, encodedUsername, timestampStr, random, providedSig] = parts;
            const timestamp = parseInt(timestampStr, 10);

            // 检查过期
            if (isNaN(timestamp) || Date.now() - timestamp > SESSION_DURATION) {
                return { valid: false };
            }

            const sigBytes = hexToUint8Array(providedSig);
            if (!sigBytes) {
                return { valid: false };
            }

            // 验证签名（使用 crypto.subtle.verify 进行常量时间校验）
            const message = `${encodedUserId}:${encodedUsername}:${timestampStr}:${random}`;
            const isValid = await crypto.subtle.verify(
                'HMAC',
                key,
                sigBytes as BufferSource,
                encoder.encode(message)
            );

            if (isValid) {
                return {
                    valid: true,
                    userId: decodeURIComponent(encodedUserId),
                    username: decodeURIComponent(encodedUsername)
                };
            }
            return { valid: false };
        }

        return { valid: false };
    } catch (e) {
        console.error('[Auth] Verification failed:', e);
        return { valid: false };
    }
}

// --- 认证中间件 ---
export async function authMiddleware(
    request: Request,
    env: Env
): Promise<{ valid: boolean; userId?: string; username?: string }> {
    const cookie = request.headers.get('Cookie');
    const prefix = `${COOKIE_NAME}=`;
    const sessionCookie = cookie?.split(';').find((c) => c.trim().startsWith(prefix));
    if (!sessionCookie) return { valid: false };
    const token = sessionCookie.trim().slice(prefix.length);

    if (!token) return { valid: false };

    return await verifySecureToken(token, env);
}
