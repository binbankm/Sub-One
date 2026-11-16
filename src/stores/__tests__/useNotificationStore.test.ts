import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNotificationStore } from '../useNotificationStore';
import i18n from '../../i18n';

describe('useNotificationStore & i18n parameter interpolation', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.useFakeTimers();
    });

    it('should add toast notification successfully', () => {
        const store = useNotificationStore();
        store.showToast('Test Message', 'success', 3000);

        expect(store.toasts.length).toBe(1);
        expect(store.toasts[0].message).toBe('Test Message');
        expect(store.toasts[0].type).toBe('success');
    });

    it('should deduplicate identical toast messages that are already visible', () => {
        const store = useNotificationStore();
        store.showToast('Identical Toast', 'success', 3000);
        store.showToast('Identical Toast', 'success', 3000);

        expect(store.toasts.length).toBe(1);
    });

    it('should debounce identical toast messages within 1.2s even if dismissed', () => {
        const store = useNotificationStore();
        store.showToast('Debounced Toast', 'success', 3000);
        expect(store.toasts.length).toBe(1);

        // Remove the toast manually
        store.removeToast(store.toasts[0].id);
        expect(store.toasts.length).toBe(0);

        // Try showing the same toast within 500ms
        vi.advanceTimersByTime(500);
        store.showToast('Debounced Toast', 'success', 3000);
        expect(store.toasts.length).toBe(0); // Debounced

        // Advance past 1200ms
        vi.advanceTimersByTime(800);
        store.showToast('Debounced Toast', 'success', 3000);
        expect(store.toasts.length).toBe(1); // Allowed
    });

    it('should correctly format node and subscription count with i18n', () => {
        i18n.global.locale.value = 'zh';
        const msgZh = i18n.global.t('entities.node.import.importSuccess', { count: 5 });
        expect(msgZh).toBe('🚀 导入成功！共添加 5 个节点');

        const methodZh = i18n.global.t('entities.node.import.importSuccessMethod', {
            method: 'URL',
            count: 12
        });
        expect(methodZh).toBe('🚀 URL成功！共添加 12 个节点');

        const bulkZh = i18n.global.t('entities.node.management.importSuccess', {
            subs: 2,
            nodes: 8
        });
        expect(bulkZh).toBe('成功导入 2 条订阅和 8 个手动节点');

        // English verification
        i18n.global.locale.value = 'en';
        const msgEn = i18n.global.t('entities.node.import.importSuccess', { count: 5 });
        expect(msgEn).toBe('🚀 Import successful! Added 5 nodes');

        const methodEn = i18n.global.t('entities.node.import.importSuccessMethod', {
            method: 'URL',
            count: 12
        });
        expect(methodEn).toBe('🚀 URL successful! Added 12 nodes');

        const bulkEn = i18n.global.t('entities.node.management.importSuccess', {
            subs: 2,
            nodes: 8
        });
        expect(bulkEn).toBe('Successfully imported 2 subscriptions and 8 manual nodes');

        // Reset to zh
        i18n.global.locale.value = 'zh';
    });
});
