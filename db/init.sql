-- ============================================
-- Sub-One D1 数据库初始化脚本
-- ============================================
-- 用途：在 Cloudflare D1 数据库中创建存储表和索引
-- 执行位置：Cloudflare Dashboard → D1 → 选择数据库 → 控制台
-- 执行次数：仅需执行一次（可安全重复执行）
-- ============================================

-- 1. 创建存储表
-- 该表模拟 KV 的键值对存储方式，用于存储所有应用数据
CREATE TABLE IF NOT EXISTS storage (
    key TEXT PRIMARY KEY,        -- 键名（主键，唯一）
    value TEXT NOT NULL,         -- 值（JSON 格式字符串）
    updated_at INTEGER NOT NULL  -- 更新时间戳（毫秒，用于排序和查询）
);

-- 2. 创建索引以提高查询性能
-- 索引说明：索引相当于数据库的"目录"，能显著提升查询速度

-- 2.1 时间索引：加速按时间排序和范围查询
CREATE INDEX IF NOT EXISTS idx_updated_at ON storage(updated_at);

-- 2.2 键名索引：加速键名查找和前缀匹配
CREATE INDEX IF NOT EXISTS idx_key_prefix ON storage(key);

-- 3. 插入初始化标记
-- 该记录用于标识数据库已成功初始化，便于调试和验证
INSERT OR REPLACE INTO storage (key, value, updated_at)
VALUES ('_db_initialized', '"true"', strftime('%s', 'now') * 1000);

-- ============================================
-- 初始化完成！
-- 数据库现在已准备好存储以下数据：
-- - subs: 订阅源数据
-- - profiles: 订阅组数据
-- - settings: 系统设置
-- - sub_one_users_v1: 用户账号数据
-- ============================================
