/**
 * Sub-One Core Parsers
 * 参考 Sub-Store 的解析器架构
 *
 * 核心功能:
 * - parse(): 解析原始内容，返回代理列表
 * - 支持多种格式：URI、Clash YAML、Base64
 */

import { Parser, Proxy } from '../types';
import { safeBase64Decode, isBase64, logger } from '../utils';

// === 导入所有解析器 ===
import { URI_SS } from './ss';
import { URI_SSR } from './ssr';
import { URI_VMess } from './vmess';
import { URI_VLESS } from './vless';
import { URI_Trojan } from './trojan';
import { URI_Hysteria } from './hysteria';
import { URI_Hysteria2 } from './hysteria2';
import { URI_TUIC } from './tuic';
import { URI_WireGuard } from './wireguard';
import { URI_AnyTLS } from './anytls';
import { URI_Socks5, URI_Socks, URI_HTTP } from './socks';
import { Surge_Line, QX_Line, Loon_Line } from './client';
import { URI_Snell } from './snell';
import { Clash_All, parseClashYAML } from './clash';

// === 导出所有解析器 ===
export { URI_SS } from './ss';
export { URI_SSR } from './ssr';
export { URI_VMess } from './vmess';
export { URI_VLESS } from './vless';
export { URI_Trojan } from './trojan';
export { URI_Hysteria } from './hysteria';
export { URI_Hysteria2 } from './hysteria2';
export { URI_TUIC } from './tuic';
export { URI_WireGuard } from './wireguard';
export { URI_AnyTLS } from './anytls';
export { URI_Socks5, URI_Socks, URI_HTTP } from './socks';
export { Surge_Line, QX_Line, Loon_Line } from './client';
export { URI_Snell } from './snell';
export { Clash_All, parseClashYAML, parseClashProxy } from './clash';

/**
 * 所有 URI 解析器列表
 * 按优先级排序（常用协议优先）
 */
export const PROXY_PARSERS: Parser[] = [
    URI_SS(),
    URI_SSR(),
    URI_VMess(),
    URI_VLESS(),
    URI_Trojan(),
    URI_Hysteria2(),
    URI_Snell(),
    URI_Hysteria(),
    URI_TUIC(),
    URI_WireGuard(),
    URI_AnyTLS(),
    URI_Socks5(),
    URI_Socks(),
    URI_HTTP(),
    Surge_Line(),
    QX_Line(),
    Loon_Line(),
];

/**
 * 预处理原始内容
 * - Base64 解码
 * - 清理空白字符
 */
function preprocess(raw: string): string {
    let content = raw.trim();

    // 检测并解码 Base64
    if (isBase64(content)) {
        logger.debug('Detected Base64 encoded content, decoding...');
        content = safeBase64Decode(content);
    }

    return content;
}

/**
 * 尝试使用指定解析器解析一行
 */
function tryParse(parser: Parser, line: string): [Proxy | null, Error | null] {
    if (!safeMatch(parser, line)) {
        return [null, new Error('Parser mismatch')];
    }
    try {
        const proxy = parser.parse(line);
        return [proxy, null];
    } catch (err) {
        return [null, err as Error];
    }
}

/**
 * 安全地测试解析器是否匹配
 */
function safeMatch(parser: Parser, line: string): boolean {
    try {
        return parser.test(line);
    } catch {
        return false;
    }
}

/**
 * 后处理代理对象
 * 参考 Sub-Store 的 lastParse 函数
 */
