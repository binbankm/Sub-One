/**
 * Sub-One Proxy Node Normalizer
 *
 * 节点标准化与属性补全
 * 确保节点属性格式统一、填充默认值、校验基本合法性
 */
import type { NetworkType, ProxyNode } from '../types';
import { isNotEmpty, isValidPort, parsePort, randomId } from '../utils';

/**
 * 标准化节点对象
 */
export function normalizeProxyNode(proxy: ProxyNode): ProxyNode {
    // 1. 确保有唯一 ID
    if (!proxy.id) {
        proxy.id = randomId();
    }

    // 2. 密码与加密方法标准化
    if (typeof proxy.cipher === 'string') {
        proxy.cipher = proxy.cipher.toLowerCase();
    }
    if (typeof proxy.password === 'number') {
        proxy.password = String(proxy.password);
    }

    // 3. 特殊协议修正 (Shadowsocks none cipher)
    if (proxy.type === 'ss' && proxy.cipher === 'none' && !proxy.password) {
        proxy.password = '';
    }

    // 4. 端口转换与校验
    if (proxy.port) {
        const port = parsePort(proxy.port);
        proxy.port = isValidPort(port) ? port : 0;
    }

    // 5. 服务器地址清洗
    if (proxy.server) {
        proxy.server = String(proxy.server).trim().replace(/^\[/, '').replace(/\]$/, ''); // 移除 IPv6 的方括号
    }

    // 6. 传输层 (Network) 默认值与结构标准化
    normalizeNetwork(proxy);

    // 7. TLS 默认值处理
    if (proxy.tls === undefined) {
        // 某些协议默认开启 TLS
        if (['hysteria2', 'tuic', 'https'].includes(proxy.type)) {
            proxy.tls = true;
        } else {
            proxy.tls = false;
        }
    }

    // 8. 默认名称补全
    if (!isNotEmpty(proxy.name)) {
        proxy.name = `${proxy.type.toUpperCase()} ${proxy.server}:${proxy.port}`;
    }

    return proxy;
}

/**
 * 传输层选项标准化
 */
function normalizeNetwork(proxy: ProxyNode) {
    // 处理旧式的 ws-path / ws-headers
    if (proxy.network === 'ws') {
        if (!proxy['ws-opts']) {
            proxy['ws-opts'] = {
                path: (proxy as any)['ws-path'] || '/',
                headers: (proxy as any)['ws-headers'] || {}
            };
        }
        // 清理旧字段
        delete (proxy as any)['ws-path'];
        delete (proxy as any)['ws-headers'];
    }

    // 格式化所有传输路径 (以 / 开头)
    const networks: NetworkType[] = ['ws', 'h2', 'http'];
    for (const net of networks) {
        const optsKey = `${net}-opts` as keyof ProxyNode;
        const opts = proxy[optsKey] as any;
        if (opts && opts.path) {
            if (Array.isArray(opts.path)) {
                opts.path = opts.path.map((p: string) => formatPath(p));
            } else {
                opts.path = formatPath(opts.path);
            }
        }
    }

    // 不同协议的默认 network
    if (!proxy.network) {
        if (['vmess', 'vless', 'trojan'].includes(proxy.type)) {
            proxy.network = 'tcp';
        }
    }
}

/**
 * 格式化路径，确保以 / 开头且不为空
 */
function formatPath(path: any): string {
    if (typeof path === 'string' || typeof path === 'number') {
        let p = String(path).trim();
        if (p === '') return '/';
        return p.startsWith('/') ? p : '/' + p;
    }
    return '/';
}
