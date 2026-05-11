import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@release-train/shared';
import { loginApi, getCurrentUserApi } from '../services/auth';

vi.mock('../services/auth', () => ({
  loginApi: vi.fn(),
  getCurrentUserApi: vi.fn(),
}));

const user = {
  id: 'u1',
  username: 'admin',
  displayName: '管理员',
  email: 'admin@example.com',
  role: Role.SUPER_ADMIN,
};

async function loadStore() {
  vi.resetModules();
  return import('./auth');
}

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(loginApi).mockReset();
    vi.mocked(getCurrentUserApi).mockReset();
  });

  it('登录成功后保存 token 和用户信息', async () => {
    vi.mocked(loginApi).mockResolvedValue({ token: 'token-1', user });
    const { useAuthStore } = await loadStore();

    await useAuthStore.getState().login('admin', 'Password1');

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe('token-1');
  });

  it('登出时清空认证状态', async () => {
    vi.mocked(loginApi).mockResolvedValue({ token: 'token-1', user });
    const { useAuthStore } = await loadStore();

    await useAuthStore.getState().login('admin', 'Password1');
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('收到 401 事件时清空认证状态', async () => {
    vi.mocked(loginApi).mockResolvedValue({ token: 'token-1', user });
    const { useAuthStore } = await loadStore();

    await useAuthStore.getState().login('admin', 'Password1');
    window.dispatchEvent(new Event('auth:unauthorized'));

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
