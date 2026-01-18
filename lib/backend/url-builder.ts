/**
 * =================================================================
 * URL 构建器 - 完整参数保护版本
 * =================================================================
 * 
 * 设计原则:
 * 1. 参数完整性优先 - 绝不丢失任何参数
 * 2. 双向验证 - 构建的 URL 应能解析回相同 Node
 * 3. 参数回填 - 从 originalUrl 提取遗漏参数
 * 4. 详细日志 - 追踪参数处理过程
 * 
 * 
 * @module url-builder-enhanced
 * =================================================================
 */

import {
    Node, VlessNode, VmessNode, TrojanNode, ShadowsocksNode,
    ShadowsocksRNode, HysteriaNode, Hysteria2Node, TuicNode,
    WireGuardNode, AnyTLSNode, SnellNode, Socks5Node, V2rayNConfig
} from '../shared/types';
import { buildStandardQuery } from './parsers/helper';
import { Base64 } from 'js-base64';

// 调试模式
const DEBUG = typeof process !== 'undefined' && process.env?.DEBUG_URL_BUILDER === '1';

/**
 * 参数回填：从 originalUrl 中提取当前 Node 缺失的参数
 */
function extractMissingParams(node: Node): URLSearchParams | null {
    if (!node.originalUrl) return null;

    try {
        const urlObj = new URL(node.originalUrl);
        return new URLSearchParams(urlObj.search);
    } catch (e) {
        if (DEBUG) console.warn('[URL Builder] 无法解析 originalUrl:', node.originalUrl);
        return null;
    }
}

/**
 * 参数合并：将原始参数与新参数合并，新参数优先
 */
function mergeParams(newParams: URLSearchParams, originalParams: URLSearchParams | null): URLSearchParams {
    if (!originalParams) return newParams;

    const merged = new URLSearchParams(originalParams);

    // 新参数覆盖原参数
    newParams.forEach((value, key) => {
        merged.set(key, value);
    });

    if (DEBUG) {
        const added: string[] = [];
        merged.forEach((value, key) => {
            if (!newParams.has(key)) {
                added.push(`${key}=${value}`);
            }
        });
        if (added.length > 0) {
            console.log(`[URL Builder] 回填参数: ${added.join(', ')}`);
        }
    }

    return merged;
}

/**
 * 主构建函数 - 增强版
 */
export function buildNodeUrl(node: Node): string {
    try {
        // ⭐ 优先使用原始URL（节点名未改变的情况）
        if (node.originalUrl) {
            try {
                const originalUrlObj = new URL(node.originalUrl);
                const originalHash = decodeURIComponent(originalUrlObj.hash.slice(1));

                if (originalHash === node.name) {
                    if (DEBUG) console.log(`[URL Builder] 使用原始URL: ${node.name}`);
                    return node.originalUrl;
                }
            } catch (e) {
                // URL 解析失败，继续重建
            }
        }

        // 根据协议类型构建URL
        let builtUrl = '';
        switch (node.type) {
            case 'vless':
                builtUrl = buildVlessUrl(node);
                break;
            case 'vmess':
                builtUrl = buildVmessUrl(node);
                break;
            case 'trojan':
                builtUrl = buildTrojanUrl(node);
                break;
            case 'ss':
                builtUrl = buildShadowsocksUrl(node);
                break;
            case 'ssr':
                builtUrl = buildSSRUrl(node);
                break;
            case 'hysteria':
                builtUrl = buildHysteriaUrl(node);
                break;
            case 'hysteria2':
                builtUrl = buildHysteria2Url(node);
                break;
            case 'tuic':
                builtUrl = buildTuicUrl(node);
                break;
            case 'wireguard':
                builtUrl = buildWireGuardUrl(node);
                break;
            case 'anytls':
                builtUrl = buildAnyTLSUrl(node);
                break;
            case 'snell':
                builtUrl = buildSnellUrl(node);
                break;
            case 'socks5':
                builtUrl = buildSocks5Url(node);
                break;
            default:
                if (node.originalUrl) {
                    return node.originalUrl;
                }
                return '';
        }

        if (DEBUG) console.log(`[URL Builder] 构建完成: ${node.name} -> ${builtUrl.substring(0, 100)}...`);
        return builtUrl;

    } catch (e) {
        console.error(`[URL Builder] 构建失败 (${node.name}):`, e);
        // 降级：返回原始URL
        return node.originalUrl || '';
    }
}

