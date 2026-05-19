import { FastifyError, FastifyReply } from 'fastify';
import { getErrorCodeEntry, ErrorType } from '@release-train/shared';
import { getGlobalLogger } from '../logger/index.js';

// ========== 业务错误基类 ==========
// 所有响应统一使用 HTTP 200，通过 success 字段区分成功/失败，code 字段标识具体错误
export class AppError extends Error {
  public code: string;
  public errorType: ErrorType; // TECHNICAL：技术错误 | BUSINESS：业务错误

  constructor(message: string, code: string, errorType: ErrorType) {
    super(message);
    this.code = code;
    this.errorType = errorType;
    this.name = 'AppError';
  }
}

// ========== 内部工具：从注册表创建 AppError 实例 ==========
function makeError(code: string, overrideMessage?: string): AppError {
  const entry = getErrorCodeEntry(code);
  if (!entry) {
    return new AppError(`未知错误码: ${code}`, code, ErrorType.TECHNICAL);
  }
  return new AppError(
    overrideMessage ?? entry.message,
    entry.code,
    entry.type,
  );
}

// ========== 错误工厂方法 ==========
// 每个方法对应 shared/error-codes.ts 中的一条注册记录
// 新增错误码步骤：1) shared/error-codes.ts 注册 → 2) 此处新增工厂方法
export const errors = {
  // ---- 通用错误 ----
  unauthorized: (message?: string) =>
    makeError('UNAUTHORIZED', message),

  forbidden: (message?: string) =>
    makeError('FORBIDDEN', message),

  permissionDenied: (message?: string) =>
    makeError('PERMISSION_DENIED', message),

  notFound: (resource = '资源') =>
    makeError('NOT_FOUND', `${resource}不存在`),

  badRequest: (message?: string) =>
    makeError('BAD_REQUEST', message),

  conflict: (message?: string) =>
    makeError('CONFLICT', message),

  internal: (message?: string) =>
    makeError('INTERNAL_ERROR', message),

  // ---- 需求模块错误 ----
  // 语义化错误码，替代通用 badRequest/notFound/conflict
  // 使用方式：throw errors.requirementNotFound('需求 xxx 不存在')

  requirementNotFound: (message?: string) =>
    makeError('REQUIREMENT_NOT_FOUND', message),

  requirementNotDraft: (message?: string) =>
    makeError('REQUIREMENT_NOT_DRAFT', message),

  requirementNotRejected: (message?: string) =>
    makeError('REQUIREMENT_NOT_REJECTED', message),

  requirementNotPendingReview: (message?: string) =>
    makeError('REQUIREMENT_NOT_PENDING_REVIEW', message),

  requirementAlreadyApproved: (message?: string) =>
    makeError('REQUIREMENT_ALREADY_APPROVED', message),

  requirementAlreadyCancelled: (message?: string) =>
    makeError('REQUIREMENT_ALREADY_CANCELLED', message),

  requirementAlreadyProduced: (message?: string) =>
    makeError('REQUIREMENT_ALREADY_PRODUCED', message),

  requirementInvalidDescription: (message?: string) =>
    makeError('REQUIREMENT_INVALID_DESCRIPTION', message),

  requirementSystemNotFound: (message?: string) =>
    makeError('REQUIREMENT_SYSTEM_NOT_FOUND', message),

  requirementBaNotFound: (message?: string) =>
    makeError('REQUIREMENT_BA_NOT_FOUND', message),

  requirementPmNotFound: (message?: string) =>
    makeError('REQUIREMENT_PM_NOT_FOUND', message),

  requirementDependencyNotFound: (message?: string) =>
    makeError('REQUIREMENT_DEPENDENCY_NOT_FOUND', message),

  requirementCircularDependency: (message?: string) =>
    makeError('REQUIREMENT_CIRCULAR_DEPENDENCY', message),

  requirementCodeConflict: (message?: string) =>
    makeError('REQUIREMENT_CODE_CONFLICT', message),

  requirementVersionConflict: (message?: string) =>
    makeError('REQUIREMENT_VERSION_CONFLICT', message),

  requirementPermissionDenied: (message?: string) =>
    makeError('REQUIREMENT_PERMISSION_DENIED', message),

  requirementNotInTrain: (message?: string) =>
    makeError('REQUIREMENT_NOT_IN_TRAIN', message),

  subStatusCannotChange: (message?: string) =>
    makeError('SUB_STATUS_CANNOT_CHANGE', message),

  subStatusSameAsCurrent: (message?: string) =>
    makeError('SUB_STATUS_SAME_AS_CURRENT', message),

  subStatusInvalid: (message?: string) =>
    makeError('SUB_STATUS_INVALID', message),

  requirementChangeReasonRequired: (message?: string) =>
    makeError('REQUIREMENT_CHANGE_REASON_REQUIRED', message),

  requirementChangeReasonTooLong: (message?: string) =>
    makeError('REQUIREMENT_CHANGE_REASON_TOO_LONG', message),

  requirementSealedCannotChange: (message?: string) =>
    makeError('REQUIREMENT_SEALED_CANNOT_CHANGE', message),

  requirementNotReadyOrInTrain: (message?: string) =>
    makeError('REQUIREMENT_NOT_READY_OR_IN_TRAIN', message),

  // ---- 火车模块错误 ----
  trainNotFound: (message?: string) =>
    makeError('TRAIN_NOT_FOUND', message),

  trainSystemNotFound: (message?: string) =>
    makeError('TRAIN_SYSTEM_NOT_FOUND', message),

  trainSystemConflict: (message?: string) =>
    makeError('TRAIN_SYSTEM_CONFLICT', message),

  trainInvalidStatus: (message?: string) =>
    makeError('TRAIN_INVALID_STATUS', message),

  trainHasOnboardedRequirements: (message?: string) =>
    makeError('TRAIN_HAS_ONBOARDED_REQUIREMENTS', message),

  trainSystemHasOnboardedRequirements: (message?: string) =>
    makeError('TRAIN_SYSTEM_HAS_ONBOARDED_REQUIREMENTS', message),

  trainVersionConflict: (message?: string) =>
    makeError('TRAIN_VERSION_CONFLICT', message),

  trainNameRequired: (message?: string) =>
    makeError('TRAIN_NAME_REQUIRED', message),

  trainNameTooLong: (message?: string) =>
    makeError('TRAIN_NAME_TOO_LONG', message),

  trainNameTooShort: (message?: string) =>
    makeError('TRAIN_NAME_TOO_SHORT', message),

  trainCapacityOutOfRange: (message?: string) =>
    makeError('TRAIN_CAPACITY_OUT_OF_RANGE', message),

  trainSystemRequired: (message?: string) =>
    makeError('TRAIN_SYSTEM_REQUIRED', message),

  trainSystemNotInTrain: (message?: string) =>
    makeError('TRAIN_SYSTEM_NOT_IN_TRAIN', message),

  // ---- US2.2 火车班次相关错误 ----
  trainScheduleStartDateRequired: (message?: string) =>
    makeError('TRAIN_SCHEDULE_START_DATE_REQUIRED', message),

  trainScheduleEndDateRequired: (message?: string) =>
    makeError('TRAIN_SCHEDULE_END_DATE_REQUIRED', message),

  trainScheduleEndDateInvalid: (message?: string) =>
    makeError('TRAIN_SCHEDULE_END_DATE_INVALID', message),

  trainNotPlanning: (message?: string) =>
    makeError('TRAIN_NOT_PLANNING', message),

  trainScheduleDateInvalid: (message?: string) =>
    makeError('TRAIN_SCHEDULE_DATE_INVALID', message),

  trainNoSchedule: (message?: string) =>
    makeError('TRAIN_NO_SCHEDULE', message),

  systemNotFound: (message?: string) =>
    makeError('SYSTEM_NOT_FOUND', message),

  userNotFound: (message?: string) =>
    makeError('USER_NOT_FOUND', message),
};

