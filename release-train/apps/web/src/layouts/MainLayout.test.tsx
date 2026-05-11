import { describe, expect, it } from 'vitest';
import { Role } from '@release-train/shared';
import { getVisibleMenuItems } from './menu';

const baseUser = {
  id: 'u1',
  username: 'user',
  displayName: '用户',
  email: 'user@example.com',
  role: Role.BA,
};

describe('getVisibleMenuItems', () => {
  it('普通角色看不到系统管理', () => {
    const keys = getVisibleMenuItems(baseUser).map((item) => item.key);

    expect(keys).toEqual(['/requirements', '/trains']);
  });

  it('超级管理员可以看到系统管理', () => {
    const keys = getVisibleMenuItems({ ...baseUser, role: Role.SUPER_ADMIN }).map(
      (item) => item.key
    );

    expect(keys).toContain('/systems');
  });
});
