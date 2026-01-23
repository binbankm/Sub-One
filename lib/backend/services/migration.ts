
import { Env } from '../types';
import { KVStorage, D1Storage } from './storage';
import { getStorageBackend } from './storage-backend';

import {
    KV_KEY_SUBS,
    KV_KEY_PROFILES,
    KV_KEY_SETTINGS,
    KV_KEY_USERS
} from '../config/constants';

/**
 * 数据迁移服务
 */

// 需要迁移的 KV 键列表
const MIGRATION_KEYS = [
    KV_KEY_SUBS,      // 订阅源数据
    KV_KEY_PROFILES,  // 订阅组数据
    KV_KEY_SETTINGS,  // 系统设置
    KV_KEY_USERS      // 用户数据
];

/**
 * 从 KV 迁移到 D1
 */
export async function migrateKVtoD1(env: Env): Promise<{
    success: boolean;
    message: string;
    details?: {
        migrated: string[];
        failed: string[];
        total: number;
    };
}> {
    if (!env.SUB_ONE_D1) {
        return {
            success: false,
            message: 'D1 数据库未配置，无法迁移'
        };
    }

    const kvStorage = new KVStorage(env.SUB_ONE_KV);
    const d1Storage = new D1Storage(env.SUB_ONE_D1);

    const migrated: string[] = [];
    const failed: string[] = [];

    for (const key of MIGRATION_KEYS) {
        try {
            // 从 KV 读取数据
            const data = await kvStorage.get(key);

            if (data !== null) {
                // 写入到 D1
                await d1Storage.put(key, data);
                migrated.push(key);
                console.log(`[Migration] Successfully migrated key: ${key}`);
            } else {
                console.log(`[Migration] Key not found in KV, skipping: ${key}`);
            }
        } catch (error) {
            console.error(`[Migration] Failed to migrate key: ${key}`, error);
            failed.push(key);
        }
    }

    const total = migrated.length + failed.length;

    return {
        success: failed.length === 0,
        message: failed.length === 0
            ? `成功迁移 ${migrated.length} 项数据到 D1`
            : `迁移完成，成功 ${migrated.length} 项，失败 ${failed.length} 项`,
        details: {
            migrated,
            failed,
            total
        }
    };
}

/**
 * 从 D1 迁移到 KV
 */
export async function migrateD1toKV(env: Env): Promise<{
    success: boolean;
    message: string;
    details?: {
        migrated: string[];
        failed: string[];
        total: number;
    };
}> {
    if (!env.SUB_ONE_D1) {
        return {
            success: false,
            message: 'D1 数据库未配置，无法迁移'
        };
    }

    const kvStorage = new KVStorage(env.SUB_ONE_KV);
    const d1Storage = new D1Storage(env.SUB_ONE_D1);

    const migrated: string[] = [];
    const failed: string[] = [];

    for (const key of MIGRATION_KEYS) {
        try {
            // 从 D1 读取数据
            const data = await d1Storage.get(key);

            if (data !== null) {
                // 写入到 KV
                await kvStorage.put(key, data);
                migrated.push(key);
                console.log(`[Migration] Successfully migrated key: ${key}`);
            } else {
                console.log(`[Migration] Key not found in D1, skipping: ${key}`);
            }
        } catch (error) {
            console.error(`[Migration] Failed to migrate key: ${key}`, error);
            failed.push(key);
        }
    }

    const total = migrated.length + failed.length;

    return {
        success: failed.length === 0,
        message: failed.length === 0
            ? `成功迁移 ${migrated.length} 项数据到 KV`
            : `迁移完成，成功 ${migrated.length} 项，失败 ${failed.length} 项`,
        details: {
            migrated,
            failed,
            total
        }
    };
}

/**
 * 自动迁移：根据目标存储后端自动选择迁移方向
 */
export async function autoMigrate(env: Env, targetBackend: 'kv' | 'd1'): Promise<{
    success: boolean;
    message: string;
    details?: {
        migrated: string[];
        failed: string[];
        total: number;
    };
}> {
    const currentBackend = await getStorageBackend(env);

    // 如果目标和当前相同，不需要迁移
    if (currentBackend === targetBackend) {
        return {
            success: true,
            message: '当前已使用目标存储后端，无需迁移'
        };
    }

    // 根据目标选择迁移方向
    if (targetBackend === 'd1') {
        return await migrateKVtoD1(env);
    } else {
        return await migrateD1toKV(env);
    }
}
