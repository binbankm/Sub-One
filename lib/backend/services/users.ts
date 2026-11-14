import { KV_KEY_USERS } from '../config/constants';
import { User, UserRole } from '../proxy/types';
import { Env } from '../types';
import { StorageFactory } from './storage';
import { getStorageBackendInfo } from './storage-backend';

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
}

/**
 * 获取当前活动的存储服务实例
 */
async function getStorage(env: Env) {
    const info = await getStorageBackendInfo(env);
    return StorageFactory.create(env, info.current);
}

/**
 * 使用 Web Crypto API 生成 PBKDF2 密码哈希（带 16 字节随机盐）
 */
export async function hashPassword(password: string, salt?: Uint8Array): Promise<string> {
    const saltBytes = salt || crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBytes as any,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        KEY_BYTES * 8
    );
    const saltHex = bufferToHex(saltBytes);
    const hashHex = bufferToHex(derivedBits);
    return `pbkdf2:${saltHex}:${PBKDF2_ITERATIONS}:${hashHex}`;
}

/**
 * 验证密码（支持 PBKDF2 和历史旧版本单轮无盐 SHA-256 哈希）
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (storedHash.startsWith('pbkdf2:')) {
        const parts = storedHash.split(':');
        if (parts.length === 4) {
            const [, saltHex, iterationsStr, expectedHashHex] = parts;
            const iterations = parseInt(iterationsStr, 10);
            const saltBytes = hexToBuffer(saltHex);
            const encoder = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password),
                { name: 'PBKDF2' },
                false,
                ['deriveBits']
            );
            const derivedBits = await crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: saltBytes as any,
                    iterations: iterations || PBKDF2_ITERATIONS,
                    hash: 'SHA-256'
                },
                keyMaterial,
                KEY_BYTES * 8
            );
            const derivedHashHex = bufferToHex(derivedBits);
            return timingSafeEqual(derivedHashHex, expectedHashHex);
        }
    }

    // 历史旧版本 SHA-256 单轮哈希向下兼容校验
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const legacyHash = bufferToHex(hashBuffer);
    return timingSafeEqual(legacyHash, storedHash);
}

/**
 * 从存储获取所有用户
 */
export async function getAllUsers(env: Env): Promise<User[]> {
    try {
        const storage = await getStorage(env);
        const users = await storage.get<User[]>(KV_KEY_USERS);
        return users || [];
    } catch (e) {
        console.error('[UserService] Failed to get users:', e);
        return [];
    }
}

/**
 * 根据用户名查找用户
 */
export async function getUserByUsername(env: Env, username: string): Promise<User | null> {
    const users = await getAllUsers(env);
    return users.find((u) => u.username === username) || null;
}

/**
 * 创建新用户
 */
export async function createUser(
    env: Env,
    username: string,
    password: string,
    role: UserRole = 'user'
): Promise<User> {
    const users = await getAllUsers(env);

    // 检查用户名是否已存在
    if (users.some((u) => u.username === username)) {
        throw new Error('用户名已存在');
    }

    const newUser: User = {
        id: crypto.randomUUID(),
        username,
        passwordHash: await hashPassword(password),
        role,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    users.push(newUser);

    const storage = await getStorage(env);
    await storage.put(KV_KEY_USERS, users);

    return newUser;
}

/**
 * 更新用户
 */
export async function updateUser(
    env: Env,
    userId: string,
    updates: { password?: string; role?: UserRole }
): Promise<User> {
    const users = await getAllUsers(env);
    const userIndex = users.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
        throw new Error('用户不存在');
    }

    const user = users[userIndex];

    // 更新密码
    if (updates.password) {
        user.passwordHash = await hashPassword(updates.password);
    }

    // 更新角色
    if (updates.role) {
        user.role = updates.role;
    }

    user.updatedAt = Date.now();
    users[userIndex] = user;

    const storage = await getStorage(env);
    await storage.put(KV_KEY_USERS, users);

    return user;
}

/**
 * 删除用户
 */
export async function deleteUser(env: Env, userId: string): Promise<boolean> {
    const users = await getAllUsers(env);
    const filteredUsers = users.filter((u) => u.id !== userId);

    if (filteredUsers.length === users.length) {
        return false; // 用户不存在
    }

    const storage = await getStorage(env);
    await storage.put(KV_KEY_USERS, filteredUsers);
    return true;
}

/**
 * 检查是否已有用户
 */
export async function hasUsers(env: Env): Promise<boolean> {
    const users = await getAllUsers(env);
    return users.length > 0;
}

/**
 * 验证用户登录
 */
export async function authenticateUser(
    env: Env,
    username: string,
    password: string
): Promise<User | null> {
    const user = await getUserByUsername(env, username);

    if (!user) {
        return null;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
        return null;
    }

    // 自动将旧版 SHA-256 哈希平滑升级到 PBKDF2 哈希
    if (!user.passwordHash.startsWith('pbkdf2:')) {
        try {
            await updateUser(env, user.id, { password });
        } catch (e) {
            console.warn('[UserService] Failed to upgrade legacy password hash:', e);
        }
    }

    return user;
}
