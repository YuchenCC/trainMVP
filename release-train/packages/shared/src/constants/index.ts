// ========== 角色枚举 ==========
export enum Role {
  BA = 'BA', // 业务BA
  PM = 'PM', // 产品经理
  PROJECT_MGR = 'PROJECT_MGR', // 项目经理
  TECH_MGR = 'TECH_MGR', // 技术经理
  TEST_MGR = 'TEST_MGR', // 测试经理
  TRAIN_ADMIN = 'TRAIN_ADMIN', // 火车管理员
  SUPER_ADMIN = 'SUPER_ADMIN', // 超级管理员
}

// ========== 需求状态枚举 ==========
export enum ReqStatus {
  DRAFT = 'DRAFT', // 草稿
  PENDING_REVIEW = 'PENDING_REVIEW', // 待评审
  READY = 'READY', // 已就绪
  REJECTED = 'REJECTED', // 已拒绝
  ONBOARDED = 'ONBOARDED', // 已纳版
  RELEASED = 'RELEASED', // 已投产
  CANCELLED = 'CANCELLED', // 已取消
}

// ========== 需求子状态枚举 ==========
export enum ReqSubStatus {
  DEV_IN_PROGRESS = 'DEV_IN_PROGRESS', // 开发中
  SIT_TESTING = 'SIT_TESTING', // SIT测试
  UAT_TESTING = 'UAT_TESTING', // UAT测试
  FROZEN = 'FROZEN', // 封板
}

// ========== 火车状态枚举 ==========
export enum TrainStatus {
  PLANNING = 'PLANNING', // 规划中
  IN_PROGRESS = 'IN_PROGRESS', // 进行中
  COMPLETED = 'COMPLETED', // 已完成
  CANCELLED = 'CANCELLED', // 已取消
}

// ========== 紧急程度枚举 ==========
export enum UrgencyLevel {
  P0 = 'P0', // 最高紧急（线上故障）
  P1 = 'P1', // 高紧急（业务阻断）
}

// ========== 审批状态枚举 ==========
export enum ApprovalStatus {
  PENDING = 'PENDING', // 待审批
  APPROVED = 'APPROVED', // 已通过
  REJECTED = 'REJECTED', // 已驳回
}

// ========== 系统成员角色枚举 ==========
export enum SystemRole {
  BA = 'BA', // 业务BA
  PM = 'PM', // 产品经理
  PROJECT_MGR = 'PROJECT_MGR', // 项目经理
  TECH_MGR = 'TECH_MGR', // 技术经理
  TEST_MGR = 'TEST_MGR', // 测试经理
  DEV = 'DEV', // 开发人员
  QA = 'QA', // 测试人员
}

// ========== 操作权限枚举 ==========
// 对应 PRD 权限矩阵中的 15 个操作，集中管理所有权限点
export enum Operation {
  CREATE_REQ = 'CREATE_REQ', // 创建需求
  EDIT_REQ = 'EDIT_REQ', // 编辑需求
  SUBMIT_REVIEW = 'SUBMIT_REVIEW', // 发起评审
  REVIEW_REQ = 'REVIEW_REQ', // 评审通过/拒绝
  CANCEL_REQ = 'CANCEL_REQ', // 取消需求
  CHANGE_REQ = 'CHANGE_REQ', // 需求变更（已就绪/已纳版非封板）
  EMERGENCY_CHANGE = 'EMERGENCY_CHANGE', // 紧急变更（封板状态）
  APPROVE_EMERGENCY = 'APPROVE_EMERGENCY', // 紧急变更审批
  COMPLETE_DEV = 'COMPLETE_DEV', // 开发完成
  PASS_SIT = 'PASS_SIT', // SIT通过
  PASS_UAT = 'PASS_UAT', // UAT通过
  CREATE_TRAIN = 'CREATE_TRAIN', // 创建火车
  MANAGE_TRAIN = 'MANAGE_TRAIN', // 纳版/移除/投产
  ROLLBACK_TRAIN = 'ROLLBACK_TRAIN', // 回滚
  COMPLETE_TRAIN = 'COMPLETE_TRAIN', // 完成版本火车
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
  [Operation.CREATE_TRAIN]: '创建火车',
  [Operation.MANAGE_TRAIN]: '纳版/移除/投产',
  [Operation.ROLLBACK_TRAIN]: '回滚',
  [Operation.COMPLETE_TRAIN]: '完成版本火车',
};

// ========== RBAC 权限矩阵 ==========
// 定义每个操作允许的角色列表，与 PRD 权限矩阵一一对应
// 超级管理员在中间件中自动放行，此处无需列出
export const PERMISSION_MATRIX: Record<Operation, Role[]> = {
  [Operation.CREATE_REQ]: [Role.BA, Role.PM],
  [Operation.EDIT_REQ]: [Role.BA, Role.PM],
  [Operation.SUBMIT_REVIEW]: [Role.BA],
  [Operation.REVIEW_REQ]: [Role.PM, Role.PROJECT_MGR, Role.TECH_MGR],
  [Operation.CANCEL_REQ]: [Role.BA, Role.TRAIN_ADMIN],
  [Operation.CHANGE_REQ]: [Role.BA, Role.TRAIN_ADMIN],
  [Operation.EMERGENCY_CHANGE]: [Role.BA, Role.TRAIN_ADMIN],
  [Operation.APPROVE_EMERGENCY]: [Role.PROJECT_MGR, Role.TRAIN_ADMIN],
  [Operation.COMPLETE_DEV]: [Role.TECH_MGR],
  [Operation.PASS_SIT]: [Role.TEST_MGR],
  [Operation.PASS_UAT]: [Role.BA],
  [Operation.CREATE_TRAIN]: [Role.TRAIN_ADMIN],
  [Operation.MANAGE_TRAIN]: [Role.TRAIN_ADMIN],
  [Operation.ROLLBACK_TRAIN]: [Role.TRAIN_ADMIN],
  [Operation.COMPLETE_TRAIN]: [Role.TRAIN_ADMIN],
};

// ========== 权限校验工具函数 ==========
// 判断指定角色是否拥有某操作权限，供前后端统一调用
export function hasPermission(role: Role, operation: Operation): boolean {
  if (role === Role.SUPER_ADMIN) return true;
  return PERMISSION_MATRIX[operation]?.includes(role) ?? false;
}

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

// ========== 火车状态显示名称映射 ==========
export const TRAIN_STATUS_LABELS: Record<TrainStatus, string> = {
  [TrainStatus.PLANNING]: '规划中',
  [TrainStatus.IN_PROGRESS]: '进行中',
  [TrainStatus.COMPLETED]: '已完成',
  [TrainStatus.CANCELLED]: '已取消',
};
