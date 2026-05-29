// ========== 需求审查相关类型定义 ==========

/**
 * 审查问题类型枚举
 */
export enum ReviewIssueType {
  TITLE_TOO_SHORT = 'TITLE_TOO_SHORT',
  DESCRIPTION_TOO_SHORT = 'DESCRIPTION_TOO_SHORT',
  INVALID_USER_STORY_FORMAT = 'INVALID_USER_STORY_FORMAT',
  MISSING_PRIORITY = 'MISSING_PRIORITY',
  INVALID_STORY_POINTS = 'INVALID_STORY_POINTS',
  MISSING_SYSTEM = 'MISSING_SYSTEM',
  MISSING_BA = 'MISSING_BA',
  MISSING_ACCEPTANCE_CRITERIA = 'MISSING_ACCEPTANCE_CRITERIA',
  AMBIGUOUS_DESCRIPTION = 'AMBIGUOUS_DESCRIPTION',
  MISSING_BUSINESS_VALUE = 'MISSING_BUSINESS_VALUE',
}

/**
 * 审查问题项
 */
export interface ReviewIssue {
  type: ReviewIssueType;
  message: string;
  suggestion: string;
  severity: 'high' | 'medium' | 'low';
}

/**
 * 审查结果
 */
export interface ReviewResult {
  id: string;
  requirementId: string;
  passed: boolean;
  score: number;
  issues: ReviewIssue[];
  suggestions: string[];
  createdAt: Date;
}