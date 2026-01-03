/**
 * 通用工具函数
 */

/**
 * 生成唯一 ID
 */
export function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
