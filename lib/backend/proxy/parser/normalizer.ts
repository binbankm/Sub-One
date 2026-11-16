/**
 * Sub-One Proxy Node Normalizer
 *
 * 节点标准化与属性补全
 * 确保节点属性格式统一、填充默认值、校验基本合法性
 */
import type { NetworkType, ProxyNode } from '../types';
import { isNotEmpty, isValidPort, normalizeReserved, parsePort, randomId } from '../utils';

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
        if (['hysteria2', 'tuic', 'https', 'anytls', 'naive'].includes(proxy.type)) {
            proxy.tls = true;
        } else {
            proxy.tls = false;
        }
    }

    // 8. 默认名称补全
    if (!isNotEmpty(proxy.name)) {
        proxy.name = `${proxy.type.toUpperCase()} ${proxy.server}:${proxy.port}`;
    }

    if (proxy.type === 'vmess' && proxy.cipher) {
        const validCiphers = ['auto', 'aes-128-gcm', 'chacha20-poly1305', 'none', 'zero'];
        if (!validCiphers.includes(proxy.cipher)) {
            proxy.cipher = 'auto';
        }
    }

    // 10. 标准化 VLESS 加密方式
    if (proxy.type === 'vless') {
        if (!proxy.encryption) {
            proxy.encryption = 'none';
        }
        // VLESS 标准化 flow
        if (proxy.flow && !proxy['reality-opts'] && !proxy.tls) {
            delete proxy.flow;
        }
    }

    // 标准化 packet-encoding (VMess & VLESS)
    if (['vmess', 'vless'].includes(proxy.type)) {
        if (proxy['packet-encoding'] == null) {
            if (proxy.xudp) {
                proxy['packet-encoding'] = 'xudp';
            } else if (proxy['packet-addr']) {
                proxy['packet-encoding'] = 'packetaddr';
            }
        }
    }

    // 11. 标准化 Reality 选项
    if (proxy['reality-opts']) {
        const r = proxy['reality-opts'] as Record<string, any>;
        // 统一 _spider-x 和 spider-x，双向同步保留
        const spx = r['spider-x'] || r['_spider-x'];
        if (spx) {
            r['spider-x'] = spx;
            r['_spider-x'] = spx;
        }
        // Loon profile 触发 support-x25519mlkem768 规范 
        if (
            r['public-key'] &&
            r['support-x25519mlkem768'] === undefined &&
            ['safari-ios-26', 'chrome147'].includes(
                `${proxy._loon_tls_profile || ''}`.trim()
            )
        ) {
            r['support-x25519mlkem768'] = true;
        }
        // 如果 reality-opts 为空则删除
        if (Object.keys(r).filter(k => r[k] != null && r[k] !== '').length === 0) {
            delete proxy['reality-opts'];
        }
    }

    // 处理 hop-interval 区间写法 (例如 "10-30")
    if (proxy['hop-interval'] != null) {
        const hopIntervalStr = String(proxy['hop-interval']).trim();
        const rangeMatch = hopIntervalStr.match(/^(\d+)\s*-\s*(\d+)$/);
        if (rangeMatch) {
            const min = parseInt(rangeMatch[1], 10);
            const max = parseInt(rangeMatch[2], 10);
            if (min > 0 && min <= max) {
                proxy['hop-interval'] = min;
                proxy['hop-interval-max'] = max;
            } else {
                delete proxy['hop-interval'];
            }
        }
    }

    // 12. 标准化 ECH 选项
    if (proxy['ech-opts']) {
        const ech = proxy['ech-opts'] as Record<string, any>;
        if (Object.keys(ech).filter(k => ech[k] != null && ech[k] !== '').length === 0) {
            delete proxy['ech-opts'];
        }
    }

    // 13. 标准化 xhttp 选项 (标准化 splithttp -> xhttp)
    if (proxy.network === 'splithttp') {
        proxy.network = 'xhttp';
    }
    if ((proxy as any)['xhttp-opts']) {
        if (!proxy.network || proxy.network === 'tcp') {
            proxy.network = 'xhttp' as any;
        }
    }

    // 14. 标准化 WireGuard reserved 字段
    if (proxy.type === 'wireguard') {
        if (proxy.reserved !== undefined) {
            proxy.reserved = normalizeReserved(proxy.reserved);
        }
        if (Array.isArray(proxy.peers)) {
            for (const peer of proxy.peers) {
                if (peer.reserved !== undefined) {
                    peer.reserved = normalizeReserved(peer.reserved);
                }
            }
        }
    }

    return proxy;
}

/**
 * 传输层选项标准化
 */
function normalizeNetwork(proxy: ProxyNode) {
    if (proxy.network === 'splithttp') {
        proxy.network = 'xhttp';
    }

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
    const networks: NetworkType[] = ['ws', 'h2', 'http', 'httpupgrade', 'xhttp'];
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
        const p = String(path).trim();
        if (p === '') return '/';
        return p.startsWith('/') ? p : '/' + p;
    }
    return '/';
}
