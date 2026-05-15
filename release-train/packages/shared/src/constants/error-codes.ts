// ========== 错误码集中注册表 ==========
// 所有错误码、类型、默认提示在此文件统一管理
// 前后端共享，新增错误码只需在此注册 + 后端 errors 工厂新增方法
//
// 重要约定：
// - 技术错误（TECHNICAL）：使用对应的 HTTP 状态码
//   IP访问拒绝、认证失败、限流、服务器/数据库异常、资源不存在
// - 业务错误（BUSINESS）：统一返回 HTTP 200，通过 success:false 区分
//   角色权限、参数校验、唯一/重复、非空、业务规则等

// ========== 错误类型枚举 ==========
export enum ErrorType {
  TECHNICAL = 'TECHNICAL', // 技术错误：IP拒绝、认证、限流、服务器/数据库异常、资源不存在
  BUSINESS = 'BUSINESS',   // 业务错误：角色权限、参数校验、唯一/重复、非空、业务规则（统一 HTTP 200）
}

// ========== 错误码条目接口 ==========
export interface ErrorCodeEntry {
  code: string;        // 错误码（UPPER_SNAKE_CASE，全局唯一）
  type: ErrorType;     // 错误类型：TECHNICAL | BUSINESS
  statusCode: number;  // HTTP 状态码（业务错误统一为 200）
  message: string;     // 默认中文提示（可含占位符如 {resource}）
}

// ========== 错误码注册表 ==========
// 新增错误码时按类型分组添加，保持字母序排列
export const ERROR_CODE_MAP: Record<string, ErrorCodeEntry> = {

  // ==========================================
  // 技术错误（TECHNICAL）— 使用对应 HTTP 状态码
  // IP访问拒绝、认证失败、限流、服务器/数据库异常、资源不存在
  // ==========================================

  FORBIDDEN: {
    code: 'FORBIDDEN',
    type: ErrorType.TECHNICAL,
    statusCode: 403,
    message: '访问被拒绝',
  },

  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    type: ErrorType.TECHNICAL,
    statusCode: 500,
    message: '服务器内部错误',
  },

  NOT_FOUND: {
    code: 'NOT_FOUND',
    type: ErrorType.TECHNICAL,
    statusCode: 404,
    message: '{resource}不存在',
  },

  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    type: ErrorType.TECHNICAL,
    statusCode: 429,
    message: '请求过于频繁，请稍后再试',
  },

  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    type: ErrorType.TECHNICAL,
    statusCode: 401,
    message: '未登录或登录已过期',
  },

  // ==========================================
  // 业务错误（BUSINESS）— 统一 HTTP 200，success: false
  // 角色权限、参数校验、唯一/重复、非空、业务规则
  // ==========================================

  BAD_REQUEST: {
    code: 'BAD_REQUEST',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '请求参数错误',
  },

  CONFLICT: {
    code: 'CONFLICT',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '数据冲突',
  },

  PERMISSION_DENIED: {
    code: 'PERMISSION_DENIED',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '无权限执行此操作',
  },

  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '请求参数验证失败',
  },

  // ==========================================
  // 需求模块业务错误（BUSINESS）— 统一 HTTP 200
  // ==========================================

  REQUIREMENT_NOT_FOUND: {
    code: 'REQUIREMENT_NOT_FOUND',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '需求不存在',
  },

  REQUIREMENT_NOT_DRAFT: {
    code: 'REQUIREMENT_NOT_DRAFT',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '仅草稿状态可操作',
  },

  REQUIREMENT_INVALID_DESCRIPTION: {
    code: 'REQUIREMENT_INVALID_DESCRIPTION',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '需求描述无效',
  },

  REQUIREMENT_SYSTEM_NOT_FOUND: {
    code: 'REQUIREMENT_SYSTEM_NOT_FOUND',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '归属系统不存在',
  },

  REQUIREMENT_BA_NOT_FOUND: {
    code: 'REQUIREMENT_BA_NOT_FOUND',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '业务归属人不存在或角色不符',
  },

  REQUIREMENT_PM_NOT_FOUND: {
    code: 'REQUIREMENT_PM_NOT_FOUND',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '产品经理不存在或角色不符',
  },

  REQUIREMENT_DEPENDENCY_NOT_FOUND: {
    code: 'REQUIREMENT_DEPENDENCY_NOT_FOUND',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '依赖需求不存在',
  },

  REQUIREMENT_CIRCULAR_DEPENDENCY: {
    code: 'REQUIREMENT_CIRCULAR_DEPENDENCY',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '存在循环依赖，无法添加',
  },

  REQUIREMENT_CODE_CONFLICT: {
    code: 'REQUIREMENT_CODE_CONFLICT',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '需求编号生成冲突，请重试',
  },

  REQUIREMENT_VERSION_CONFLICT: {
    code: 'REQUIREMENT_VERSION_CONFLICT',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '需求已被其他人修改，请刷新后重试',
  },

  REQUIREMENT_PERMISSION_DENIED: {
    code: 'REQUIREMENT_PERMISSION_DENIED',
    type: ErrorType.BUSINESS,
    statusCode: 200,
    message: '无权编辑该需求',
  },
};

// ========== 工具函数 ==========

/**
 * 根据错误码获取完整条目
 * @param code 错误码
 * @returns 错误码条目，未注册时返回 undefined
 */
export function getErrorCodeEntry(code: string): ErrorCodeEntry | undefined {
  return ERROR_CODE_MAP[code];
}

/**
 * 根据错误码获取默认中文提示
 * @param code 错误码
 * @param fallback 未注册时的兜底提示
 * @returns 中文错误提示
 */
export function getErrorMessage(code: string, fallback = '操作失败，请稍后重试'): string {
  return ERROR_CODE_MAP[code]?.message ?? fallback;
}

/**
 * 判断是否为业务错误（HTTP 200 + success:false）
 * @param code 错误码
 * @returns true = 业务错误，false = 技术错误或未注册
 */
export function isBusinessError(code: string): boolean {
  return ERROR_CODE_MAP[code]?.type === ErrorType.BUSINESS;
}

/**
 * 判断是否为技术错误（对应 HTTP 状态码）
 * @param code 错误码
 * @returns true = 技术错误，false = 业务错误或未注册
 */
export function isTechnicalError(code: string): boolean {
  return ERROR_CODE_MAP[code]?.type === ErrorType.TECHNICAL;
}