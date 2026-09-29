import { KV_KEY_CRON_LOGS, KV_KEY_SETTINGS, KV_KEY_SUBS } from '../config/constants';
import { GLOBAL_USER_AGENT, defaultSettings } from '../config/defaults';
import { parse } from '../proxy';
import { AppConfig, CronLogEntry, Subscription, SubscriptionUserInfo } from '../proxy/types';
import { checkAndNotify, sendTgNotification } from '../services/notification';
import { StorageFactory } from '../services/storage';
import { getStorageBackendInfo } from '../services/storage-backend';
import { Env } from '../types';

/**
 * 记录定时任务执行历史（保留最新 10 条）
 */
async function recordCronLog(
    storage: any,
    entry: Omit<CronLogEntry, 'id'>
) {
    try {
        const history = ((await storage.get(KV_KEY_CRON_LOGS)) as CronLogEntry[] | null) || [];
        const newLog: CronLogEntry = {
            id: crypto.randomUUID(),
            ...entry
        };
        const updated = [newLog, ...history].slice(0, 10);
        await storage.put(KV_KEY_CRON_LOGS, updated);
    } catch (e) {
        console.error('[Cron] Failed to save cron log:', e);
    }
}

/**
 * 获取当前活动的存储服务实例
 */
async function getStorage(env: Env) {
    const info = await getStorageBackendInfo(env);
    return StorageFactory.create(env, info.current);
}

export async function handleCronTrigger(env: Env): Promise<Response> {
    console.log('Cron trigger fired. Checking all subscriptions for traffic and node count...');

    const storage = await getStorage(env);
    const initialSubs = (await storage.get<Subscription[]>(KV_KEY_SUBS)) || [];
    const settings = (await storage.get<AppConfig>(KV_KEY_SETTINGS)) || defaultSettings;

    // 存储更新结果: Map<subId, {userInfo, nodeCount}>
    const updates = new Map<string, { userInfo?: SubscriptionUserInfo; nodeCount?: number }>();

    // 并行执行所有请求以减少总耗时
    const updatePromises = initialSubs.map(async (sub) => {
        if (!sub.url.startsWith('http') || !sub.enabled) return;

        try {
            const response = await fetch(
                new Request(sub.url, {
                    headers: { 'User-Agent': GLOBAL_USER_AGENT },
                    redirect: 'follow',
                    cf: { insecureSkipVerify: true },
                    signal: AbortSignal.timeout(15000)
                } as any)
            );

            if (response.ok) {
                const updateData: { userInfo?: SubscriptionUserInfo; nodeCount?: number } = {};
                let hasUpdate = false;

                // 1. 提取流量信息（从headers）
                const userInfoHeader = response.headers.get('subscription-userinfo');
                if (userInfoHeader) {
                    const info: Partial<SubscriptionUserInfo> = {};
                    userInfoHeader.split(';').forEach((part) => {
                        const [key, value] = part.trim().split('=');
                        if (key && value) {
                            const numValue = Number(value);
                            if (!isNaN(numValue)) {
                                (info as Record<string, number>)[key] = numValue;
                            }
                        }
                    });

                    // 临时更新本地副本用于检查通知（不影响最终写入）
                    sub.userInfo = info as SubscriptionUserInfo;
                    updateData.userInfo = info as SubscriptionUserInfo;

                    // 检查到期和流量预警
                    await checkAndNotify(sub, settings as AppConfig);
                    hasUpdate = true;
                }

                // 2. 提取节点数量（从body）
                const text = await response.text();
                try {
                    // 只解析不处理去重，只为了计数
                    const nodes = parse(text);
                    if (nodes.length > 0) {
                        updateData.nodeCount = nodes.length;
                        hasUpdate = true;
                    }
                } catch (e) {
                    console.error(`Cron: Parse failed for ${sub.name}:`, e);
                }

                if (hasUpdate) {
                    updates.set(sub.id, updateData);
                }
            }
        } catch (e) {
            console.error(`Cron: Failed to process ${sub.name}:`, e);
        }
    });

    await Promise.allSettled(updatePromises);

    if (updates.size > 0) {
        // 关键修复：再次获取最新数据，应用更新，防止覆盖用户期间的修改
        const latestSubs = (await storage.get<Subscription[]>(KV_KEY_SUBS)) || [];
        console.log(`[Cron] Fetched ${latestSubs.length} subs from storage, updates map has ${updates.size} entries`);
        console.log(`[Cron] Update IDs: ${Array.from(updates.keys()).join(', ')}`);
        console.log(`[Cron] Storage sub IDs: ${latestSubs.map(s => s.id).join(', ')}`);
        
        let hasChanges = false;
        let updatedCount = 0;

        for (const sub of latestSubs) {
            if (updates.has(sub.id)) {
                const update = updates.get(sub.id)!;
                console.log(`[Cron] Applying update to ${sub.name} (ID: ${sub.id}):`, update);
                if (update.userInfo) {
                    sub.userInfo = update.userInfo;
                    hasChanges = true;
                }
                if (update.nodeCount !== undefined) {
                    sub.nodeCount = update.nodeCount;
                    hasChanges = true;
                }
                updatedCount++;
            }
        }

        console.log(`[Cron] Matched and updated ${updatedCount} subscriptions, hasChanges=${hasChanges}`);

        if (hasChanges) {
            await storage.put(KV_KEY_SUBS, latestSubs);
            console.log(`[Cron] Saved ${updatedCount} subscriptions to storage`);

            // 记录成功日志
            await recordCronLog(storage, {
                timestamp: Date.now(),
                status: 'success',
                triggerType: 'external',
                updatedCount,
                totalCount: initialSubs.length,
                message: `成功自动刷新了 ${updatedCount} 个订阅的数据`
            });

            // 发送自动更新结果汇总到 TG
            const summaryMsg = 
                `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
                `┃  ⏰ 定时更新报告  ┃\n` +
                `┗━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                `✅ 成功刷新了 \`${updatedCount}\` 个订阅的数据\n` +
                `📅 所有订阅节点信息已同步至最新状态`;
            await sendTgNotification(settings as AppConfig, summaryMsg);
        } else {
            // 记录无变动日志
            await recordCronLog(storage, {
                timestamp: Date.now(),
                status: 'warning',
                triggerType: 'external',
                updatedCount: 0,
                totalCount: initialSubs.length,
                message: '定时任务已触发，所有订阅数据已是最新'
            });
        }
    } else {
        console.log('Cron job finished. No changes detected.');
        await recordCronLog(storage, {
            timestamp: Date.now(),
            status: 'warning',
            triggerType: 'external',
            updatedCount: 0,
            totalCount: initialSubs.length,
            message: '定时任务已触发，但没有找到需要更新的 HTTP 订阅'
        });
    }

    return new Response(JSON.stringify({ success: true, message: 'Cron job completed successfully.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
