
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchInitialData, login as apiLogin } from '../lib/api.js';

export const useSessionStore = defineStore('session', () => {
  const sessionState = ref('loading'); // loading, loggedIn, loggedOut
  const initialData = ref(null);

  async function checkSession() {
    try {
      const data = await fetchInitialData();
      if (data) {
        initialData.value = data;
        sessionState.value = 'loggedIn';
      } else {
        sessionState.value = 'loggedOut';
      }
    } catch (error) {
      console.error("Session check failed:", error);
      sessionState.value = 'loggedOut';
    }
  }

  async function login(password) {
    try {
      const response = await apiLogin(password);
      if (response.ok) {
        handleLoginSuccess();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || '登录失败');
      }
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
