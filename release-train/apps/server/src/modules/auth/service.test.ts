import { describe, expect, it } from 'vitest';
import { Role } from '@release-train/shared';
import {
  assertDevSeedEnabled,
  assertStrongPassword,
  buildJwtPayload,
  toSafeUser,
} from './service.js';

const prismaUser = {
  id: 'u1',
  username: 'admin',
  displayName: '管理员',
  email: 'admin@example.com',
  password: 'secret',
  role: Role.SUPER_ADMIN,
  ssoId: 'sso-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('auth service helpers', () => {
  it('toSafeUser 剔除 password 和 ssoId', () => {
    expect(toSafeUser(prismaUser)).toEqual({
      id: 'u1',
      username: 'admin',
      displayName: '管理员',
      email: 'admin@example.com',
      role: Role.SUPER_ADMIN,
    });
  });

  it('buildJwtPayload 仅包含非敏感字段', () => {
    expect(buildJwtPayload(toSafeUser(prismaUser))).toEqual({
      sub: 'u1',
      username: 'admin',
      role: Role.SUPER_ADMIN,
    });
  });

  it('密码必须包含大小写字母和数字', () => {
    expect(() => assertStrongPassword('Password1')).not.toThrow();
    expect(() => assertStrongPassword('password')).toThrow('密码至少8位');
  });

  it('seed 仅允许在非生产且显式启用时使用', () => {
    expect(() =>
      assertDevSeedEnabled({ NODE_ENV: 'development', ENABLE_DEV_SEED: 'true' })
    ).not.toThrow();
    expect(() => assertDevSeedEnabled({ NODE_ENV: 'production', ENABLE_DEV_SEED: 'true' })).toThrow(
      '生产环境禁止使用此接口'
    );
    expect(() =>
      assertDevSeedEnabled({ NODE_ENV: 'development', ENABLE_DEV_SEED: 'false' })
    ).toThrow('初始化管理员接口未启用');
  });
});
