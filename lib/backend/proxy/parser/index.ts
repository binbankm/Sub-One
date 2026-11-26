/**
 * Sub-One Parsers Entry
 *
 * 整合所有解析器：URI, Clash, SIP008, Base64
 */
import { Base64 } from 'js-base64';

import type { ProxyNode } from '../types';
import { isNotEmpty, normalizeReserved, parseEndpoint, parsePort } from '../utils';
import { parseClash } from './clash-parser';
import { detectFormat } from './format-detector';
import { parseLoon } from './loon-parser';
import { normalizeProxyNode } from './normalizer';
import { parseQX } from './qx-parser';
import { parseSingbox } from './singbox-parser';
import { parseSIP008 } from './sip008-parser';
import { parseSurge } from './surge-parser';
import { parseNodeURI } from './uri-parsers';

/**
 * 从 INI 格式配置中提取指定 section（如 [Proxy]、[server_local]）的有效行；
 * 若文本中不存在任何目标 section 头，则回退为返回所有非 section 非注释行。
 */
function extractSectionLines(content: string, targetSections: string[]): string[] {
    const rawLines = content.split(/\r?\n/).map((line) => line.trim());
    const targets = new Set(targetSections.map((s) => s.toLowerCase()));
    const hasTargetSection = rawLines.some((line) => {
        const m = line.match(/^\[(.+)\]$/);
        return m ? targets.has(m[1].trim().toLowerCase()) : false;
    });

    const result: string[] = [];
    let inTarget = !hasTargetSection;

    for (const line of rawLines) {
        if (!isNotEmpty(line) || line.startsWith('//') || line.startsWith('#') || line.startsWith(';')) {
            continue;
        }
        const secMatch = line.match(/^\[(.+)\]$/);
        if (secMatch) {
            if (hasTargetSection) {
                inTarget = targets.has(secMatch[1].trim().toLowerCase());
            }
            continue;
        }
        if (inTarget) {
            result.push(line);
        }
    }

    return result;
}

/**
 * 解析 Surge 配置中的 [WireGuard <section-name>] 区块并合并到对应 WireGuard 节点
 */
function mergeSurgeWireGuardSections(content: string, nodes: ProxyNode[]): ProxyNode[] {
    const wgNodes = nodes.filter((n) => n.type === 'wireguard');
    if (wgNodes.length === 0) return nodes;

    const sections = new Map<string, Record<string, string>>();
    let currentSection: string | null = null;

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!isNotEmpty(line) || line.startsWith('#') || line.startsWith('//') || line.startsWith(';')) {
            continue;
        }
        const secMatch = line.match(/^\[WireGuard\s+(.+)\]$/i);
        if (secMatch) {
            currentSection = secMatch[1].trim();
            if (!sections.has(currentSection)) sections.set(currentSection, {});
            continue;
        }
        if (/^\[.*\]$/.test(line)) {
            currentSection = null;
            continue;
        }
        if (currentSection && line.includes('=')) {
            const eqIdx = line.indexOf('=');
            const k = line.substring(0, eqIdx).trim().toLowerCase();
            const v = line.substring(eqIdx + 1).trim();
            sections.get(currentSection)![k] = v;
        }
    }

    if (sections.size === 0) return nodes;

    for (const node of wgNodes) {
        const secName = node._sectionName || node['section-name'] || node.name;
        const sec = sections.get(secName);
        if (!sec) continue;

        if (sec['private-key']) node['private-key'] = sec['private-key'].replace(/^"(.*)"$/, '$1');
        if (sec['self-ip']) node.ip = sec['self-ip'].replace(/^"(.*)"$/, '$1');
        if (sec['self-ip-v6']) node.ipv6 = sec['self-ip-v6'].replace(/^"(.*)"$/, '$1');
        if (sec['dns-server']) {
            const dnsList = sec['dns-server'].split(',').map((s) => s.trim()).filter(Boolean);
            node.dns = dnsList.length === 1 ? dnsList[0] : dnsList;
        }
        if (sec.mtu) {
            const mtu = parseInt(sec.mtu, 10);
            if (!isNaN(mtu)) node.mtu = mtu;
        }
        if (sec['prefer-ipv6'] === 'true') {
            node['ip-version'] = 'ipv6-prefer';
        }
        if (sec.peer) {
            const peerInner = sec.peer.replace(/^\((.*)\)$/, '$1');
            const peerParams: Record<string, string> = {};
            // Split peer params respecting quotes
            const parts: string[] = [];
            let cur = '';
            let inQuotes = false;
            for (let i = 0; i < peerInner.length; i++) {
                const ch = peerInner[i];
                if (ch === '"') inQuotes = !inQuotes;
                if (ch === ',' && !inQuotes) {
                    parts.push(cur.trim());
                    cur = '';
                } else {
                    cur += ch;
                }
            }
            if (cur.trim()) parts.push(cur.trim());

            for (const p of parts) {
                const eqIdx = p.indexOf('=');
                if (eqIdx > 0) {
                    const pk = p.substring(0, eqIdx).trim().toLowerCase();
                    const pv = p.substring(eqIdx + 1).trim().replace(/^"(.*)"$/, '$1');
                    peerParams[pk] = pv;
                }
            }

            if (peerParams.endpoint) {
                const ep = parseEndpoint(peerParams.endpoint);
                if (ep.server) node.server = ep.server;
                if (ep.port) node.port = parsePort(ep.port);
            }
            if (peerParams['public-key']) node['public-key'] = peerParams['public-key'];
            if (peerParams['preshared-key']) node['pre-shared-key'] = peerParams['preshared-key'];
            if (peerParams.keepalive) {
                const ka = parseInt(peerParams.keepalive, 10);
                if (!isNaN(ka)) {
                    node.keepalive = ka;
                    node['persistent-keepalive'] = ka;
                }
            }
            if (peerParams['allowed-ips']) {
                node['allowed-ips'] = peerParams['allowed-ips'].split(',').map((s) => s.trim()).filter(Boolean);
            }
            if (peerParams['client-id']) {
                node.reserved = normalizeReserved(peerParams['client-id']);
            }
            node.peers = [
                {
                    server: node.server,
                    port: node.port,
                    endpoint: peerParams.endpoint,
                    'public-key': node['public-key'],
                    'pre-shared-key': node['pre-shared-key'],
                    'allowed-ips': node['allowed-ips'] || ['0.0.0.0/0', '::/0'],
                    reserved: node.reserved as number[]
                }
            ];
        }
    }

    return nodes;
}

