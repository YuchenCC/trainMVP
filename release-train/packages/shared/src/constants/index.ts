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

// ========== 火车状态枚举 ==========
export enum TrainStatus {
  PLANNING = 'PLANNING',              // 规划中
  IN_PROGRESS = 'IN_PROGRESS',        // 进行中
  COMPLETED = 'COMPLETED',            // 已完成
  CANCELLED = 'CANCELLED',            // 已取消
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
