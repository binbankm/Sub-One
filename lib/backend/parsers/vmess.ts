import { VmessNode, TransportOptions, TlsOptions, NetworkType, V2rayNConfig } from '../../shared/types';
import { Base64 } from 'js-base64';
import { generateId, safeDecodeURIComponent, parseStandardParams } from './helper';

/**
 * 解析 VMess 链接
 * 
 * 支持格式:
 * 1. VMess JSON: vmess://base64({v:2, ps:..., add:..., ...})
 * 2. 标准 URI: vmess://uuid@host:port?params#name
 * 
 * 注意:
 * - alterId (额外ID) 已被废弃，推荐使用 VLESS
 * - cipher 默认为 'auto' 符合 v2fly 规范
 */
export function parseVmess(url: string): VmessNode | null {
    if (!url.startsWith('vmess://')) return null;

    const content = url.slice(8); // remove vmess://

    // 尝试解析 Base64 JSON (最常见)
    try {
        const decoded = Base64.decode(content);
        const config = JSON.parse(decoded);
        return parseVmessJson(config);
    } catch {
        // JSON 解析失败，尝试解析普通 URI 格式
        // 格式: vmess://uuid@host:port?params#name
        try {
            return parseVmessUri(url);
        } catch (e) {
            console.error('[VMess] 解析失败:', e instanceof Error ? e.message : e);
            return null;
        }
    }
}

function parseVmessUri(url: string): VmessNode | null {
    const urlObj = new URL(url);
    const uuid = urlObj.username;

    if (!uuid) return null;

    const server = urlObj.hostname.replace(/^\[|\]$/g, '');
    const port = Number(urlObj.port);
    const name = safeDecodeURIComponent(urlObj.hash.slice(1)) || 'VMess节点';

    if (!server || !port) return null;

    const params = new URLSearchParams(urlObj.search);
    const { transport, tls } = parseStandardParams(params);

    // Additional params
    const alterId = Number(params.get('aid') || params.get('alterId') || 0);
    const cipher = params.get('scy') || params.get('security') || 'auto';

    // 警告: alterId 已废弃
    if (alterId > 0) {
        console.warn('[VMess] alterId 已被废弃，建议迁移至 VLESS');
    }

    return {
        type: 'vmess',
        id: generateId(),
        name,
        server,
        port,
        uuid,
        alterId,
        cipher,
        udp: true,
        transport,
        tls,
        packetEncoding: params.get('packetEncoding') || params.get('packet_encoding') || undefined,
        originalUrl: url
    };
}

function parseVmessJson(config: V2rayNConfig): VmessNode | null {
    if (!config.add) return null;
    if (!config.port) return null;
    if (!config.id) return null;

    const port = Number(config.port);
    if (isNaN(port)) return null;

    // --- Transport 解析 ---
    const net = (config.net || 'tcp') as NetworkType;
    const transport: TransportOptions = { type: net };

    // WS
    if (net === 'ws') {
        if (config.path) transport.path = config.path;
        if (config.host) transport.headers = { Host: config.host };
    }
    // H2 / HTTP
    else if (net === 'h2' || net === 'http') {
        if (config.path) transport.path = config.path;
        if (config.host) transport.host = config.host.split(',');
    }
    // gRPC
    else if (net === 'grpc') {
        if (config.path) transport.serviceName = config.path;
        if (config.type === 'multi') transport.mode = 'multi';
    }
    // KCP / QUIC
    else if (net === 'kcp' || net === 'quic') {
        if (config.type) transport.headerType = config.type;
        if (config.path) transport.quicKey = config.path;
    }

    // --- TLS 解析 ---
    const tls: TlsOptions = {
        enabled: config.tls === 'tls'
    };
    if (tls.enabled) {
        if (config.sni) tls.serverName = config.sni;
        if (config.alpn) tls.alpn = config.alpn.split(',');
        if (config.fp) tls.fingerprint = config.fp;
        if (config.allowInsecure === true) {
            tls.insecure = true;
        }
    }

    const alterId = Number(config.aid || 0);
    if (alterId > 0) {
        console.warn('[VMess] alterId 已被废弃，建议迁移至 VLESS');
    }

    return {
        type: 'vmess',
        id: generateId(),
        name: config.ps || 'VMess节点',
        server: config.add,
        port: port,
        uuid: config.id,
        alterId,
        cipher: config.scy || 'auto',
        udp: true,
        transport,
        tls
        // originalUrl: originalUrl // 移除以强制前端使用结构化字段显示
    };
}
