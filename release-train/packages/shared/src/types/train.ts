// ========== 版本火车相关类型定义 ==========
// 对应 Prisma Train 和 TrainSystem 模型，以及相关 API 请求/响应类型
import { TrainScheduleStatus } from '../constants';

// ========== 版本火车实体类型（Prisma 模型） ==========
// 注意：API 响应中使用 string（ISO 格式），此类型保留用于内部逻辑
export interface Train {
  id: string;
  name: string;
  description?: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

// ========== 火车班次实体类型（Prisma 模型 v2.0） ==========
export interface TrainSchedule {
  id: string;
  trainId: string;
  name: string;
  status: TrainScheduleStatus;
  startDate?: Date;
  endDate?: Date;
  boardingDate?: Date;
  lockdownDate?: Date;
  releaseDate?: Date;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

// ========== 版本火车列表项 ==========
// 对应 GET /api/trains 返回的单条记录（列表轻量化版本）
export interface TrainItem {
  id: string;                     // 火车 ID
  name: string;                    // 火车名称
  description?: string;           // 火车描述
  systemCount: number;             // 搭载系统数量
  scheduleCount: number;          // 班次数量
  createdAt: string;              // 创建时间（ISO 字符串）
}

// ========== 火车班次列表项 ==========
export interface TrainScheduleItem {
  id: string;                     // 班次 ID
  name: string;                    // 班次名称
  status: TrainScheduleStatus;     // 班次状态
  startDate?: string;              // 开始日期
  endDate?: string;               // 结束日期
  boardingDate?: string;           // 纳版截止日期
  lockdownDate?: string;          // 封板日期
  releaseDate?: string;            // 投产日期
  systemCount: number;             // 搭载系统数量
  totalCapacity: number;           // 总容量点数
  usedCapacity: number;            // 已使用容量点数
  requirementCount: number;        // 已纳版需求数量
  createdAt: string;              // 创建时间（ISO 字符串）
}

// ========== 版本火车列表响应 ==========
// 对应 GET /api/trains 响应体
export interface TrainListResponse {
  list: TrainItem[];              // 火车列表
  pagination: {
    page: number;                  // 当前页码
    pageSize: number;              // 每页条数
    total: number;                 // 总记录数
    totalPages: number;            // 总页数
  };
}

// ========== 版本火车列表查询参数 ==========
// 对应 GET /api/trains 查询参数
export interface TrainListParams {
  page?: number;                   // 页码（默认 1）
  pageSize?: number;               // 每页条数（默认 20）
}

// ========== 搭载系统详情 ==========
// 对应火车详情中搭载系统的完整信息
export interface TrainSystemDetail {
  id: string;                     // 火车-系统关联 ID
  system: { id: string; name: string };  // 系统信息
  capacityPoints: number;          // 本期可用点数
  usedPoints: number;              // 已使用点数
  remainingPoints: number;         // 剩余点数（计算字段）
  usageRate: number;               // 使用率百分比（计算字段）
  baUser?: { id: string; displayName: string };      // 业务 BA
  pmUser?: { id: string; displayName: string };      // 产品经理
  techMgrUser?: { id: string; displayName: string }; // 技术经理
  testMgrUser?: { id: string; displayName: string }; // 测试负责人
  devTeamUsers?: { id: string; displayName: string }[]; // 开发团队成员列表
}

// ========== 版本火车详情 ==========
// 对应 GET /api/trains/:id 响应体（所有时间字段使用 string）
export interface TrainDetail {
  id: string;                     // 火车 ID
  name: string;                    // 火车名称
  description?: string;            // 火车描述
  version: number;                 // 乐观锁版本号
  createdBy: { id: string; displayName: string }; // 创建人
  createdAt: string;              // 创建时间（ISO 字符串）
  updatedAt: string;              // 更新时间（ISO 字符串）
  systems: TrainSystemDetail[];    // 搭载系统列表
}

// ========== 班次详情 ==========
// 对应 GET /api/trains/:trainId/schedules/:scheduleId 响应体
export interface TrainScheduleDetail {
  id: string;                     // 班次 ID
  trainId: string;               // 火车 ID
  name: string;                    // 班次名称
  status: TrainScheduleStatus;     // 班次状态
  startDate?: string;              // 开始日期
  endDate?: string;               // 结束日期
  boardingDate?: string;           // 纳版截止日期
  lockdownDate?: string;          // 封板日期
  releaseDate?: string;            // 投产日期
  version: number;                 // 乐观锁版本号
  createdBy: { id: string; displayName: string }; // 创建人
  createdAt: string;              // 创建时间（ISO 字符串）
  updatedAt: string;              // 更新时间（ISO 字符串）
  train: { id: string; name: string }; // 所属火车信息
  snapshots: TrainSystemSnapshot[]; // 容量快照列表
}

// ========== 创建版本火车请求参数 ==========
// 对应 POST /api/trains 请求体
export interface CreateTrainRequest {
  name: string;                   // 必填，火车名称，2-100字符
  description?: string;           // 可选，火车描述，最多 2000 字符
  systems?: {
    systemId: string;             // 必填，系统 ID
    capacityPoints: number;       // 必填，本期可用点数，1-500
    baUserId?: string;             // 可选，业务 BA 用户 ID
    pmUserId?: string;             // 可选，产品经理用户 ID
    techMgrUserId?: string;        // 可选，技术经理用户 ID
    testMgrUserId?: string;        // 可选，测试负责人用户 ID
    devTeamUserIds?: string[];     // 可选，开发团队用户 ID 列表
  }[];
}

// ========== 更新版本火车请求参数 ==========
// 对应 PATCH /api/trains/:id 请求体
// 备注：可同时更新火车基本信息和搭载系统配置
export interface UpdateTrainRequest {
  version: number;                // 必填，乐观锁版本号
  name?: string;                   // 可选，火车名称，2-100字符
  description?: string;            // 可选，火车描述，最多 2000 字符
  systems?: {                      // 可选，搭载系统配置列表
    systemId: string;              // 必填，系统 ID
    capacityPoints: number;       // 本期可用点数，1-500
    baUserId?: string;            // 可选，业务 BA 用户 ID
    pmUserId?: string;             // 可选，产品经理用户 ID
    techMgrUserId?: string;        // 可选，技术经理用户 ID
    testMgrUserId?: string;        // 可选，测试负责人用户 ID
    devTeamUserIds?: string[];     // 可选，开发团队用户 ID 列表
  }[];
}

// ========== 添加搭载系统请求参数 ==========
// 对应 POST /api/trains/:id/systems 请求体
export interface AddTrainSystemRequest {
  systemId: string;               // 必填，系统 ID
  capacityPoints: number;          // 必填，本期可用点数，1-500
  baUserId?: string;               // 可选，业务 BA 用户 ID
  pmUserId?: string;               // 可选，产品经理用户 ID
  techMgrUserId?: string;          // 可选，技术经理用户 ID
  testMgrUserId?: string;           // 可选，测试负责人用户 ID
  devTeamUserIds?: string[];       // 可选，开发团队用户 ID 列表
}

// ========== 更新搭载系统请求参数 ==========
// 对应 PATCH /api/trains/:id/systems/:systemId 请求体
export interface UpdateTrainSystemRequest {
  capacityPoints?: number;         // 可选，本期可用点数，1-500
  baUserId?: string;               // 可选，业务 BA 用户 ID
  pmUserId?: string;               // 可选，产品经理用户 ID
  techMgrUserId?: string;          // 可选，技术经理用户 ID
  testMgrUserId?: string;           // 可选，测试负责人用户 ID
  devTeamUserIds?: string[];       // 可选，开发团队用户 ID 列表
}

// ========== 可选系统项 ==========
// 对应 GET /api/systems/available 返回的单条记录
export interface AvailableSystem {
  id: string;                     // 系统 ID
  name: string;                    // 系统名称
  conflictTrain?: {                // 冲突信息（如果有）
    id: string;                   // 冲突火车 ID
    name: string;                  // 冲突火车名称
  };
}

// ========== 自定义关键日期类型 ==========
export interface CustomKeyDate {
  id?: string;
  name: string;
  date?: string | null;
}

// ========== 创建火车班次请求参数 ==========
// 对应 POST /api/trains/:id/schedules 请求体（US2.2）
export interface CreateTrainScheduleRequest {
  name?: string;                 // 可选，班次名称，默认自动生成
  startDate: string;              // 必填，开始日期，格式 YYYY-MM-DD
  endDate: string;               // 必填，结束日期，格式 YYYY-MM-DD
  boardingDate?: string;         // 可选，统一纳版日
  lockdownDate?: string;        // 可选，统一封板日
  releaseDate?: string;          // 可选，统一投产日
  customKeyDates?: CustomKeyDate[]; // 可选，自定义关键日期
}

// ========== 更新火车班次请求参数 ==========
// 对应 PATCH /api/trains/:id/schedules/:scheduleId 请求体（US2.2）
export interface UpdateTrainScheduleRequest {
  name?: string;                 // 可选，班次名称
  startDate?: string | null;      // 可选，开始日期
  endDate?: string | null;        // 可选，结束日期
  boardingDate?: string | null;   // 可选，统一纳版日
  lockdownDate?: string | null;  // 可选，统一封板日
  releaseDate?: string | null;    // 可选，统一投产日
  customKeyDates?: CustomKeyDate[]; // 可选，自定义关键日期
  version?: number;               // 可选，乐观锁版本号
}

// ========== 关键日期响应 ==========
// 对应 GET /api/trains/:id/key-dates 响应体（US2.2）
export interface KeyDatesResponse {
  startDate: string;              // 开始日期
  endDate: string;              // 结束日期
  boardingDate: string;           // 统一纳版日
  lockdownDate: string;          // 统一封板日
  releaseDate: string;            // 统一投产日
  daysCount: number;               // 周期天数
}

// ========== 关键日期计算结果（内部类型）
// 用于 calculateKeyDates 函数的返回值
export interface CalculatedKeyDates {
  boardingDate: Date;              // 统一纳版日
  lockdownDate: Date;              // 统一封板日
  releaseDate: Date;              // 统一投产日
}

// ========== 班次容量快照（US2.2 新增）
// 对应 TrainSystemSnapshot 模型
export interface TrainSystemSnapshot {
  id: string;                     // 快照 ID
  trainScheduleId: string;        // 班次 ID
  systemId: string;               // 系统 ID
  system: { id: string; name: string };  // 系统信息
  capacityPoints: number;          // 快照时的容量点
  usedPoints: number;              // 快照时的已用点
  remainingPoints: number;          // 剩余容量点（计算字段）
  usageRate: number;              // 使用率（计算字段）
}

// ========== 班次列表响应（US2.3 新增）
// 对应 GET /api/trains/:id/schedules 响应体
export interface TrainScheduleListResponse {
  list: TrainScheduleItem[];     // 班次列表（按创建时间倒序）
}

// ========== 预览关键日期请求（US2.2 新增）
export interface PreviewKeyDatesRequest {
  startDate: string;
  endDate: string;
}

// ========== 预览关键日期响应（US2.2 新增） ==========
export interface PreviewKeyDatesResponse {
  boardingDate: string;
  lockdownDate: string;
  releaseDate: string;
}

// ========== US2.5 - 纳版搭载相关类型 ==========
export interface PrecheckOnboardRequest {
  requirementIds: string[];
}

export interface DependencyRisk {
  dependencyId: string;
  reqCode: string;
  title: string;
  dependencyStatus: string;
  riskLevel: 'none' | 'warning' | 'high' | 'critical';
  message: string;
}

export interface PrecheckOnboardResultItem {
  requirementId: string;
  reqCode: string;
  title: string;
  system: { id: string; name: string };
  storyPoints: number;
  systemConfigured: boolean;
  dependencyCheck: {
    hasRisk: boolean;
    risks: DependencyRisk[];
  };
  capacityCheck: {
    hasCapacity: boolean;
    systemName: string;
    remainingPoints: number;
    afterOnboard: number;
  };
  blockedByLockdown?: boolean; // 封板后未经过紧急变更审批则阻断（v2.0 新增）
}

export interface PrecheckOnboardResponse {
  valid: boolean;
  results: PrecheckOnboardResultItem[];
  summary: {
    totalCount: number;
    canOnboardCount: number;
    hasDependencyRiskCount: number;
    hasCapacityWarningCount: number;
    lockdownBlockedCount?: number; // 封板阻断数（v2.0 新增）
    isLockedDown?: boolean;        // 班次是否已封板（v2.0 新增）
  };
}

export interface OnboardRequest {
  requirementIds: string[];
  confirmedRisks?: {
    requirementId: string;
    riskLevel: 'warning' | 'high' | 'critical';
    confirmedNote?: string;
  }[];
}

export interface OnboardResponse {
  success: boolean;
  onboardedCount: number;
}

export interface ReadyRequirementItem {
  id: string;
  reqCode: string;
  title: string;
  system: { id: string; name: string };
  priority: string;
  storyPoints: number;
  ba: { id: string; displayName: string };
  createdAt: string;
}

export interface ReadyRequirementsResponse {
  list: ReadyRequirementItem[];
}

// ========== US2.6 - 从火车移除相关类型 ==========
export interface RemoveFromTrainRequest {
  reason: string;
}

export interface BatchRemoveFromTrainRequest {
  requirementIds: string[];
  reason: string;
}

export interface BatchOperationResult {
  success: boolean;
  count: number;
}

// ========== US2.7 - 确认投产相关类型 ==========
export interface BatchReleaseRequest {
  requirementIds: string[];
}

// ========== US2.8 - 回滚相关类型 ==========
export interface RollbackRequest {
  reason: string;
}

// ========== US2.9 - 完成火车相关类型 ==========
export interface CompleteCheckResponse {
  canComplete: boolean;
  releaseDatePassed: boolean;
  currentDate: string;
  releaseDate: string;
  onboardedRequirementsCount: number;
  onboardedRequirements: {
    id: string;
    reqCode: string;
    title: string;
  }[];
}

// ========== US2.10 - BA 默认系统相关类型 ==========
export interface DefaultSystemResponse {
  systemId: string | null;
  systemName: string | null;
  allSystemsAvailable: boolean;
}

export interface BASystemsResponse {
  systems: {
    id: string;
    name: string;
  }[];
  hasSystem: boolean;
}
