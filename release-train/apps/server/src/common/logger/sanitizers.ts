/**
 * ========== 敏感信息脱敏工具 ==========
 * 提供敏感字段的自动检测和脱敏功能
 * 确保日志中不会泄露用户隐私信息和认证凭据
 */

import { FastifyRequest, FastifyReply } from 'fastify';

// ========== 认证敏感字段（完全替换为 [REDACTED]）==========
const AUTH_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
  '*.password',
  '*.oldPassword',
  '*.newPassword',
  '*.confirmPassword',
  '*.token',
  '*.secret',
  '*.apiKey',
  '*.api_key',
  '*.accessToken',
  '*.refreshToken',
  '*.sessionId',
];

// ========== 个人敏感字段（格式脱敏）==========
const PERSONAL_SENSITIVE_PATHS = [
  '*.email',
  '*.phone',
  '*.mobile',
  '*.tel',
  '*.idCard',
  '*.id_card',
  '*.idNumber',
  '*.bankCard',
  '*.bankAccount',
  '*.address',
  '*.realName',
  '*.birthday',
  '*.socialSecurity',
  '*.ssn',
  '*.passport',
  '*.driverLicense',
];

/**
 * 生成匹配函数，检查路径是否匹配模式
 * @param pattern 模式，支持通配符 *
 */
function pathMatch(pattern: string, path: string): boolean {
  const regex = new RegExp(
    '^' + pattern.replace(/\*/g, '[^.]+').replace(/\./g, '\\.') + '$'
  );
  return regex.test(path);
}

/**
 * 检查字段名是否匹配模式（支持通配符）
 * @param pattern 模式，支持通配符 *
 * @param fieldName 字段名
 */
function fieldMatch(pattern: string, fieldName: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return fieldName.toLowerCase() === suffix.toLowerCase();
  }
  return pathMatch(pattern, fieldName);
}

/**
 * 检查路径是否需要脱敏（完全替换）
 */
function isAuthRedactPath(path: string): boolean {
  return AUTH_REDACT_PATHS.some(pattern => pathMatch(pattern, path));
}

/**
 * 检查字段名是否需要脱敏（完全替换）
 */
function isAuthRedactField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return AUTH_REDACT_PATHS.some(pattern => {
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2).toLowerCase();
      return lowerField === suffix;
    }
    return pathMatch(pattern, fieldName);
  });
}

/**
 * 检查路径是否需要格式脱敏
 */
function isPersonalSensitivePath(path: string): boolean {
  return PERSONAL_SENSITIVE_PATHS.some(pattern => pathMatch(pattern, path));
}

/**
 * 检查字段名是否需要格式脱敏
 */
function isPersonalSensitiveField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return PERSONAL_SENSITIVE_PATHS.some(pattern => {
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2).toLowerCase();
      return lowerField === suffix;
    }
    return pathMatch(pattern, fieldName);
  });
}

/**
 * 邮箱脱敏: user@example.com -> u***@example.com
 */
function sanitizeEmail(value: string): string {
  if (!value.includes('@')) return '[REDACTED]';
  const [local, domain] = value.split('@');
  return `${local[0]}***@${domain}`;
}

/**
 * 手机号脱敏: 13812345678 -> 138****5678
 */
function sanitizePhone(value: string): string {
  if (/^\d{11}$/.test(value)) {
    return `${value.slice(0, 3)}****${value.slice(-4)}`;
  }
  return '[REDACTED]';
}

/**
 * 身份证号脱敏: 310101199001011234 -> 310***********1234
 */
function sanitizeIdCard(value: string): string {
  if (/^\d{17}[\dXx]$/.test(value)) {
    return `${value.slice(0, 3)}***********${value.slice(-4)}`;
  }
  return '[REDACTED]';
}

/**
 * 银行卡号脱敏: 6222021234567890123 -> **** **** **** 0123
 */
function sanitizeBankCard(value: string): string {
  if (/^\d{16,19}$/.test(value)) {
    return `**** **** **** ${value.slice(-4)}`;
  }
  return '[REDACTED]';
}

/**
 * 电话脱敏: 021-1234-5678 -> ***-****-5678
 */
function sanitizeTel(value: string): string {
  if (/^\d{3,4}-\d{3,4}-\d{4}$/.test(value)) {
    return `***-****-${value.split('-').pop()}`;
  }
  return '[REDACTED]';
}

/**
 * 中文姓名脱敏: 张三 -> 张*，欧阳娜 -> 欧*娜
 */
function sanitizeChineseName(value: string): string {
  if (/^[\u4e00-\u9fa5]{2,4}$/.test(value)) {
    if (value.length === 2) {
      return `${value[0]}*`;
    }
    return `${value[0]}*${value.slice(-1)}`;
  }
  return '[REDACTED]';
}

