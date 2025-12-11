import { storage } from './storage';
import { subscriptionParser } from './parser';
import { sendTgNotification, formatBytes } from './utils';
import { Settings, Subscription, Node, UserInfo } from './types';
import {
    KV_KEY_SUBS,
    KV_KEY_SETTINGS,
    defaultSettings
} from './constants';
import * as cron from 'node-cron';


export class CronService {
    start() {
        // Run every 6 hours: "0 */6 * * *"
        cron.schedule('0 */6 * * *', () => {
            this.handleCronTrigger();
        });
        console.log('Cron service started.');
    }

    async handleCronTrigger() {
        console.log("Cron trigger fired. Checking all subscriptions for traffic and node count...");
        const originalSubs = await storage.get<Subscription[]>(KV_KEY_SUBS) || [];
        const allSubs = JSON.parse(JSON.stringify(originalSubs));
        const settings = await storage.get<Settings>(KV_KEY_SETTINGS) || defaultSettings;

        let changesMade = false;

        for (const sub of allSubs) {
            if (sub.url.startsWith('http') && sub.enabled) {
                try {
                    const trafficRequest = fetch(sub.url, {
                        headers: { 'User-Agent': 'Clash for Windows/0.20.39' },
                        redirect: "follow"
                    });
                    const nodeCountRequest = fetch(sub.url, {
                        headers: { 'User-Agent': 'Sub-One-Cron-Updater/1.0' },
                        redirect: "follow"
                    });

                    const [trafficResult, nodeCountResult] = await Promise.allSettled([
                        Promise.race([trafficRequest, new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))]),
                        Promise.race([nodeCountRequest, new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))])
                    ]);

                    if (trafficResult.status === 'fulfilled' && trafficResult.value.ok) {
                        const userInfoHeader = trafficResult.value.headers.get('subscription-userinfo');
                        if (userInfoHeader) {
                            const info: Partial<UserInfo> = {};
                            userInfoHeader.split(';').forEach(part => {
                                const [key, value] = part.trim().split('=');
                                if (key && value) {
                                    (info as Record<string, string | number>)[key] = /^\d+$/.test(value) ? Number(value) : value;
                                }
                            });
                            sub.userInfo = info as UserInfo;
                            await this.checkAndNotify(sub, settings);
                            changesMade = true;
                        }
                    }

                    if (nodeCountResult.status === 'fulfilled' && nodeCountResult.value.ok) {
                        const text = await nodeCountResult.value.text();
                        let nodeCount = 0;
                        try {
                            const nodes = subscriptionParser.parse(text);
                            nodeCount = nodes.length;
                        } catch (e) {
                            console.error(`Cron: Parse failed for ${sub.name}:`, e);
                        }

                        if (nodeCount > 0) {
                            sub.nodeCount = nodeCount;
                            changesMade = true;
                        }
                    }
                } catch (e: unknown) {
                    console.error(`Cron: Unhandled error while updating ${sub.name}`, e instanceof Error ? e.message : String(e));
                }
            }
        }

        if (changesMade) {
            await storage.put(KV_KEY_SUBS, allSubs);
            console.log("Subscriptions updated with new traffic info and node counts.");
        } else {
            console.log("Cron job finished. No changes detected.");
        }
    }

    async checkAndNotify(sub: Subscription, settings: Settings) {
        if (!sub.userInfo) return;

        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();

        if (sub.userInfo.expire) {
            const expiryDate = new Date(sub.userInfo.expire * 1000);
            const daysRemaining = Math.ceil((expiryDate.getTime() - now) / ONE_DAY_MS);

            if (daysRemaining <= (settings.NotifyThresholdDays || 7)) {
                if (!sub.lastNotifiedExpire || (now - sub.lastNotifiedExpire > ONE_DAY_MS)) {
                    const message = `🗓️ *订阅临期提醒* 🗓️\n\n*订阅名称:* \`${sub.name || '未命名'}\`\n*状态:* \`${daysRemaining < 0 ? '已过期' : `仅剩 ${daysRemaining} 天到期`}\`\n*到期日期:* \`${expiryDate.toLocaleDateString('zh-CN')}\``;
                    const sent = await sendTgNotification(settings, message);
                    if (sent) {
                        sub.lastNotifiedExpire = now;
                    }
                }
            }
        }

        const { upload, download, total } = sub.userInfo;
        if (total !== undefined && total > 0 && upload !== undefined && download !== undefined) {
            const used = upload + download;
            const usagePercent = Math.round((used / total) * 100);

            if (usagePercent >= (settings.NotifyThresholdPercent || 90)) {
                if (!sub.lastNotifiedTraffic || (now - sub.lastNotifiedTraffic > ONE_DAY_MS)) {
                    const message = `📈 *流量预警提醒* 📈\n\n*订阅名称:* \`${sub.name || '未命名'}\`\n*状态:* \`已使用 ${usagePercent}%\`\n*详情:* \`${formatBytes(used)} / ${formatBytes(total)}\``;
                    const sent = await sendTgNotification(settings, message);
                    if (sent) {
                        sub.lastNotifiedTraffic = now;
                    }
                }
            }
        }
    }
}

export class SubscriptionService {
    async generateCombinedNodeList(config: Settings, userAgent: string, subs: Subscription[], prependedContent = '') {
        const manualNodes = subs.filter(sub => !sub.url.toLowerCase().startsWith('http'));
        const parsedManualNodes = subscriptionParser.parseNodeLines(manualNodes.map(n => n.url), '手动节点');

        const processedManualNodes = subscriptionParser.processNodes(
            parsedManualNodes,
            '手动节点',
            { prependSubName: config.prependSubName }
        );

        const httpSubs = subs.filter(sub => sub.url.toLowerCase().startsWith('http'));
        const subPromises = httpSubs.map(async (sub) => {
            try {
                const response = await Promise.race([
                    fetch(sub.url, {
                        headers: { 'User-Agent': userAgent },
                        redirect: "follow"
                        // cf: { insecureSkipVerify: true } // Not available in Node, might need https.Agent
                    }),
                    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]);

                if (!response.ok) return [];
                const text = await response.text();

                return subscriptionParser.parse(text, sub.name, {
                    exclude: sub.exclude,
                    prependSubName: config.prependSubName
                });
            } catch (e) {
                console.error(`Failed to fetch/parse sub ${sub.name}:`, e);
                return [];
            }
        });

        const processedSubResults = await Promise.all(subPromises);
        const allNodes = [...processedManualNodes, ...processedSubResults.flat()];

        const uniqueNodes: Node[] = [];
        const seenUrls = new Set();

        for (const node of allNodes) {
            if (!node || !node.url) continue;
            if (!seenUrls.has(node.url)) {
                seenUrls.add(node.url);
                uniqueNodes.push(node);
            }
        }

        let finalContent = uniqueNodes.map(n => n.url).join('\n');
        if (finalContent.length > 0 && !finalContent.endsWith('\n')) finalContent += '\n';

        if (prependedContent) {
            return `${finalContent}${prependedContent}`;
        }
        return finalContent;
    }
}

export const cronService = new CronService();
export const subscriptionService = new SubscriptionService();
