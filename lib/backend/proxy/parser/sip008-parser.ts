/**
 * Sub-One SIP008 Parser
 * 
 * 将 SIP008 (Shadowsocks JSON) 格式转换为标准 ProxyNode 列表
 * 参考: https://shadowsocks.org/en/spec/SIP008-Online-Configuration-Delivery.html
 */

import type { ProxyNode } from '../types';
import { randomId, parsePort } from '../utils';

/**
 * 解析 SIP008 JSON 内容
 */
export function parseSIP008(content: string): ProxyNode[] {
    try {
        const data = JSON.parse(content);
        if (!data || !Array.isArray(data.servers)) {
            return [];
        }

        return data.servers
            .map((s: any) => parseSIP008Node(s))
            .filter((p: ProxyNode | null): p is ProxyNode => p !== null);
    } catch (e) {
        console.error('[parseSIP008] JSON parse error:', e);
        return [];
    }
}

/**
 * 将单个 SIP008 节点项转换为 ProxyNode
 */
export function parseSIP008Node(s: any): ProxyNode | null {
    if (!s || !s.server || !s.server_port) return null;

    const port = parsePort(s.server_port);
    const name = s.remarks || s.id || `SS ${s.server}:${port}`;

    const node: ProxyNode = {
        id: randomId(),
        type: 'ss',
        name,
        server: s.server,
        port,
        cipher: s.method || s.encryption,
        password: s.password,
        plugin: s.plugin,
        'plugin-opts': s.plugin_opts || s.plugin_options,
        udp: true,
    };

    return node;
}
