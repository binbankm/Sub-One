
/// <reference types="@cloudflare/workers-types" />

export interface Env {
    SUB_ONE_KV: KVNamespace;
    SUB_ONE_D1?: D1Database;  // D1 数据库绑定（可选）
    ADMIN_PASSWORD?: string;
}

// 存储后端类型
export type StorageBackend = 'kv' | 'd1';
