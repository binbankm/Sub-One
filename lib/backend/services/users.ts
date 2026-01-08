
import { Env } from '../types';
import { KV_KEY_USERS } from '../config/constants';
import { User, UserRole } from '../../shared/types';

/**
 * 使用 Web Crypto API 生成密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}

/**
 * 从KV获取所有用户
 */
export async function getAllUsers(env: Env): Promise<User[]> {
    try {
        const users = await env.SUB_ONE_KV.get(KV_KEY_USERS, 'json');
        return (users as User[]) || [];
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
    return users.find(u => u.username === username) || null;
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
    if (users.some(u => u.username === username)) {
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
    await env.SUB_ONE_KV.put(KV_KEY_USERS, JSON.stringify(users));

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
    const userIndex = users.findIndex(u => u.id === userId);

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

    await env.SUB_ONE_KV.put(KV_KEY_USERS, JSON.stringify(users));

    return user;
}

/**
 * 删除用户
 */
export async function deleteUser(env: Env, userId: string): Promise<boolean> {
    const users = await getAllUsers(env);
    const filteredUsers = users.filter(u => u.id !== userId);

    if (filteredUsers.length === users.length) {
        return false; // 用户不存在
    }

    await env.SUB_ONE_KV.put(KV_KEY_USERS, JSON.stringify(filteredUsers));
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
    return isValid ? user : null;
}
