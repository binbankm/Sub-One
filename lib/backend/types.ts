
/// <reference types="@cloudflare/workers-types" />

export interface Env {
    SUB_ONE_KV: KVNamespace;
    ADMIN_PASSWORD?: string;
}
