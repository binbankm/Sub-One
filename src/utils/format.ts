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
    if (diffDays < 0) style = 'text-red-500 font-bold';
    else if (diffDays <= 7) style = 'text-yellow-500 font-semibold';

    return {
        date: expiryDate.toLocaleDateString(),
        daysRemaining: diffDays < 0 ? '已过期' : diffDays === 0 ? '今天到期' : `${diffDays} 天后`,
        style: style
    };
};

/**
 * 获取流量显示的颜色样式
 * @param percentage 使用百分比 (0-100)
 * @returns CSS 类名字符串
 */
export const getTrafficColorClass = (percentage: number): string => {
    if (percentage >= 90) return 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30';
    if (percentage >= 75)
        return 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-orange-500/30';
    return 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-500/30';
};
