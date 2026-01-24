import { KV_KEY_PROFILES, KV_KEY_SETTINGS, KV_KEY_SUBS } from '../config/constants';
import { GLOBAL_USER_AGENT, defaultSettings } from '../config/defaults';
import { ProxyNode, convert, parse, process } from '../proxy';
import { AppConfig, Profile, SubConfig, Subscription } from '../proxy/types';
import { sendTgNotification } from '../services/notification';
import { StorageFactory } from '../services/storage';
import { getStorageBackendInfo } from '../services/storage-backend';
import { Env } from '../types';

// 去除旧的单例
// const subscriptionParser = new SubscriptionParser();

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
): Promise<ProxyNode[]> {
    // 1. 处理手动节点
    const manualNodes = subs.filter((sub) => {
        const url = sub.url || '';
        return !url.toLowerCase().startsWith('http');
    });
    // 直接解析手动节点文本
    const manualContent = manualNodes.map((n) => n.url).join('\n');
    let processedManualNodes = parse(manualContent);
    processedManualNodes = await process(
        processedManualNodes,
        {
            prependSubName: config.prependSubName,
            dedupe: config.dedupe
        },
        '手动节点'
    );

    // 2. 处理 HTTP 订阅
    const httpSubs = subs.filter((sub) => {
        const url = sub.url || '';
        return url.toLowerCase().startsWith('http');
    });
    const subPromises = httpSubs.map(async (sub) => {
        try {
            const response = (await Promise.race([
                fetch(
                    new Request(sub.url, {
                        headers: { 'User-Agent': userAgent },
                        redirect: 'follow',
                        cf: { insecureSkipVerify: true }
                    })
                ),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
            ])) as Response;

            if (!response.ok) return [];
            const text = await response.text();

            // 使用统一解析流水线
            const nodes = parse(text);
            return await process(
                nodes,
                {
                    exclude: sub.exclude,
                    prependSubName: config.prependSubName,
                    dedupe: config.dedupe
                },
                sub.name
            );
        } catch (e) {
            console.error(`Failed to fetch/parse sub ${sub.name}:`, e);
            return [];
        }
    });

    const processedSubResults = await Promise.all(subPromises);
    const allNodes: ProxyNode[] = [...processedManualNodes, ...processedSubResults.flat()];

    return allNodes;
}

export async function handleSubRequest(
    context: EventContext<Env, string, unknown>
): Promise<Response> {
    const { request, env } = context;
    const url = new URL(request.url);
    const userAgentHeader = request.headers.get('User-Agent') || 'Unknown';

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
    const pathSegments = url.pathname
        .replace(/^\/sub\//, '/')
        .split('/')
        .filter(Boolean);

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
        const profile = allProfiles.find((p) => p.customId === profileIdentifier);
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
                targetSubs = [
                    {
                        id: 'expired-node',
                        url: DEFAULT_EXPIRED_NODE,
                        name: '您的订阅已到期',
                        customId: '',
                        enabled: true,
                        nodeCount: 0
                    } as Subscription
                ];
            } else {
                subName = profile.name;
                const profileSubIds = new Set(profile.subscriptions || []);
                const profileNodeIds = new Set(profile.manualNodes || []);
                targetSubs = allSubs.filter((item) => {
                    const url = item.url || '';
                    const isSubscription = url.startsWith('http');
                    const isManualNode = !isSubscription;
                    const belongsToProfile =
                        (isSubscription && profileSubIds.has(item.id)) ||
                        (isManualNode && profileNodeIds.has(item.id));
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
        targetSubs = allSubs.filter((s) => s.enabled);
    }

    let targetFormat = url.searchParams.get('target');
    if (!targetFormat) {
        const supportedFormats = [
            'clash',
            'mihomo',
            'singbox',
            'surge',
            'stash',
            'surfboard',
            'loon',
            'base64',
            'v2ray',
            'quantumultx',
            'shadowrocket',
            'uri'
        ];
        for (const format of supportedFormats) {
            if (url.searchParams.has(format)) {
                targetFormat = format;
                break;
            }
        }
    }
    if (!targetFormat) {
        const ua = userAgentHeader.toLowerCase();
        const uaMapping = [
            // Clash Meta/Mihomo 系列客户端
            ['clash-verge', 'mihomo'],
            ['clash-meta', 'mihomo'],
            ['clash.meta', 'mihomo'],
            ['mihomo', 'mihomo'], // Mihomo (新版 Clash Meta)
            ['flclash', 'mihomo'], // FlClash
            ['clash party', 'mihomo'], // Clash Party
            ['clashparty', 'mihomo'],
            ['mihomo party', 'mihomo'],
            ['mihomoparty', 'mihomo'],
            ['clashmi', 'mihomo'],
            ['stash', 'stash'], // Stash (iOS Clash)
            ['nekoray', 'mihomo'], // Nekoray (通常兼容 Clash)
            ['clash', 'clash'], // 通用匹配

            // 其他客户端
            ['sing-box', 'singbox'],
            ['shadowrocket', 'shadowrocket'],
            ['v2rayn', 'v2ray'],
            ['v2rayng', 'v2ray'],
            ['surge', 'surge'],
            ['surfboard', 'surfboard'],
            ['loon', 'loon'],
            ['quantumult x', 'quantumultx'],
            ['quantumult', 'quantumultx'],

            // 兜底通用词
            ['meta', 'mihomo']
        ];

        for (const [keyword, format] of uaMapping) {
            if (ua.includes(keyword)) {
                targetFormat = format;
                break;
            }
        }
    }
    if (!targetFormat) {
        targetFormat = 'base64';
    }

    if (!url.searchParams.has('callback_token')) {
        const clientIp = request.headers.get('CF-Connecting-IP') || 'N/A';
        const country = request.headers.get('CF-IPCountry') || 'N/A';
        const domain = url.hostname;
        let message = `🛰️ *订阅被访问* 🛰️\n\n*域名:* \`${domain}\`\n*客户端:* \`${userAgentHeader}\`\n*IP 地址:* \`${clientIp} (${country})\`\n*请求格式:* \`${targetFormat}\``;

        if (profileIdentifier) {
            message += `\n*订阅组:* \`${subName}\``;
            const profile = allProfiles.find(
                (p) =>
                    (p.customId && p.customId === profileIdentifier) || p.id === profileIdentifier
            );
            if (profile && profile.expiresAt) {
                const expiryDateStr = new Date(profile.expiresAt).toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai'
                });
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

    targetSubs.forEach((sub) => {
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

    try {
        const convertedContent = await convert(combinedNodes, targetFormat, {
            filename: subName
        });

        const responseHeaders = new Headers({
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `inline; filename*=utf-8''${encodeURIComponent(subName)}`,
            'Cache-Control': 'no-store, no-cache'
        });

        // 订阅已过期的特殊处理逻辑由生成层或此处保证
        // 如果是 base64, produce 已经处理了 Base64.encode

        // 添加标准的 Subscription-UserInfo HTTP 头部
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
