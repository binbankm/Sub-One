import { KV_KEY_PROFILES, KV_KEY_SETTINGS, KV_KEY_SUBS } from '../config/constants';
import { GLOBAL_USER_AGENT, defaultSettings } from '../config/defaults';
import { ProxyNode, convert, parse, process, handleRenaming } from '../proxy';
import { AppConfig, Profile, SubConfig, Subscription } from '../proxy/types';
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
    subs: Subscription[],
    profileRename?: string
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
            globalRename: config.renameRules,
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
            const response = await fetch(
                new Request(sub.url, {
                    headers: { 'User-Agent': userAgent },
                    redirect: 'follow',
                    cf: { insecureSkipVerify: true },
                    signal: AbortSignal.timeout(15000)
                } as any)
            );

            if (!response.ok) return [];
            const text = await response.text();

            // 使用统一解析流水线
            const nodes = parse(text);
            return await process(
                nodes,
                {
                    exclude: sub.exclude,
                    rename: sub.rename,
                    globalRename: config.renameRules,
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
    let allNodes: ProxyNode[] = [...processedManualNodes, ...processedSubResults.flat()];

    if (profileRename && profileRename.trim()) {
        allNodes = handleRenaming(allNodes, profileRename);
    }

    return allNodes;
}

/**
 * 调用外部 API 进行订阅转换
 * @param externalApiUrl 外部转换 API 基础地址
 * @param subscriptionUrl 订阅源链接（回调链接）
 * @param targetFormat 目标格式
 * @param filename 文件名
 * @returns 转换后的内容
 */
type ExternalApiType = 'subconverter' | 'sublink-worker';

/**
 * 检测外部 API 类型（Subconverter 还是 Sublink Worker）
 * 通过访问首页的 title 判断
 */
async function detectExternalApiType(apiBaseUrl: string): Promise<ExternalApiType> {
    try {
        const resp = await fetch(apiBaseUrl, {
            method: 'GET',
            headers: { 'User-Agent': GLOBAL_USER_AGENT },
            redirect: 'follow'
        });
        const text = await resp.text();
        // Sublink Worker 的首页 title 包含 "Sublink Worker"
        if (text.includes('Sublink Worker') || text.includes('sublink-worker')) {
            return 'sublink-worker';
        }
    } catch {
        // 忽略检测错误，默认走 subconverter
    }
    return 'subconverter';
}

async function convertViaExternalApi(
    externalApiUrl: string,
    subscriptionUrl: string,
    targetFormat: string,
    filename: string
): Promise<string> {
    let finalApiUrl = externalApiUrl.trim();
    if (!finalApiUrl.startsWith('http')) {
        finalApiUrl = 'https://' + finalApiUrl;
    }

    // --- 目标格式映射 (针对外部 API 的兼容性) ---
    let apiTarget = targetFormat.toLowerCase();
    const targetMapping: Record<string, string> = {
        mihomo: 'clash',
        stash: 'clash',
        quantumultx: 'quanx',
        v2ray: 'v2ray',
        shadowrocket: 'ss'
    };

    if (targetMapping[apiTarget]) {
        apiTarget = targetMapping[apiTarget];
    }

    try {
        // --- 检测 API 类型 ---
        const apiType = await detectExternalApiType(finalApiUrl);
        console.log(`Detected external API type: ${apiType}`);

        if (apiType === 'sublink-worker') {
            // ===== Sublink Worker 模式 =====
            // Sublink Worker 使用 /clash?config=... 格式
            // 其中 config 参数是 URL 编码后的节点链接（每行一个）
            // 但它也支持传入订阅 URL，由服务端抓取

            const apiUrl = new URL(finalApiUrl);
            // 格式映射：Sublink Worker 使用 /clash, /singbox 等路径
            const sublinkTargetMap: Record<string, string> = {
                clash: 'clash',
                mihomo: 'clash',
                singbox: 'singbox',
                'sing-box': 'singbox',
                surge: 'surge',
                loon: 'loon',
                quantumultx: 'quantumultx',
                quanx: 'quantumultx',
                shadowrocket: 'shadowrocket',
                stash: 'stash',
                v2ray: 'xray',
                base64: 'xray',
                uri: 'xray'
            };
            const sublinkTarget = sublinkTargetMap[apiTarget] || 'clash';
            apiUrl.pathname = '/' + sublinkTarget;

            // Sublink Worker 的 config 参数：传入订阅 URL
            apiUrl.searchParams.set('config', subscriptionUrl);

            console.log(
                `Calling Sublink Worker API: ${apiUrl.toString()}`
            );

            const response = await fetch(apiUrl.toString(), {
                method: 'GET',
                headers: { 'User-Agent': GLOBAL_USER_AGENT }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Sublink Worker 返回错误 (${response.status}): ${errorText.substring(0, 100)}`
                );
            }

            return await response.text();
        } else {
            // ===== Subconverter 模式 (原有逻辑) =====
            const apiUrl = new URL(finalApiUrl);

            if (apiUrl.pathname === '/' || apiUrl.pathname === '') {
                apiUrl.pathname = '/sub';
            }

            apiUrl.searchParams.set('target', apiTarget);

            if (apiTarget === 'surge') {
                apiUrl.searchParams.set('ver', '4');
            }

            apiUrl.searchParams.set('url', subscriptionUrl);
            apiUrl.searchParams.set('filename', filename);
            apiUrl.searchParams.set('emoji', 'true');

            console.log(
                `Calling Subconverter API: ${apiUrl.origin}${apiUrl.pathname}?target=${targetFormat}...`
            );

            const response = await fetch(apiUrl.toString(), {
                method: 'GET',
                headers: { 'User-Agent': GLOBAL_USER_AGENT }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `外部转换API返回错误 (${response.status}): ${errorText.substring(0, 100)}`
                );
            }

            return await response.text();
        }
    } catch (err: any) {
        if (err.message.includes('Invalid URL')) {
            throw new Error(`非法的外部API地址: "${finalApiUrl}"`);
        }
        throw err;
    }
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
    let activeProfile: Profile | null = null;

    const DEFAULT_EXPIRED_NODE = `trojan://00000000-0000-0000-0000-000000000000@127.0.0.1:443#${encodeURIComponent('您的订阅已失效')}`;

    if (profileIdentifier) {
        if (!token || token !== config.profileToken) {
            return new Response('Invalid Profile Token', { status: 403 });
        }
        const profile = allProfiles.find((p) => p.customId === profileIdentifier);
        if (profile && profile.enabled) {
            activeProfile = profile;
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
            'quanx',
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
            ['quantumult x', 'quanx'],
            ['quantumult', 'quanx'],

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

    // 注意：订阅被访问通知已移除，避免过于频繁的 TG 消息

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

    try {
        let convertedContent: string;

        // --- 核心逻辑修改：外部转换 API 处理 ---
        // 增加一个 flag 防止无限循环（如果请求中包含 _internal=true，则强制使用内置转换返回 base64）
        const isInternalFetch = url.searchParams.get('_internal') === 'true';

        // 基础格式（v2ray, base64, uri）始终强制使用内置转换，避免外部 API 不支持新协议（如 vless, hy2）导致节点丢失
        const simpleTargets = ['v2ray', 'base64', 'uri'];
        const isSimpleTarget = simpleTargets.includes(targetFormat.toLowerCase());

        if (
            !isInternalFetch &&
            config.useExternalConverter &&
            config.externalConverterUrl &&
            config.externalConverterUrl.trim() &&
            !isSimpleTarget
        ) {
            console.log('Using external converter API (Callback Mode)');

            // 构建一个指向当前 Sub-One 的回调链接，让外部 API 来抓取处理好的 base64 节点
            const callbackUrl = new URL(request.url);
            callbackUrl.searchParams.set('target', 'base64');
            callbackUrl.searchParams.set('_internal', 'true'); // 关键：告诉下一级请求只返回节点，不要再调外部 API

            // 某些外部 API 需要正确的 User-Agent 才能从 Sub-One 抓取数据
            // 我们直接调用外部 API
            const finalApiUrl = config.externalConverterUrl.trim();
            convertedContent = await convertViaExternalApi(
                finalApiUrl,
                callbackUrl.toString(), // 传递回调链接而非庞大的 data URI
                targetFormat,
                subName
            );
        } else {
            // --- 内置转换模式 (或者是回调请求本身) ---
            console.log(
                isInternalFetch ? 'Serving internal nodes fetch' : 'Using built-in converter'
            );
            const combinedNodes = await generateCombinedNodeList(
                config,
                upstreamUserAgent,
                targetSubs,
                activeProfile?.rename
            );
            convertedContent = await convert(combinedNodes, targetFormat, {
                filename: subName
            });
        }

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
