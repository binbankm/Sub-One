/**
 * Sub-One SIP008 Parser
 *
 * 将 SIP008 (Shadowsocks JSON) 格式转换为标准 ProxyNode 列表
 * 参考: https://shadowsocks.org/en/spec/SIP008-Online-Configuration-Delivery.html
 */
import type { ProxyNode } from '../types';
import { parsePort, randomId } from '../utils';

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
 * 解析 SIP008 字符串/对象形式的 plugin_opts
 */
function parseSIP008PluginOpts(rawOpts: unknown): Record<string, any> | undefined {
    if (!rawOpts) return undefined;
    if (typeof rawOpts === 'object' && !Array.isArray(rawOpts)) {
        return rawOpts as Record<string, any>;
    }
    if (typeof rawOpts !== 'string') return undefined;

    const opts: Record<string, any> = {};
    for (const part of rawOpts.split(';')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) {
            opts[trimmed] = true;
            continue;
        }
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim();
        if (k === 'obfs' || k === 'mode') opts.mode = v;
        else if (k === 'obfs-host' || k === 'host') opts.host = v;
        else if (k === 'obfs-uri' || k === 'path') opts.path = v;
        else if (k === 'version') opts.version = /^\d+$/.test(v) ? parseInt(v, 10) : v;
        else if (k === 'tls') opts.tls = v === 'true' || v === '1';
        else opts[k] = v;
    }
    return Object.keys(opts).length > 0 ? opts : undefined;
}

/**
 * 将单个 SIP008 节点项转换为 ProxyNode
 */
export function parseSIP008Node(s: any): ProxyNode | null {
    if (!s || !s.server || !s.server_port) return null;

    const port = parsePort(s.server_port);
    const name = s.remarks || s.id || `SS ${s.server}:${port}`;

    let plugin = s.plugin ? String(s.plugin).trim() : undefined;
    if (plugin === 'simple-obfs' || plugin === 'obfs-local') {
        plugin = 'obfs';
    }

    const node: ProxyNode = {
        id: randomId(),
        type: 'ss',
        name,
        server: s.server,
        port,
        cipher: s.method || s.encryption,
        password: s.password,
        plugin,
        'plugin-opts': parseSIP008PluginOpts(s.plugin_opts ?? s.plugin_options),
        udp: s.udp !== undefined ? Boolean(s.udp) : true
    };

    if (s.tfo !== undefined) node.tfo = Boolean(s.tfo);
    if (s.uot || s.udp_over_tcp) {
        node.uot = true;
        node['udp-over-tcp'] = true;
    }

    return node;
}
