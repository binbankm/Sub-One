import { Env } from '../types';
import { KV_KEY_SETTINGS, KV_KEY_SUBS, KV_KEY_PROFILES } from '../config/constants';
import { defaultSettings, GLOBAL_USER_AGENT } from '../config/defaults';
import { formatBytes } from '../utils/common';
import { sendTgNotification } from '../services/notification';
import { ProxyUtils } from '../proxy';
import { Proxy } from '../proxy/types';
import { Subscription, Profile, AppConfig } from '../../shared/types';

async function generateCombinedNodeList(
    userAgent: string,
    subs: Subscription[]
): Promise<Proxy[]> {
    const allProxies: Proxy[] = [];

    // 1. 处理手动节点和 HTTP 订阅
    const subPromises = subs.map(async (sub) => {
        if (!sub.enabled) return [];
        try {
            let content = sub.url;
            if (sub.url.toLowerCase().startsWith('http')) {
                const response = await Promise.race([
                    fetch(new Request(sub.url, {
                        headers: { 'User-Agent': userAgent },
                        redirect: "follow",
                        cf: { insecureSkipVerify: true }
                    })),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
                ]) as Response;

                if (!response.ok) return [];
                content = await response.text();
            }

            // 解析
            const proxies = ProxyUtils.parse(content);
            // 订阅级过滤
            return ProxyUtils.process(proxies, {
                subName: sub.name,
                exclude: sub.exclude,
            });
        } catch (e) {
            console.error(`Failed to fetch/parse sub ${sub.name}:`, e);
            return [];
        }
    });

    const results = await Promise.all(subPromises);
    results.forEach(list => allProxies.push(...list));

    return allProxies;
}

export async function handleSubRequest(context: EventContext<Env, any, any>): Promise<Response> {
    const { request, env } = context;
    const url = new URL(request.url);
    const userAgentHeader = request.headers.get('User-Agent') || "Unknown";

    const [settingsData, subsData, profilesData] = await Promise.all([
        env.SUB_ONE_KV.get(KV_KEY_SETTINGS, 'json'),
        env.SUB_ONE_KV.get(KV_KEY_SUBS, 'json'),
        env.SUB_ONE_KV.get(KV_KEY_PROFILES, 'json')
    ]);

    const allSubs = (subsData || []) as Subscription[];
    const allProfiles = (profilesData || []) as Profile[];
    const config = { ...defaultSettings, ...(settingsData as AppConfig) };

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
            // Clash Meta/Mihomo 系列客户端 (支持 VLESS, Hysteria2 等)
            ['clash-meta', 'clashmeta'],
            ['clash.meta', 'clashmeta'],
            ['clash-verge', 'clashmeta'],
            ['clash-verge-rev', 'clashmeta'],
            ['flclash', 'clashmeta'],
            ['clash party', 'clashmeta'],
            ['clashparty', 'clashmeta'],
            ['mihomo party', 'clashmeta'],
            ['mihomoparty', 'clashmeta'],
            ['mihomo', 'clashmeta'],
            ['stash', 'stash'],                // Stash 映射到 ClashMeta 逻辑
            ['nekoray', 'clashmeta'],
            // 标准 Clash 客户端
            ['clash', 'clash'],
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

    // 3. 构建临时节点 (如流量信息等)
    const extraProxies: Proxy[] = [];
    if (!isProfileExpired) {
        const totalRemainingBytes = targetSubs.reduce((acc, sub) => {
            if (sub.enabled && sub.userInfo && sub.userInfo.total > 0) {
                const used = (sub.userInfo.upload || 0) + (sub.userInfo.download || 0);
                const remaining = sub.userInfo.total - used;
                return acc + Math.max(0, remaining);
            }
            return acc;
        }, 0);
        if (totalRemainingBytes > 0) {
            const formattedTraffic = formatBytes(totalRemainingBytes);
            extraProxies.push({
                name: `流量剩余 ≫ ${formattedTraffic}`,
                type: 'trojan',
                server: '127.0.0.1',
                port: 443,
                password: '00000000-0000-0000-0000-000000000000',
            } as any);
        }
    } else {
        extraProxies.push({
            name: '您的订阅已失效',
            type: 'trojan',
            server: '127.0.0.1',
            port: 443,
            password: '00000000-0000-0000-0000-000000000000',
        } as any);
    }

    const combinedNodes = [...extraProxies, ...await generateCombinedNodeList(GLOBAL_USER_AGENT, targetSubs)];

    // 4. 全局处理 (去重、全局开关)
    const processedNodes = ProxyUtils.process(combinedNodes, {
        dedupe: !!config.dedupe,
        udp: !!config.udp,
        skipCertVerify: !!config.skipCertVerify,
    });

    // 5. 生成目标格式
    const finalTarget = targetFormat === 'base64' ? 'URI' : targetFormat;

    try {
        const convertedContent = ProxyUtils.produce(
            processedNodes,
            finalTarget,
            'external',
            {
                filename: subName,
                udp: !!config.udp,
                skipCertVerify: !!config.skipCertVerify
            }
        ) as string;

        const responseHeaders = new Headers({
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `inline; filename*=utf-8''${encodeURIComponent(subName)}`,
            'Cache-Control': 'no-store, no-cache'
        });

        return new Response(convertedContent, {
            status: 200,
            headers: responseHeaders
        });

    } catch (conversionError: any) {
        console.error('[Internal Converter Error]', conversionError);
        return new Response(`Conversion Failed: ${conversionError.message}`, { status: 500 });
    }
}
