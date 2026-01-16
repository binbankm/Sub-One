import { ShadowsocksRNode } from '../../shared/types';
import { Base64 } from 'js-base64';
import { safeDecodeURIComponent, generateId } from './helper';

/**
 * 解析 ShadowsocksR (SSR) 链接
 * 格式: ssr://BASE64(server:port:protocol:method:obfs:base64password/?params)
 * 
 * 参数:
 * - obfsparam, protoparam: Base64 编码
 * - remarks, group: Base64 编码
 * 
 * 注意: SSR 已停止维护，仅用于兼容
 */
export function parseSSR(url: string): ShadowsocksRNode | null {
    if (!url.startsWith('ssr://')) return null;

    try {
        const base64Part = url.slice(6);
        const decoded = Base64.decode(base64Part);

        // SSR 主要是用 : 分隔核心字段
        const mainParts = decoded.split(':');
        if (mainParts.length < 6) return null;

        const server = mainParts[0];
        const port = parseInt(mainParts[1]);
        const protocol = mainParts[2];
        const method = mainParts[3];
        const obfs = mainParts[4];

        // 密码及其之后的部分可能包含参数
        const rest = mainParts.slice(5).join(':');

        // SSR 的参数部分通常由 /? 或 ? 开始
        let passwordBase64 = '';
        let queryPart = '';

        if (rest.includes('/?')) {
            [passwordBase64, queryPart] = rest.split('/?');
        } else if (rest.includes('?')) {
            [passwordBase64, queryPart] = rest.split('?');
        } else {
            passwordBase64 = rest;
        }

        const password = Base64.decode(passwordBase64);

        let name = 'SSR节点';
        let protocolParam = '';
        let obfsParam = '';

        if (queryPart) {
            const params = new URLSearchParams(queryPart);

            const remarksBase64 = params.get('remarks');
            if (remarksBase64) {
                try {
                    name = Base64.decode(remarksBase64);
                } catch {
                    name = safeDecodeURIComponent(remarksBase64);
                }
            }

            const protoParamBase64 = params.get('protoparam');
            if (protoParamBase64) {
                try {
                    protocolParam = Base64.decode(protoParamBase64);
                } catch {
                    protocolParam = protoParamBase64;
                }
            }

            const obfsParamBase64 = params.get('obfsparam');
            if (obfsParamBase64) {
                try {
                    obfsParam = Base64.decode(obfsParamBase64);
                } catch {
                    obfsParam = obfsParamBase64;
                }
            }
        }

        if (!server || !port || !method || !password) return null;

        return {
            id: generateId(),
            type: 'ssr',
            name,
            server,
            port,
            protocol,
            protocolParam,
            cipher: method,
            obfs,
            obfsParam,
            password,
            udp: true
        };

    } catch (e) {
        console.error('[SSR] 解析失败:', e instanceof Error ? e.message : e);
        return null;
    }
}
