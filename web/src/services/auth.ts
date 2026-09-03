import http from "@/utils/http";
import { useAuthStore } from "@/stores/auth";

/**
 * 认证服务 - 兼容旧接口，内部委托给 auth store
 * 取代旧的 useAuthKey + useState 实现
 */
export function useAuthService() {
  const authStore = useAuthStore();

  const login = async (key: string): Promise<boolean> => {
    try {
      await http.post("/auth/login", { auth_key: key });
      authStore.setKey(key);
      return true;
    } catch (_error) {
      // 错误已记录
      return false;
    }
  };

  const logout = (): void => {
    authStore.clear();
  };

  const checkLogin = (): boolean => {
    return authStore.checkLogin();
  };

  return {
    login,
    logout,
    checkLogin,
  };
}
