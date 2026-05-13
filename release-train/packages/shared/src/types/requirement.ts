// ========== 需求相关类型定义 ==========
import { ReqStatus, ReqSubStatus, Priority, ReqType, SourceChannel, OperationType } from '../constants';

// 需求实体类型（对应 Prisma Requirement 模型）
export interface Requirement {
  id: string;                          // 需求ID
  reqCode: string;                     // 需求编号，格式REQ-{年份}-{4位序号}
  title: string;                       // 需求标题
  description: string;                 // 需求描述（HTML富文本）
  status: ReqStatus;                   // 主状态
  subStatus?: ReqSubStatus;            // 子状态（仅已纳版有值）
  priority: Priority;                  // 优先级 P0/P1/P2/P3
  storyPoints: number;                 // 工作量点数 1-100
  systemId: string;                    // 归属系统ID
  baId: string;                        // 业务归属人ID
  pmId?: string;                       // 产品经理ID（可选）
  creatorId: string;                   // 创建人ID
  trainId?: string;                    // 所属火车ID（可选）
  version: number;                     // 乐观锁版本号
  reqType?: ReqType;                   // 需求类型（可选）
  sourceChannel?: SourceChannel;       // 来源渠道（可选）
  proposedAt: Date;                    // 提出时间
  createdAt: Date;                     // 创建时间
  updatedAt: Date;                     // 更新时间
}

// 创建需求请求参数
export interface CreateRequirementRequest {
  title: string;                       // 需求标题，1-200字
  description: string;                 // 需求描述，HTML富文本
  priority: Priority;                  // 优先级
  storyPoints: number;                 // 工作量点数 1-100
  systemId: string;                    // 归属系统ID
  baId: string;                        // 业务归属人ID
  pmId?: string;                       // 产品经理ID（可选）
  reqType?: ReqType;                   // 需求类型（可选）
  sourceChannel?: SourceChannel;       // 来源渠道（可选）
  dependencyIds?: string[];            // 前置依赖需求ID列表（可选）
}

// 编辑需求请求参数（仅草稿状态可编辑）
export interface UpdateRequirementRequest {
  version: number;                     // 乐观锁版本号，必填
  title?: string;                      // 需求标题（可选）
  description?: string;                // 需求描述（可选）
  systemId?: string;                   // 归属系统ID（草稿可改）
  priority?: Priority;                 // 优先级（可选）
  storyPoints?: number;                // 工作量点数（可选）
  baId?: string;                       // 业务归属人ID（草稿可改）
  pmId?: string;                       // 产品经理ID（可选）
  reqType?: ReqType;                   // 需求类型（可选）
  sourceChannel?: SourceChannel;       // 来源渠道（可选）
  dependencyIds?: string[];            // 全量替换依赖列表（可选）
}

// 需求详情响应数据（创建/编辑/查询共用）
export interface RequirementDetail {
  id: string;                          // 需求ID
  reqCode: string;                     // 需求编号
  title: string;                       // 需求标题
  description: string;                 // 需求描述（已XSS过滤的HTML）
  system: { id: string; name: string }; // 归属系统摘要
  priority: Priority;                  // 优先级
  storyPoints: number;                 // 工作量点数
  ba: { id: string; displayName: string };  // 业务归属人摘要
  pm?: { id: string; displayName: string }; // 产品经理摘要（可选）
  creator: { id: string; displayName: string }; // 创建人摘要
  status: ReqStatus;                   // 主状态
  subStatus?: ReqSubStatus;            // 子状态（仅已纳版有值）
  train?: { id: string; name: string }; // 所属版本火车摘要（已纳版时有值）
  reqType?: ReqType;                   // 需求类型（可选）
  sourceChannel?: SourceChannel;       // 来源渠道（可选）
  version: number;                     // 乐观锁版本号
  dependencies: DependencyItem[];      // 前置依赖列表
  createdAt: string;                   // 创建时间（ISO 8601）
  updatedAt: string;                   // 更新时间（ISO 8601）
  proposedAt: string;                  // 提出时间（ISO 8601）
}

// 依赖项摘要
export interface DependencyItem {
  id: string;                          // 需求ID
  reqCode: string;                     // 需求编号
  title: string;                       // 需求标题
  status: ReqStatus;                   // 需求状态
  subStatus?: ReqSubStatus;            // 子状态
}

// 需求状态变更请求参数
export interface StatusChangeRequest {
  reason?: string;                     // 变更原因（草稿取消免填）
}

// 紧急变更请求参数（P0/P1 需要审批）
export interface EmergencyChangeRequest {
  urgency: string;                     // 紧急程度 P0/P1
  reason: string;                      // 变更原因
}

// 需求列表项（用于分页列表展示，字段精简）
export interface RequirementListItem {
  id: string;                          // 需求ID
  reqCode: string;                     // 需求编号
  title: string;                       // 需求标题
  status: ReqStatus;                   // 主状态
  priority: Priority;                  // 优先级
  storyPoints: number;                 // 工作量点数
  system: { id: string; name: string }; // 归属系统摘要
  ba: { id: string; displayName: string };  // 业务归属人摘要
  creator: { id: string; displayName: string }; // 创建人摘要
  createdAt: string;                   // 创建时间（ISO 8601）
  updatedAt: string;                   // 更新时间（ISO 8601）
}

// 需求列表查询参数
export interface RequirementListQuery {
  page?: number;                       // 页码，默认 1
  pageSize?: number;                   // 每页条数，默认 20，最大 100
  status?: ReqStatus;                  // 按状态筛选（可选）
  keyword?: string;                    // 按编号/标题模糊搜索（可选）
}
