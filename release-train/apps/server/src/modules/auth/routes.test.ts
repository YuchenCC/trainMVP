import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';

describe('auth routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret-at-least-32-characters',
      NODE_ENV: 'test',
      ENABLE_DEV_SEED: 'false',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('未登录访问 /auth/me 返回 401', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/api/auth/me' });
    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      code: 'UNAUTHORIZED',
    });
  });

  it('无效 token 访问 /auth/me 返回 401', async () => {
    const app = await createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: 'Bearer bad-token' },
    });
    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      code: 'UNAUTHORIZED',
    });
  });

  it('seed 未显式启用时返回 403', async () => {
    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/seed',
      payload: {
        username: 'admin',
        password: 'Password1',
        displayName: '管理员',
        email: 'admin@example.com',
      },
    });
    await app.close();

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      success: false,
      code: 'FORBIDDEN',
    });
  });

  it('seed body 缺字段时返回 400', async () => {
    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/seed',
      payload: { username: 'admin' },
    });
    await app.close();

    expect(response.statusCode).toBe(400);
  });
});