// =================================================================
// 协议专用构建函数 - 完整参数版本
// =================================================================

/**
 * VLESS URL 构建 - 完整参数版
 */
function buildVlessUrl(node: VlessNode): string {
    // 1. 使用 helper 构建标准参数
    const params = buildStandardQuery(node.transport, node.tls);

    // 2. 回填原始参数
    const originalParams = extractMissingParams(node);
    const mergedParams = mergeParams(params, originalParams);

    // 3. VLESS 特定参数
    if (node.flow) {
        mergedParams.set('flow', node.flow);
    }

    const encryption = node.encryption || 'none';
    mergedParams.set('encryption', encryption);

    // 4. Security 参数
    if (node.tls?.reality?.enabled) {
        mergedParams.set('security', 'reality');
    } else if (node.tls?.enabled) {
        mergedParams.set('security', 'tls');
    } else {
        mergedParams.set('security', 'none');
    }

    // 5. Transport type（确保显式指定）
    if (node.transport?.type) {
        mergedParams.set('type', node.transport.type);
    } else if (!mergedParams.has('type')) {
        mergedParams.set('type', 'tcp');
    }

    // 6. headerType（VLESS 标准要求）
    if (!node.transport?.headerType || node.transport.headerType === 'none') {
        if (!mergedParams.has('headerType')) {
            mergedParams.set('headerType', 'none');
        }
    }

    // 7. 清理不应该存在的参数
    if (node.tls?.insecure !== true) {
        mergedParams.delete('allowInsecure');
        mergedParams.delete('insecure');
    }

    // 8. 构建最终URL
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `vless://${node.uuid}@${host}:${node.port}?${mergedParams.toString()}${hash}`;
}

/**
 * VMess URL 构建 - V2RayN 格式（完整版）
 */
function buildVmessUrl(node: VmessNode): string {
    const config: V2rayNConfig = {
        ps: node.name,
        add: node.server,
        port: node.port,
        id: node.uuid,
        aid: node.alterId,
        scy: node.cipher,
        net: node.transport?.type || 'tcp',
        type: node.transport?.headerType || 'none',
        tls: node.tls?.enabled ? 'tls' : ''
    };

    // TLS 参数
    if (node.tls) {
        if (node.tls.serverName) config.sni = node.tls.serverName;
        if (node.tls.alpn && node.tls.alpn.length > 0) {
            config.alpn = node.tls.alpn.join(',');
        }
        if (node.tls.fingerprint) config.fp = node.tls.fingerprint;
        if (node.tls.insecure) config.allowInsecure = true;
    }

    // Transport 参数（详细映射）
    if (node.transport) {
        switch (node.transport.type) {
            case 'ws':
                config.host = node.transport.headers?.Host || '';
                config.path = node.transport.path || '/';
                break;

            case 'grpc':
                config.path = node.transport.serviceName || '';
                if (node.transport.mode === 'multi') {
                    config.type = 'multi';
                }
                break;

            case 'h2':
            case 'http':
                config.path = node.transport.path || '/';
                config.host = node.transport.host ? node.transport.host.join(',') : '';
                if (node.transport.method) {
                    // V2RayN 没有 method 字段，记录到 type
                    if (DEBUG) console.warn('[VMess] method 参数在 V2RayN 格式中不支持');
                }
                break;

            case 'kcp':
            case 'quic':
                if (node.transport.seed) {
                    config.path = node.transport.seed;
                }
                if (node.transport.headerType) {
                    config.type = node.transport.headerType;
                }
                break;
        }
    }

    return `vmess://${Base64.encode(JSON.stringify(config))}`;
}

