// ========== 需求审查服务 ==========
// 用于检查需求是否写清楚，包括：
// 1. 用户故事格式检查
// 2. 验收条件完整性检查
// 3. 需求描述质量评估
// 4. 依赖关系检查

import { prisma } from '../../prisma';
import { errors } from '../../common/errors';
import { getCozeClient, CozeWorkflow } from '../../common/coze';
import {
  Requirement,
  ReviewIssue,
  ReviewIssueType,
} from '@release-train/shared';

/**
 * 审查结果数据模型
 */
export interface RequirementReviewResult {
  requirementId: string;
  passed: boolean;
  score: number;
  issues: ReviewIssue[];
  suggestions: string[];
  optimizedTitle?: string;
  optimizedDescription?: string;
  acceptanceCriteria?: string[];
  reviewedAt: Date;
}

/**
 * 审查规则配置
 */
const REVIEW_RULES = {
  // 用户故事格式检查
  userStoryPattern: /作为[\u4e00-\u9fa5a-zA-Z]+，?我(希望|想要|需要)[\u4e00-\u9fa5a-zA-Z0-9，。、]+以便[\u4e00-\u9fa5a-zA-Z0-9，。、]+/,
  
  // 验收条件最少数量
  minAcceptanceCriteria: 3,
  
  // 描述最少字数
  minDescriptionLength: 50,
  
  // 优先级必须设置
  requiredPriority: ['P0', 'P1', 'P2', 'P3'],
  
  // 故事点数范围
  storyPointsRange: { min: 1, max: 100 },
};

/**
 * 需求审查输入数据（部分字段）
 */
interface RequirementReviewInput {
  title?: string | null;
  description?: string | null;
  priority?: string | null;
  storyPoints?: number | null;
  reqType?: string | null;
  sourceChannel?: string | null;
  systemId?: string | null;
  baId?: string | null;
}

/**
 * 执行本地规则审查（不调用 AI）
 */
function runLocalReview(requirement: RequirementReviewInput): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  
  // 1. 检查标题
  if (!requirement.title || requirement.title.length < 5) {
    issues.push({
      type: ReviewIssueType.TITLE_TOO_SHORT,
      message: `标题过短，当前 ${requirement.title?.length || 0} 字符，建议至少 5 字符`,
      suggestion: '请提供更清晰的需求标题',
      severity: 'medium',
    });
  }
  
  // 2. 检查描述长度
  if (!requirement.description || requirement.description.length < REVIEW_RULES.minDescriptionLength) {
    issues.push({
      type: ReviewIssueType.DESCRIPTION_TOO_SHORT,
      message: `描述过短，当前 ${requirement.description?.length || 0} 字符，建议至少 ${REVIEW_RULES.minDescriptionLength} 字符`,
      suggestion: '请详细描述需求背景、目标和业务价值',
      severity: 'high',
    });
  }
  
  // 3. 检查用户故事格式
  if (!REVIEW_RULES.userStoryPattern.test(requirement.description || '')) {
    issues.push({
      type: ReviewIssueType.INVALID_USER_STORY_FORMAT,
      message: '描述不符合用户故事格式',
      suggestion: '建议使用标准格式：作为<角色>，我想要<功能>以便<价值>',
      severity: 'medium',
    });
  }
  
  // 4. 检查优先级
  if (!requirement.priority || !REVIEW_RULES.requiredPriority.includes(requirement.priority)) {
    issues.push({
      type: ReviewIssueType.MISSING_PRIORITY,
      message: '未设置优先级或优先级无效',
      suggestion: '请选择优先级：P0（紧急）、P1（高）、P2（中）、P3（低）',
      severity: 'high',
    });
  }
  
  // 5. 检查故事点数
  if (!requirement.storyPoints || 
      requirement.storyPoints < REVIEW_RULES.storyPointsRange.min || 
      requirement.storyPoints > REVIEW_RULES.storyPointsRange.max) {
    issues.push({
      type: ReviewIssueType.INVALID_STORY_POINTS,
      message: `故事点数无效，当前值：${requirement.storyPoints}`,
      suggestion: `请设置有效范围：${REVIEW_RULES.storyPointsRange.min}-${REVIEW_RULES.storyPointsRange.max}`,
      severity: 'medium',
    });
  }
  
  // 6. 检查系统
  if (!requirement.systemId) {
    issues.push({
      type: ReviewIssueType.MISSING_SYSTEM,
      message: '未关联系统',
      suggestion: '请选择需求所属的业务系统',
      severity: 'high',
    });
  }
  
  // 7. 检查 BA
  if (!requirement.baId) {
    issues.push({
      type: ReviewIssueType.MISSING_BA,
      message: '未分配 BA（需求分析师）',
      suggestion: '请指定需求分析师',
      severity: 'high',
    });
  }
  
  return issues;
}

