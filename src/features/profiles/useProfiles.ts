/**
 * ==================== 订阅组管理组合式函数 ====================
 * 
 * 功能说明：
 * - 管理订阅组（Profile）的增删改查操作
 * - 处理订阅组分页显示
 * - 验证和处理订阅组自定义 ID
 * - 生成并复制订阅组分享链接
 * - 处理订阅组与订阅/节点的关联关系
 * 
 * =============================================================
 */

import { ref, computed, type Ref } from 'vue';
import type { Profile, AppConfig } from '../../types/index';
import { useToastStore } from '../../stores/toast';

/**
 * 订阅组管理组合式函数
 * 
 * @param {Ref<AppConfig>} config - 应用配置的响应式引用
 * @returns 订阅组管理相关的状态和方法
 */
export function useProfiles(config: Ref<AppConfig>) {
    // 获取 Toast 提示功能
    const { showToast } = useToastStore();

    // ==================== 响应式状态 ====================

    /** 订阅组列表 */
    const profiles = ref<Profile[]>([]);

    /** 当前页码（从 1 开始） */
    const profilesCurrentPage = ref(1);

    /** 每页显示的订阅组数量 */
    const profilesPerPage = 6;

    // ==================== 计算属性 ====================

    /**
     * 总页数
     * 根据订阅组总数和每页数量计算
     */
    const profilesTotalPages = computed(() => Math.ceil(profiles.value.length / profilesPerPage));

    /**
     * 当前页显示的订阅组列表
     * 根据当前页码进行分页切片
     */
    const paginatedProfiles = computed(() => {
        const start = (profilesCurrentPage.value - 1) * profilesPerPage;
        const end = start + profilesPerPage;
        return profiles.value.slice(start, end);
    });

    /**
     * 已启用的订阅组数量
     * 统计 enabled 为 true 的订阅组
     */
    const activeProfiles = computed(() => profiles.value.filter(profile => profile.enabled).length);

    // ==================== 分页控制 ====================

    /**
     * 切换页码
     * 
     * @param {number} page - 目标页码
     */
    function changeProfilesPage(page: number) {
        // 验证页码范围
        if (page < 1 || page > profilesTotalPages.value) return;
        profilesCurrentPage.value = page;
    }

    // ==================== 数据初始化 ====================

    /**
     * 初始化订阅组列表
     * 
     * 说明：
     * - 从服务器获取的数据初始化订阅组
     * - 确保每个订阅组都有必需的字段和默认值
     * 
     * @param {Partial<Profile>[]} profilesData - 原始订阅组数据数组
     */
    function initializeProfiles(profilesData: Partial<Profile>[]) {
        profiles.value = (profilesData || []).map(p => ({
            id: p.id || crypto.randomUUID(),
            name: p.name || `订阅组 ${Date.now()}`,
            enabled: p.enabled ?? true,
            subscriptions: p.subscriptions || [],
            manualNodes: p.manualNodes || [],
            customId: p.customId || '',
            type: p.type || 'base64',
            ...p
        } as Profile));
    }

    // ==================== 订阅组操作 ====================

    /**
     * 添加新的订阅组
     * 
     * 说明：
     * - 验证是否已配置 profileToken（必需）
     * - 验证自定义 ID 的合法性和唯一性
     * - 将新订阅组添加到列表开头
     * - 自动跳转到第一页以显示新添加的订阅组
     * 
     * @param {Profile} profile - 要添加的订阅组对象
     * @returns {boolean} 是否添加成功
     */
    function addProfile(profile: Profile) {
        // 检查 profileToken 是否已配置
        const token = config.value?.profileToken;
        if (!token || !token.trim()) {
            showToast('请先在"设置"中配置"订阅组分享Token"，否则无法创建订阅组', 'error');
            return false;
        }

        // 验证自定义 ID
        if (profile.customId) {
            // 自定义 ID 只能包含字母、数字、连字符和下划线
            const CUSTOM_ID_REGEX = /[^a-zA-Z0-9-_]/g;
            profile.customId = profile.customId.replace(CUSTOM_ID_REGEX, '');

            // 检查自定义 ID 是否已被其他订阅组使用
            if (profile.customId && profiles.value.some(p => p.id !== profile.id && p.customId === profile.customId)) {
                showToast(`自定义 ID "${profile.customId}" 已存在`, 'error');
                return false;
            }
        }

        // 添加订阅组到列表开头（unshift 添加到数组开头）
        profiles.value.unshift({ ...profile, id: crypto.randomUUID() });

        // 跳转到第一页以显示新添加的订阅组
        // 因为新订阅组被添加到列表开头，所以需要在第一页才能看到
        profilesCurrentPage.value = 1;

        return true;
    }

    /**
     * 更新现有订阅组
     * 
     * 说明：
     * - 验证自定义 ID 的合法性和唯一性
     * - 查找并更新对应的订阅组
     * 
     * @param {Profile} updatedProfile - 更新后的订阅组对象
     * @returns {boolean} 是否更新成功
     */
    function updateProfile(updatedProfile: Profile) {
        // 验证自定义 ID
        if (updatedProfile.customId) {
            // 清理自定义 ID（移除非法字符）
            const CUSTOM_ID_REGEX = /[^a-zA-Z0-9-_]/g;
            updatedProfile.customId = updatedProfile.customId.replace(CUSTOM_ID_REGEX, '');

            // 检查自定义 ID 是否与其他订阅组冲突
            if (updatedProfile.customId && profiles.value.some(p => p.id !== updatedProfile.id && p.customId === updatedProfile.customId)) {
                showToast(`自定义 ID "${updatedProfile.customId}" 已存在`, 'error');
                return false;
            }
        }

        // 查找并更新订阅组
        const index = profiles.value.findIndex(p => p.id === updatedProfile.id);
        if (index !== -1) {
            // 直接替换整个对象
            profiles.value[index] = updatedProfile;
            return true;
        }

        return false;
    }

    /**
     * 切换订阅组的启用状态
     * 
     * @param {string} profileId - 订阅组 ID
     * @param {boolean} enabled - 新的启用状态
     */
    function toggleProfile(profileId: string, enabled: boolean) {
        const index = profiles.value.findIndex(p => p.id === profileId);
        if (index !== -1) {
            profiles.value[index].enabled = enabled;
        }
    }

    /**
     * 删除订阅组
     * 
     * 说明：
     * - 从列表中移除指定的订阅组
     * - 如果当前页变为空页且不是第一页，自动跳转到上一页
     * 
     * @param {string} profileId - 要删除的订阅组 ID
     */
    function deleteProfile(profileId: string) {
        // 过滤掉要删除的订阅组
        profiles.value = profiles.value.filter(p => p.id !== profileId);

        // 如果删除后当前页为空且不是第一页，跳转到上一页
        if (paginatedProfiles.value.length === 0 && profilesCurrentPage.value > 1) {
            profilesCurrentPage.value--;
        }
    }

    /**
     * 删除所有订阅组
     * 
     * 说明：
     * - 清空订阅组列表
     * - 重置页码为第一页
     */
    function deleteAllProfiles() {
        profiles.value = [];
        profilesCurrentPage.value = 1;
    }

    /**
     * 批量删除订阅组
     * 
     * 说明：
     * - 根据 ID 列表批量删除订阅组
     * - 删除后自动调整页码
     * 
     * @param {string[]} profileIds - 要删除的订阅组 ID 数组
     */
    function batchDeleteProfiles(profileIds: string[]) {
        // 参数验证
        if (!profileIds || profileIds.length === 0) return;

        // 过滤掉要删除的订阅组
        profiles.value = profiles.value.filter(p => !profileIds.includes(p.id));

        // 如果当前页为空且不是第一页，跳转到上一页
        if (paginatedProfiles.value.length === 0 && profilesCurrentPage.value > 1) {
            profilesCurrentPage.value--;
        }
    }

    // ==================== 分享链接 ====================

    /**
     * 复制订阅组分享链接到剪贴板
     * 
     * 说明：
     * - 生成订阅组的分享链接格式：{origin}/{token}/{identifier}
     * - identifier 优先使用自定义 ID，否则使用订阅组 ID
     * - 需要先在设置中配置固定的 profileToken
     * 
     * @param {string} profileId - 订阅组 ID
     */
    function copyProfileLink(profileId: string) {
        // 检查 token 配置
        const token = config.value?.profileToken;
        if (!token || token === 'auto' || !token.trim()) {
            showToast('请在设置中配置一个固定的"订阅组分享Token"', 'error');
            return;
        }

        // 查找订阅组
        const profile = profiles.value.find(p => p.id === profileId);
        if (!profile) return;

        // 确定标识符（优先使用自定义 ID）
        const identifier = profile.customId || profile.id;

        // 生成分享链接
        // 格式：https://yourdomain.com/{token}/{identifier}
        const link = `${window.location.origin}/${token}/${identifier}`;

        // 复制到剪贴板
        navigator.clipboard.writeText(link);
        showToast('订阅组分享链接已复制！', 'success');
    }

    // ==================== 关联管理 ====================

    /**
     * 从所有订阅组中移除指定的 ID
     * 
     * 说明：
     * - 当删除订阅或节点时，需要从所有订阅组中移除其引用
     * - 避免订阅组引用不存在的订阅或节点
     * 
     * @param {string} id - 要移除的订阅或节点 ID
     * @param {'subscriptions' | 'manualNodes'} field - 字段名称
     */
    function removeIdFromProfiles(id: string, field: 'subscriptions' | 'manualNodes') {
        profiles.value.forEach(p => {
            // 确保字段已初始化
            if (!p[field]) {
                p[field] = [];
            }
            const index = p[field].indexOf(id);
            if (index !== -1) {
                // 从数组中移除该 ID
                p[field].splice(index, 1);
            }
        });
    }

    /**
     * 清空所有订阅组的指定字段
     * 
     * 说明：
     * - 批量删除订阅或节点时，清空所有订阅组中的对应引用
     * 
     * @param {'subscriptions' | 'manualNodes'} field - 要清空的字段名称
     */
    function clearProfilesField(field: 'subscriptions' | 'manualNodes') {
        profiles.value.forEach(p => {
            // 确保字段已初始化，然后清空数组（将长度设为 0）
            if (!p[field]) {
                p[field] = [];
            } else {
                p[field].length = 0;
            }
        });
    }

    // ==================== 高级业务操作 ====================

    /**
     * 保存订阅组（新增或更新）
     * 自动处理验证、新增/更新逻辑
     */
    function saveProfile(profile: Profile, isNew: boolean): { success: boolean; message?: string } {
        if (!profile.name) return { success: false, message: '订阅组名称不能为空' };

        const result = isNew ? addProfile(profile) : updateProfile(profile);
        return { success: result };
    }

    // ==================== 导出接口 ====================

    return {
        // 响应式状态
        profiles,
        profilesCurrentPage,
        profilesTotalPages,
        paginatedProfiles,
        activeProfiles,

        // 方法
        changeProfilesPage,
        initializeProfiles,
        addProfile,
        updateProfile,
        deleteProfile,
        toggleProfile,
        deleteAllProfiles,
        batchDeleteProfiles,
        copyProfileLink,
        removeIdFromProfiles,
        clearProfilesField,
        saveProfile // New
    };
}
