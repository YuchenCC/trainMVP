
import {
  SmartOnboardSuggestRequest,
  SmartOnboardSuggestResponse,
  OnboardWarning,
  RequirementForAI,
  DependencyForAI,
  ConfirmOnboardRequest,
} from '@release-train/shared';
import { errors } from '../../common/errors';
import { prisma } from '../../prisma';
import { getCozeClient } from '../../common/coze';

/**
 * 前端预处理：检测循环依赖
 * 在调用 Coze 之前直接用图算法检测，因为 AI 对此不擅长
 */
function detectCycleDependencies(requirements: RequirementForAI[]): OnboardWarning[] {
  const warnings: OnboardWarning[] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const idSet = new Set(requirements.map((r) => r.id));

  function dfs(reqId: string): boolean {
    visited.add(reqId);
    recStack.add(reqId);
    const req = requirements.find((r) => r.id === reqId);
    if (req?.dependencies) {
      for (const dep of req.dependencies) {
        if (!idSet.has(dep.depId)) continue;
        if (!visited.has(dep.depId)) {
          if (dfs(dep.depId)) return true;
        } else if (recStack.has(dep.depId)) {
          warnings.push({
            type: 'cycle_dependency',
            reqCode: req.reqCode,
            message: `需求 ${req.reqCode} 与 ${dep.depReqCode} 存在循环依赖，AI 无法处理，请手动检查`,
          });
          return true;
        }
      }
    }
    recStack.delete(reqId);
    return false;
  }

  for (const req of requirements) {
    if (!visited.has(req.id)) dfs(req.id);
  }

  return warnings;
}

/**
 * 从数据库获取班次容量信息
 */
async function getScheduleCapacity(scheduleId: string) {
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      snapshots: { select: { capacityPoints: true, usedPoints: true } },
    },
  });

  if (!schedule) {
    throw errors.trainNotFound();
  }

  const totalCapacity = schedule.snapshots.reduce(
    (sum, snap) => sum + snap.capacityPoints,
    0,
  );
  const usedCapacity = schedule.snapshots.reduce(
    (sum, snap) => sum + snap.usedPoints,
    0,
  );
  const remainingCapacity = totalCapacity - usedCapacity;

  return {
    name: schedule.name,
    totalCapacity,
    usedCapacity,
    remainingCapacity,
  };
}

/**
 * 从数据库获取需求信息（含依赖关系）
 */
async function getRequirementsForAI(
  requirementIds: string[],
): Promise<RequirementForAI[]> {
  const requirements = await prisma.requirement.findMany({
    where: { id: { in: requirementIds } },
    include: {
      system: { select: { name: true } },
      dependencies: {
        include: {
          dependency: {
            select: {
              id: true,
              reqCode: true,
              title: true,
              priority: true,
              storyPoints: true,
              status: true,
            },
          },
        },
      },
    },
  });

  return requirements.map((req) => {
    const dependencies: DependencyForAI[] = req.dependencies.map((d) => ({
      depId: d.dependency.id,
      depReqCode: d.dependency.reqCode,
      depTitle: d.dependency.title,
      depPriority: d.dependency.priority,
      depStoryPoints: d.dependency.storyPoints,
      depStatus: d.dependency.status,
    }));

    return {
      id: req.id,
      reqCode: req.reqCode,
      title: req.title,
      priority: req.priority,
      storyPoints: req.storyPoints,
      system: req.system.name,
      status: req.status,
      dependencies,
    };
  });
}

/**
 * 构建发送给 Coze 的工作流输入数据
 */
function buildCozeInput(
  scheduleName: string,
  totalCapacity: number,
  usedCapacity: number,
  remainingCapacity: number,
  requirements: RequirementForAI[],
) {
  // Coze 工作流参数名直接是 trainSchedule 和 selectedRequirements
  return {
    trainSchedule: {
      name: scheduleName,
      totalCapacity,
      usedCapacity,
      remainingCapacity,
    },
    selectedRequirements: requirements,
  };
}

