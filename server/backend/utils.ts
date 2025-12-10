import { Settings } from './types';

export const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes || bytes < 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 0) return '0 B';
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export function calculateDataHash(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

export function hasDataChanged(oldData: any, newData: any): boolean {
    if (!oldData && !newData) return false;
    if (!oldData || !newData) return true;
    return calculateDataHash(oldData) !== calculateDataHash(newData);
}

export async function sendTgNotification(settings: Settings, message: string) {
    if (!settings.BotToken || !settings.ChatID) {
        console.log("TG BotToken or ChatID not set, skipping notification.");
        return false;
    }
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const fullMessage = `${message}\n\n*时间:* \`${now} (UTC+8)\``;

    const url = `https://api.telegram.org/bot${settings.BotToken}/sendMessage`;
    const payload = {
        chat_id: settings.ChatID,
        text: fullMessage,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            console.log("TG 通知已成功发送。");
            return true;
        } else {
            const errorData = await response.json();
            console.error("发送 TG 通知失败：", response.status, errorData);
            return false;
        }
    } catch (error) {
        console.error("发送 TG 通知时出错：", error);
        return false;
    }
}
