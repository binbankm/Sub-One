/**
 * 备份恢复服务模块
 *
 * 功能：
 * - 导出所有数据为 JSON 格式
 * - 导入备份数据并恢复
 * - 验证备份文件的完整性
 * - 支持覆盖和合并两种恢复模式
 */
import { KV_KEY_PROFILES, KV_KEY_SETTINGS, KV_KEY_SUBS, KV_KEY_USERS, KV_KEY_BACKUPS } from '../config/constants';
import { IStorageService } from './storage';

/**
 * 服务器快照信息
 */
export interface SnapshotInfo {
    id: string;
    timestamp: number;
    name: string;
    metadata: BackupMetadata;
}

/**
 * 备份文件格式版本
 */
export const BACKUP_VERSION = '2.0.0';

/**
 * 手动节点的 KV 键名（如果存在）
 */

/**
 * 备份元数据
 */
export interface BackupMetadata {
    /** 备份文件版本 */
    version: string;
    /** 备份时间戳 */
    timestamp: number;
    /** 存储后端类型 */
    storageBackend: 'kv' | 'd1';
    /** 导出用户 */
    exportedBy?: string;
    /** 数据统计 */
    itemCount: {
        subscriptions: number;
        profiles: number;
        manualNodes: number;
        proxyCount: number; // 总节点数 (包括订阅内的节点)
        users: number;
    };
}

/**
 * 备份数据结构
 */
export interface BackupData {
    /** 版本号 */
    version: string;
    /** 备份时间戳 */
    timestamp: number;
    /** 元数据 */
    metadata: BackupMetadata;
    /** 实际数据 */
    data: {
        subscriptions: unknown[];
        profiles: unknown[];
        manualNodes?: unknown[]; // Reverted to original as the provided snippet was syntactically incorrect for an interface
        settings: unknown;
        users: unknown;
    };
    /** 数据校验和 */
    checksum: string;
}

/**
 * 导入模式
 */
export type ImportMode = 'overwrite' | 'merge';

/**
 * 生成 SHA-256 校验和
 */
async function generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 导出所有数据
 *
 * @param storage - 存储服务实例
 * @param storageBackend - 当前存储后端类型
 * @param username - 执行导出的用户名
 * @returns 备份数据对象
 */
