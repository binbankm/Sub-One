
import { Env } from '../types';
import { KV_KEY_SETTINGS, KV_KEY_SUBS } from '../config/constants';
import { defaultSettings, GLOBAL_USER_AGENT } from '../config/defaults';
import { checkAndNotify } from '../services/notification';
import { ProxyUtils } from '../proxy';
import { Subscription, AppConfig, SubscriptionUserInfo } from '../../shared/types';

export async function handleCronTrigger(env: Env): Promise<Response> {
    console.log("Cron trigger fired. Checking all subscriptions for traffic and node count...");
    const originalSubs = (await env.SUB_ONE_KV.get(KV_KEY_SUBS, 'json') || []) as Subscription[];
    const allSubs = JSON.parse(JSON.stringify(originalSubs)) as Subscription[]; // 深拷贝以便比较
    const settings = (await env.SUB_ONE_KV.get(KV_KEY_SETTINGS, 'json') || defaultSettings) as AppConfig;

    let changesMade = false;

    for (const sub of allSubs) {
        if (sub.url.startsWith('http') && sub.enabled) {
            try {
                // ⭐ 优化：只发送一次请求，复用响应（性能提升50%）
                const singleRequest = fetch(new Request(sub.url, {
                    headers: { 'User-Agent': GLOBAL_USER_AGENT },
                    redirect: "follow",
                    cf: { insecureSkipVerify: true }
                } as any));

                try {
                    const response = await Promise.race([
                        singleRequest,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
                    ]) as Response;

                    if (response.ok) {
                        // 1. 提取流量信息（从headers）
                        const userInfoHeader = response.headers.get('subscription-userinfo');
                        if (userInfoHeader) {
                            const info: Partial<SubscriptionUserInfo> = {};
                            userInfoHeader.split(';').forEach(part => {
                                const [key, value] = part.trim().split('=');
                                if (key && value) {
                                    const numValue = Number(value);
                                    if (!isNaN(numValue)) {
                                        (info as any)[key] = numValue;
                                    }
                                }
                            });
                            sub.userInfo = info as SubscriptionUserInfo;
                            await checkAndNotify(sub, settings);
                            changesMade = true;
                        }

                        // 2. 提取节点数量（从body）
                        const text = await response.text();
                        try {
                            const nodes = ProxyUtils.parse(text);
                            if (nodes.length > 0) {
                                sub.nodeCount = nodes.length;
                                changesMade = true;
                            }
                        } catch (e) {
                            console.error(`Cron: Parse failed for ${sub.name}:`, e);
                        }
                    } else {
                        console.error(`Cron: HTTP ${response.status} for ${sub.name}`);
                    }
                } catch (error: unknown) {
                    const msg = error instanceof Error ? error.message : String(error);
                    console.error(`Cron: Failed to fetch ${sub.name}:`, msg);
                }

            } catch (e: any) {
                console.error(`Cron: Unhandled error while updating ${sub.name}`, e.message);
            }
        }
    }

    if (changesMade) {
        await env.SUB_ONE_KV.put(KV_KEY_SUBS, JSON.stringify(allSubs));
        console.log("Subscriptions updated with new traffic info and node counts.");
    } else {
        console.log("Cron job finished. No changes detected.");
    }
    return new Response("Cron job completed successfully.", { status: 200 });
}
