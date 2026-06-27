// ========== 插件 API 服务层（T5） ==========
// 为 Coze 插件提供系统查询、需求详情、变更单创建等业务逻辑
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../prisma/index.js';
import { errors } from '../../common/errors/index.js';

// ========== 系统模糊搜索 ==========
export async function searchSystems(name: string, keyword?: string) {
  // 系统名模糊匹配
  const system = await prisma.system.findFirst({
    where: {
      name: { contains: name, mode: 'insensitive' }, // 不区分大小写模糊匹配
    },
    select: {
      id: true,
      name: true,
      description: true,
    },
  });

  if (!system) {
    return null;
  }

  // 查询该系统下所有需求（排除已取消和已投产），有关键词则进一步筛选
  let requirements: any[] = [];
  const requirementWhere: any = {
    systemId: system.id,
    status: { notIn: ['CANCELLED', 'RELEASED'] },
  };

  if (keyword) {
    requirementWhere.OR = [
      { title: { contains: keyword, mode: 'insensitive' } },
      { reqCode: { contains: keyword, mode: 'insensitive' } },
    ];
  }

  requirements = await prisma.requirement.findMany({
    where: requirementWhere,
    select: {
      id: true,
      reqCode: true,
      title: true,
      status: true,
      subStatus: true,
      priority: true,
      storyPoints: true,
      ba: { select: { displayName: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 10, // 最多返回 10 条
  });

  return {
    system,
    requirements: requirements.map((r) => ({
      id: r.id,
      reqCode: r.reqCode,
      title: r.title,
      status: r.status,
      subStatus: r.subStatus,
      priority: r.priority,
      storyPoints: r.storyPoints,
      baName: r.ba.displayName,
    })),
  };
}

// ========== 需求完整详情 ==========
export async function getRequirementDetailForPlugin(requirementId: string) {
  const req = await prisma.requirement.findUnique({
    where: { id: requirementId },
    include: {
      system: { select: { id: true, name: true } },
      ba: { select: { id: true, displayName: true } },
      pm: { select: { id: true, displayName: true } },
      trainSchedule: {
        select: {
          id: true,
          name: true,
          status: true,
          lockdownDate: true,
          releaseDate: true,
        },
      },
      // 上游依赖（本需求依赖谁）
      dependants: {
        include: {
          dependency: {
            select: {
              id: true,
              reqCode: true,
              title: true,
              status: true,
              subStatus: true,
            },
          },
        },
      },
      // 下游依赖（谁依赖本需求）
      dependencies: {
        include: {
          dependant: {
            select: {
              id: true,
              reqCode: true,
              title: true,
              status: true,
              subStatus: true,
            },
          },
        },
      },
      statusLogs: {
        orderBy: { createdAt: 'asc' },
        select: {
          fromStatus: true,
          toStatus: true,
          createdAt: true,
        },
      },
    },
  });

  if (!req) {
    throw errors.requirementNotFound('需求不存在');
  }

  // 构建依赖列表
  const upstreamDeps = req.dependants.map((d) => ({
    id: d.id,
    reqCode: d.dependency.reqCode,
    title: d.dependency.title,
    status: d.dependency.status,
    subStatus: d.dependency.subStatus,
    relation: 'upstream' as const, // 本需求依赖它 = 上游
  }));

  const downstreamDeps = req.dependencies.map((d) => ({
    id: d.id,
    reqCode: d.dependant.reqCode,
    title: d.dependant.title,
    status: d.dependant.status,
    subStatus: d.dependant.subStatus,
    relation: 'downstream' as const, // 它依赖本需求 = 下游
  }));

  // 构建状态流转历史
  const statusHistory = req.statusLogs.map((log) => ({
    from: log.fromStatus,
    to: log.toStatus,
    time: log.createdAt.toISOString(),
  }));

  return {
    id: req.id,
    reqCode: req.reqCode,
    title: req.title,
    description: req.description,
    status: req.status,
    subStatus: req.subStatus,
    priority: req.priority,
    storyPoints: req.storyPoints,
    reqType: req.reqType,
    systemName: req.system.name,
    baName: req.ba.displayName,
    pmName: req.pm?.displayName || null,
    schedule: req.trainSchedule
      ? {
          id: req.trainSchedule.id,
          name: req.trainSchedule.name,
          status: req.trainSchedule.status,
          lockdownDate: req.trainSchedule.lockdownDate?.toISOString() || null,
          releaseDate: req.trainSchedule.releaseDate?.toISOString() || null,
        }
      : null,
    dependencies: [...upstreamDeps, ...downstreamDeps],
    statusHistory,
    createdAt: req.createdAt.toISOString(),
  };
}

// ========== 生成变更编号 ==========
async function generateChangeCode(tx: Prisma.TransactionClient, maxRetries = 3): Promise<string> {
  const year = new Date().getFullYear();
  const latest = await tx.changeRequest.findFirst({
    where: { changeCode: { startsWith: `CR-${year}-` } },
    orderBy: { changeCode: 'desc' },
  });
  const nextSeq = latest ? parseInt(latest.changeCode.split('-')[2], 10) + 1 : 1;
  const code = `CR-${year}-${String(nextSeq).padStart(4, '0')}`;

  // 并发重试
  for (let i = 0; i < maxRetries; i++) {
    const existing = await tx.changeRequest.findUnique({ where: { changeCode: code } });
    if (!existing) return code;
    // 冲突则自增重试
  }

  throw errors.conflict('变更编号生成冲突，请重试');
}

// ========== 创建变更单 ==========
export async function createChangeRequest(data: {
  requirementId: string;
  conversation?: string;
  changeSummary?: string;
  workloadImpact?: string;
  scheduleImpact?: string;
  riskLevel?: string;
  riskDescription?: string;
  source?: string;
}) {
  // 验证需求存在并获取 systemId
  const requirement = await prisma.requirement.findUnique({
    where: { id: data.requirementId },
    select: { id: true, systemId: true },
  });

  if (!requirement) {
    throw errors.requirementNotFound('需求不存在');
  }

  return prisma.$transaction(async (tx) => {
    const changeCode = await generateChangeCode(tx);
    return tx.changeRequest.create({
      data: {
        changeCode,
        requirementId: data.requirementId,
        systemId: requirement.systemId,
        conversation: data.conversation,
        changeSummary: data.changeSummary,
        workloadImpact: data.workloadImpact,
        scheduleImpact: data.scheduleImpact,
        riskLevel: data.riskLevel,
        riskDescription: data.riskDescription,
        source: data.source || 'coze',
        status: 'PENDING',
      },
    });
  });
}
