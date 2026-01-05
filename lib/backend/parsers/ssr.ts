import { ShadowsocksRNode } from '../../shared/types';
import { decodeBase64 } from '../converter/base64';
import { safeDecodeURIComponent, generateId } from './helper';

/**
 * 解析 ShadowsocksR (SSR) 链接
 * 格式: ssr://BASE64(server:port:protocol:method:obfs:base64password/?obfsparam=base64&protoparam=base64&remarks=base64&group=base64)
 */
export function parseSSR(url: string): ShadowsocksRNode | null {
    if (!url.startsWith('ssr://')) return null;

    try {
        const base64Part = url.slice(6);
        const decoded = decodeBase64(base64Part);

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

        const password = decodeBase64(passwordBase64);

        let name = 'SSR节点';
        let protocolParam = '';
        let obfsParam = '';

        if (queryPart) {
            const params = new URLSearchParams(queryPart);

            const remarksBase64 = params.get('remarks');
            if (remarksBase64) {
                try {
                    name = decodeBase64(remarksBase64);
                } catch {
                    name = safeDecodeURIComponent(remarksBase64);
                }
            }

            const protoParamBase64 = params.get('protoparam');
            if (protoParamBase64) {
                try {
                    protocolParam = decodeBase64(protoParamBase64);
                } catch {
                    protocolParam = protoParamBase64;
                }
            }

            const obfsParamBase64 = params.get('obfsparam');
            if (obfsParamBase64) {
                try {
                    obfsParam = decodeBase64(obfsParamBase64);
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
        return null;
    }
}
