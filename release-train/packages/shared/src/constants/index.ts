// ========== 优先级枚举 ==========
export enum Priority {
  P0 = 'P0',                          // 最高优先级（线上故障/业务阻断）
  P1 = 'P1',                          // 高优先级（核心功能/重要需求）
  P2 = 'P2',                          // 中优先级（常规需求）
  P3 = 'P3',                          // 低优先级（优化/体验类）
}

// ========== 需求类型枚举 ==========
export enum ReqType {
  NEW_FEATURE = 'NEW_FEATURE',        // 新功能：全新开发的业务功能
  OPTIMIZATION = 'OPTIMIZATION',      // 优化：已有功能的改进提升
  BUG = 'BUG',                        // 缺陷：需要修复的问题
}

// ========== 来源渠道枚举 ==========
export enum SourceChannel {
  BUSINESS = 'BUSINESS',              // 业务提出：业务方直接提出
  USER_FEEDBACK = 'USER_FEEDBACK',    // 用户反馈：终端用户反馈
  DATA_ANALYSIS = 'DATA_ANALYSIS',    // 数据分析：基于数据洞察提出
  COMPETITOR = 'COMPETITOR',          // 竞品分析：参考竞品功能提出
}

// ========== 操作类型枚举 ==========
export enum OperationType {
  CREATE = 'CREATE',                          // 创建需求
  UPDATE = 'UPDATE',                          // 编辑需求（草稿状态）
  SUBMIT_REVIEW = 'SUBMIT_REVIEW',            // 发起评审
  REVIEW_PASS = 'REVIEW_PASS',                // 评审通过
  REVIEW_REJECT = 'REVIEW_REJECT',            // 评审拒绝
  RE_EDIT = 'RE_EDIT',                        // 重新编辑（已拒绝→草稿）
  CANCEL = 'CANCEL',                          // 取消需求
  CHANGE_REQUIREMENT = 'CHANGE_REQUIREMENT',  // 需求变更
  EMERGENCY_CHANGE = 'EMERGENCY_CHANGE',      // 紧急变更
  DEV_COMPLETE = 'DEV_COMPLETE',              // 开发完成
  SIT_PASS = 'SIT_PASS',                      // SIT通过
  UAT_PASS = 'UAT_PASS',                      // UAT通过
  CHANGE_SUB_STATUS = 'CHANGE_SUB_STATUS',    // 子状态变更
  BATCH_SUBMIT_REVIEW = 'BATCH_SUBMIT_REVIEW', // 批量发起评审
  BATCH_CANCEL = 'BATCH_CANCEL',              // 批量取消
  BATCH_CHANGE_PRIORITY = 'BATCH_CHANGE_PRIORITY', // 批量修改优先级
  ONBOARD = 'ONBOARD',                        // 纳版
  REMOVE = 'REMOVE',                          // 从火车移除
  RELEASE = 'RELEASE',                        // 投产
  ROLLBACK = 'ROLLBACK',                      // 回滚
}

// ========== 角色枚举 ==========
export enum Role {
  BA = 'BA',                          // 业务BA
  PM = 'PM',                          // 产品经理
  PROJECT_MGR = 'PROJECT_MGR',        // 项目经理
  TECH_MGR = 'TECH_MGR',              // 技术经理
  TEST_MGR = 'TEST_MGR',              // 测试经理
  TRAIN_ADMIN = 'TRAIN_ADMIN',        // 火车管理员
  SUPER_ADMIN = 'SUPER_ADMIN',        // 超级管理员
}

// ========== 需求状态枚举 ==========
export enum ReqStatus {
  DRAFT = 'DRAFT',                    // 草稿
  PENDING_REVIEW = 'PENDING_REVIEW',  // 待评审
  READY = 'READY',                    // 已就绪
  REJECTED = 'REJECTED',              // 已拒绝
  ONBOARDED = 'ONBOARDED',            // 已纳版
  RELEASED = 'RELEASED',              // 已投产
  CANCELLED = 'CANCELLED',            // 已取消
}

// ========== 需求子状态枚举 ==========
export enum ReqSubStatus {
  DEV_IN_PROGRESS = 'DEV_IN_PROGRESS', // 开发中
  SIT_TESTING = 'SIT_TESTING',         // SIT测试
  UAT_TESTING = 'UAT_TESTING',         // UAT测试
  FROZEN = 'FROZEN',                   // 封板
}