/**
 * 通用解析入口：根据内容格式自动选择解析器
 */
export function parse(content: string): ProxyNode[] {
    if (!isNotEmpty(content)) return [];

    const format = detectFormat(content);

    switch (format) {
        case 'html':
            return [];

        case 'clash':
            return parseClash(content).map(normalizeProxyNode);

        case 'sip008':
            return parseSIP008(content).map(normalizeProxyNode);

        case 'singbox':
            return parseSingbox(content).map(normalizeProxyNode);

        case 'base64': {
            try {
                // [FIX-ED] 处理 URL-Safe Base64 字符替换 (- -> +, _ -> /) 以修复解码兼容性
                let sanitized = content.trim().replace(/-/g, '+').replace(/_/g, '/');
                // Fix padding if needed
                while (sanitized.length % 4) sanitized += '=';
                const decoded = Base64.decode(sanitized);
                // 递归解析解码后的内容，确保返回 ProxyNode[]
                return parse(decoded);
            } catch (e) {
                console.error('[parse] Base64 decode failed:', e);
                return [];
            }
        }

        case 'surge': {
            const surgeNodes = extractSectionLines(content, ['Proxy'])
                .map((line) => parseSurge(line))
                .filter((node): node is ProxyNode => node !== null);
            return mergeSurgeWireGuardSections(content, surgeNodes).map(normalizeProxyNode);
        }

        case 'loon':
            return extractSectionLines(content, ['Proxy'])
                .map((line) => parseLoon(line))
                .filter((node): node is ProxyNode => node !== null)
                .map(normalizeProxyNode);

        case 'qx':
            return extractSectionLines(content, ['server_local'])
                .map((line) => parseQX(line))
                .filter((node): node is ProxyNode => node !== null)
                .map(normalizeProxyNode);

        case 'uri-list':
        case 'unknown':
        default:
            // 按行解析 URI
            return content
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(
                    (line) => isNotEmpty(line) && !line.startsWith('//') && !line.startsWith('#')
                )
                .map((line) => parseNodeURI(line))
                .filter((node): node is ProxyNode => node !== null)
                .map(normalizeProxyNode);
    }
}
