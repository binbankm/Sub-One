
import { Env } from '../types';
import { KV_KEY_SETTINGS, KV_KEY_SUBS, KV_KEY_PROFILES } from '../config/constants';
import { defaultSettings, GLOBAL_USER_AGENT } from '../config/defaults';
import { sendTgNotification } from '../services/notification';
import { SubscriptionParser } from '../subscription-parser';
import { subscriptionConverter } from '../converter';
import { Base64 } from 'js-base64';
import { Subscription, Profile, AppConfig, Node, SubConfig } from '../../shared/types';
import { StorageFactory } from '../services/storage';
import { getStorageBackendInfo } from '../services/storage-backend';

const subscriptionParser = new SubscriptionParser();

/**
 * 获取当前活动的存储服务实例
 */
async function getStorage(env: Env) {
    const info = await getStorageBackendInfo(env);
    return StorageFactory.create(env, info.current);
}

async function generateCombinedNodeList(
    config: SubConfig,
    userAgent: string,
    subs: Subscription[]
): Promise<Node[]> {
    // 1. 处理手动节点
    const manualNodes = subs.filter(sub => !sub.url.toLowerCase().startsWith('http'));
    // 解析手动节点
    const parsedManualNodes = subscriptionParser.parseNodeLines(manualNodes.map(n => n.url), '手动节点');

    const processedManualNodes = subscriptionParser.processNodes(
        parsedManualNodes,
        '手动节点',
        { prependSubName: config.prependSubName, dedupe: config.dedupe }
    );

    // 2. 处理 HTTP 订阅
    const httpSubs = subs.filter(sub => sub.url.toLowerCase().startsWith('http'));
    const subPromises = httpSubs.map(async (sub) => {
        try {
            const response = await Promise.race([
                fetch(new Request(sub.url, {
                    headers: { 'User-Agent': userAgent },
                    redirect: "follow",
                    cf: { insecureSkipVerify: true }
                })),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
            ]) as Response;

            if (!response.ok) return [];
            const text = await response.text();

            // parse 方法内部会调用 processNodes
            return subscriptionParser.parse(text, sub.name, {
                exclude: sub.exclude,

                prependSubName: config.prependSubName,
                dedupe: config.dedupe
            });
        } catch (e) {
            console.error(`Failed to fetch/parse sub ${sub.name}:`, e);
            return [];
        }
    });

    const processedSubResults = await Promise.all(subPromises);
    const allNodes: Node[] = [...processedManualNodes, ...processedSubResults.flat()];

    return allNodes;
}