// ========== 全局错误处理器 ==========
// 所有响应统一 HTTP 200，通过 success 字段区分成功/失败
export function handleError(error: unknown, reply: FastifyReply): void {
  // AppError：业务层主动抛出的错误
  if (error instanceof AppError) {
    reply.status(200).send({
      success: false,
      message: error.message,
      code: error.code,
    });
    return;
  }

  // Fastify 内置错误（schema 校验、rate-limit 等）
  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode) {
    // 速率限制
    if (fastifyError.statusCode === 429) {
      reply.status(200).send({
        success: false,
        message: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    // 请求参数 schema 校验失败
    if (fastifyError.statusCode === 400 && fastifyError.code === 'FST_ERR_VALIDATION') {
      reply.status(200).send({
        success: false,
        message: '请求参数验证失败',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    // 其他 Fastify 框架错误
    reply.status(200).send({
      success: false,
      message: fastifyError.message,
      code: fastifyError.code || 'FASTIFY_ERROR',
    });
    return;
  }

  // rate-limit 通过 errorResponseBuilder 抛出的错误（无 statusCode）
  if ((error as any)?.code === 'RATE_LIMIT_EXCEEDED') {
    reply.status(200).send({
      success: false,
      message: (error as any)?.message || '请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT_EXCEEDED',
    });
    return;
  }

  // 未知错误：开发环境返回详细错误信息，生产环境隐藏堆栈
  const isDev = process.env.NODE_ENV !== 'production';
  try {
    const logger = getGlobalLogger();
    logger.error('[Unhandled Error]', error instanceof Error ? error : undefined);
  } catch {
    console.error('[Unhandled Error]', error);
  }

  reply.status(200).send({
    success: false,
    message: isDev ? (error instanceof Error ? error.message : '服务器内部错误') : '服务器内部错误',
    code: 'INTERNAL_ERROR',
  });
}