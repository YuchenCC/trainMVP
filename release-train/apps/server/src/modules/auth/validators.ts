// ========== 认证模块请求 Schema ==========
// Fastify 使用 JSON Schema 做运行时输入校验。

export const loginBodySchema = {
  type: 'object',
  required: ['username', 'password'],
  additionalProperties: false,
  properties: {
    username: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 1 },
  },
} as const;

export const seedBodySchema = {
  type: 'object',
  required: ['username', 'password', 'displayName', 'email'],
  additionalProperties: false,
  properties: {
    username: { type: 'string', minLength: 3, maxLength: 64 },
    password: { type: 'string', minLength: 8, maxLength: 128 },
    displayName: { type: 'string', minLength: 1, maxLength: 64 },
    email: { type: 'string', format: 'email', maxLength: 128 },
  },
} as const;
