
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchInitialData, login as apiLogin } from '../lib/api';

import type { InitialData } from '../types';

export const useSessionStore = defineStore('session', () => {
  const sessionState = ref<'loading' | 'loggedIn' | 'loggedOut'>('loading'); // loading, loggedIn, loggedOut
  const initialData = ref<InitialData | null>(null);

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

  async function login(password: string) {
    try {
      const response = await apiLogin(password);
      if (response.ok) {
        handleLoginSuccess();
      } else {
        let errorMessage = '登录失败';
        if (response instanceof Response) {
          const errorData = await response.json().catch(() => ({}));
          errorMessage = errorData.message || errorData.error || errorMessage;
        } else {
          errorMessage = (response as any).error || errorMessage;
        }
        throw new Error(errorMessage);
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