/**
 * 计算审查分数
 */
function calculateScore(issues: ReviewIssue[]): number {
  if (issues.length === 0) return 100;
  
  let score = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case 'high':
        score -= 20;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
    }
  }
  
  return Math.max(0, score);
}

/**
 * 构建发送给 Coze 的审查提示词
 */
function buildCozePrompt(requirement: RequirementReviewInput): string {
  return `
请对以下需求进行智能审查，检查是否符合用户故事规范，并给出优化后的版本：

需求标题：${requirement.title || '未填写'}
需求描述：${requirement.description || '未填写'}
优先级：${requirement.priority || '未填写'}
故事点数：${requirement.storyPoints || '未填写'}
需求类型：${requirement.reqType || '未填写'}
来源渠道：${requirement.sourceChannel || '未填写'}

请检查以下方面：
1. 用户故事格式是否正确（作为...我想要...以便...）
2. 需求描述是否清晰、完整（建议50字以上）
3. 是否包含明确的验收条件
4. 是否描述了业务价值
5. 是否存在歧义或模糊表述

请返回 JSON 格式的审查结果（用 output 字段包裹）：
{
  "output": {
    "success": true,
    "data": {
      "requirementId": "new",
      "passed": true,
      "score": 0-100,
      "issues": [
        {
          "type": "问题类型",
          "message": "问题描述",
          "suggestion": "改进建议",
          "severity": "high|medium|low"
        }
      ],
      "suggestions": ["建议1", "建议2"],
      "optimizedTitle": "优化后的标题",
      "optimizedDescription": "优化后的完整需求描述（包含用户故事格式、业务背景、验收条件等，建议200字以上）",
      "acceptanceCriteria": ["验收条件1", "验收条件2", "验收条件3"],
      "reviewedAt": "ISO时间格式"
    }
  }
}
`;
}

/**
 * Coze 工作流输入格式
 * 注意：Coze 会将参数包装在 _input 对象中
 */
export interface CozeWorkflowInput {
  _input: {
    title: string;
    description: string;
    priority: string;
    storyPoints: number;
    reqType: string;
    sourceChannel: string;
    systemId?: string;
    baId?: string;
  };
}

/**
 * 将枚举值映射为中文，匹配 Coze 工作流输入格式
 */
function mapPriorityToChinese(priority: string): string {
  const map: Record<string, string> = { P0: '紧急', P1: '高', P2: '中', P3: '低' };
  return map[priority] || '中';
}

function mapReqTypeToChinese(reqType: string): string {
  const map: Record<string, string> = { NEW_FEATURE: '功能需求', OPTIMIZATION: '优化', BUG: '缺陷' };
  return map[reqType] || '功能需求';
}

function mapSourceChannelToChinese(sourceChannel: string): string {
  const map: Record<string, string> = { BUSINESS: '业务需求', USER_FEEDBACK: '用户反馈', DATA_ANALYSIS: '数据分析', COMPETITOR: '竞品分析' };
  return map[sourceChannel] || '用户反馈';
}

/**
 * 执行 AI 智能审查
 */
