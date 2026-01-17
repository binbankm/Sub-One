
import { Env, StorageBackend } from '../types';
import { StorageFactory } from './storage';

// 存储后端配置的 KV 键名
const STORAGE_BACKEND_KEY = 'storage_backend_config';

/**
 * 获取当前配置的存储后端
 * @param env - Cloudflare 环境对象
 * @returns 当前存储后端类型
 */
export async function getStorageBackend(env: Env): Promise<StorageBackend> {
    try {
        // 始终从 KV 读取存储后端配置（元数据存储在 KV）
        const config = await env.SUB_ONE_KV.get(STORAGE_BACKEND_KEY, 'json') as { backend: StorageBackend } | null;

        if (config && config.backend) {
            // 验证配置的后端是否可用
            const available = StorageFactory.getAvailableBackends(env);
            if (available.includes(config.backend)) {
                return config.backend;
            }
            console.warn(`[StorageBackend] Configured backend "${config.backend}" is not available, falling back to KV`);
        }

        // 默认使用 KV
        return 'kv';
    } catch (error) {
        console.error('[StorageBackend] Failed to get storage backend config:', error);
        return 'kv'; // 出错时默认使用 KV
    }
}

/**
 * 设置存储后端
 * @param env - Cloudflare 环境对象
 * @param backend - 新的存储后端类型
 * @returns 是否设置成功
 */
export async function setStorageBackend(env: Env, backend: StorageBackend): Promise<boolean> {
    try {
        const available = StorageFactory.getAvailableBackends(env);

        if (!available.includes(backend)) {
            console.error(`[StorageBackend] Backend "${backend}" is not available`);
            return false;
        }

        // 配置始终存储在 KV 中
        await env.SUB_ONE_KV.put(STORAGE_BACKEND_KEY, JSON.stringify({ backend }));

        console.log(`[StorageBackend] Storage backend set to "${backend}"`);
        return true;
    } catch (error) {
        console.error('[StorageBackend] Failed to set storage backend:', error);
        return false;
    }
}

/**
 * 获取存储后端信息
 * @param env - Cloudflare 环境对象
 * @returns 存储后端信息
 */
export async function getStorageBackendInfo(env: Env) {
    const current = await getStorageBackend(env);
    const available = StorageFactory.getAvailableBackends(env);

    return {
        current,
        available,
        canSwitch: available.length > 1
    };
}
