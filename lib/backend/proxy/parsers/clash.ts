/**
 * Clash YAML Parser
 * 参考 Sub-Store: Clash_All
 *
 * 解析 Clash/Clash Meta 格式的 YAML 订阅
 */

import { Parser, Proxy } from '../types';
import yaml from 'js-yaml';
import { isNotBlank, safeParseInt } from '../utils';

export function Clash_All(): Parser {
    const name = 'Clash YAML Parser';

    const test = (line: string): boolean => {
        // 检测是否是 YAML 格式
        // 1. 包含 proxies: 关键字
        // 2. 或者以 - { 开头（YAML 数组项）
        // 3. 或者以 - name: 开头
        return (
            /^\s*proxies\s*:/m.test(line) ||
            /^\s*-\s*\{/.test(line) ||
            /^\s*-\s*name\s*:/m.test(line) ||
            /^\s*-\s*type\s*:/m.test(line)
        );
    };

    const parse = (_line: string): Proxy => {
        // 这个解析器特殊：它处理单个代理对象而不是整行
        // 实际上 Clash 格式会在 parseClashYAML 中批量处理
        throw new Error('Clash YAML parser should be used via parseClashYAML()');
    };

    return { name, test, parse };
}

/**
 * 解析 Clash YAML 内容，返回代理列表
 */
export function parseClashYAML(content: string): Proxy[] {
    const proxies: Proxy[] = [];

    try {
        // 尝试解析完整 YAML
        const parsed = yaml.load(content) as { proxies?: unknown[] } | null;

        if (parsed?.proxies && Array.isArray(parsed.proxies)) {
            for (const item of parsed.proxies) {
                const proxy = parseClashProxy(item as Record<string, unknown>);
                if (proxy) {
                    proxies.push(proxy);
                }
            }
        }
    } catch {
        // 尝试按行解析 JSON 格式的代理
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('- {') && trimmed.endsWith('}')) {
                try {
                    const jsonStr = trimmed.slice(2); // 移除 "- "
                    const obj = JSON.parse(jsonStr);
                    const proxy = parseClashProxy(obj);
                    if (proxy) {
                        proxies.push(proxy);
                    }
                } catch { /* skip invalid lines */ }
            }
        }
    }

    return proxies;
}

/**
 * 解析单个 Clash 代理对象
 */
