/**
 * ========== 日志模块单元测试 ==========
 * 测试敏感信息脱敏、日志记录等功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeObject,
  sanitizeValue,
  REDACT_CONFIG,
} from '../sanitizers.js';

describe('Sanitizers - 敏感信息脱敏', () => {
  describe('sanitizeObject - 对象脱敏', () => {
    it('应脱敏密码字段', () => {
      const input = { password: 'secret123' };
      const result = sanitizeObject(input);
      expect(result.password).toBe('[REDACTED]');
    });

    it('应脱敏嵌套密码字段', () => {
      const input = { user: { password: 'secret123' } };
      const result = sanitizeObject(input);
      expect(result.user.password).toBe('[REDACTED]');
    });

    it('应脱敏 token 字段', () => {
      const input = { token: 'abc123xyz' };
      const result = sanitizeObject(input);
      expect(result.token).toBe('[REDACTED]');
    });

    it('应脱敏 authorization 请求头', () => {
      const input = { headers: { authorization: 'Bearer xxx' } };
      const result = sanitizeObject(input);
      expect(result.headers.authorization).toBe('[REDACTED]');
    });

    it('应脱敏邮箱', () => {
      const input = { email: 'zhangsan@example.com' };
      const result = sanitizeObject(input);
      expect(result.email).toBe('z***@example.com');
    });

    it('应脱敏手机号', () => {
      const input = { phone: '13812345678' };
      const result = sanitizeObject(input);
      expect(result.phone).toBe('138****5678');
    });

    it('应脱敏手机号 (mobile)', () => {
      const input = { mobile: '13812345678' };
      const result = sanitizeObject(input);
      expect(result.mobile).toBe('138****5678');
    });

    it('应脱敏身份证号', () => {
      const input = { idCard: '310101199001011234' };
      const result = sanitizeObject(input);
      expect(result.idCard).toBe('310***********1234');
    });

    it('应脱敏银行卡号', () => {
      const input = { bankCard: '6222021234567890123' };
      const result = sanitizeObject(input);
      expect(result.bankCard).toBe('**** **** **** 0123');
    });

    it('应脱敏中文姓名 (2字)', () => {
      const input = { realName: '张三' };
      const result = sanitizeObject(input);
      expect(result.realName).toBe('张*');
    });

    it('应脱敏中文姓名 (3字)', () => {
      const input = { realName: '欧阳娜' };
      const result = sanitizeObject(input);
      expect(result.realName).toBe('欧*娜');
    });

    it('应脱敏生日', () => {
      const input = { birthday: '1990-01-01' };
      const result = sanitizeObject(input);
      expect(result.birthday).toBe('****-**-**');
    });

    it('应脱敏地址', () => {
      const input = { address: '上海市浦东新区张江镇某路123号' };
      const result = sanitizeObject(input);
      expect(result.address).toBe('上海市***');
    });

    it('应保留非敏感字段不变', () => {
      const input = { name: 'test', age: 25 };
      const result = sanitizeObject(input);
      expect(result.name).toBe('test');
      expect(result.age).toBe(25);
    });

    it('应处理数组', () => {
      const input = { users: [{ password: 'pass1' }, { password: 'pass2' }] };
      const result = sanitizeObject(input);
      expect(result.users[0].password).toBe('[REDACTED]');
      expect(result.users[1].password).toBe('[REDACTED]');
    });

    it('应处理 null 和 undefined', () => {
      const input = { a: null, b: undefined };
      const result = sanitizeObject(input);
      expect(result.a).toBeNull();
      expect(result.b).toBeUndefined();
    });
  });

  describe('sanitizeValue - 单值脱敏', () => {
    it('应脱敏密码', () => {
      expect(sanitizeValue('password', 'secret')).toBe('[REDACTED]');
    });

    it('应脱敏邮箱', () => {
      expect(sanitizeValue('email', 'user@example.com')).toBe('u***@example.com');
    });

    it('应脱敏手机号', () => {
      expect(sanitizeValue('phone', '13812345678')).toBe('138****5678');
    });

    it('应保留普通文本', () => {
      expect(sanitizeValue('username', 'john')).toBe('john');
    });

    it('应处理大小写不敏感匹配', () => {
      expect(sanitizeValue('PASSWORD', 'secret')).toBe('[REDACTED]');
      expect(sanitizeValue('EMAIL', 'test@test.com')).toBe('t***@test.com');
    });
  });

  describe('REDACT_CONFIG - 脱敏配置', () => {
    it('应包含认证敏感路径', () => {
      expect(REDACT_CONFIG.AUTH_PATHS).toContain('*.password');
      expect(REDACT_CONFIG.AUTH_PATHS).toContain('*.token');
      expect(REDACT_CONFIG.AUTH_PATHS).toContain('req.headers.authorization');
    });

    it('应包含个人敏感路径', () => {
      expect(REDACT_CONFIG.PERSONAL_PATHS).toContain('*.email');
      expect(REDACT_CONFIG.PERSONAL_PATHS).toContain('*.phone');
      expect(REDACT_CONFIG.PERSONAL_PATHS).toContain('*.idCard');
    });
  });
});