// ========== 班次状态枚举 ==========
export enum TrainScheduleStatus {
  PLANNING = 'PLANNING',              // 规划中
  IN_PROGRESS = 'IN_PROGRESS',        // 进行中
  LOCKED_DOWN = 'LOCKED_DOWN',        // 已封板
  RELEASED = 'RELEASED',              // 已投产
}

// ========== 紧急程度枚举 ==========
export enum UrgencyLevel {
  P0 = 'P0',                          // 最高紧急（线上故障）
  P1 = 'P1',                          // 高紧急（业务阻断）
}

// ========== 审批状态枚举 ==========
export enum ApprovalStatus {
  PENDING = 'PENDING',                // 待审批
  APPROVED = 'APPROVED',              // 已通过
  REJECTED = 'REJECTED',              // 已驳回
}

// ========== 系统成员角色枚举 ==========
export enum SystemRole {
  BA = 'BA',                          // 业务BA
  PM = 'PM',                          // 产品经理
  PROJECT_MGR = 'PROJECT_MGR',        // 项目经理
  TECH_MGR = 'TECH_MGR',              // 技术经理
  TEST_MGR = 'TEST_MGR',              // 测试经理
  DEV = 'DEV',                        // 开发人员
  QA = 'QA',                          // 测试人员
}

// ========== 操作权限枚举 ==========
// 对应 PRD 权限矩阵中的 15 个操作，集中管理所有权限点
export enum Operation {
  CREATE_REQ = 'CREATE_REQ',                    // 创建需求
  EDIT_REQ = 'EDIT_REQ',                        // 编辑需求
  SUBMIT_REVIEW = 'SUBMIT_REVIEW',              // 发起评审
  REVIEW_REQ = 'REVIEW_REQ',                    // 评审通过/拒绝
  CANCEL_REQ = 'CANCEL_REQ',                    // 取消需求
  CHANGE_REQ = 'CHANGE_REQ',                    // 需求变更（已就绪/已纳版非封板）
  EMERGENCY_CHANGE = 'EMERGENCY_CHANGE',        // 紧急变更（封板状态）
  APPROVE_EMERGENCY = 'APPROVE_EMERGENCY',      // 紧急变更审批
  COMPLETE_DEV = 'COMPLETE_DEV',                // 开发完成
  PASS_SIT = 'PASS_SIT',                        // SIT通过
  PASS_UAT = 'PASS_UAT',                        // UAT通过
  CHANGE_SUB_STATUS = 'CHANGE_SUB_STATUS',      // 子状态变更
  CREATE_TRAIN = 'CREATE_TRAIN',                // 创建火车
  MANAGE_TRAIN = 'MANAGE_TRAIN',                // 纳版/移除/投产
  ROLLBACK_TRAIN = 'ROLLBACK_TRAIN',            // 回滚
  COMPLETE_TRAIN = 'COMPLETE_TRAIN',            // 完成版本火车
}

// ========== 操作权限显示名称映射 ==========
export const OPERATION_LABELS: Record<Operation, string> = {
  [Operation.CREATE_REQ]: '创建需求',
  [Operation.EDIT_REQ]: '编辑需求',
  [Operation.SUBMIT_REVIEW]: '发起评审',
  [Operation.REVIEW_REQ]: '评审通过/拒绝',
  [Operation.CANCEL_REQ]: '取消需求',
  [Operation.CHANGE_REQ]: '需求变更',
  [Operation.EMERGENCY_CHANGE]: '紧急变更',
  [Operation.APPROVE_EMERGENCY]: '紧急变更审批',
  [Operation.COMPLETE_DEV]: '开发完成',
  [Operation.PASS_SIT]: 'SIT通过',
  [Operation.PASS_UAT]: 'UAT通过',
  [Operation.CHANGE_SUB_STATUS]: '子状态变更',
  [Operation.CREATE_TRAIN]: '创建火车',
  [Operation.MANAGE_TRAIN]: '纳版/移除/投产',
  [Operation.ROLLBACK_TRAIN]: '回滚',
  [Operation.COMPLETE_TRAIN]: '完成版本火车',
};

