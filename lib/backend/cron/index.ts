
import { Env } from '../types';
import { KV_KEY_SETTINGS, KV_KEY_SUBS } from '../config/constants';
import { defaultSettings, GLOBAL_USER_AGENT } from '../config/defaults';
import { checkAndNotify } from '../services/notification';
import { Subscription, AppConfig, SubscriptionUserInfo } from '../proxy/types';
import { StorageFactory } from '../services/storage';
import { getStorageBackendInfo } from '../services/storage-backend';
import { parse } from '../proxy';

// const subscriptionParser = new SubscriptionParser();

/**
 * 获取当前活动的存储服务实例
 */
async function getStorage(env: Env) {
    const info = await getStorageBackendInfo(env);
    return StorageFactory.create(env, info.current);
}

export async function handleCronTrigger(env: Env): Promise<Response> {
    console.log("Cron trigger fired. Checking all subscriptions for traffic and node count...");

    const storage = await getStorage(env);
    const originalSubs = (await storage.get<Subscription[]>(KV_KEY_SUBS)) || [];

    const allSubs = JSON.parse(JSON.stringify(originalSubs)) as Subscription[]; // 深拷贝以便比较
    const settings = (await storage.get<AppConfig>(KV_KEY_SETTINGS)) || defaultSettings;

    let changesMade = false;

    for (const sub of allSubs) {
        if (sub.url.startsWith('http') && sub.enabled) {
            try {
                // ⭐ 优化：只发送一次请求，复用响应（性能提升50%）
                const singleRequest = fetch(new Request(sub.url, {
                    headers: { 'User-Agent': GLOBAL_USER_AGENT },
                    redirect: "follow",
                    cf: { insecureSkipVerify: true }
                } as RequestInit));

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
                                        (info as Record<string, number>)[key] = numValue;
                                    }
                                }
                            });
                            sub.userInfo = info as SubscriptionUserInfo;
                            await checkAndNotify(sub, settings as AppConfig);
                            changesMade = true;
                        }

                        // 2. 提取节点数量（从body）
                        const text = await response.text();
                        try {
                            const nodes = parse(text);
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

            } catch (e) {
                const error = e as Error;
                console.error(`Cron: Unhandled error while updating ${sub.name}`, error.message);
            }
        }
    }

    if (changesMade) {
        await storage.put(KV_KEY_SUBS, allSubs);
        console.log("Subscriptions updated with new traffic info and node counts.");
    } else {
        console.log("Cron job finished. No changes detected.");
    }
    return new Response("Cron job completed successfully.", { status: 200 });
}
