
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchInitialData } from '../lib/api.js';

export const useSessionStore = defineStore('session', () => {
  const sessionState = ref('loading');
  const initialData = ref(null);

  // 创建默认数据结构
  const createDefaultData = () => ({
    subs: [],
    profiles: [],
    config: {
      FileName: 'SUB_ONE',
      mytoken: 'auto',
      profileToken: 'profiles'
    }
  });

  async function checkSession() {
    try {
      const data = await fetchInitialData();
      initialData.value = data || createDefaultData();
      sessionState.value = 'loggedIn';
    } catch (error) {
      console.error("Session check failed:", error);
      initialData.value = createDefaultData();
      sessionState.value = 'loggedIn';
    }
  }

  async function login(password) {
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