async function runAiReview(requirement: RequirementReviewInput): Promise<{
  issues: ReviewIssue[];
  suggestions: string[];
  score: number;
  optimizedTitle?: string;
  optimizedDescription?: string;
  acceptanceCriteria?: string[];
}> {
  try {
    const coze = getCozeClient();

    // 调用需求审查专用工作流（不传 prompt，Coze 工作流自带提示词）
    const result = await coze.runWorkflowAndParse<{
      issues: ReviewIssue[];
      suggestions: string[];
      score: number;
      optimizedTitle?: string;
      optimizedDescription?: string;
      acceptanceCriteria?: string[];
    }>(CozeWorkflow.REQUIREMENT_REVIEW, {
      title: requirement.title || '',
      description: requirement.description || '',
      priority: mapPriorityToChinese(requirement.priority || 'P3'),
      storyPoints: requirement.storyPoints || 3,
      reqType: mapReqTypeToChinese(requirement.reqType || 'NEW_FEATURE'),
      sourceChannel: mapSourceChannelToChinese(requirement.sourceChannel || 'USER_FEEDBACK'),
      systemId: requirement.systemId || 'SYS001',
      baId: requirement.baId || 'BA001',
    });

    return {
      issues: result?.issues || [],
      suggestions: result?.suggestions || [],
      score: result?.score || 0,
      optimizedTitle: result?.optimizedTitle,
      optimizedDescription: result?.optimizedDescription,
      acceptanceCriteria: result?.acceptanceCriteria,
    };
  } catch (error) {
    console.warn('⚠️ AI 审查不可用，降级到本地规则审查:', error);
    return { issues: [], suggestions: [], score: 0 };
  }
}

/**
 * 主审查函数
 * @param requirementId - 需求 ID
 * @returns 审查结果
 */
export async function reviewRequirement(requirementId: string): Promise<RequirementReviewResult> {
  // 获取需求详情
  const requirement = await prisma.requirement.findUnique({
    where: { id: requirementId },
  });
  
  if (!requirement) {
    throw errors.notFound('需求');
  }
  
  // 执行本地规则审查
  const localIssues = runLocalReview(requirement);
  
  // 执行 AI 智能审查
  const { issues: aiIssues, suggestions: aiSuggestions, score: aiScore } = await runAiReview(requirement);
  
  // 合并审查结果
  const allIssues = [...localIssues, ...aiIssues];
  const allSuggestions = [...new Set(aiSuggestions)]; // 去重
  
  // 计算最终分数（本地规则权重 20%，AI 权重 80%）
  const localScore = calculateScore(localIssues);
  const finalScore = Math.round(localScore * 0.2 + aiScore * 0.8);
  
  return {
    requirementId: requirement.id,
    passed: finalScore >= 60,
    score: finalScore,
    issues: allIssues,
    suggestions: allSuggestions,
    reviewedAt: new Date(),
  };
}

/**
 * 根据需求数据直接审查（不查询数据库）
 * @param requirement - 需求对象
 * @returns 审查结果
 */
export async function reviewRequirementData(requirement: Partial<Requirement>): Promise<RequirementReviewResult> {
  // 执行本地规则审查
  const localIssues = runLocalReview(requirement as Requirement);

  // 执行 AI 智能审查
  const { issues: aiIssues, suggestions: aiSuggestions, score: aiScore, optimizedTitle, optimizedDescription, acceptanceCriteria } = await runAiReview(requirement as Requirement);

  // 合并审查结果
  const allIssues = [...localIssues, ...aiIssues];
  const allSuggestions = [...new Set(aiSuggestions)]; // 去重

  // 计算最终分数（本地规则权重 20%，AI 权重 80%）
  const localScore = calculateScore(localIssues);
  const finalScore = Math.round(localScore * 0.2 + aiScore * 0.8);
  
  return {
    requirementId: requirement.id || '',
    passed: finalScore >= 60,
    score: finalScore,
    issues: allIssues,
    suggestions: allSuggestions,
    optimizedTitle,
    optimizedDescription,
    acceptanceCriteria,
    reviewedAt: new Date(),
  };
}