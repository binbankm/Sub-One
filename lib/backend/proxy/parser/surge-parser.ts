/**
 * Sub-One Surge Parser
 *
 * 增强型 Surge 格式解析器
 * 1. 支持带引号和逗号的名称/参数
 * 2. 支持端口跳跃 (port-hopping)
 * 3. 支持 Direct, Reject 等特殊类型
 */
import type { ProxyNode, ProxyType } from '../types';
import { parsePort, randomId } from '../utils';

/**
 * 解析 Surge 代理行
 */
export function parseSurge(line: string): ProxyNode | null {
    if (!line || !line.includes('=')) return null;

    try {
        // 1. 处理端口跳跃 (如果存在)
        const hoppingMatch = line.match(
            /,\s*?port-hopping\s*?=\s*?["']?\s*?((\d+(-\d+)?)([,;]\d+(-\d+)?)*)\s*?["']?\s*?/i
        );
        let portHopping: string | undefined;
        let cleanLine = line;
        if (hoppingMatch) {
            portHopping = hoppingMatch[1].replace(/;/g, ',');
            cleanLine = line.replace(hoppingMatch[0], '');
        }

        // 2. 分割名称和内容 (处理可能带引号的名称)
        const eqIdx = cleanLine.indexOf('=');
        let name = cleanLine.substring(0, eqIdx).trim();
        if (name.startsWith('"') && name.endsWith('"')) {
            name = name.substring(1, name.length - 1);
        }

        const content = cleanLine.substring(eqIdx + 1).trim();

        // 3. 健壮的逗号分割 (忽略引号内的逗号)
        const parts = smartSplit(content);
        if (parts.length < 1) return null;

        const rawType = parts[0].toLowerCase();

        // 处理特殊类型
        if (rawType === 'direct' || rawType === 'reject') {
            return {
                id: randomId(),
                name,
                type: rawType as any,
                server: '127.0.0.1',
                port: 0
            } as ProxyNode;
        }

        if (parts.length < 3) return null;

        const server = parts[1];
        const port = parsePort(parts[2]);

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            name,
            type: normalizeSurgeType(rawType),
            server,
            port,
            ports: portHopping
        };

        // 4. 解析命名参数
        const params: Record<string, string> = {};
        for (let i = 3; i < parts.length; i++) {
            const part = parts[i];
            if (part.includes('=')) {
                const [key, ...valParts] = part.split('=');
                params[key.trim().toLowerCase()] = valParts
                    .join('=')
                    .trim()
                    .replace(/^"(.*)"$/, '$1');
            } else {
                params[part.trim().toLowerCase()] = 'true';
            }
        }

        mapSurgeParams(proxy, params);

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseSurge] Error:', e);
        return null;
    }
}

/**
 * 智能分割: 只有不在引号内的逗号才作为分隔符
 */
function smartSplit(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
            if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inQuotes = false;
            }
            current += char;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.filter((s) => s.length > 0);
}

function normalizeSurgeType(type: string): ProxyType {
    if (type === 'https') return 'https';
    if (type === 'custom') return 'ss';
    if (type === 'socks5-tls') return 'socks5';
    if (type === 'tuic-v5') return 'tuic';
    return type as ProxyType;
}

function mapSurgeParams(proxy: Partial<ProxyNode>, params: Record<string, string>) {
    if (params.password) proxy.password = params.password;
    if (params.username) proxy.username = params.username;
    if (params.psk) proxy.password = params.psk;
    if (params['encrypt-method']) proxy.cipher = params['encrypt-method'];

    // TLS
    proxy.tls = params.tls === 'true' || proxy.type === 'https' || !!params.sni;
    if (params.sni) proxy.sni = params.sni;
    if (params['skip-cert-verify'])
        proxy['skip-cert-verify'] = params['skip-cert-verify'] === 'true';
    if (params['client-fingerprint']) proxy['client-fingerprint'] = params['client-fingerprint'];

    // TCP / UDP / TFO
    if (params.tfo || params['fast-open'])
        proxy.tfo = (params.tfo || params['fast-open']) === 'true';
    if (params.udp) proxy.udp = params.udp === 'true';

    // 传输层
    if (params.obfs === 'ws' || params.obfs === 'wss') {
        proxy.network = 'ws';
        proxy['ws-opts'] = {
            path: params['obfs-path'] || '/',
            headers: params['obfs-host'] ? { Host: params['obfs-host'] } : {}
        };
    } else if (params.obfs === 'http') {
        proxy.network = 'http';
        proxy['http-opts'] = {
            path: params['obfs-path'] || '/',
            headers: params['obfs-host'] ? { Host: params['obfs-host'] } : {}
        };
    }

    // 协议特定
    switch (proxy.type) {
        case 'vmess':
            proxy.uuid = params.username;
            if (params.version) proxy.alterId = parseInt(params.version, 10);
            break;
        case 'vless':
            proxy.uuid = params.username;
            break;
        case 'tuic':
            proxy.uuid = params.username; // Surge format often uses username as uuid
            break;
        case 'snell':
            if (params.version) proxy.version = parseInt(params.version, 10);
            break;
        case 'external':
            proxy.exec = params.exec;
            proxy.localPort = params['local-port'];
            if (params.args) proxy.args = smartSplit(params.args);
            if (params.addresses) proxy.addresses = smartSplit(params.addresses);
            break;
    }
}
