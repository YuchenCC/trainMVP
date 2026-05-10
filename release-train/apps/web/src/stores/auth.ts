// ========== 认证状态管理 ==========
// 使用 Zustand 管理用户登录状态、Token 和用户信息
import { create } from 'zustand';
import type { SafeUser } from '@release-train/shared';
import api from '../services/api';

// ========== 用户状态类型 ==========
interface AuthState {
  user: SafeUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

// ========== 从localStorage恢复初始状态 ==========
const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');
let initialUser: SafeUser | null = null;
try {
  initialUser = userStr ? JSON.parse(userStr) : null;
} catch {
  localStorage.removeItem('user');
}

// ========== Auth Store ==========
export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token,
  isAuthenticated: !!token && !!initialUser,
  loading: false,

  // 登录
  login: async (username: string, password: string) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { username, password });
      const { token: newToken, user: newUser } = data.data;

      // 存储到localStorage（生产环境推荐httpOnly Cookie）
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));

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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  },

  // 获取当前用户信息
  fetchUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      const user = data.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch {
      // Token无效，清除登录状态
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ token: null, user: null, isAuthenticated: false });
    }
  },
}));
