import { Hysteria2Node } from '../../shared/types';
import { safeDecodeURIComponent, parseStandardParams, generateId } from './helper';

/**
 * 解析 Hysteria 2 链接
 * 格式: hysteria2://[auth@]hostname[:port]/?[params]#[name]
 * 兼容: hy2://
 * 
 * 完整支持官方 URI 规范:
 * - 认证: password 或 username:password (userpass)
 * - 混淆: salamander
 * - TLS: sni, insecure, pinSHA256
 * - 多端口: 123,5000-6000
 * 
 * 官方文档: https://v2.hysteria.network/docs/developers/URI-Scheme/
 */
export function parseHysteria2(url: string): Hysteria2Node | null {
    try {
        // 统一协议前缀
        const normalizedUrl = url.replace(/^hy2:\/\//, 'hysteria2://');
        if (!normalizedUrl.startsWith('hysteria2://')) return null;

        const urlObj = new URL(normalizedUrl);

        // ========== 1. 认证信息解析 ==========
        // 支持两种模式:
        // - password 模式: hysteria2://password@host
        // - userpass 模式: hysteria2://username:password@host
        const authInfo = safeDecodeURIComponent(urlObj.username);
        let password = '';
        let username = '';

        if (authInfo.includes(':')) {
            // userpass 模式
            const parts = authInfo.split(':');
            username = parts[0];
            password = parts.slice(1).join(':'); // 密码可能包含冒号
        } else {
            // password 模式
            password = authInfo;
        }

        // ========== 2. 服务器和端口 ==========
        const server = urlObj.hostname.replace(/^\[|\]$/g, '');
        const name = safeDecodeURIComponent(urlObj.hash.slice(1)) || 'Hysteria2节点';

        // 多端口格式解析: 123,5000-6000
        // 注意：多端口格式主要用于服务端，客户端通常选择第一个端口
        let port = 0;
        const portStr = urlObj.port || '443'; // 默认端口 443

        if (portStr.includes(',') || portStr.includes('-')) {
            // 多端口格式，提取第一个端口
            const firstPort = portStr.split(',')[0].split('-')[0];
            port = Number(firstPort);
            console.log(`[Hysteria2] 检测到多端口格式: ${portStr}, 使用第一个端口: ${port}`);
        } else {
            port = Number(portStr);
        }

        if (!server || !port || port < 1 || port > 65535) {
            console.warn('[Hysteria2] 服务器或端口无效:', { server, port });
            return null;
        }

        const params = new URLSearchParams(urlObj.search);

        // ========== 3. TLS 参数解析 ==========
        const { tls } = parseStandardParams(params);

        // Hysteria 2 强制 TLS/QUIC
        tls.enabled = true;

        // pinSHA256: 证书指纹固定 (用于防止 MITM)
        const pinSHA256 = params.get('pinSHA256');
        if (pinSHA256) {
            // 存储在 TLS 选项的扩展字段中
            if (!tls.fingerprint) {
                tls.fingerprint = pinSHA256;
            }
        }

        // ========== 4. 混淆参数 ==========
        const obfsType = params.get('obfs');
        const obfsPassword = params.get('obfs-password');

        let obfs = undefined;
        if (obfsType && obfsType !== 'none') {
            // 官方仅支持 salamander
            if (obfsType !== 'salamander') {
                console.warn(`[Hysteria2] 未知的混淆类型: ${obfsType} (官方仅支持 salamander)`);
            }
            obfs = {
                type: obfsType,
                password: obfsPassword || ''
            };
        }

        // ========== 5. 构建节点对象 ==========
        const node: Hysteria2Node = {
            type: 'hysteria2',
            id: generateId(),
            name,
            server,
            port,
            password,
            udp: true, // Hysteria 2 基于 UDP/QUIC
            tls,
            obfs
        };

        // 调试日志
        if (typeof process !== 'undefined' && process.env?.DEBUG_PARSER) {
            console.log('[Hysteria2] 解析成功:', {
                name: node.name,
                server: node.server,
                port: node.port,
                auth: username ? 'userpass' : 'password',
                obfs: obfs?.type || 'none',
                pinned: !!pinSHA256
            });
        }

        return node;

    } catch (e) {
        console.error('[Hysteria2] 解析失败:', e instanceof Error ? e.message : e);
        return null;
    }
}
