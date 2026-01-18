/**
 * 备份恢复服务模块
 * 
 * 功能：
 * - 导出所有数据为 JSON 格式
 * - 导入备份数据并恢复
 * - 验证备份文件的完整性
 * - 支持覆盖和合并两种恢复模式
 */

import { IStorageService } from './storage';
import {
    KV_KEY_SUBS,
    KV_KEY_PROFILES,
    KV_KEY_SETTINGS,
    KV_KEY_USERS
} from '../config/constants';

/**
 * 备份文件格式版本
 */
export const BACKUP_VERSION = '1.0.0';

/**
 * 手动节点的 KV 键名（如果存在）
 */
const KV_KEY_MANUAL_NODES = 'manual_nodes';

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
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
        const [subscriptions, profiles, manualNodes, settings, users] = await Promise.all([
            storage.get(KV_KEY_SUBS).then(res => res || []),
            storage.get(KV_KEY_PROFILES).then(res => res || []),
            storage.get(KV_KEY_MANUAL_NODES).then(res => res || []),
            storage.get(KV_KEY_SETTINGS).then(res => res || {}),
            storage.get(KV_KEY_USERS).then(res => res || {})
        ]);

        // 2. 构建元数据
        const metadata: BackupMetadata = {
            version: BACKUP_VERSION,
            timestamp: Date.now(),
            storageBackend,
            exportedBy: username,
            itemCount: {
                subscriptions: Array.isArray(subscriptions) ? subscriptions.length : 0,
                profiles: Array.isArray(profiles) ? profiles.length : 0,
                manualNodes: Array.isArray(manualNodes) ? manualNodes.length : 0,
                users: typeof users === 'object' && users !== null ? Object.keys(users).length : 0
            }
        };

        // 3. 构建数据对象
        const backupDataContent: BackupData['data'] = {
            subscriptions: Array.isArray(subscriptions) ? subscriptions : [],
            profiles: Array.isArray(profiles) ? profiles : [],
            manualNodes: Array.isArray(manualNodes) ? manualNodes : [],
            settings: settings || {}, // Reverted to original as the provided snippet was syntactically incorrect for an object literal
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

        // 3. 验证版本兼容性（当前仅支持 1.0.0）
        const backupContent = backupData as BackupData;
        if (backupContent.version !== BACKUP_VERSION) {
            return {
                valid: false,
                error: `备份文件版本不兼容：${backupContent.version}（当前系统版本：${BACKUP_VERSION}）`
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

        const { data } = backupData;

        // 2. 根据模式处理数据
        let finalSubscriptions = data.subscriptions;
        let finalProfiles = data.profiles;
        let finalManualNodes = data.manualNodes || [];
        let finalSettings = data.settings;
        let finalUsers = data.users;

        if (mode === 'merge') {
            // 合并模式：保留现有数据，仅添加不存在的项
            const [existingSubs, existingProfiles, existingNodes, existingSettings, existingUsers] = await Promise.all([
                storage.get(KV_KEY_SUBS),
                storage.get(KV_KEY_PROFILES),
                storage.get(KV_KEY_MANUAL_NODES),
                storage.get(KV_KEY_SETTINGS),
                storage.get(KV_KEY_USERS)
            ]);

            // 合并订阅源（基于 ID 或 URL）
            if (Array.isArray(existingSubs) && existingSubs.length > 0) {
                const existingIds = new Set(existingSubs.map((s) => (s as { id: string; url: string }).id || (s as { id: string; url: string }).url));
                const newSubs = data.subscriptions.filter((s) => !existingIds.has((s as { id: string; url: string }).id || (s as { id: string; url: string }).url));
                finalSubscriptions = [...existingSubs, ...newSubs];
            }

            // 合并订阅组（基于 ID）
            if (Array.isArray(existingProfiles) && existingProfiles.length > 0) {
                const existingIds = new Set(existingProfiles.map((p) => (p as { id: string }).id));
                const newProfiles = data.profiles.filter((p) => !existingIds.has((p as { id: string }).id));
                finalProfiles = [...existingProfiles, ...newProfiles];
            }

            // 合并手动节点（基于 ID）
            if (Array.isArray(existingNodes) && existingNodes.length > 0) {
                const existingIds = new Set(existingNodes.map((n) => (n as { id: string }).id));
                const newNodes = (data.manualNodes || []).filter((n) => !existingIds.has((n as { id: string }).id));
                finalManualNodes = [...existingNodes, ...newNodes];
            }

            // 设置：合并对象
            if (existingSettings && typeof existingSettings === 'object' && !Array.isArray(existingSettings)) {
                finalSettings = { ...(existingSettings as Record<string, unknown>), ...(data.settings as Record<string, unknown>) };
            }

            // 用户：合并对象
            if (existingUsers && typeof existingUsers === 'object' && !Array.isArray(existingUsers)) {
                finalUsers = { ...(existingUsers as Record<string, unknown>), ...(data.users as Record<string, unknown>) };
            }
        }

        // 3. 写入所有数据
        await Promise.all([
            storage.put(KV_KEY_SUBS, finalSubscriptions),
            storage.put(KV_KEY_PROFILES, finalProfiles),
            storage.put(KV_KEY_MANUAL_NODES, finalManualNodes),
            storage.put(KV_KEY_SETTINGS, finalSettings),
            storage.put(KV_KEY_USERS, finalUsers)
        ]);

        console.log('[Backup Import] 数据导入成功:', {
            mode,
            subscriptions: Array.isArray(finalSubscriptions) ? finalSubscriptions.length : 0,
            profiles: Array.isArray(finalProfiles) ? finalProfiles.length : 0,
            manualNodes: Array.isArray(finalManualNodes) ? finalManualNodes.length : 0
        });

        return {
            success: true,
            message: mode === 'overwrite' ? '数据已完全恢复' : '数据已合并导入',
            details: {
                imported: (Array.isArray(finalSubscriptions) ? finalSubscriptions.length : 0) +
                    (Array.isArray(finalProfiles) ? finalProfiles.length : 0) +
                    (Array.isArray(finalManualNodes) ? finalManualNodes.length : 0),
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
