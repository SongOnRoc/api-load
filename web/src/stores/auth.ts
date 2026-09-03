import { defineStore } from "pinia";
import { ref } from "vue";

const AUTH_KEY = "authKey";
const STORAGE_KEY = AUTH_KEY;

/**
 * 认证 store
 * 取代 services/auth.ts 中的 useAuthKey + utils/state.ts 的 useState
 */
export const useAuthStore = defineStore("auth", () => {
  const authKey = ref<string | null>(localStorage.getItem(STORAGE_KEY));

  function setKey(key: string) {
    authKey.value = key;
    localStorage.setItem(STORAGE_KEY, key);
  }

  function clear() {
    authKey.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  function checkLogin(): boolean {
    if (authKey.value) {
      return true;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      authKey.value = stored;
      return true;
    }
    return false;
  }

  return { authKey, setKey, clear, checkLogin };
});