function postProcess(proxy: Proxy): Proxy {
    // 标准化 cipher
    if (typeof proxy.cipher === 'string') {
        proxy.cipher = proxy.cipher.toLowerCase();
    }

    // 密码转字符串
    if (typeof proxy.password === 'number') {
        proxy.password = String(proxy.password);
    }

    // SS none cipher 需要空密码
    if (proxy.type === 'ss' && proxy.cipher === 'none' && !proxy.password) {
        proxy.password = '';
    }

    // interface -> interface-name
    if (proxy.interface) {
        proxy['interface-name'] = proxy.interface;
        delete proxy.interface;
    }

    // 端口标准化
    if (typeof proxy.port === 'string') {
        proxy.port = parseInt(proxy.port, 10);
    }

    // 服务器地址清理
    if (proxy.server) {
        proxy.server = String(proxy.server)
            .trim()
            .replace(/^\[/, '')
            .replace(/\]$/, '');
    }

    // 默认 network 设置
    if (proxy.type === 'trojan') {
        proxy.network = proxy.network || 'tcp';
    }
    if (proxy.type === 'vmess') {
        proxy.network = proxy.network || 'tcp';
        proxy.cipher = proxy.cipher || 'auto';
        proxy.alterId = proxy.alterId || 0;
    }
    if (proxy.type === 'vless') {
        proxy.network = proxy.network || 'tcp';
    }

    // 隐式 TLS 协议
    if (['trojan', 'tuic', 'hysteria', 'hysteria2', 'anytls'].includes(proxy.type)) {
        proxy.tls = true;
    }

    // ws-opts path 补齐
    if (proxy.network === 'ws') {
        if (!proxy['ws-opts']) {
            proxy['ws-opts'] = {};
        }
        if (!proxy['ws-opts'].path) {
            proxy['ws-opts'].path = '/';
        }
    }

    // 清理空的 reality-opts
    if (proxy['reality-opts'] && Object.keys(proxy['reality-opts']).length === 0) {
        delete proxy['reality-opts'];
    }

    // 清理空的 grpc-opts
    if (proxy['grpc-opts'] && Object.keys(proxy['grpc-opts']).length === 0) {
        delete proxy['grpc-opts'];
    }

    // 非 reality 且空 flow 无意义
    if (!proxy['reality-opts'] && !proxy.flow) {
        delete proxy.flow;
    }

    // 名称默认值
    if (!proxy.name || typeof proxy.name !== 'string') {
        proxy.name = `${proxy.type} ${proxy.server}:${proxy.port}`;
    }

    // disable-sni 标记
    if (['', 'off'].includes(proxy.sni || '')) {
        proxy['disable-sni'] = true;
    }

    return proxy;
}

/**
 * 解析原始内容，返回代理列表
 *
 * 支持格式:
 * 1. Clash YAML
 * 2. Base64 编码的 URI 列表
 * 3. 逐行 URI
 *
 * @param raw 原始内容
 * @returns 代理列表
 */
export function parse(raw: string): Proxy[] {
    // 预处理
    const content = preprocess(raw);

    // 尝试 Clash YAML 格式
    if (Clash_All().test(content)) {
        logger.debug('Detected Clash YAML format');
        const proxies = parseClashYAML(content);
        return proxies.map(postProcess);
    }

    // 按行解析
    const lines = content.split('\n');
    const proxies: Proxy[] = [];
    let lastParser: Parser | null = null;

    for (let line of lines) {
        line = line.trim();
        if (line.length === 0) continue;
        if (line.startsWith('#')) continue; // 跳过注释

        let success = false;

        // 尝试使用上次成功的解析器（性能优化）
        if (lastParser) {
            const [proxy, error] = tryParse(lastParser, line);
            if (!error && proxy) {
                proxies.push(postProcess(proxy));
                success = true;
            }
        }

        // 搜索匹配的解析器
        if (!success) {
            for (const parser of PROXY_PARSERS) {
                const [proxy, error] = tryParse(parser, line);
                if (!error && proxy) {
                    proxies.push(postProcess(proxy));
                    lastParser = parser;
                    success = true;
                    logger.debug(`Parser [${parser.name}] matched`);
                    break;
                }
            }
        }

        if (!success) {
            logger.debug(`Failed to parse line: ${line.substring(0, 50)}...`);
        }
    }

    return proxies;
}

export default parse;