/**
 * 地址脱敏: 只显示省市
 */
function sanitizeAddress(value: string): string {
  if (!value) return '[REDACTED]';
  const match = value.match(/^([^省市区]+[省市区])/);
  return match ? `${match[1]}***` : '***';
}

/**
 * 生日脱敏: 1990-01-01 -> ****-**-**
 */
function sanitizeBirthday(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '****-**-**';
  }
  return '[REDACTED]';
}

/**
 * 社保号脱敏: 310000199001011234 -> *** *** *** 1234
 */
function sanitizeSocialSecurity(value: string): string {
  if (/^\d{18}$/.test(value)) {
    return `*** *** *** ${value.slice(-4)}`;
  }
  return '[REDACTED]';
}

/**
 * 证件号脱敏（通用）
 */
function sanitizeDocumentNumber(value: string): string {
  if (/^[A-Z0-9]{6,20}$/i.test(value)) {
    return `****${value.slice(-4)}`;
  }
  return '[REDACTED]';
}

/**
 * 根据字段名和值进行格式脱敏
 */
function sanitizeByKey(key: string, value: any): any {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') return value;

  const keyLower = key.toLowerCase();

  // 邮箱
  if (keyLower.includes('email')) {
    return sanitizeEmail(value);
  }

  // 手机号
  if (keyLower.includes('phone') || keyLower.includes('mobile')) {
    return sanitizePhone(value);
  }

  // 身份证号
  if (keyLower.includes('idcard') || keyLower.includes('id_card') || keyLower.includes('idnumber')) {
    return sanitizeIdCard(value);
  }

  // 银行卡号
  if (keyLower.includes('bankcard') || keyLower.includes('bankaccount')) {
    return sanitizeBankCard(value);
  }

  // 电话
  if (keyLower.includes('tel')) {
    return sanitizeTel(value);
  }

  // 姓名
  if (keyLower.includes('realname')) {
    return sanitizeChineseName(value);
  }

  // 地址
  if (keyLower.includes('address')) {
    return sanitizeAddress(value);
  }

  // 生日
  if (keyLower.includes('birthday')) {
    return sanitizeBirthday(value);
  }

  // 社保号
  if (keyLower.includes('socialsecurity') || keyLower.includes('ssn')) {
    return sanitizeSocialSecurity(value);
  }

  // 护照
  if (keyLower.includes('passport')) {
    return sanitizeDocumentNumber(value);
  }

  // 驾照
  if (keyLower.includes('driverlicense') || keyLower.includes('driver_license')) {
    return sanitizeDocumentNumber(value);
  }

  return value;
}

/**
 * 递归遍历对象，对敏感字段进行脱敏
 * @param obj 要处理的对象
 * @param path 当前路径（用于匹配模式）
 */
export function sanitizeObject(obj: any, path: string = ''): any {
  if (obj === undefined || obj === null) return obj;

  // 数组处理
  if (Array.isArray(obj)) {
    return obj.map((item, index) => sanitizeObject(item, `${path}[${index}]`));
  }

  // 非对象处理
  if (typeof obj !== 'object') {
    return obj;
  }

  // 对象处理
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    const lowerKey = key.toLowerCase();

    // 完全脱敏字段（认证敏感）
    if (isAuthRedactPath(currentPath) || isAuthRedactField(lowerKey)) {
      result[key] = '[REDACTED]';
      continue;
    }

    // 格式脱敏字段（个人敏感）
    if (isPersonalSensitivePath(currentPath) || isPersonalSensitiveField(lowerKey)) {
      result[key] = sanitizeByKey(key, value);
      continue;
    }

    // 递归处理嵌套对象
    if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value, currentPath);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Fastify 请求日志脱敏中间件
 * 在记录请求日志前对敏感字段进行脱敏
 */
export function sanitizeRequestLog(request: FastifyRequest, reply: FastifyReply): void {
  // 脱敏请求头
  if (request.headers.authorization) {
    request.headers.authorization = '[REDACTED]';
  }
  if (request.headers.cookie) {
    request.headers.cookie = '[REDACTED]';
  }
}

/**
 * 快速脱敏单个值（根据字段名）
 */
export function sanitizeValue(key: string, value: any): any {
  // 认证敏感字段
  if (isAuthRedactField(key)) {
    return '[REDACTED]';
  }

  // 个人敏感字段
  if (isPersonalSensitiveField(key)) {
    return sanitizeByKey(key, value);
  }

  return value;
}

// 导出配置供外部使用
export const REDACT_CONFIG = {
  AUTH_PATHS: AUTH_REDACT_PATHS,
  PERSONAL_PATHS: PERSONAL_SENSITIVE_PATHS,
};
