// ========== 仪表盘相关类型定义 ==========
// 用于角色仪表盘和月历视图的 API 响应类型
import { TrainScheduleStatus, ReqStatus, ReqSubStatus, Priority, ApprovalStatus } from '../constants';
import { RequirementListItem } from './requirement';

// ========== API-01: 需求聚合统计响应 ==========
export interface RequirementStatsResponse {
  byStatus: Record<string, number>;    // { DRAFT: 3, PENDING_REVIEW: 2, ... }
  bySubStatus: Record<string, number>; // { DEV_IN_PROGRESS: 2, SIT_TESTING: 1, ... } 仅已纳版
  byPriority: Record<string, number>;  // { P0: 1, P1: 3, P2: 8, P3: 2 }
  total: number;
  activeCount: number;                 // 排除 CANCELLED + RELEASED
}

// ========== API-02: 紧急变更列表项 ==========
export interface EmergencyChangeItem {
  id: string;
  requirementId: string;
  reqCode: string;
  title: string;
  system: { id: string; name: string };
  urgency: 'P0' | 'P1';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalStep: number;
  approverId: string | null;
  createdAt: string;
}

// ========== API-03: 用户待办聚合响应 ==========
export interface MyTodosResponse {
  pendingReviewRejected?: RequirementListItem[];
  changeApprovedNeedsResubmit?: RequirementListItem[];
  pendingReviewList?: RequirementListItem[];
  emergencyPendingApproval?: EmergencyChangeItem[];
  pendingOnboard?: RequirementListItem[];
  pendingRelease?: RequirementListItem[];
  pendingDev?: RequirementListItem[];
  pendingToSubmitTest?: RequirementListItem[];
  pendingTest?: RequirementListItem[];
}

// ========== API-04: 班次进度项 ==========
export interface ScheduleProgressItem {
  id: string;
  scheduleId: string;
  scheduleName: string;
  trainName: string;
  version: string;
  status: TrainScheduleStatus;
  currentPhase: string;
  totalRequirements: number;
  completedCount: number;
  inProgressCount: number;
  capacityUsed: number;
  capacityTotal: number;
  progress: number;
  progressPercent: number;
  startDate: string;
  endDate: string | null;
  boardingDate: string | null;
  uatEndDate: string | null;
  lockdownDate: string | null;
  releaseDate: string | null;
}