/**
 * Trojan URL 构建 - 完整参数版
 */
function buildTrojanUrl(node: TrojanNode): string {
    const params = buildStandardQuery(node.transport, node.tls);
    const originalParams = extractMissingParams(node);
    const mergedParams = mergeParams(params, originalParams);

    // Trojan 默认启用 TLS，确保相关参数
    if (!mergedParams.has('security') && node.tls?.enabled) {
        mergedParams.set('security', 'tls');
    }

    if (node.tls?.insecure) {
        mergedParams.set('allowInsecure', '1');
    }

    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `trojan://${encodeURIComponent(node.password)}@${host}:${node.port}?${mergedParams.toString()}${hash}`;
}

/**
 * Shadowsocks URL 构建 - SIP002 标准
 */
function buildShadowsocksUrl(node: ShadowsocksNode): string {
    const userInfo = `${node.cipher}:${node.password}`;
    const base64Info = Base64.encode(userInfo);
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    let url = `ss://${base64Info}@${host}:${node.port}`;

    // Plugin（完整参数）
    if (node.plugin) {
        let pluginStr = node.plugin;
        if (node.pluginOpts) {
            const opts = Object.entries(node.pluginOpts)
                .map(([k, v]) => `${k}=${v}`)
                .join(';');
            pluginStr += `;${opts}`;
        }
        url += `?plugin=${encodeURIComponent(pluginStr)}`;
    }

    return url + hash;
}

/**
 * Hysteria 2 URL 构建 - 完整参数版
 */
function buildHysteria2Url(node: Hysteria2Node): string {
    const params = buildStandardQuery(undefined, node.tls);
    const originalParams = extractMissingParams(node);
    const mergedParams = mergeParams(params, originalParams);

    // 混淆配置
    if (node.obfs) {
        mergedParams.set('obfs', node.obfs.type);
        mergedParams.set('obfs-password', node.obfs.password);
    }

    // 拥塞控制
    if (node.congestionControl) {
        mergedParams.set('cc', node.congestionControl);
    }

    // 认证信息
    let auth = '';
    if (node.username && node.password) {
        auth = `${encodeURIComponent(node.username)}:${encodeURIComponent(node.password)}@`;
    } else if (node.password) {
        auth = `${encodeURIComponent(node.password)}@`;
    }

    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `hysteria2://${auth}${host}:${node.port}?${mergedParams.toString()}${hash}`;
}

/**
 * TUIC URL 构建 - 完整参数版
 */
function buildTuicUrl(node: TuicNode): string {
    const params = buildStandardQuery(undefined, node.tls);
    const originalParams = extractMissingParams(node);
    const mergedParams = mergeParams(params, originalParams);

    // TUIC 特定参数
    if (node.congestionControl) {
        mergedParams.set('congestion_control', node.congestionControl);
    }
    if (node.udpRelayMode) {
        mergedParams.set('udp_relay_mode', node.udpRelayMode);
    }

    // ALPN（TUIC 通常需要 h3）
    if (node.alpn && node.alpn.length > 0 && !mergedParams.has('alpn')) {
        mergedParams.set('alpn', node.alpn.join(','));
    }

    const userInfo = node.password ? `${node.uuid}:${node.password}` : node.uuid;
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `tuic://${encodeURIComponent(userInfo)}@${host}:${node.port}?${mergedParams.toString()}${hash}`;
}

/**
 * SSR URL 构建 - 完整参数版
 */
function buildSSRUrl(node: ShadowsocksRNode): string {
    const server = node.server;
    const port = node.port;
    const protocol = node.protocol || 'origin';
    const method = node.cipher;
    const obfs = node.obfs || 'plain';
    const passwordBase64 = Base64.encode(node.password);

    const mainPart = `${server}:${port}:${protocol}:${method}:${obfs}:${passwordBase64}`;

    const params = new URLSearchParams();
    if (node.name) params.set('remarks', Base64.encode(node.name));
    if (node.protocolParam) params.set('protoparam', Base64.encode(node.protocolParam));
    if (node.obfsParam) params.set('obfsparam', Base64.encode(node.obfsParam));

    const queryStr = params.toString();
    const fullContent = queryStr ? `${mainPart}/?${queryStr}` : mainPart;

    return `ssr://${Base64.encode(fullContent)}`;
}