// ========== RBAC 权限矩阵 ==========
// 定义每个操作允许的角色列表，与 PRD 权限矩阵一一对应
// 超级管理员在中间件中自动放行，此处无需列出
export const PERMISSION_MATRIX: Record<Operation, Role[]> = {
  [Operation.CREATE_REQ]:       [Role.BA, Role.PM, Role.PROJECT_MGR],
  [Operation.EDIT_REQ]:         [Role.BA, Role.PM, Role.PROJECT_MGR],
  [Operation.SUBMIT_REVIEW]:    [Role.BA, Role.TRAIN_ADMIN],
  [Operation.REVIEW_REQ]:       [Role.PROJECT_MGR],
  [Operation.CANCEL_REQ]:       [Role.BA, Role.TRAIN_ADMIN, Role.SUPER_ADMIN],
  [Operation.CHANGE_REQ]:       [Role.BA, Role.TRAIN_ADMIN, Role.SUPER_ADMIN],
  [Operation.EMERGENCY_CHANGE]: [Role.BA, Role.TRAIN_ADMIN],
  [Operation.APPROVE_EMERGENCY]:[Role.TEST_MGR, Role.PROJECT_MGR, Role.TRAIN_ADMIN],
  [Operation.COMPLETE_DEV]:     [Role.TECH_MGR],
  [Operation.PASS_SIT]:         [Role.TEST_MGR],
  [Operation.PASS_UAT]:         [Role.BA],
  [Operation.CHANGE_SUB_STATUS]: [Role.PROJECT_MGR, Role.TECH_MGR, Role.TEST_MGR],
  [Operation.CREATE_TRAIN]:     [Role.TRAIN_ADMIN],
  [Operation.MANAGE_TRAIN]:     [Role.TRAIN_ADMIN],
  [Operation.ROLLBACK_TRAIN]:   [Role.TRAIN_ADMIN],
  [Operation.COMPLETE_TRAIN]:   [Role.TRAIN_ADMIN],
};

// ========== 权限校验工具函数 ==========
// 判断指定角色是否拥有某操作权限，供前后端统一调用
export function hasPermission(role: Role, operation: Operation): boolean {
  if (role === Role.SUPER_ADMIN) return true;
  return PERMISSION_MATRIX[operation]?.includes(role) ?? false;
}

// ========== 操作类型显示名称映射 ==========
export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  [OperationType.CREATE]: '创建需求',
  [OperationType.UPDATE]: '编辑需求',
  [OperationType.SUBMIT_REVIEW]: '发起评审',
  [OperationType.REVIEW_PASS]: '评审通过',
  [OperationType.REVIEW_REJECT]: '评审拒绝',
  [OperationType.RE_EDIT]: '重新编辑',
  [OperationType.CANCEL]: '取消需求',
  [OperationType.CHANGE_REQUIREMENT]: '需求变更',
  [OperationType.EMERGENCY_CHANGE]: '紧急变更',
  [OperationType.DEV_COMPLETE]: '开发完成',
  [OperationType.SIT_PASS]: 'SIT通过',
  [OperationType.UAT_PASS]: 'UAT通过',
  [OperationType.CHANGE_SUB_STATUS]: '子状态变更',
  [OperationType.BATCH_SUBMIT_REVIEW]: '批量发起评审',
  [OperationType.BATCH_CANCEL]: '批量取消',
  [OperationType.BATCH_CHANGE_PRIORITY]: '批量修改优先级',
  [OperationType.ONBOARD]: '纳版',
  [OperationType.REMOVE]: '从火车移除',
  [OperationType.RELEASE]: '投产',
  [OperationType.ROLLBACK]: '回滚',
};

// ========== 优先级显示名称映射 ==========
export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.P0]: 'P0-最高',
  [Priority.P1]: 'P1-高',
  [Priority.P2]: 'P2-中',
  [Priority.P3]: 'P3-低',
};

// ========== 需求类型显示名称映射 ==========
export const REQ_TYPE_LABELS: Record<ReqType, string> = {
  [ReqType.NEW_FEATURE]: '新功能',
  [ReqType.OPTIMIZATION]: '优化',
  [ReqType.BUG]: '缺陷',
};

// ========== 来源渠道显示名称映射 ==========
export const SOURCE_CHANNEL_LABELS: Record<SourceChannel, string> = {
  [SourceChannel.BUSINESS]: '业务提出',
  [SourceChannel.USER_FEEDBACK]: '用户反馈',
  [SourceChannel.DATA_ANALYSIS]: '数据分析',
  [SourceChannel.COMPETITOR]: '竞品分析',
};