/**
 * 调用 Coze 生成智能纳版建议
 */
export async function generateOnboardSuggestions(
  data: SmartOnboardSuggestRequest,
): Promise<SmartOnboardSuggestResponse> {
  const coze = getCozeClient();

  // 获取班次信息
  const schedule = await getScheduleCapacity(data.scheduleId);

  // 获取需求信息
  const requirements = await getRequirementsForAI(data.requirementIds);

  // 前端预处理：循环依赖检测（Coze/LLM 不擅长图算法，后端兜底）
  const backendWarnings: OnboardWarning[] = detectCycleDependencies(requirements);

  // 前端计算：canAccommodate 真实值（不依赖 AI 判断）
  const totalStoryPoints = requirements.reduce((sum, r) => sum + r.storyPoints, 0);
  const realCanAccommodate = totalStoryPoints <= schedule.remainingCapacity;

  // 构建工作流输入数据
  const cozeInput = buildCozeInput(
    schedule.name,
    schedule.totalCapacity,
    schedule.usedCapacity,
    schedule.remainingCapacity,
    requirements,
  );

  // 调用 Coze 工作流
  const result = await coze.runWorkflowAndParse<SmartOnboardSuggestResponse>(cozeInput);

  // 合并 AI 和 后端 的警告
  const mergedWarnings = [
    ...backendWarnings,
    ...(result.warnings || []),
  ];

  // 构建响应：canAccommodate 使用后端精确计算值，不信任 AI 的判断
  return {
    success: result.success,
    analysis: {
      totalSelected: result.analysis?.totalSelected || requirements.length,
      totalStoryPoints: result.analysis?.totalStoryPoints || totalStoryPoints,
      remainingCapacity: schedule.remainingCapacity,
      canAccommodate: realCanAccommodate,
      exceededBy: realCanAccommodate ? 0 : (totalStoryPoints - schedule.remainingCapacity),
    },
    suggestions: result.suggestions || [],
    warnings: mergedWarnings,
    summary: result.summary || '',
  };
}

/**
 * 确认并执行纳版
 */
export async function confirmOnboard(
  data: ConfirmOnboardRequest,
  userId: string,
) {
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: data.scheduleId },
  });

  if (!schedule) {
    throw errors.trainNotFound();
  }

  // 检查班次是否已封板
  const isLockedDown = schedule.status === 'LOCKED_DOWN';

  let onboardedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const reqId of data.requirementIds) {
      const req = await tx.requirement.findUnique({
        where: { id: reqId },
      });

      if (!req) {
        continue;
      }
      if (req.status !== 'READY') {
        continue;
      }

      // 封板后只允许经过紧急变更审批的需求
      if (isLockedDown) {
        const emergencyApproved = await tx.emergencyChange.findFirst({
          where: { requirementId: reqId, status: 'APPROVED' },
        });
        if (!emergencyApproved) {
          continue;
        }
      }

      const snapshot = await tx.trainSystemSnapshot.findUnique({
        where: {
          trainScheduleId_systemId: {
            trainScheduleId: data.scheduleId,
            systemId: req.systemId,
          },
        },
      });

      if (!snapshot) {
        continue;
      }

      // 更新需求状态
      await tx.requirement.update({
        where: { id: reqId },
        data: {
          status: 'ONBOARDED',
          subStatus: 'DEV_IN_PROGRESS',
          scheduleId: data.scheduleId,
        },
      });

      // 更新容量使用
      await tx.trainSystemSnapshot.update({
        where: { id: snapshot.id },
        data: {
          usedPoints: { increment: req.storyPoints },
        },
      });

      // 记录操作日志
      await tx.statusLog.create({
        data: {
          requirementId: reqId,
          operationType: 'ONBOARD',
          fromStatus: req.status,
          toStatus: 'ONBOARDED',
          operatorId: userId,
        },
      });

      onboardedCount++;
    }
  });

  return {
    success: true,
    onboardedCount,
  };
}
