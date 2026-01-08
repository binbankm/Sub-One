
import { Env } from '../types';

export const COOKIE_NAME = 'auth_session';
export const SESSION_DURATION = 8 * 60 * 60 * 1000;

/**
 * 生成安全的会话Token（带HMAC签名）
 * @param env Cloudflare环境对象
 * @param userId 用户ID
 * @param username 用户名
 * @returns Promise<string> 格式：userId:username:timestamp:random:signature
 */
export async function generateSecureToken(env: Env, userId: string, username: string): Promise<string> {
    const timestamp = Date.now();
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const random = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const message = `${userId}:${username}:${timestamp}:${random}`;

    // 使用ADMIN_PASSWORD作为密钥进行HMAC签名（向后兼容）
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(env.ADMIN_PASSWORD || 'default-secret'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(message)
    );

    const sigHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return `${message}:${sigHex}`;
}

/**
 * 验证Token签名并返回用户信息
 * @param token Token字符串
 * @param env Cloudflare环境对象
 * @returns Promise<{ valid: boolean; userId?: string; username?: string }> 验证结果及用户信息
 */
export async function verifySecureToken(token: string, env: Env): Promise<{ valid: boolean; userId?: string; username?: string }> {
    try {
        const parts = token.split(':');

        // 新格式：userId:username:timestamp:random:signature（5部分）
        if (parts.length === 5) {
            const [userId, username, timestampStr, random, providedSig] = parts;
            const timestamp = parseInt(timestampStr, 10);

            // 检查过期
            if (isNaN(timestamp) || (Date.now() - timestamp > SESSION_DURATION)) {
                return { valid: false };
            }

            // 验证签名
            const message = `${userId}:${username}:${timestampStr}:${random}`;
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
                'raw',
                encoder.encode(env.ADMIN_PASSWORD || 'default-secret'),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );

            const expectedSig = await crypto.subtle.sign(
                'HMAC',
                key,
                encoder.encode(message)
            );

            const expectedSigHex = Array.from(new Uint8Array(expectedSig))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            if (providedSig === expectedSigHex) {
                return { valid: true, userId, username };
            }
            return { valid: false };
        }

        // 旧格式（向后兼容）：timestamp:random:signature（3部分）
        if (parts.length === 3) {
            const [timestampStr, random, providedSig] = parts;
            const timestamp = parseInt(timestampStr, 10);

            // 检查过期
            if (isNaN(timestamp) || (Date.now() - timestamp > SESSION_DURATION)) {
                return { valid: false };
            }

            // 验证签名
            const message = `${timestampStr}:${random}`;
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
                'raw',
                encoder.encode(env.ADMIN_PASSWORD || 'default-secret'),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );

            const expectedSig = await crypto.subtle.sign(
                'HMAC',
                key,
                encoder.encode(message)
            );

            const expectedSigHex = Array.from(new Uint8Array(expectedSig))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            if (providedSig === expectedSigHex) {
                return { valid: true }; // 旧token不包含用户信息
            }
            return { valid: false };
        }

        // 更旧格式（向后兼容）：纯时间戳（1部分）
        if (parts.length === 1) {
            const timestamp = parseInt(token, 10);
            if (!isNaN(timestamp) && (Date.now() - timestamp < SESSION_DURATION)) {
                return { valid: true }; // 旧token不包含用户信息
            }
        }

        return { valid: false };
    } catch {
        return { valid: false };
    }
}

// --- 认证中间件 ---
export async function authMiddleware(request: Request, env: Env): Promise<{ valid: boolean; userId?: string; username?: string }> {
    const cookie = request.headers.get('Cookie');
    const sessionCookie = cookie?.split(';').find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
    if (!sessionCookie) return { valid: false };
    const token = sessionCookie.split('=')[1];

    // 使用新的安全验证函数
    return await verifySecureToken(token, env);
}
