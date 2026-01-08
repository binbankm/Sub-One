/**
 * ==================== 会话管理 Store ====================
 * 
 * 功能说明：
 * - 管理用户登录状态
 * - 检查会话有效性
 * - 处理登录和登出操作
 * - 存储初始数据（订阅、订阅组、配置）
 * 
 * ========================================================
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchInitialData, login as apiLogin } from '../lib/api';
import type { InitialData } from '../types';

/**
 * 会话状态类型定义
 */
type SessionState = 'loading' | 'loggedIn' | 'loggedOut';

/**
 * 会话 Store
 * 使用 Setup 语法定义 Pinia Store
 */
export const useSessionStore = defineStore('session', () => {
  // ==================== 响应式状态 ====================

  /**
   * 会话状态
   * - loading: 正在检查会话
   * - loggedIn: 已登录
   * - loggedOut: 未登录
   */
  const sessionState = ref<SessionState>('loading');

  /**
   * 初始数据
   * 包含用户的订阅、订阅组和配置信息
   */
  const initialData = ref<InitialData | null>(null);

  // ==================== 会话检查 ====================

  /**
   * 检查会话有效性
   * 
   * 说明：
   * - 向服务器请求初始数据
   * - 如果成功获取，表示会话有效，设置为已登录状态
   * - 如果失败，表示会话无效，设置为未登录状态
   * - 应用启动时会自动调用此方法
   */
  async function checkSession() {
    try {
      // 从服务器获取初始数据
      const data = await fetchInitialData();

      if (data) {
        // 获取成功，保存数据并标记为已登录
        initialData.value = data;
        sessionState.value = 'loggedIn';
      } else {
        // 获取失败，标记为未登录
        sessionState.value = 'loggedOut';
      }
    } catch (error) {
      // 发生错误，记录日志并标记为未登录
      console.error("会话检查失败:", error);
      sessionState.value = 'loggedOut';
    }
  }

  // ==================== 登录处理 ====================

  /**
   * 用户登录
   * 
   * 说明：
   * - 向服务器提交用户名和密码进行身份验证
   * - 登录成功后自动检查会话并获取数据
 * - 登录失败时抛出错误
   * 
   * @param {string} username - 用户名
   * @param {string} password - 用户密码
   * @throws {Error} 登录失败时抛出错误
   */
  async function login(username: string, password: string) {
    try {
      // 调用 API 登录
      const response = await apiLogin(username, password);

      if (response.ok) {
        // 登录成功，处理后续流程
        handleLoginSuccess();
      } else {
        // 登录失败，解析错误消息
        let errorMessage = '登录失败';

        if (response instanceof Response) {
          // 从响应中提取错误消息
          const errorData = await response.json().catch(() => ({})) as any;
          errorMessage = errorData.message || errorData.error || errorMessage;
        } else {
          // 从自定义错误对象中提取错误消息
          errorMessage = (response as any).error || errorMessage;
        }

        // 抛出错误
        throw new Error(errorMessage);
      }
    } catch (error) {
      // 记录错误并重新抛出
      console.error('登录失败:', error);
      throw error;
    }
  }

  /**
   * 处理登录成功后的操作
   * 
   * 说明：
   * - 设置状态为加载中
   * - 重新检查会话并获取初始数据
   */
  function handleLoginSuccess() {
    // 先设置为加载状态
    sessionState.value = 'loading';

    // 检查会话并获取数据
    checkSession();
  }

  // ==================== 登出处理 ====================

  /**
   * 用户登出
   * 
   * 说明：
   * - 清除会话状态
   * - 清空初始数据
   * - 注意：这里只是前端状态清理，实际的服务器端登出由后端处理
   */
  async function logout() {
    // 设置为未登录状态
    sessionState.value = 'loggedOut';

    // 清空初始数据
    initialData.value = null;
  }

  // ==================== 导出接口 ====================

  return {
    /** 会话状态 */
    sessionState,
    /** 初始数据 */
    initialData,
    /** 检查会话 */
    checkSession,
    /** 登录 */
    login,
    /** 登出 */
    logout
  };
});
