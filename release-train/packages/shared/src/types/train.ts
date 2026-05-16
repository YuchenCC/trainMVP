// ========== 版本火车相关类型定义 ==========
// 对应 Prisma Train 和 TrainSystem 模型，以及相关 API 请求/响应类型
import { TrainStatus } from '../constants';

// ========== 版本火车实体类型（Prisma 模型） ==========
// 注意：API 响应中使用 string（ISO 格式），此类型保留用于内部逻辑
export interface Train {
  id: string;
  name: string;
  cycleWeeks: number;
  status: TrainStatus;
  description?: string;
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
  status: TrainStatus;             // 火车状态
  description?: string;           // 火车描述
  startDate?: string;              // 开始日期（US2.2 创建班次后填充）
  endDate?: string;               // 结束日期（US2.2 创建班次后填充）
  systemCount: number;             // 搭载系统数量
  totalCapacity: number;           // 总容量点数
  usedCapacity: number;            // 已使用容量点数
  remainingCapacity: number;       // 剩余容量点数
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
  status?: TrainStatus;            // 火车状态筛选（可选）
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
  status: TrainStatus;             // 火车状态
  description?: string;            // 火车描述
  version: number;                 // 乐观锁版本号
  startDate?: string;              // 开始日期
  endDate?: string;               // 结束日期
  boardingDate?: string;           // 纳版截止日期（US2.2 自动计算）
  lockdownDate?: string;          // 封板日期（US2.2 自动计算）
  releaseDate?: string;            // 投产日期（US2.2 自动计算）
  createdBy: { id: string; displayName: string }; // 创建人
  createdAt: string;              // 创建时间（ISO 字符串）
  updatedAt: string;              // 更新时间（ISO 字符串）
  systems: TrainSystemDetail[];    // 搭载系统列表
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
    status: TrainStatus;            // 冲突火车状态
  };
}

// ========== 创建火车班次请求参数 ==========
// 对应 POST /api/trains/:id/schedule 请求体（US2.2）
export interface CreateTrainScheduleRequest {
  startDate: string;              // 必填，开始日期，格式 YYYY-MM-DD
  endDate: string;               // 必填，结束日期，格式 YYYY-MM-DD
  version?: number;               // 可选，乐观锁版本号（创建时不需要，兼容更新逻辑）
}

// ========== 更新火车班次请求参数 ==========
// 对应 PATCH /api/trains/:id/schedule 请求体（US2.2）
export interface UpdateTrainScheduleRequest {
  startDate?: string;              // 可选，开始日期
  endDate?: string;                // 可选，结束日期
  boardingDate?: string;               // 可选，统一纳版日
  lockdownDate?: string;              // 可选，统一封板日
  releaseDate?: string;               // 可选，统一投产日
  version: number;                // 必填，乐观锁版本号
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
  releaseDate: Date;               // 统一投产日
}