// =================================================================
// 其他协议构建函数（保持原有实现）
// =================================================================

function buildHysteriaUrl(node: HysteriaNode): string {
    const params = buildStandardQuery(undefined, node.tls);
    const originalParams = extractMissingParams(node);
    const mergedParams = mergeParams(params, originalParams);

    if (node.auth) mergedParams.set('auth', node.auth);
    if (node.upMbps) mergedParams.set('upmbps', String(node.upMbps));
    if (node.downMbps) mergedParams.set('downmbps', String(node.downMbps));
    if (node.obfs) mergedParams.set('obfs', node.obfs);
    if (node.obfsParam) mergedParams.set('obfsParam', node.obfsParam);
    if (node.protocol) mergedParams.set('protocol', node.protocol);

    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `hysteria://${host}:${node.port}?${mergedParams.toString()}${hash}`;
}

function buildWireGuardUrl(node: WireGuardNode): string {
    const params = new URLSearchParams();
    const originalParams = extractMissingParams(node);

    if (node.publicKey) params.set('public-key', node.publicKey);
    if (node.ip) params.set('ip', node.ip);
    if (node.ipv6) params.set('ipv6', node.ipv6);
    if (node.preSharedKey) params.set('preshared-key', node.preSharedKey);
    if (node.mtu) params.set('mtu', String(node.mtu));
    if (node.reserved) params.set('reserved', node.reserved.join(','));

    const mergedParams = mergeParams(params, originalParams);
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `wireguard://${encodeURIComponent(node.privateKey)}@${host}:${node.port}?${mergedParams.toString()}${hash}`;
}

function buildAnyTLSUrl(node: AnyTLSNode): string {
    const params = buildStandardQuery(undefined, node.tls);
    const originalParams = extractMissingParams(node);
    const mergedParams = mergeParams(params, originalParams);

    if (node.clientFingerprint) mergedParams.set('fp', node.clientFingerprint);
    if (node.idleTimeout) mergedParams.set('idle_timeout', String(node.idleTimeout));
    if (node.tls?.enabled) mergedParams.set('tls', '1');

    const userInfo = node.password ? `${encodeURIComponent(node.password)}@` : '';
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `anytls://${userInfo}${host}:${node.port}?${mergedParams.toString()}${hash}`;
}

function buildSnellUrl(node: SnellNode): string {
    const params = new URLSearchParams();
    const originalParams = extractMissingParams(node);

    if (node.version) params.set('version', node.version);
    if (node.obfs) {
        params.set('obfs', node.obfs.type);
        if (node.obfs.host) params.set('host', node.obfs.host);
    }
    params.set('psk', node.password);

    const mergedParams = mergeParams(params, originalParams);
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `snell://${host}:${node.port}?${mergedParams.toString()}${hash}`;
}

function buildSocks5Url(node: Socks5Node): string {
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    let userInfo = '';
    if (node.username && node.password) {
        userInfo = `${encodeURIComponent(node.username)}:${encodeURIComponent(node.password)}@`;
    } else if (node.username) {
        userInfo = `${encodeURIComponent(node.username)}@`;
    } else if (node.password) {
        userInfo = `:${encodeURIComponent(node.password)}@`;
    }

    return `socks5://${userInfo}${host}:${node.port}${hash}`;
}

// =================================================================
// 导出
// =================================================================

export {
    buildVlessUrl,
    buildVmessUrl,
    buildTrojanUrl,
    buildShadowsocksUrl,
    buildHysteria2Url,
    buildTuicUrl,
    buildSSRUrl,
    buildHysteriaUrl,
    buildWireGuardUrl,
    buildAnyTLSUrl,
    buildSnellUrl,
    buildSocks5Url
};
