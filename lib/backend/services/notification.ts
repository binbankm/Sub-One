import { AppConfig, Subscription } from '../proxy/types';
import { formatBytes } from '../utils/common';

// --- TG 通知函式 ---
export async function sendTgNotification(settings: AppConfig, message: string): Promise<boolean> {
    if (!settings.BotToken || !settings.ChatID) {
        console.log('TG BotToken or ChatID not set, skipping notification.');
        return false;
    }
    // 为所有消息添加时间戳
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const fullMessage = `${message} \n\n * 时间:* \`${now} (UTC+8)\``;

    const url = `https://api.telegram.org/bot${settings.BotToken}/sendMessage`;
    const payload = {
        chat_id: settings.ChatID,
        text: fullMessage,
        parse_mode: 'Markdown',
        disable_web_page_preview: true // 禁用链接预览，使消息更紧凑
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            console.log('TG 通知已成功发送。');
            return true;
        } else {
            const errorData = await response.json();
            console.error('发送 TG 通知失败：', response.status, errorData);
            return false;
        }
    } catch (error) {
        console.error('发送 TG 通知时出错：', error);
        return false;
    }
}

// sub: 要检查的订阅对象
// settings: 全局设置
// env: Cloudflare 环境
export async function checkAndNotify(sub: Subscription, settings: AppConfig): Promise<void> {
    if (!sub.userInfo) return; // 没有流量信息，无法检查

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // 1. 检查订阅到期
    if (sub.userInfo.expire) {
        const expiryDate = new Date(sub.userInfo.expire * 1000);
        const daysRemaining = Math.ceil((expiryDate.getTime() - now) / ONE_DAY_MS);

        // 检查是否满足通知条件：剩余天数 <= 阈值
        if (daysRemaining <= (settings.NotifyThresholdDays || 7)) {
            // 检查上次通知时间，防止24小时内重复通知
            if (!sub.lastNotifiedExpire || now - sub.lastNotifiedExpire > ONE_DAY_MS) {
                const isExpired = daysRemaining < 0;
                const statusIcon = isExpired ? '🔴' : '🟡';
                const statusText = isExpired ? '已过期' : `仅剩 ${daysRemaining} 天`;
                
                const message = 
                    `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
                    `┃  🗓️ 到期提醒 ${statusIcon}  ┃\n` +
                    `┗━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                    `📌 *订阅名称*\n` +
                    `\`${sub.name || '未命名'}\`\n\n` +
                    `⏰ *到期时间*\n` +
                    `\`${expiryDate.toLocaleDateString('zh-CN')}\`\n\n` +
                    `📊 *当前状态*\n` +
                    `\`${statusText}\``;
                
                const sent = await sendTgNotification(settings, message);
                if (sent) {
                    sub.lastNotifiedExpire = now; // 更新通知时间戳
                }
            }
        }
    }

    // 2. 检查流量使用
    const { upload, download, total } = sub.userInfo;
    if (total && total > 0 && upload !== undefined && download !== undefined) {
        const used = upload + download;
        const usagePercent = Math.round((used / total) * 100);
        const remaining = total - used;

        // 检查是否满足通知条件：已用百分比 >= 阈值
        if (usagePercent >= (settings.NotifyThresholdPercent || 90)) {
            // 检查上次通知时间，防止24小时内重复通知
            if (!sub.lastNotifiedTraffic || now - sub.lastNotifiedTraffic > ONE_DAY_MS) {
                const statusIcon = usagePercent >= 95 ? '🔴' : '🟠';
                
                const message = 
                    `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
                    `┃  📊 流量预警 ${statusIcon}  ┃\n` +
                    `┗━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                    `📌 *订阅名称*\n` +
                    `\`${sub.name || '未命名'}\`\n\n` +
                    `📈 *使用情况*\n` +
                    `已用: \`${formatBytes(used)}\`\n` +
                    `总量: \`${formatBytes(total)}\`\n` +
                    `剩余: \`${formatBytes(remaining)}\`\n\n` +
                    `⚠️ *已使用 ${usagePercent}%*`;
                
                const sent = await sendTgNotification(settings, message);
                if (sent) {
                    sub.lastNotifiedTraffic = now;
                }
            }
        }
    }
}
