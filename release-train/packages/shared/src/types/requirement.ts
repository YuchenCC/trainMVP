// ========== 需求相关类型定义 ==========
import { ReqStatus, ReqSubStatus } from '../constants';

// 需求实体类型（对应 Prisma Requirement 模型）
export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: ReqStatus;
  subStatus?: ReqSubStatus;
  priority: number;
  storyPoints: number;
  dependencies?: string[];
  systemId: string;
  baOwnerId: string;
  pmId?: string;
  creatorId: string;
  trainId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 创建需求请求参数
export interface CreateRequirementRequest {
  title: string;
  description: string;
  priority: number;
  storyPoints: number;
  systemId: string;
  baOwnerId: string;
  pmId?: string;
  dependencies?: string[];
}

// 更新需求请求参数（所有字段可选）
export interface UpdateRequirementRequest {
  title?: string;
  description?: string;
  priority?: number;
  storyPoints?: number;
  pmId?: string;
  dependencies?: string[];
}

// 需求状态变更请求参数
export interface StatusChangeRequest {
  reason?: string;
}

// 紧急变更请求参数（P0/P1 需要审批）
export interface EmergencyChangeRequest {
  urgency: string;
  reason: string;
}
