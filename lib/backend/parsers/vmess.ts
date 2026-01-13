import { VmessNode, TransportOptions, TlsOptions, NetworkType, V2rayNConfig } from '../../shared/types';
import { decodeBase64 } from '../converter/base64';
import { generateId, safeDecodeURIComponent, parseStandardParams } from './helper';

/**
 * 解析 VMess 链接
 * 支持 VMess JSON (vmess://base64-json) 和标准 URI
 */
export function parseVmess(url: string): VmessNode | null {
    if (!url.startsWith('vmess://')) return null;

    const content = url.slice(8); // remove vmess://

    // 尝试解析 Base64 JSON (最常见)
    try {
        const decoded = decodeBase64(content);
        const config = JSON.parse(decoded);
        return parseVmessJson(config, url);
    } catch {
        // JSON 解析失败，尝试解析普通 URI 格式
        // 格式: vmess://uuid@host:port?params#name
        try {
            return parseVmessUri(url);
        } catch (e) {
            console.error('[VMess Parsing Error]', e);
            return null;
        }
    }
}

function parseVmessUri(url: string): VmessNode | null {
    const urlObj = new URL(url);
    const uuid = urlObj.username;
    // vmess uri format varies, sometimes it is user@host:port, sometimes host:port?id=...
    // But QuantumultX/Shadowrocket style usually vmess://method:uuid@host:port ?
    // Actually the "standard" URI is vmess://user@host:port?extra...
    // Let's assume user is UUID.

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
        originalUrl: url
    };
}

function parseVmessJson(config: V2rayNConfig, originalUrl: string): VmessNode | null {
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
        if (config.path) transport.serviceName = config.path; // VMess JSON 中 path 常用于存放 serviceName
        if (config.type === 'multi') transport.mode = 'multi';
    }
    // KCP / QUIC
    else if (net === 'kcp' || net === 'quic') {
        if (config.type) transport.headerType = config.type;
        if (config.path) transport.quicKey = config.path; // QUIC key/path 复用
    }

    // --- TLS 解析 ---
    const tls: TlsOptions = {
        enabled: config.tls === 'tls'
    };
    if (tls.enabled) {
        if (config.sni) tls.serverName = config.sni;
        if (config.alpn) tls.alpn = config.alpn.split(',');
        if (config.fp) tls.fingerprint = config.fp;
        // VMess JSON 通常不带 insecure 字段，默认视作 false，除非有特殊扩展字段
        if (config.allowInsecure === true) {
            tls.insecure = true;
        }
    }

    return {
        type: 'vmess',
        id: generateId(),
        name: config.ps || 'VMess节点',
        server: config.add,
        port: port,
        uuid: config.id,
        alterId: Number(config.aid || 0),
        cipher: config.scy || 'auto',
        udp: true,
        transport,
        tls,
        originalUrl
    };
}
