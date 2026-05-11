import { describe, expect, it } from 'vitest';
import type { ApiResponse } from './api';

describe('ApiResponse', () => {
  it('错误码使用字符串枚举值', () => {
    const response: ApiResponse = {
      success: false,
      message: '无权限执行此操作',
      code: 'FORBIDDEN',
    };

    expect(response.code).toBe('FORBIDDEN');
  });
});