export function parseClashProxy(obj: Record<string, unknown>): Proxy | null {
    if (!obj || typeof obj !== 'object') return null;
    if (!obj.type || !obj.server) return null;

    const type = String(obj.type).toLowerCase();
    const server = String(obj.server);
    const port = safeParseInt(obj.port, 0);
    const name = String(obj.name || obj.remarks || `${type} ${server}:${port}`);

    // 基础代理对象
    const proxy: Proxy = {
        type: type as Proxy['type'],
        name,
        server,
        port,
    };

    // === 通用字段 ===
    if (obj.udp !== undefined) proxy.udp = !!obj.udp;
    if (obj.tfo !== undefined) proxy.tfo = !!obj.tfo;
    if (obj.tls !== undefined) proxy.tls = !!obj.tls;

    // SNI
    if (isNotBlank(obj.sni)) proxy.sni = String(obj.sni);
    if (isNotBlank(obj.servername)) proxy.sni = String(obj.servername);

    // 跳过证书验证
    if (obj['skip-cert-verify'] !== undefined) {
        proxy['skip-cert-verify'] = !!obj['skip-cert-verify'];
    }

    // Client fingerprint
    if (isNotBlank(obj['client-fingerprint'])) {
        proxy['client-fingerprint'] = String(obj['client-fingerprint']);
    }
    if (isNotBlank(obj.fingerprint)) {
        proxy.fingerprint = String(obj.fingerprint);
    }

    // ALPN
    if (Array.isArray(obj.alpn)) {
        proxy.alpn = obj.alpn.map(String);
    }

    // === 协议特定字段 ===

    // VMess/VLESS
    if (isNotBlank(obj.uuid)) proxy.uuid = String(obj.uuid);
    if (isNotBlank(obj.id)) proxy.uuid = String(obj.id);
    if (obj.alterId !== undefined) proxy.alterId = safeParseInt(obj.alterId);
    if (isNotBlank(obj.cipher)) proxy.cipher = String(obj.cipher);
    if (isNotBlank(obj.flow)) proxy.flow = String(obj.flow);
    if (isNotBlank(obj.encryption)) proxy.encryption = String(obj.encryption);

    // Trojan/SS/SSR/Snell/TUIC
    if (isNotBlank(obj.password)) proxy.password = String(obj.password);
    if (isNotBlank(obj.psk)) proxy.password = String(obj.psk);

    // SS
    if (isNotBlank(obj.plugin)) proxy.plugin = String(obj.plugin);
    if (obj['plugin-opts']) proxy['plugin-opts'] = obj['plugin-opts'] as Record<string, unknown>;

    // SSR
    if (isNotBlank(obj.protocol)) proxy.protocol = String(obj.protocol);
    if (isNotBlank(obj['protocol-param'])) proxy['protocol-param'] = String(obj['protocol-param']);
    if (isNotBlank(obj.obfs)) proxy.obfs = String(obj.obfs);
    if (isNotBlank(obj['obfs-param'])) proxy['obfs-param'] = String(obj['obfs-param']);

    // 传输层
    if (isNotBlank(obj.network)) {
        proxy.network = String(obj.network) as Proxy['network'];
    }

    // WS opts
    if (obj['ws-opts']) {
        proxy['ws-opts'] = obj['ws-opts'] as Proxy['ws-opts'];
    }

    // HTTP opts
    if (obj['http-opts']) {
        proxy['http-opts'] = obj['http-opts'] as Proxy['http-opts'];
    }

    // H2 opts
    if (obj['h2-opts']) {
        proxy['h2-opts'] = obj['h2-opts'] as Proxy['h2-opts'];
    }

    // gRPC opts
    if (obj['grpc-opts']) {
        proxy['grpc-opts'] = obj['grpc-opts'] as Proxy['grpc-opts'];
    }

    // Reality opts
    if (obj['reality-opts']) {
        proxy['reality-opts'] = obj['reality-opts'] as Proxy['reality-opts'];
    }

    // Hysteria
    if (isNotBlank(obj['auth-str'])) proxy['auth-str'] = String(obj['auth-str']);
    if (obj.up !== undefined) proxy.up = obj.up as number | string;
    if (obj.down !== undefined) proxy.down = obj.down as number | string;
    if (isNotBlank(obj['obfs-password'])) proxy['obfs-password'] = String(obj['obfs-password']);
    if (isNotBlank(obj.ports)) proxy.ports = String(obj.ports);

    // TUIC
    if (isNotBlank(obj['congestion-controller'])) {
        proxy['congestion-controller'] = String(obj['congestion-controller']);
    }
    if (isNotBlank(obj['udp-relay-mode'])) {
        proxy['udp-relay-mode'] = String(obj['udp-relay-mode']);
    }
    if (obj['reduce-rtt'] !== undefined) proxy['reduce-rtt'] = !!obj['reduce-rtt'];

    // WireGuard
    if (isNotBlank(obj['private-key'])) proxy['private-key'] = String(obj['private-key']);
    if (isNotBlank(obj['public-key'])) proxy['public-key'] = String(obj['public-key']);
    if (isNotBlank(obj['pre-shared-key'])) proxy['pre-shared-key'] = String(obj['pre-shared-key']);
    if (isNotBlank(obj['preshared-key'])) proxy['preshared-key'] = String(obj['preshared-key']);
    if (isNotBlank(obj.ip)) proxy.ip = String(obj.ip);
    if (isNotBlank(obj.ipv6)) proxy.ipv6 = String(obj.ipv6);
    if (obj.mtu !== undefined) proxy.mtu = safeParseInt(obj.mtu);
    if (obj.reserved !== undefined) proxy.reserved = obj.reserved as number[] | string;
    if (obj.keepalive !== undefined) proxy.keepalive = safeParseInt(obj.keepalive);
    if (obj['persistent-keepalive'] !== undefined) {
        proxy['persistent-keepalive'] = safeParseInt(obj['persistent-keepalive']);
    }
    if (Array.isArray(obj.peers)) proxy.peers = obj.peers as Proxy['peers'];

    // Snell
    if (obj.version !== undefined) proxy.version = safeParseInt(obj.version);
    if (obj['obfs-opts']) proxy['obfs-opts'] = obj['obfs-opts'] as Proxy['obfs-opts'];

    // Socks5/HTTP
    if (isNotBlank(obj.username)) proxy.username = String(obj.username);

    // AnyTLS
    if (obj['idle-timeout'] !== undefined) proxy['idle-timeout'] = safeParseInt(obj['idle-timeout']);

    // 其他
    if (obj['udp-over-tcp'] !== undefined) proxy['udp-over-tcp'] = !!obj['udp-over-tcp'];
    if (isNotBlank(obj['tls-fingerprint'])) proxy['tls-fingerprint'] = String(obj['tls-fingerprint']);
    if (obj['disable-sni'] !== undefined) proxy['disable-sni'] = !!obj['disable-sni'];
    if (isNotBlank(obj.interface)) proxy.interface = String(obj.interface);
    if (isNotBlank(obj['interface-name'])) proxy['interface-name'] = String(obj['interface-name']);
    if (obj['routing-mark'] !== undefined) proxy['routing-mark'] = safeParseInt(obj['routing-mark']);
    if (isNotBlank(obj['underlying-proxy'])) proxy['underlying-proxy'] = String(obj['underlying-proxy']);
    if (isNotBlank(obj['dialer-proxy'])) proxy['dialer-proxy'] = String(obj['dialer-proxy']);

    return proxy;
}

export default Clash_All;
