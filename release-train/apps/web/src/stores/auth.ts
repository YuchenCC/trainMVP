// ========== 认证状态管理 ==========
// 使用 Zustand 管理用户登录状态、Token 和用户信息
import { create } from 'zustand';
import type { SafeUser } from '@release-train/shared';
import { hasPermission, type Operation } from '@release-train/shared';
import { getCurrentUserApi, loginApi } from '../services/auth';
import { clearAuth, loadStoredAuth, saveAuth, saveUser } from '../utils/authStorage';

// ========== 用户状态类型 ==========
interface AuthState {
  user: SafeUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  checkPermission: (operation: Operation) => boolean;
}

// ========== 从统一存储工具恢复初始状态 ==========
const initialAuth = loadStoredAuth();

function toLoggedOutState() {
  return {
    token: null,
    user: null,
    isAuthenticated: false,
    loading: false,
  };
}

// ========== Auth Store ==========
export const useAuthStore = create<AuthState>((set) => ({
  user: initialAuth.user,
  token: initialAuth.token,
  isAuthenticated: !!initialAuth.token && !!initialAuth.user,
  loading: false,

  // 登录
  login: async (username: string, password: string) => {
    set({ loading: true });
    try {
      const { token: newToken, user: newUser } = await loginApi({ username, password });

      saveAuth(newToken, newUser);

      set({
        token: newToken,
        user: newUser,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  // 登出
  logout: () => {
    clearAuth();
    set(toLoggedOutState());
  },

  // 获取当前用户信息
  fetchUser: async () => {
    try {
      const user = await getCurrentUserApi();
      saveUser(user);
      set({ user, isAuthenticated: true });
    } catch {
      clearAuth();
      set(toLoggedOutState());
    }
  },

  // 基于权限矩阵校验当前用户是否拥有指定操作权限
  // 前端用于控制按钮/菜单的显示隐藏，服务端仍需二次校验
  checkPermission: (operation: Operation): boolean => {
    const state = useAuthStore.getState();
    if (!state.user) return false;
    return hasPermission(state.user.role, operation);
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    clearAuth();
    useAuthStore.setState(toLoggedOutState());
  });
}
