import { Env, StorageBackend } from '../types';

/**
 * 统一的存储接口，抽象 KV 和 D1 的差异
 */
export interface IStorageService {
    get<T = unknown>(key: string): Promise<T | null>;
    put(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    list?(prefix?: string): Promise<string[]>;
}

/**
 * KV 存储实现
 */
export class KVStorage implements IStorageService {
    constructor(private kv: KVNamespace) {}

    async get<T = unknown>(key: string): Promise<T | null> {
        return (await this.kv.get(key, 'json')) as T | null;
    }

    async put(key: string, value: unknown): Promise<void> {
        await this.kv.put(key, JSON.stringify(value));
    }

    async delete(key: string): Promise<void> {
        await this.kv.delete(key);
    }

    async list(prefix?: string): Promise<string[]> {
        const keys: string[] = [];
        let hasMore = true;
        let cursor: string | undefined;

        while (hasMore) {
            const result = await this.kv.list({ prefix, cursor });
            keys.push(...result.keys.map((k) => k.name));
            hasMore = !result.list_complete;
            // KV API 会在最后一批 incomplete 时提供最后一个 key 的 name 作为 cursor
            cursor =
                hasMore && result.keys.length > 0
                    ? result.keys[result.keys.length - 1].name
                    : undefined;
        }

        return keys;
    }
}

/**
 * D1 存储实现
 */
export class D1Storage implements IStorageService {
    constructor(private db: D1Database) {
        this.initDatabase();
    }

    /**
     * 初始化数据库表结构（如果不存在）
     */
    private async initDatabase(): Promise<void> {
        try {
            await this.db
                .prepare(
                    `
                CREATE TABLE IF NOT EXISTS storage (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            `
                )
                .run();

            // 创建索引以提高查询性能
            await this.db
                .prepare(
                    `
                CREATE INDEX IF NOT EXISTS idx_updated_at ON storage(updated_at)
            `
                )
                .run();
        } catch (error) {
            console.error('[D1Storage] Failed to initialize database:', error);
        }
    }

    async get<T = unknown>(key: string): Promise<T | null> {
        try {
            const result = await this.db
                .prepare('SELECT value FROM storage WHERE key = ?')
                .bind(key)
                .first<{ value: string }>();

            if (!result) return null;

            return JSON.parse(result.value) as T;
        } catch (error) {
            console.error(`[D1Storage] Failed to get key "${key}":`, error);
            return null;
        }
    }

    async put(key: string, value: unknown): Promise<void> {
        try {
            const jsonValue = JSON.stringify(value);
            const timestamp = Date.now();

            await this.db
                .prepare(
                    `
                    INSERT INTO storage (key, value, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(key) DO UPDATE SET
                        value = excluded.value,
                        updated_at = excluded.updated_at
                `
                )
                .bind(key, jsonValue, timestamp)
                .run();
        } catch (error) {
            console.error(`[D1Storage] Failed to put key "${key}":`, error);
            throw error;
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.db.prepare('DELETE FROM storage WHERE key = ?').bind(key).run();
        } catch (error) {
            console.error(`[D1Storage] Failed to delete key "${key}":`, error);
            throw error;
        }
    }

    async list(prefix?: string): Promise<string[]> {
        try {
            const query = prefix
                ? 'SELECT key FROM storage WHERE key LIKE ? ORDER BY key'
                : 'SELECT key FROM storage ORDER BY key';

            const stmt = prefix
                ? this.db.prepare(query).bind(`${prefix}%`)
                : this.db.prepare(query);

            const result = await stmt.all<{ key: string }>();

            return result.results ? result.results.map((r) => r.key) : [];
        } catch (error) {
            console.error('[D1Storage] Failed to list keys:', error);
            return [];
        }
    }
}

/**
 * 存储工厂：根据配置创建相应的存储实例
 */
export class StorageFactory {
    /**
     * 创建存储服务实例
     * @param env - Cloudflare 环境对象
     * @param backend - 存储后端类型（'kv' 或 'd1'）
     * @returns 存储服务实例
     */
    static create(env: Env, backend: StorageBackend): IStorageService {
        if (backend === 'd1') {
            if (!env.SUB_ONE_D1) {
                console.warn('[StorageFactory] D1 database not configured, falling back to KV');
                return new KVStorage(env.SUB_ONE_KV);
            }
            return new D1Storage(env.SUB_ONE_D1);
        }

        return new KVStorage(env.SUB_ONE_KV);
    }

    /**
     * 检测可用的存储后端
     * @param env - Cloudflare 环境对象
     * @returns 可用的存储后端列表
     */
    static getAvailableBackends(env: Env): StorageBackend[] {
        const backends: StorageBackend[] = ['kv']; // KV 总是可用

        if (env.SUB_ONE_D1) {
            backends.push('d1');
        }

        return backends;
    }
}

/**
 * 条件性写入存储，只在数据真正变更时写入
 * @param storage - 存储服务实例
 * @param key - 存储键名
 * @param newData - 新数据
 * @param oldData - 旧数据（可选）
 * @returns 是否执行了写入操作
 */
export async function conditionalPut(
    storage: IStorageService,
    key: string,
    newData: unknown,
    oldData: unknown = null
): Promise<boolean> {
    if (oldData === null) {
        try {
            oldData = await storage.get(key);
        } catch (error) {
            await storage.put(key, newData);
            return true;
        }
    }

    // 简单的深度比较
    if (JSON.stringify(oldData) !== JSON.stringify(newData)) {
        await storage.put(key, newData);
        return true;
    }

    return false;
}
