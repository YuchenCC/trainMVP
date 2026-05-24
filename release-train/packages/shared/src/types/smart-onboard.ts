
// ========== 智能纳版（AI Agent 排期建议）相关类型定义 ==========

// AI 纳版建议请求参数
export interface SmartOnboardSuggestRequest {
  scheduleId: string;               // 班次 ID
  requirementIds: string[];         // 用户选择的需求 ID 列表
}

// AI 纳版建议响应 - Coze 返回的格式
export interface SmartOnboardSuggestResponse {
  success: boolean;
  analysis: {
    totalSelected: number;
    totalStoryPoints: number;
    remainingCapacity: number;
    canAccommodate: boolean;
    exceededBy?: number;
  };
  suggestions: OnboardSuggestion[];
  warnings: OnboardWarning[];
  summary: string;
}

// 用于 AI 的需求信息
export interface RequirementForAI {
  id: string;
  reqCode: string;
  title: string;
  priority: string;
  storyPoints: number;
  system: string;
  status: string;
  dependencies: DependencyForAI[];
}

// 用于 AI 的依赖项信息
export interface DependencyForAI {
  depId: string;
  depReqCode: string;
  depTitle: string;
  depPriority: string;
  depStoryPoints: number;
  depStatus: string;
}

// 纳版建议项
export interface OnboardSuggestion {
  order: number;                    // 推荐顺序
  id: string;                       // 需求 ID
  reqCode: string;                  // 需求编号
  title: string;                    // 需求标题
  priority: string;                 // 优先级
  storyPoints: number;              // 故事点数
  system: string;                   // 归属系统
  status: string;                   // 需求状态
  suggestion: 'recommended';        // 建议类型
  reason: string;                   // 建议理由
}

// 纳版警告
export interface OnboardWarning {
  type: 'capacity_exceeded' | 'dependency_risk' | 'cycle_dependency';
  reqCode?: string;                 // 相关需求编号
  message: string;                  // 警告信息
}

// 确认纳版请求参数
export interface ConfirmOnboardRequest {
  scheduleId: string;               // 班次 ID
  requirementIds: string[];         // 最终确认的需求 ID 列表（按顺序）
  confirmedRisks?: {                // 确认的风险
    requirementId: string;
    riskLevel: 'warning' | 'high' | 'critical';
    confirmedNote?: string;
  }[];
}

