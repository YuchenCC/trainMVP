import { describe, expect, it, beforeEach } from 'vitest';
import { Role } from '@release-train/shared';
import { clearAuth, getStoredToken, loadStoredAuth, saveAuth, saveUser } from './authStorage';

const user = {
  id: 'u1',
  username: 'admin',
  displayName: '管理员',
  email: 'admin@example.com',
  role: Role.SUPER_ADMIN,
};

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('保存和读取登录态', () => {
    saveAuth('token-1', user);

    expect(getStoredToken()).toBe('token-1');
    expect(loadStoredAuth()).toEqual({ token: 'token-1', user });
  });

  it('用户缓存损坏时仅清理用户信息', () => {
    localStorage.setItem('token', 'token-1');
    localStorage.setItem('user', '{bad-json');

    expect(loadStoredAuth()).toEqual({ token: 'token-1', user: null });
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('支持单独刷新用户信息并清空登录态', () => {
    saveAuth('token-1', user);
    saveUser({ ...user, displayName: '超级管理员' });

    expect(loadStoredAuth().user?.displayName).toBe('超级管理员');

    clearAuth();
    expect(loadStoredAuth()).toEqual({ token: null, user: null });
  });
});
