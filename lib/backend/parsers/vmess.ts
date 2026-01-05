import { VmessNode, TransportOptions, TlsOptions, NetworkType, V2rayNConfig } from '../../shared/types';
import { decodeBase64 } from '../converter/base64';
import { generateId } from './helper';

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
        // require('fs').appendFileSync('vmess-debug.log', `Decoded: ${decoded}\n`);
        const config = JSON.parse(decoded);
        return parseVmessJson(config, url);
    } catch (e) {
        // require('fs').appendFileSync('vmess-debug.log', `Error: ${e}\n`);
        console.error('[VMess Parsing Error]', e);
        return null;
    }
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
