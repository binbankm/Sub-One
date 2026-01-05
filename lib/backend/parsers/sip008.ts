import { ShadowsocksNode } from '../../shared/types';
import { generateId } from './helper';

/**
 * SIP008 (Shadowsocks JSON Subscription) サーバー对象接口
 */
export interface SIP008Server {
    server?: string;
    add?: string;
    server_port?: number | string;
    port?: number | string;
    method?: string;
    scy?: string;
    password?: string;
    id?: string;
    key?: string;
    remarks?: string;
    ps?: string;
    plugin?: string;
    plugin_opts?: string | Record<string, string>;
}

/**
 * SIP008 (Shadowsocks JSON Subscription) 解析器
 * 同时也兼容一些单节点的 JSON 导出格式
 */

/**
 * 解析单个 SIP008 Server 对象
 */
export function parseSIP008Server(server: SIP008Server): ShadowsocksNode | null {
    if (!server || typeof server !== 'object') return null;

    const address = server.server || server.add;
    const port = server.server_port || server.port;
    const method = server.method || server.scy || 'aes-256-gcm';
    const password = server.password || server.id || server.key;

    if (!address || !port || !password) return null;

    let pluginName: string | undefined = server.plugin;
    let pluginOpts: Record<string, string> | undefined;

    if (server.plugin_opts) {
        if (typeof server.plugin_opts === 'string') {
            const parts = server.plugin_opts.split(';');
            pluginOpts = {};
            for (const part of parts) {
                const [key, value] = part.split('=');
                if (key && value) {
                    pluginOpts[key] = value;
                } else if (key) {
                    // 处理只有 key 没有 value 的情况，如 "obfs-local;obfs=http"
                    pluginOpts[key] = 'true';
                }
            }
        } else if (typeof server.plugin_opts === 'object') {
            pluginOpts = server.plugin_opts as Record<string, string>;
        }
    }

    return {
        id: generateId(),
        type: 'ss',
        name: server.remarks || server.ps || server.id || `${address}:${port}`,
        server: address,
        port: Number(port),
        cipher: method,
        password: password,
        udp: true,
        plugin: pluginName,
        pluginOpts
    };
}

/**
 * 解析完整的 SIP008 JSON 内容
 */
export function parseSIP008(json: Record<string, unknown> | unknown[] | null | undefined): ShadowsocksNode[] {
    if (!json) return [];

    const nodes: ShadowsocksNode[] = [];

    // 1. 标准 SIP008 格式 (带 servers 数组)
    if (typeof json === 'object' && !Array.isArray(json) && json !== null && 'servers' in json && Array.isArray(json.servers)) {
        for (const s of json.servers as SIP008Server[]) {
            const node = parseSIP008Server(s);
            if (node) nodes.push(node);
        }
    }
    // 2. 纯数组格式
    else if (Array.isArray(json)) {
        for (const s of json as SIP008Server[]) {
            const node = parseSIP008Server(s);
            if (node) nodes.push(node);
        }
    }
    // 3. 单个节点格式
    else if (json && typeof json === 'object' && !Array.isArray(json) &&
        (json as Record<string, unknown>).server &&
        ((json as Record<string, unknown>).server_port || (json as Record<string, unknown>).port) &&
        (json as Record<string, unknown>).method) {
        const node = parseSIP008Server(json as SIP008Server);
        if (node) nodes.push(node);
    }

    return nodes;
}
