import { VlessNode } from '../../shared/types';
import { safeDecodeURIComponent, parseStandardParams, generateId } from './helper';

/**
 * 解析 VLESS 链接
 * 格式: vless://uuid@host:port?params#name
 * 
 * 完整支持 Xray 官方分享链接标准:
 * - 基础字段: uuid, server, port, encryption
 * - Flow 控制: xtls-rprx-vision, xtls-rprx-vision-udp443 等
 * - 传输层: tcp, ws, h2, grpc, httpupgrade, splithttp 等
 * - TLS/REALITY: 完整支持所有安全参数
 * 
 * 官方规范: https://github.com/XTLS/Xray-core/discussions/716
 */
export function parseVless(url: string): VlessNode | null {
    try {
        const urlObj = new URL(url);

        // ========== 1. 核心必需字段 ==========
        const uuid = urlObj.username;
        const server = urlObj.hostname.replace(/^\[|\]$/g, ''); // 去除 IPv6 方括号
        const port = Number(urlObj.port);
        const name = safeDecodeURIComponent(urlObj.hash.slice(1)) || 'VLESS节点';

        // UUID 格式验证（标准 UUID v4 格式）
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuid || !uuidPattern.test(uuid)) {
            console.warn('[VLESS] 无效的 UUID 格式:', uuid);
            return null;
        }

        if (!server || !port || port < 1 || port > 65535) {
            console.warn('[VLESS] 缺少必要字段或端口无效:', { server, port });
            return null;
        }

        const params = new URLSearchParams(urlObj.search);

        // ========== 2. VLESS 特有字段 ==========

        // Encryption: VLESS 当前仅支持 'none'
        const encryption = params.get('encryption') || 'none';
        if (encryption !== 'none' && encryption !== '') {
            console.warn('[VLESS] 当前仅支持 encryption=none，发现:', encryption);
            // 不阻断解析，但记录警告
        }

        // Flow: XTLS 流控参数
        // 官方支持: xtls-rprx-vision, xtls-rprx-vision-udp443
        const flow = params.get('flow') || '';
        const validFlows = ['', 'xtls-rprx-vision', 'xtls-rprx-vision-udp443', 'xtls-rprx-direct'];
        if (flow && !validFlows.includes(flow)) {
            console.warn('[VLESS] 未知的 flow 参数:', flow, '(继续解析)');
        }

        // ========== 3. 传输层与安全层解析 ==========
        const { transport, tls } = parseStandardParams(params);

        // VLESS 特殊处理: 如果使用了 flow，必须启用 TLS
        if (flow && flow.startsWith('xtls-')) {
            if (!tls.enabled) {
                console.warn('[VLESS] XTLS flow 需要 TLS，自动启用');
                tls.enabled = true;
            }
        }

        // REALITY 启用时，强制 TLS
        if (tls.reality?.enabled) {
            tls.enabled = true;

            // REALITY 必需字段验证
            if (!tls.reality.publicKey) {
                console.warn('[VLESS] REALITY 缺少 publicKey (pbk)');
                return null;
            }
        }

        // ========== 4. 其他参数 ==========
        const packetEncoding = params.get('packetEncoding') || params.get('packet_encoding');

        // ========== 4. 构建节点对象 ==========
        const node: VlessNode = {
            type: 'vless',
            id: generateId(),
            name,
            server,
            port,
            uuid,
            udp: true, // VLESS 默认支持 UDP
            flow: flow || undefined,
            encryption: encryption || 'none',
            transport,
            tls,
            packetEncoding: packetEncoding || undefined,
            originalUrl: url // 保存原始URL，便于调试和重建
        };

        // 日志输出（调试模式）
        if (typeof process !== 'undefined' && process.env?.DEBUG_PARSER) {
            console.log('[VLESS] 解析成功:', {
                name: node.name,
                server: node.server,
                port: node.port,
                flow: node.flow,
                security: tls.enabled ? (tls.reality?.enabled ? 'reality' : 'tls') : 'none',
                network: transport?.type || 'tcp'
            });
        }

        return node;

    } catch (e) {
        console.error('[VLESS] 解析失败:', e instanceof Error ? e.message : e);
        return null;
    }
}
