
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchInitialData, login as apiLogin } from '../lib/api.js';

export const useSessionStore = defineStore('session', () => {
  const sessionState = ref('loading'); // loading, loggedIn, loggedOut
  const initialData = ref(null);

  async function checkSession() {
    try {
      // 临时去掉密码验证，直接获取数据
      const data = await fetchInitialData();
      if (data) {
        initialData.value = data;
        sessionState.value = 'loggedIn';
      } else {
        // 如果没有数据，创建一个空的初始数据
        initialData.value = { subs: [], profiles: [], config: { FileName: 'Sub-One', mytoken: 'auto', profileToken: 'profiles' } };
        sessionState.value = 'loggedIn';
      }
    } catch (error) {
      console.error("Session check failed:", error);
      // 即使出错也设置为已登录状态
      initialData.value = { subs: [], profiles: [], config: { FileName: 'Sub-One', mytoken: 'auto', profileToken: 'profiles' } };
      sessionState.value = 'loggedIn';
    }
  }

  async function login(password) {
    // 临时去掉密码验证，直接登录成功
    try {
      handleLoginSuccess();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  function handleLoginSuccess() {
    sessionState.value = 'loading';
    checkSession();
  }

  async function logout() {
    sessionState.value = 'loggedOut';
    initialData.value = null;
  }

  return { sessionState, initialData, checkSession, login, logout };
});
