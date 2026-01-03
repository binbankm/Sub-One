import { ShadowsocksNode } from '../types';
import { generateId } from './helper';

/**
 * SIP008 (Shadowsocks JSON Subscription) 解析器
 * 同时也兼容一些单节点的 JSON 导出格式
 */

/**
 * 解析单个 SIP008 Server 对象
 */
export function parseSIP008Server(server: any): ShadowsocksNode | null {
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
            pluginOpts = server.plugin_opts;
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
export function parseSIP008(json: any): ShadowsocksNode[] {
    if (!json) return [];

    const nodes: ShadowsocksNode[] = [];

    // 1. 标准 SIP008 格式 (带 servers 数组)
    if (json.servers && Array.isArray(json.servers)) {
        for (const s of json.servers) {
            const node = parseSIP008Server(s);
            if (node) nodes.push(node);
        }
    }
    // 2. 纯数组格式
    else if (Array.isArray(json)) {
        for (const s of json) {
            const node = parseSIP008Server(s);
            if (node) nodes.push(node);
        }
    }
    // 3. 单个节点格式
    else if (json.server && (json.server_port || json.port) && json.method) {
        const node = parseSIP008Server(json);
        if (node) nodes.push(node);
    }

    return nodes;
}