export async function handleSubRequest(context: EventContext<Env, string, unknown>): Promise<Response> {
    const { request, env } = context;
    const url = new URL(request.url);
    const userAgentHeader = request.headers.get('User-Agent') || "Unknown";

    const storage = await getStorage(env);

    const [settingsData, subsData, profilesData] = await Promise.all([
        storage.get<AppConfig>(KV_KEY_SETTINGS),
        storage.get<Subscription[]>(KV_KEY_SUBS),
        storage.get<Profile[]>(KV_KEY_PROFILES)
    ]);

    const allSubs = (subsData || []) as Subscription[];
    const allProfiles = (profilesData || []) as Profile[];
    const config = { ...defaultSettings, ...(settingsData || {}) } as AppConfig;

    let token: string | null = '';
    let profileIdentifier: string | null = null;
    const pathSegments = url.pathname.replace(/^\/sub\//, '/').split('/').filter(Boolean);

    if (pathSegments.length > 0) {
        token = pathSegments[0];
        if (pathSegments.length > 1) {
            profileIdentifier = pathSegments[1] || null;
        }
    } else {
        token = url.searchParams.get('token');
    }

    let targetSubs: Subscription[];
    let subName = config.FileName;
    let isProfileExpired = false;

    const DEFAULT_EXPIRED_NODE = `trojan://00000000-0000-0000-0000-000000000000@127.0.0.1:443#${encodeURIComponent('您的订阅已失效')}`;

    if (profileIdentifier) {
        if (!token || token !== config.profileToken) {
            return new Response('Invalid Profile Token', { status: 403 });
        }
        const profile = allProfiles.find(p => (p.customId && p.customId === profileIdentifier) || p.id === profileIdentifier);
        if (profile && profile.enabled) {
            if (profile.expiresAt) {
                const expiryDate = new Date(profile.expiresAt);
                const now = new Date();
                if (now > expiryDate) {
                    console.log(`Profile ${profile.name} (ID: ${profile.id}) has expired.`);
                    isProfileExpired = true;
                }
            }

            if (isProfileExpired) {
                subName = profile.name;
                // create a temporary expired subscription object
                targetSubs = [{ id: 'expired-node', url: DEFAULT_EXPIRED_NODE, name: '您的订阅已到期', customId: '', enabled: true, nodeCount: 0 } as Subscription];
            } else {
                subName = profile.name;
                const profileSubIds = new Set(profile.subscriptions);
                const profileNodeIds = new Set(profile.manualNodes);
                targetSubs = allSubs.filter(item => {
                    const isSubscription = item.url.startsWith('http');
                    const isManualNode = !isSubscription;
                    const belongsToProfile = (isSubscription && profileSubIds.has(item.id)) || (isManualNode && profileNodeIds.has(item.id));
                    if (!item.enabled || !belongsToProfile) {
                        return false;
                    }
                    return true;
                });
            }
        } else {
            return new Response('Profile not found or disabled', { status: 404 });
        }
    } else {
        if (!token || token !== config.mytoken) {
            return new Response('Invalid Token', { status: 403 });
        }
        targetSubs = allSubs.filter(s => s.enabled);
    }

    let targetFormat = url.searchParams.get('target');
    if (!targetFormat) {
        const supportedFormats = ['clash', 'singbox', 'surge', 'loon', 'base64', 'v2ray', 'quantumultx'];
        for (const format of supportedFormats) {
            if (url.searchParams.has(format)) {
                if (format === 'v2ray') {
                    targetFormat = 'base64';
                } else {
                    targetFormat = format;
                }
                break;
            }
        }
    }
    if (!targetFormat) {
        const ua = userAgentHeader.toLowerCase();
        const uaMapping = [
            // Clash Meta/Mihomo 系列客户端
            ['clash-meta', 'clash'],
            ['clash.meta', 'clash'],
            ['clash-verge', 'clash'],
            ['clash-verge-rev', 'clash'],
            ['flclash', 'clash'],              // FlClash - 跨平台 Clash Meta 客户端
            ['clash party', 'clash'],          // Clash Party (原 Mihomo Party)
            ['clashparty', 'clash'],
            ['mihomo party', 'clash'],
            ['mihomoparty', 'clash'],
            ['clashmi', 'clash'],              // Clash Mi - 移动端客户端
            ['mihomo', 'clash'],
            ['stash', 'clash'],
            ['nekoray', 'clash'],
            ['clash', 'clash'],                // 放在最后，避免误匹配
            // 其他客户端
            ['sing-box', 'singbox'],
            ['shadowrocket', 'base64'],
            ['v2rayn', 'base64'],
            ['v2rayng', 'base64'],
            ['surge', 'surge'],
            ['loon', 'loon'],
            ['quantumult', 'quantumultx']
        ];

        for (const [keyword, format] of uaMapping) {
            if (ua.includes(keyword)) {
                targetFormat = format;
                break;
            }
        }
    }
    if (!targetFormat) { targetFormat = 'base64'; }

    if (!url.searchParams.has('callback_token')) {
        const clientIp = request.headers.get('CF-Connecting-IP') || 'N/A';
        const country = request.headers.get('CF-IPCountry') || 'N/A';
        const domain = url.hostname;
        let message = `🛰️ *订阅被访问* 🛰️\n\n*域名:* \`${domain}\`\n*客户端:* \`${userAgentHeader}\`\n*IP 地址:* \`${clientIp} (${country})\`\n*请求格式:* \`${targetFormat}\``;

        if (profileIdentifier) {
            message += `\n*订阅组:* \`${subName}\``;
            const profile = allProfiles.find(p => (p.customId && p.customId === profileIdentifier) || p.id === profileIdentifier);
            if (profile && profile.expiresAt) {
                const expiryDateStr = new Date(profile.expiresAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
                message += `\n*到期时间:* \`${expiryDateStr}\``;
            }
        }

        context.waitUntil(sendTgNotification(config as AppConfig, message));
    }

    // 计算订阅组的流量统计信息（用于 HTTP 头部）
    let totalUpload = 0;
    let totalDownload = 0;
    let totalBytes = 0;
    let earliestExpire: number | undefined;

    targetSubs.forEach(sub => {
        if (sub.enabled && sub.userInfo) {
            if (sub.userInfo.upload) totalUpload += sub.userInfo.upload;
            if (sub.userInfo.download) totalDownload += sub.userInfo.download;
            if (sub.userInfo.total) totalBytes += sub.userInfo.total;

            // 找出最早的到期时间
            if (sub.userInfo.expire && sub.userInfo.expire > 0) {
                if (!earliestExpire || sub.userInfo.expire < earliestExpire) {
                    earliestExpire = sub.userInfo.expire;
                }
            }
        }
    });

    const upstreamUserAgent = GLOBAL_USER_AGENT;
    console.log(`Fetching upstream with UA: ${upstreamUserAgent}`);

    const combinedNodes = await generateCombinedNodeList(config, upstreamUserAgent, targetSubs);

    let combinedContent = combinedNodes.map(n => n.url).join('\n');
    if (combinedContent.length > 0 && !combinedContent.endsWith('\n')) combinedContent += '\n';

    if (targetFormat === 'base64') {
        let contentToEncode;
        if (isProfileExpired) {
            contentToEncode = DEFAULT_EXPIRED_NODE + '\n';
        } else {
            contentToEncode = combinedContent;
        }

        const headers: Record<string, string> = {
            "Content-Type": "text/plain; charset=utf-8",
            'Cache-Control': 'no-store, no-cache',
            "Content-Disposition": `inline; filename*=utf-8''${encodeURIComponent(subName)}`
        };
        return new Response(Base64.encode(contentToEncode), { headers });
    }

    try {
        const convertedContent = subscriptionConverter.convert(
            combinedNodes,
            targetFormat,
            {
                filename: subName,
                udp: Boolean(config.udp),
                skipCertVerify: Boolean(config.skipCertVerify)
            }
        );

        const responseHeaders = new Headers({
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `inline; filename*=utf-8''${encodeURIComponent(subName)}`,
            'Cache-Control': 'no-store, no-cache'
        });

        // 添加标准的 Subscription-UserInfo HTTP 头部
        // 格式: upload=xxx; download=xxx; total=xxx; expire=xxx
        // 被 Clash、Surge、Loon、QuantumultX 等主流客户端原生支持
        if (totalUpload > 0 || totalDownload > 0 || totalBytes > 0 || earliestExpire) {
            const userInfoParts: string[] = [];

            if (totalUpload > 0) userInfoParts.push(`upload=${totalUpload}`);
            if (totalDownload > 0) userInfoParts.push(`download=${totalDownload}`);
            if (totalBytes > 0) userInfoParts.push(`total=${totalBytes}`);
            if (earliestExpire) userInfoParts.push(`expire=${earliestExpire}`);

            if (userInfoParts.length > 0) {
                responseHeaders.set('Subscription-UserInfo', userInfoParts.join('; '));
            }
        }

        return new Response(convertedContent, {
            status: 200,
            headers: responseHeaders
        });

    } catch (conversionError) {
        const error = conversionError as Error;
        console.error('[Internal Converter Error]', error);
        return new Response(`Conversion Failed: ${error.message}`, { status: 500 });
    }
}
