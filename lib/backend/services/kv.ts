
import { Env } from '../types';
import { hasDataChanged } from '../utils/common';

/**
 * 条件性写入KV存储，只在数据真正变更时写入
 * @param {Object} env - Cloudflare环境对象
 * @param {string} key - KV键名
 * @param {any} newData - 新数据
 * @param {any} oldData - 旧数据（可选）
 * @returns {Promise<boolean>} - 是否执行了写入操作
 */
export async function conditionalKVPut(env: Env, key: string, newData: unknown, oldData: unknown = null): Promise<boolean> {
    if (oldData === null) {
        try {
            oldData = await env.SUB_ONE_KV.get(key, 'json');
        } catch (error) {
            await env.SUB_ONE_KV.put(key, JSON.stringify(newData));
            return true;
        }
    }

    if (hasDataChanged(oldData, newData)) {
        await env.SUB_ONE_KV.put(key, JSON.stringify(newData));
        return true;
    }
    return false;
}