// ========== 角色显示名称映射 ==========
export const ROLE_LABELS: Record<Role, string> = {
  [Role.BA]: '业务BA',
  [Role.PM]: '产品经理',
  [Role.PROJECT_MGR]: '项目经理',
  [Role.TECH_MGR]: '技术经理',
  [Role.TEST_MGR]: '测试经理',
  [Role.TRAIN_ADMIN]: '火车管理员',
  [Role.SUPER_ADMIN]: '超级管理员',
};

// ========== 系统成员角色显示名称映射 ==========
export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  [SystemRole.BA]: '业务BA',
  [SystemRole.PM]: '产品经理',
  [SystemRole.PROJECT_MGR]: '项目经理',
  [SystemRole.TECH_MGR]: '技术经理',
  [SystemRole.TEST_MGR]: '测试经理',
  [SystemRole.DEV]: '开发人员',
  [SystemRole.QA]: '测试人员',
};

// ========== 需求状态显示名称映射 ==========
export const REQ_STATUS_LABELS: Record<ReqStatus, string> = {
  [ReqStatus.DRAFT]: '草稿',
  [ReqStatus.PENDING_REVIEW]: '待评审',
  [ReqStatus.READY]: '已就绪',
  [ReqStatus.REJECTED]: '已拒绝',
  [ReqStatus.ONBOARDED]: '已纳版',
  [ReqStatus.RELEASED]: '已投产',
  [ReqStatus.CANCELLED]: '已取消',
};

// ========== 需求子状态显示名称映射 ==========
export const REQ_SUB_STATUS_LABELS: Record<ReqSubStatus, string> = {
  [ReqSubStatus.DEV_IN_PROGRESS]: '开发中',
  [ReqSubStatus.SIT_TESTING]: 'SIT测试',
  [ReqSubStatus.UAT_TESTING]: 'UAT测试',
  [ReqSubStatus.FROZEN]: '封板',
};

// ========== 需求子状态 Tag 颜色映射 ==========
export const REQ_SUB_STATUS_COLORS: Record<ReqSubStatus, string> = {
  [ReqSubStatus.DEV_IN_PROGRESS]: 'blue',
  [ReqSubStatus.SIT_TESTING]: 'orange',
  [ReqSubStatus.UAT_TESTING]: 'purple',
  [ReqSubStatus.FROZEN]: 'green',
};

// ========== 班次状态显示名称映射 ==========
export const TRAIN_SCHEDULE_STATUS_LABELS: Record<TrainScheduleStatus, string> = {
  [TrainScheduleStatus.PLANNING]: '规划中',
  [TrainScheduleStatus.IN_PROGRESS]: '进行中',
  [TrainScheduleStatus.LOCKED_DOWN]: '已封板',
  [TrainScheduleStatus.RELEASED]: '已投产',
};

// ========== 班次状态选项（用于筛选和选择） ==========
export const TRAIN_SCHEDULE_STATUS_OPTIONS = [
  { value: TrainScheduleStatus.PLANNING, label: '规划中', color: 'blue' },
  { value: TrainScheduleStatus.IN_PROGRESS, label: '进行中', color: 'processing' },
  { value: TrainScheduleStatus.LOCKED_DOWN, label: '已封板', color: 'orange' },
  { value: TrainScheduleStatus.RELEASED, label: '已投产', color: 'green' },
];

// ========== 需求状态 Tag 颜色映射 ==========
export const REQ_STATUS_COLORS: Record<ReqStatus, string> = {
  [ReqStatus.DRAFT]: 'default',
  [ReqStatus.PENDING_REVIEW]: 'processing',
  [ReqStatus.READY]: 'success',
  [ReqStatus.REJECTED]: 'error',
  [ReqStatus.ONBOARDED]: 'blue',
  [ReqStatus.RELEASED]: 'green',
  [ReqStatus.CANCELLED]: '#999',
};

// ========== 优先级 Tag 颜色映射 ==========
export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.P0]: 'red',
  [Priority.P1]: 'orange',
  [Priority.P2]: 'blue',
  [Priority.P3]: 'default',
};

// ========== 错误码注册表（独立文件管理） ==========
// 所有错误码、类型（技术/业务）、默认提示集中管理
// 详见 error-codes.ts
export {
  ErrorType,
  ERROR_CODE_MAP,
  getErrorCodeEntry,
  getErrorMessage,
  isBusinessError,
  isTechnicalError,
} from './error-codes';
export type { ErrorCodeEntry } from './error-codes';