export async function exportAllData(
    storage: IStorageService,
    storageBackend: 'kv' | 'd1',
    username?: string
): Promise<BackupData> {
    try {
        // 1. 读取所有数据
        const [subscriptions, profiles, settings, users] = await Promise.all([
            storage.get(KV_KEY_SUBS).then((res) => res || []),
            storage.get(KV_KEY_PROFILES).then((res) => res || []),
            storage.get(KV_KEY_SETTINGS).then((res) => res || {}),
            storage.get(KV_KEY_USERS).then((res) => res || {})
        ]);

        const manualNodesCount = Array.isArray(subscriptions)
            ? subscriptions.filter((s: any) => !s.url || !/^https?:\/\//.test(s.url)).length
            : 0;

        const proxyCount = Array.isArray(subscriptions)
            ? subscriptions.reduce((acc: number, s: any) => {
                // 如果是订阅（有URL），累加其 nodeCount
                if (s.url && /^https?:\/\//.test(s.url)) {
                    return acc + (s.nodeCount || 0);
                }
                // 如果是手动节点（无URL），计为 1
                return acc + 1;
            }, 0)
            : 0;

        // 2. 构建元数据
        const metadata: BackupMetadata = {
            version: BACKUP_VERSION,
            timestamp: Date.now(),
            storageBackend,
            exportedBy: username,
            itemCount: {
                subscriptions: Array.isArray(subscriptions)
                    ? subscriptions.filter((s: any) => s.url && /^https?:\/\//.test(s.url)).length
                    : 0,
                profiles: Array.isArray(profiles) ? profiles.length : 0,
                manualNodes: manualNodesCount,
                proxyCount: proxyCount,
                users: typeof users === 'object' && users !== null ? Object.keys(users).length : 0
            }
        };

        // 3. 构建数据对象
        const backupDataContent: BackupData['data'] = {
            subscriptions: Array.isArray(subscriptions) ? subscriptions : [],
            profiles: Array.isArray(profiles) ? profiles : [],
            settings: settings || {},
            users: users || {}
        };

        // 4. 生成校验和
        const dataString = JSON.stringify(backupDataContent);
        const checksum = await generateChecksum(dataString);

        // 5. 构建完整备份对象
        const backupData: BackupData = {
            version: BACKUP_VERSION,
            timestamp: metadata.timestamp,
            metadata,
            data: backupDataContent,
            checksum
        };

        console.log('[Backup Export] 备份导出成功:', {
            version: backupData.version,
            timestamp: new Date(backupData.timestamp).toISOString(),
            itemCount: metadata.itemCount
        });

        return backupData;
    } catch (error) {
        console.error('[Backup Export] 导出失败:', error);
        throw new Error(`导出备份失败: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * 验证备份文件
 *
 * @param backupData - 备份数据对象
 * @returns 验证结果
 */
export async function validateBackup(backupData: unknown): Promise<{
    valid: boolean;
    error?: string;
    metadata?: BackupMetadata;
}> {
    try {
        // 1. 检查基本结构
        if (!backupData || typeof backupData !== 'object') {
            return { valid: false, error: '备份文件格式错误：不是有效的 JSON 对象' };
        }

        const record = backupData as Record<string, any>;

        // 2. 检查必需字段
        if (!record.version) {
            return { valid: false, error: '备份文件缺少版本号' };
        }

        if (!record.metadata) {
            return { valid: false, error: '备份文件缺少元数据' };
        }

        if (!record.data) {
            return { valid: false, error: '备份文件缺少数据内容' };
        }

        if (!record.checksum) {
            return { valid: false, error: '备份文件缺少校验和' };
        }

        // 3. 验证版本兼容性（兼容 1.0.0 和 2.0.0）
        const backupContent = backupData as BackupData;
        const validVersions = ['1.0.0', '2.0.0'];
        if (!validVersions.includes(backupContent.version)) {
            return {
                valid: false,
                error: `备份文件版本不兼容：${backupContent.version}（当前系统支持：${validVersions.join(', ')}）`
            };
        }

        // 4. 验证数据完整性（校验和）
        const dataString = JSON.stringify(backupContent.data);
        const computedChecksum = await generateChecksum(dataString);

        if (computedChecksum !== backupContent.checksum) {
            return { valid: false, error: '备份文件校验失败：数据可能已损坏' };
        }

        // 5. 检查数据结构
        const content = backupContent.data; // 重命名 data 变量避免冲突
        if (!content.subscriptions || !Array.isArray(content.subscriptions)) {
            return { valid: false, error: '备份文件中的订阅源数据格式错误' };
        }

        if (!content.profiles || !Array.isArray(content.profiles)) {
            return { valid: false, error: '备份文件中的订阅组数据格式错误' };
        }

        if (!content.settings || typeof content.settings !== 'object') {
            return { valid: false, error: '备份文件中的设置数据格式错误' };
        }

        // 6. 验证通过
        return {
            valid: true,
            metadata: backupContent.metadata
        };
    } catch (error: unknown) {
        console.error('[Backup Validate] 验证失败:', error);
        return {
            valid: false,
            error: `验证过程出错: ${error instanceof Error ? error.message : '未知错误'}`
        };
    }
}

/**
 * 导入备份数据
 *
 * @param storage - 存储服务实例
 * @param backupData - 备份数据对象
 * @param mode - 导入模式（覆盖 / 合并）
 * @returns 导入结果
 */
export async function importAllData(
    storage: IStorageService,
    backupData: BackupData,
    mode: ImportMode = 'overwrite'
): Promise<{
    success: boolean;
    message: string;
    details?: {
        imported: number;
        skipped: number;
    };
}> {
    try {
        // 1. 先验证备份文件
        const validation = await validateBackup(backupData);
        if (!validation.valid) {
            return {
                success: false,
                message: validation.error || '备份文件验证失败'
            };
        }

        const { data } = backupData as any;

        // 2. 根据模式处理数据
        let finalSubscriptions = data.subscriptions;
        let finalProfiles = data.profiles;
        let finalSettings = data.settings;
        let finalUsers = data.users;

        if (mode === 'merge') {
            // 合并模式：保留现有数据，更新匹配项，添加新项
            const [existingSubs, existingProfiles, existingSettings, existingUsers] =
                await Promise.all([
                    storage.get(KV_KEY_SUBS).then(res => (res || []) as any[]),
                    storage.get(KV_KEY_PROFILES).then(res => (res || []) as any[]),
                    storage.get(KV_KEY_SETTINGS),
                    storage.get(KV_KEY_USERS)
                ]);

            // 合并订阅源（基于 ID 或 URL）
            const subMap = new Map<string, any>();
            existingSubs.forEach((s: any) => subMap.set(s.id || s.url, s));
            // 用备份数据覆盖/更新现有项
            ((data.subscriptions || []) as any[]).forEach((s: any) => {
                const key = s.id || s.url;
                if (subMap.has(key)) {
                    subMap.set(key, { ...(subMap.get(key) || {}), ...s });
                } else {
                    subMap.set(key, s);
                }
            });
            finalSubscriptions = Array.from(subMap.values());

            // 合并订阅组（基于 ID）
            const profileMap = new Map<string, any>();
            existingProfiles.forEach((p: any) => profileMap.set(p.id, p));
            ((data.profiles || []) as any[]).forEach((p: any) => {
                if (profileMap.has(p.id)) {
                    profileMap.set(p.id, { ...(profileMap.get(p.id) || {}), ...p });
                } else {
                    profileMap.set(p.id, p);
                }
            });
            finalProfiles = Array.from(profileMap.values());

            // 设置：合并对象
            if (
                existingSettings &&
                typeof existingSettings === 'object' &&
                !Array.isArray(existingSettings)
            ) {
                finalSettings = {
                    ...(existingSettings as Record<string, unknown>),
                    ...(data.settings as Record<string, unknown>)
                };
            }

            // 用户：合并对象
            if (
                existingUsers &&
                typeof existingUsers === 'object' &&
                !Array.isArray(existingUsers)
            ) {
                finalUsers = {
                    ...(existingUsers as Record<string, unknown>),
                    ...(data.users as Record<string, unknown>)
                };
            }
        }

        // 3. 写入所有数据
        await Promise.all([
            storage.put(KV_KEY_SUBS, finalSubscriptions),
            storage.put(KV_KEY_PROFILES, finalProfiles),
            storage.put(KV_KEY_SETTINGS, finalSettings),
            storage.put(KV_KEY_USERS, finalUsers)
        ]);

        console.log('[Backup Import] 数据导入成功:', {
            mode,
            subscriptions: Array.isArray(finalSubscriptions) ? finalSubscriptions.length : 0,
            profiles: Array.isArray(finalProfiles) ? finalProfiles.length : 0
        });

        return {
            success: true,
            message: mode === 'overwrite' ? '数据已完全恢复' : '数据已合并导入',
            details: {
                imported:
                    (Array.isArray(finalSubscriptions) ? finalSubscriptions.length : 0) +
                    (Array.isArray(finalProfiles) ? finalProfiles.length : 0),
                skipped: 0
            }
        };
    } catch (error) {
        console.error('[Backup Import] 导入失败:', error);
        return {
            success: false,
            message: `导入备份失败: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * 在服务器上创建快照
 *
 * @param storage - 存储服务实例
 * @param storageBackend - 当前存储端
 * @param username - 执行人
 * @param name - 快照名称
 * @returns 创建成功的快照信息
 */
export async function createServerSnapshot(
    storage: IStorageService,
    storageBackend: 'kv' | 'd1',
    username: string,
    name: string
): Promise<SnapshotInfo> {
    // 1. 导出当前数据
    const backupData = await exportAllData(storage, storageBackend, username);

    // 2. 生成快照 ID
    const snapshotId = `snapshot_${backupData.timestamp}_${Math.random().toString(36).substring(2, 9)}`;

    // 3. 保存快照原始数据
    await storage.put(`backup_data_${snapshotId}`, backupData);

    // 4. 更新快照列表
    const backups = (await storage.get<SnapshotInfo[]>(KV_KEY_BACKUPS)) || [];
    const newSnapshot: SnapshotInfo = {
        id: snapshotId,
        timestamp: backupData.timestamp,
        // 使用 Asia/Shanghai 时区生成默认名称，确保与前端显示（通常是本地时间/+8区）一致
        name: name || `快照 ${new Date(backupData.timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
        metadata: backupData.metadata
    };

    backups.unshift(newSnapshot);

    // 限制快照数量，默认保留 20 个
    if (backups.length > 20) {
        const removed = backups.pop();
        if (removed) {
            await storage.delete(`backup_data_${removed.id}`);
        }
    }

    await storage.put(KV_KEY_BACKUPS, backups);

    return newSnapshot;
}

/**
 * 获取服务器上的快照列表
 */
export async function listServerSnapshots(storage: IStorageService): Promise<SnapshotInfo[]> {
    return (await storage.get<SnapshotInfo[]>(KV_KEY_BACKUPS)) || [];
}

/**
 * 删除服务器上的快照
 */
export async function deleteServerSnapshot(
    storage: IStorageService,
    snapshotId: string
): Promise<boolean> {
    try {
        // 1. 获取列表
        const backups = (await storage.get<SnapshotInfo[]>(KV_KEY_BACKUPS)) || [];

        // 2. 移除指定项
        const filtered = backups.filter((b) => b.id !== snapshotId);

        if (filtered.length === backups.length) {
            return false;
        }

        // 3. 删除实际数据
        await storage.delete(`backup_data_${snapshotId}`);

        // 4. 更新列表
        await storage.put(KV_KEY_BACKUPS, filtered);

        return true;
    } catch (error) {
        console.error('[Backup Delete] 删除失败:', error);
        return false;
    }
}

/**
 * 批量删除服务器上的快照
 */
export async function batchDeleteServerSnapshots(
    storage: IStorageService,
    snapshotIds: string[]
): Promise<{ success: boolean; deletedCount: number }> {
    try {
        if (!snapshotIds || snapshotIds.length === 0) {
            return { success: true, deletedCount: 0 };
        }

        // 1. 获取列表
        const backups = (await storage.get<SnapshotInfo[]>(KV_KEY_BACKUPS)) || [];
        const originalCount = backups.length;

        // 2. 移除指定项 (保留不在 snapshotIds 中的项)
        const idSet = new Set(snapshotIds);
        const filtered = backups.filter((b) => !idSet.has(b.id));

        if (filtered.length === originalCount) {
            return { success: true, deletedCount: 0 };
        }

        // 3. 删除实际数据 (并行删除具体数据文件)
        // 这一步即使部分失败也不影响列表更新，因为列表才是索引
        const deletePromises = snapshotIds.map((id) =>
            storage.delete(`backup_data_${id}`).catch((e) => {
                console.warn(`Failed to delete backup data for ${id}:`, e);
            })
        );
        await Promise.allSettled(deletePromises);

        // 4. 更新列表 (一次性写回，原子操作)
        await storage.put(KV_KEY_BACKUPS, filtered);

        return {
            success: true,
            deletedCount: originalCount - filtered.length
        };
    } catch (error) {
        console.error('[Backup Batch Delete] 批量删除失败:', error);
        return { success: false, deletedCount: 0 };
    }
}

/**
 * 从服务器快照恢复
 */
export async function restoreFromServerSnapshot(
    storage: IStorageService,
    snapshotId: string,
    mode: ImportMode = 'overwrite'
): Promise<{ success: boolean; message: string }> {
    try {
        // 1. 获取快照数据
        const backupData = await storage.get<BackupData>(`backup_data_${snapshotId}`);

        if (!backupData) {
            throw new Error('快照不存在或已损坏');
        }

        // 2. 调用现有的导入逻辑
        const result = await importAllData(storage, backupData, mode);

        return result;
    } catch (error: any) {
        console.error('[Backup Restore] 恢复失败:', error);
        return {
            success: false,
            message: error.message || '恢复失败'
        };
    }
}
