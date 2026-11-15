import i18n from "@/i18n";
/**
 * 格式化字节数
 * @param bytes 字节数
 * @param decimals 小数位
 * @returns 格式化后的字符串 (e.g. "1.5 MB")
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * 格式化剩余天数并返回样式类
 * @param expireTimestamp 过期时间戳 (秒)
 * @returns { date: string, daysRemaining: string, style: string }
 */
export const formatExpiry = (expireTimestamp?: number) => {
    if (!expireTimestamp) return null;
    const expiryDate = new Date(expireTimestamp * 1000);
    const now = new Date();
    expiryDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let style = 'text-gray-500 dark:text-gray-400';
    if (diffDays < 0) style = 'text-danger-500 font-bold dark:text-danger-400';
    else if (diffDays <= 7) style = 'text-warning-500 font-semibold dark:text-warning-400';

    return {
        date: expiryDate.toLocaleDateString(),
        daysRemaining: diffDays < 0 ? i18n.global.t('widgets.subscription.filterEditor.keywords.expired') : diffDays === 0 ? i18n.global.t('widgets.subscription.filterEditor.keywords.expired') : `${diffDays} ${i18n.global.t('widgets.subscription.filterEditor.keywords.remainingTraffic')}`,
        style: style
    };
};

/**
 * 获取流量显示的颜色样式
 * @param percentage 使用百分比 (0-100)
 * @returns CSS 类名字符串
 */
export const getTrafficColorClass = (percentage: number): string => {
    if (percentage >= 90) return 'bg-linear-to-r from-danger-500 to-danger-600';
    if (percentage >= 75)
        return 'bg-linear-to-r from-warning-500 to-warning-600';
    return 'bg-linear-to-r from-primary-500 to-primary-600';
};
