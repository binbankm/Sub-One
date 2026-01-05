
import { Env } from '../types';

export const COOKIE_NAME = 'auth_session';
export const SESSION_DURATION = 8 * 60 * 60 * 1000;

/**
 * 生成安全的会话Token（带HMAC签名）
 * @param env Cloudflare环境对象
 * @returns Promise<string> 格式：timestamp:random:signature
 */
export async function generateSecureToken(env: Env): Promise<string> {
    const timestamp = Date.now();
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const random = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const message = `${timestamp}:${random}`;

    // 使用ADMIN_PASSWORD作为密钥进行HMAC签名
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
 * 验证Token签名
 * @param token Token字符串
 * @param env Cloudflare环境对象
 * @returns Promise<boolean> 是否有效
 */
export async function verifySecureToken(token: string, env: Env): Promise<boolean> {
    try {
        const parts = token.split(':');

        // 新格式：timestamp:random:signature（3部分）
        if (parts.length === 3) {
            const [timestampStr, random, providedSig] = parts;
            const timestamp = parseInt(timestampStr, 10);

            // 检查过期
            if (isNaN(timestamp) || (Date.now() - timestamp > SESSION_DURATION)) {
                return false;
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

            return providedSig === expectedSigHex;
        }

        // 旧格式（向后兼容）：纯时间戳（1部分）
        if (parts.length === 1) {
            const timestamp = parseInt(token, 10);
            return !isNaN(timestamp) && (Date.now() - timestamp < SESSION_DURATION);
        }

        return false;
    } catch {
        return false;
    }
}

// --- 认证中间件 ---
export async function authMiddleware(request: Request, env: Env): Promise<boolean> {
    const cookie = request.headers.get('Cookie');
    const sessionCookie = cookie?.split(';').find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
    if (!sessionCookie) return false;
    const token = sessionCookie.split('=')[1];

    // 使用新的安全验证函数
    return await verifySecureToken(token, env);
}
