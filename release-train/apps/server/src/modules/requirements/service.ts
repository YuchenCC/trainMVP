// ========== 需求模块 service 层 ==========
// 实现需求创建、编辑、取消、详情查询、搜索的核心业务逻辑
// 文件名：service.ts — 业务逻辑层，供路由层（index.ts）调用
import { PrismaClient, Prisma } from '@prisma/client'; // Prisma 客户端类型（用于事务和常规查询）
import sanitizeHtml from 'sanitize-html';              // XSS 过滤库：清洗 HTML 富文本
import { prisma } from '../../prisma/index.js';         // Prisma 客户端单例（复用数据库连接）
import { errors } from '../../common/errors/index.js';   // 业务错误工厂（badRequest/notFound/conflict 等）
import {
  CreateRequirementRequest,  // 创建需求请求参数类型（shared 包定义）
  UpdateRequirementRequest,  // 编辑需求请求参数类型
  RequirementDetail,          // 需求详情响应类型
  RequirementListItem,        // 需求列表项类型
  RequirementListQuery,       // 需求列表查询参数类型
  DependencyItem,             // 依赖项摘要类型（用于依赖列表展示）
  StatusLogItem,              // 操作审计日志项类型
  OperationType,              // 操作类型枚举（用于 StatusLog 审计）
  ReqStatus,                  // 需求状态枚举（用于风险分级）
  ReqSubStatus,               // 需求子状态枚举（用于子状态变更）
  Role,                       // 角色枚举（用于发起评审权限校验）
  RequirementStatsResponse,   // 需求统计响应类型（仪表盘）
  EmergencyChangeItem,        // 紧急变更项类型（仪表盘）
  MyTodosResponse,            // 用户待办响应类型（仪表盘）
} from '@release-train/shared';
import { PaginatedResponse, ApprovalStatus } from '@release-train/shared';

// ========== XSS 过滤白名单配置 ==========
// 定义需求描述中允许保留的 HTML 标签、属性和 URL 协议
// 不在白名单内的标签被丢弃但内容保留，不在白名单的属性被移除
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  // allowedTags：允许的 HTML 标签列表，覆盖 TipTap 编辑器输出的常用格式
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',  // 标题元素
    'p', 'br', 'hr',                       // 段落和分隔元素
    'ul', 'ol', 'li',                      // 列表元素（有序/无序）
    'strong', 'em', 's', 'u',              // 文本样式（加粗/斜体/删除线/下划线）
    'blockquote', 'pre', 'code',           // 引用和代码块
    'a', 'img',                            // 链接和图片
    'table', 'thead', 'tbody', 'tr', 'th', 'td',  // 表格元素
  ],
  // allowedAttributes：允许的 HTML 属性（按标签分组），仅开放安全属性
  allowedAttributes: {
    a: ['href', 'target', 'rel'],          // 链接：href跳转 / target打开方式 / rel安全属性
    img: ['src', 'alt', 'width', 'height'], // 图片：src来源 / alt替代文本 / 尺寸
    td: ['colspan', 'rowspan'],            // 表格单元格：允许合并行列
    th: ['colspan', 'rowspan'],            // 表头单元格：允许合并行列
  },
  // allowedSchemes：允许的 URL 协议白名单，禁止 javascript: 等危险协议
  allowedSchemes: ['http', 'https', 'mailto'],
  // disallowedTagsMode：不在白名单的标签处理方式，'discard' 丢弃标签但保留内容
  disallowedTagsMode: 'discard',
};

/**
 * XSS 过滤函数：清洗 HTML 富文本内容（后端存储时调用）
 * 
 * 双重 XSS 防护策略：
 * - 后端存储时：sanitize-html 过滤（本函数）
 * - 前端渲染时：DOMPurify 二次过滤（前端组件中调用）
 * 
 * @param html - 待过滤的 HTML 字符串，来自前端富文本编辑器
 * @returns 清洗后的安全 HTML 字符串（危险标签和属性已被移除）
 */
function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS); // 使用白名单配置清洗
}

/**
 * 生成需求编号
 * 
 * 格式：REQ-{年份}-{4位序号}，如 REQ-2026-0001、REQ-2026-0042
 * 生成时机：需求创建时，在 Prisma 事务内调用
 * 并发安全：利用数据库唯一约束兜底，冲突时自动重试最多3次
 * 
 * @param tx - Prisma 事务客户端，确保编号生成与需求创建在同一事务中
 * @param maxRetries - 最大重试次数，默认 3 次（并发冲突时自增重试）
 * @returns 生成的需求编号字符串，如 "REQ-2026-0001"
 * @throws 重试耗尽后抛出 409 CONFLICT 错误
 */
async function generateReqCode(tx: Prisma.TransactionClient, maxRetries = 3): Promise<string> {
  const year = new Date().getFullYear();  // 获取当前年份，用于编号前缀
  const prefix = `REQ-${year}-`;         // 构造年份前缀，如 "REQ-2026-"

  // 循环重试：最多尝试 maxRetries 次
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // 1. 查询当年已有编号中最大的一个（按 reqCode 降序取第一条）
    const lastReq = await tx.requirement.findFirst({
      where: { reqCode: { startsWith: prefix } }, // 只查当年编号
      orderBy: { reqCode: 'desc' },               // 降序排列，取最大
      select: { reqCode: true },                   // 只查编号字段
    });

    // 2. 计算下一个序号：有记录则 +1，否则从 1 开始
    let nextSeq = 1;
    if (lastReq) {
      const lastSeq = parseInt(lastReq.reqCode.slice(prefix.length), 10); // 从编号中截取序号部分
      nextSeq = lastSeq + 1;  // 递增
    }

    // 3. 格式化为 REQ-{年份}-{4位序号}，不足4位前补零
    const reqCode = `${prefix}${nextSeq.toString().padStart(4, '0')}`;

    // 4. 检查唯一性：如果另一个并发事务已抢到这个编号，则重试
    try {
      const existing = await tx.requirement.findUnique({
        where: { reqCode },     // 按唯一约束查
        select: { id: true },   // 只取 ID，判断存在性
      });
      if (existing) {
        // 编号冲突，如果是最后一次尝试则抛错，否则继续重试
        if (attempt === maxRetries - 1) {
          throw errors.requirementCodeConflict();
        }
        continue; // 继续下一轮重试
      }
      return reqCode; // 成功生成唯一编号
    } catch (error) {
      // 非业务错误的异常直接透出
      if (attempt === maxRetries - 1) {
        throw errors.requirementCodeConflict();
      }
    }
  }

  // 兜底：重试耗尽
  throw errors.requirementCodeConflict();
}

/**
 * 循环依赖检测：判断在 A → B 方向添加依赖是否形成循环
 * 
 * 使用 DFS（深度优先搜索）算法从 B（被依赖方）出发，
 * 按需查询数据库（不预加载全量依赖），检查是否能回到 A（依赖方）。
 * 循环依赖是数据一致性错误，必须在保存依赖关系时阻断。
 * 
 * @param dependantId - 依赖方需求 ID（要添加依赖的需求，即 A）
 * @param dependencyId - 被依赖方需求 ID（被依赖的需求，即 B）
 * @param tx - Prisma 事务客户端，用于按需查询依赖关系
 * @returns true 表示存在循环依赖（应阻断），false 表示无循环（可添加）
 */
async function hasCircularDependency(
  dependantId: string,
  dependencyId: string,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  // 自依赖检查：A 不能依赖 A 自身
  if (dependantId === dependencyId) return true;

  // DFS 使用的数据结构
  const visited = new Set<string>();  // 已访问节点集合，防止无限循环
  const stack = [dependencyId];       // DFS 栈，初始放入 B（被依赖方）

  // DFS 主循环：从 B 出发，沿依赖链向下搜索
  while (stack.length > 0) {
    const current = stack.pop()!;     // 取出栈顶节点

    if (current === dependantId) return true; // 回到了依赖方 A → 存在循环！
    if (visited.has(current)) continue;       // 跳过已访问节点，避免重复
    visited.add(current);                      // 标记当前节点为已访问

    // 按需查询当前节点的所有直接依赖（从数据库获取，避免全量加载）
    const deps = await tx.requirementDependency.findMany({
      where: { dependantId: current },           // 查"谁依赖了当前节点"
      select: { dependencyId: true },             // 只取被依赖方 ID
    });

    // 将当前节点的所有被依赖方加入栈中继续搜索
    for (const dep of deps) {
      stack.push(dep.dependencyId);
    }
  }

  // 遍历结束未回到依赖方 → 无循环依赖
  return false;
}

/**
 * 构造需求详情响应对象
 * 
 * 从 Prisma 查询结果组装为前端展示用的 RequirementDetail 结构，
 * 包括查询依赖列表、展开关联对象、格式化时间戳等。
 * 
 * @param requirement - Prisma 返回的需求记录（含 include 的关联数据）
 * @param txOrPrisma - Prisma 事务客户端或普通客户端（事务中传 tx，否则用全局 prisma）
 * @returns 组装好的 RequirementDetail 对象
 */
async function buildRequirementDetail(
  requirement: any,
  txOrPrisma: Prisma.TransactionClient | PrismaClient = prisma,
): Promise<RequirementDetail> {
  // 1. 查询该需求的依赖列表（A 依赖的所有 B）
  const deps = await txOrPrisma.requirementDependency.findMany({
    where: { dependantId: requirement.id },  // 本需求是依赖方
    select: {
      dependency: {                           // 关联查询被依赖的需求
        select: {
          id: true,                           // 被依赖方 ID
          reqCode: true,                      // 被依赖方编号
          title: true,                        // 被依赖方标题
          status: true,                       // 被依赖方状态（前端用于风险提示）
          subStatus: true,                    // 被依赖方子状态（已纳版时有值）
        },
      },
    },
  });

  // 2. 将依赖列表转换为 DependencyItem[] 格式（Prisma 枚举 → shared 枚举类型断言）
  //    同时计算每条依赖的风险等级
  const dependencies: DependencyItem[] = deps.map((d) => {
    const depStatus = d.dependency.status as unknown as ReqStatus;
    let riskLevel: DependencyItem['riskLevel'] = null;

    if (depStatus === 'ONBOARDED' || depStatus === 'RELEASED') {
      riskLevel = null;
    } else if (depStatus === 'READY') {
      riskLevel = 'warning';
    } else if (depStatus === 'CANCELLED') {
      riskLevel = 'critical';
    } else {
      riskLevel = 'high';
    }

    return {
      id: d.dependency.id,
      reqCode: d.dependency.reqCode,
      title: d.dependency.title,
      status: depStatus as DependencyItem['status'],
      subStatus: (d.dependency.subStatus ?? undefined) as DependencyItem['subStatus'],
      riskLevel,
    };
  });

  // 3. 查询该需求的操作审计日志（按时间倒序）
  const statusLogs = await txOrPrisma.statusLog.findMany({
    where: { requirementId: requirement.id },
    orderBy: { createdAt: 'desc' },
    include: {
      operator: {
        select: { displayName: true },
      },
    },
  });

  const statusLogItems: StatusLogItem[] = statusLogs.map((log) => ({
    id: log.id,
    operatorName: log.operator.displayName,
    operationType: log.operationType as unknown as StatusLogItem['operationType'],
    fromStatus: (log.fromStatus ?? undefined) as StatusLogItem['fromStatus'],
    toStatus: log.toStatus as unknown as StatusLogItem['toStatus'],
    fromSubStatus: (log.fromSubStatus ?? undefined) as StatusLogItem['fromSubStatus'],
    toSubStatus: (log.toSubStatus ?? undefined) as StatusLogItem['toSubStatus'],
    reason: log.reason ?? undefined,
    createdAt: log.createdAt.toISOString(),
  }));

  // 3.5 查询该需求最新的紧急变更（如果有）
  const latestEmergencyChange = await txOrPrisma.emergencyChange.findFirst({
    where: { requirementId: requirement.id, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });

  // 4. 返回完整的 RequirementDetail（含关联数据展开和时间格式化）
  return {
    id: requirement.id,                                    // 需求 ID
    reqCode: requirement.reqCode,                          // 需求编号
    title: requirement.title,                              // 需求标题
    description: requirement.description,                  // 需求描述（已 XSS 过滤的 HTML）
    system: { id: requirement.system.id, name: requirement.system.name }, // 归属系统摘要
    priority: requirement.priority,                        // 优先级 P0/P1/P2/P3
    storyPoints: requirement.storyPoints,                  // 工作量点数 1-100
    ba: { id: requirement.ba.id, displayName: requirement.ba.displayName },  // 业务归属人摘要
    pm: requirement.pm
      ? { id: requirement.pm.id, displayName: requirement.pm.displayName } // 产品经理摘要（可选）
      : undefined,                                                           // null 转为 undefined
    creator: {
      id: requirement.creator.id,                                             // 创建人 ID
      displayName: requirement.creator.displayName,                           // 创建人显示名
    },
    status: requirement.status,                            // 主状态
    subStatus: requirement.subStatus ?? undefined,          // 子状态（null → undefined）
    train: requirement.trainSchedule?.train
      ? { id: requirement.trainSchedule.train.id, name: requirement.trainSchedule.train.name } // 所属火车摘要（已纳版时有值）
      : undefined,                                                           // null → undefined
    schedule: requirement.trainSchedule
      ? { id: requirement.trainSchedule.id, name: requirement.trainSchedule.name, status: requirement.trainSchedule.status } // 所属班次摘要（v2.0，已纳版时有值）
      : undefined,
    reqType: requirement.reqType ?? undefined,             // 需求类型（null → undefined）
    sourceChannel: requirement.sourceChannel ?? undefined,  // 来源渠道（null → undefined）
    version: requirement.version,                           // 乐观锁版本号
    dependencies,                                           // 前置依赖列表（步骤 2 已组装）
    statusLogs: statusLogItems,                             // 操作审计日志（步骤 3 已组装）
    emergencyChange: latestEmergencyChange ? {              // 紧急变更（如有待审批的）
      id: latestEmergencyChange.id,
      status: latestEmergencyChange.status,
      urgency: latestEmergencyChange.urgency,
      reason: latestEmergencyChange.reason,
      approvalStep: (latestEmergencyChange as any).approvalStep ?? 1,
      approverId: latestEmergencyChange.approverId ?? undefined,
      approvedAt: latestEmergencyChange.approvedAt?.toISOString(),
      rejectReason: latestEmergencyChange.rejectReason ?? undefined,
    } : undefined,
    createdAt: requirement.createdAt.toISOString(),         // 创建时间 → ISO 8601 字符串
    updatedAt: requirement.updatedAt.toISOString(),         // 更新时间 → ISO 8601 字符串
  };
}

/**
 * 创建需求
 * 
 * 业务流程：
 * 1. XSS 过滤描述文本（双重过滤的第一层）
 * 2. 校验归属系统存在性（数据库查询）
 * 3. 校验 BA 存在且角色为 BA
 * 4. 校验 PM 存在且角色为 PM（如果指定）
 * 5. 校验依赖需求都存在（如果指定），批量返回所有不存在的 ID
 * 6. 事务内：生成编号 → 创建需求 → 创建依赖关系（含循环检测） → 创建 StatusLog
 * 
 * @param data - 创建需求请求参数（已由 Fastify Schema 校验格式）
 * @param creatorId - 创建人 ID（从 JWT Token 提取）
 * @returns 创建后的完整需求详情
 * @throws AppError 400 - 归属系统/BA/PM/依赖不存在、循环依赖
 * @throws AppError 409 - 编号生成冲突（重试后仍失败）
 */
export async function createRequirement(
  data: CreateRequirementRequest,
  creatorId: string,
): Promise<RequirementDetail> {
  // 1. XSS 过滤：后端存储时清洗需求描述
  const filteredDescription = sanitizeDescription(data.description);

  // 校验过滤后描述不为空
  if (filteredDescription.length === 0) {
    throw errors.requirementInvalidDescription('需求描述不能为空');
  }

  // 校验过滤后描述不超长（50000 字上限）
  if (filteredDescription.length > 50000) {
    throw errors.requirementInvalidDescription('需求描述不能超过50000字');
  }

  // 2. 校验归属系统存在性（先判空，避免无效 DB 查询）
  if (!data.systemId) {
    throw errors.requirementSystemNotFound('归属系统不能为空');
  }
  const system = await prisma.system.findUnique({ where: { id: data.systemId } });
  if (!system) {
    throw errors.requirementSystemNotFound();
  }

  // 3. 校验业务归属人存在且角色为 BA（先判空，避免无效 DB 查询）
  if (!data.baId) {
    throw errors.requirementBaNotFound('业务归属人不能为空');
  }
  const ba = await prisma.user.findFirst({
    where: { id: data.baId, role: 'BA' }, // 限定角色为 BA
  });
  if (!ba) {
    throw errors.requirementBaNotFound();
  }

  // 4. 如果指定了产品经理，校验其存在且角色为 PM
  if (data.pmId) {
    const pm = await prisma.user.findFirst({
      where: { id: data.pmId, role: 'PM' }, // 限定角色为 PM
    });
    if (!pm) {
      throw errors.requirementPmNotFound();
    }
  }

  // 5. 如果指定了依赖列表，批量校验所有依赖需求存在
  if (data.dependencyIds && data.dependencyIds.length > 0) {
    const existingDeps = await prisma.requirement.findMany({
      where: { id: { in: data.dependencyIds } }, // 批量查询
      select: { id: true },
    });
    const existingIds = new Set(existingDeps.map((d) => d.id)); // 存在的 ID 集合
    const missingIds = data.dependencyIds.filter((id) => !existingIds.has(id)); // 取差集
    if (missingIds.length > 0) {
      // 批量返回所有不存在的依赖需求 ID
      throw errors.requirementDependencyNotFound(`依赖需求不存在：${missingIds.join(', ')}`);
    }
  }

  // 6. 开启 Prisma 事务：编号生成 → 需求创建 → 依赖创建 → 日志记录（原子操作）
  return prisma.$transaction(async (tx) => {
    // 6a. 生成唯一需求编号（事务内，冲突自动重试）
    const reqCode = await generateReqCode(tx);

    // 6b. 创建需求记录（初始状态 DRAFT）
    const requirement = await tx.requirement.create({
      data: {
        reqCode,                             // 自动生成的需求编号
        title: data.title,                   // 需求标题
        description: filteredDescription,    // 已 XSS 过滤的描述
        systemId: data.systemId,             // 归属系统 ID
        priority: data.priority,             // 优先级 P0/P1/P2/P3
        storyPoints: data.storyPoints,       // 工作量点数
        baId: data.baId,                     // 业务归属人 ID
        pmId: data.pmId ?? null,             // 产品经理 ID（可选，undefined → null）
        creatorId,                           // 创建人 ID（从 JWT 提取）
        reqType: data.reqType ?? null,       // 需求类型（可选）
        sourceChannel: data.sourceChannel ?? null, // 来源渠道（可选）
        status: 'DRAFT',                     // 初始状态：草稿
      },
      include: {                             // 关联查询（用于返回详情）
        system: true,                        // 归属系统
        ba: true,                            // 业务归属人
        pm: true,                            // 产品经理
        creator: true,                       // 创建人
        trainSchedule: { include: { train: true } },                         // 所属火车（初始为 null）
      },
    });

    // 6c. 如果指定了依赖，逐条创建依赖关系（含循环检测）
    if (data.dependencyIds && data.dependencyIds.length > 0) {
      for (const depId of data.dependencyIds) {
        // 循环依赖检测：添加 A → depId 是否会形成环？
        const hasCircular = await hasCircularDependency(requirement.id, depId, tx);
        if (hasCircular) {
          throw errors.requirementCircularDependency(); // 阻断保存
        }

        // 创建依赖关系记录
        await tx.requirementDependency.create({
          data: {
            dependantId: requirement.id,   // 依赖方（A 依赖 B，A 是依赖方）
            dependencyId: depId,           // 被依赖方（A 依赖 B，B 是被依赖方）
          },
        });
      }
    }

    // 6d. 创建状态变更日志（审计记录）
    await tx.statusLog.create({
      data: {
        requirementId: requirement.id,       // 需求 ID
        operationType: OperationType.CREATE,  // 操作类型：创建
        toStatus: 'DRAFT',                    // 变更后状态：草稿
        operatorId: creatorId,                // 操作人 ID
      },
    });

    // 6e. 返回完整需求详情
    return buildRequirementDetail(requirement, tx);
  });
}

/**
 * 获取需求详情
 * 
 * @param id - 需求 ID
 * @returns 需求详情（含系统、人员、依赖等关联数据）
 * @throws AppError 404 - 需求不存在
 */
export async function getRequirementById(id: string): Promise<RequirementDetail> {
  // 查需求主表 + 所有关联数据（含 train 信息，已纳版时有值）
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    include: {
      system: true,   // 归属系统
      ba: true,       // 业务归属人
      pm: true,       // 产品经理
      creator: true,  // 创建人
      trainSchedule: { include: { train: true } },    // 所属火车（初始为 null，已纳版时有值）
    },
  });

  // 需求不存在 → 200 业务错误
  if (!requirement) {
    throw errors.requirementNotFound();
  }

  // 组装并返回详情
  return buildRequirementDetail(requirement);
}

/**
 * 编辑需求（仅草稿状态可编辑）
 * 
 * 业务流程：
 * 1. 校验需求存在
 * 2. 校验需求状态为 DRAFT（非草稿不可编辑）
 * 3. 乐观锁校验：请求 version 必须等于数据库 version
 * 4. 如果修改了 description → XSS 过滤
 * 5. 如果修改了 systemId/baId/pmId → 校验新值存在
 * 6. 事务内：乐观锁更新 → 全量替换依赖 → 创建 StatusLog
 * 
 * @param id - 需求 ID
 * @param data - 编辑需求请求参数（只提交要修改的字段，version 必填）
 * @param operatorId - 操作人 ID（从 JWT 提取）
 * @returns 更新后的需求详情
 * @throws AppError 404 - 需求不存在
 * @throws AppError 400 - 非草稿状态 / 归属系统不存在 / BA 不存在 / PM 不存在 / 依赖不存在 / 循环依赖
 * @throws AppError 409 - 乐观锁冲突
 */
export async function updateRequirement(
  id: string,
  data: UpdateRequirementRequest,
  operatorId: string,
): Promise<RequirementDetail> {
  // 1. 查询现有需求（含关联数据，用于后续校验和返回）
  const existing = await prisma.requirement.findUnique({
    where: { id },
    include: { system: true, ba: true, pm: true, creator: true, trainSchedule: { include: { train: true } } },
  });

  // 需求不存在
  if (!existing) {
    throw errors.requirementNotFound();
  }

  // 2. 仅草稿状态可编辑
  if (existing.status !== 'DRAFT') {
    throw errors.requirementNotDraft();
  }

  // 2b. BA 只能编辑自己的需求（PM/TRAIN_ADMIN/SUPER_ADMIN 无此限制）
  const operator = await prisma.user.findUnique({
    where: { id: operatorId },
    select: { role: true },
  });
  if (operator?.role === 'BA' && existing.baId !== operatorId) {
    throw errors.requirementPermissionDenied();
  }

  // 3. 乐观锁校验：version 不匹配说明已被其他人修改
  if (existing.version !== data.version) {
    throw errors.requirementVersionConflict();
  }

  // 4. 如果修改了描述 → XSS 过滤后再做长度校验
  if (data.description) {
    const filtered = sanitizeDescription(data.description);
    if (filtered.length === 0) {
      throw errors.requirementInvalidDescription('需求描述不能为空');
    }
    if (filtered.length > 50000) {
      throw errors.requirementInvalidDescription('需求描述不能超过50000字');
    }
    data.description = filtered; // 替换为过滤后的安全文本
  }

  // 5. 如果修改了归属系统 → 校验新系统存在
  if (data.systemId) {
    const system = await prisma.system.findUnique({ where: { id: data.systemId } });
    if (!system) {
      throw errors.requirementSystemNotFound();
    }
  }

  // 6. 如果修改了 BA → 校验新 BA 存在且角色为 BA
  if (data.baId) {
    const ba = await prisma.user.findFirst({
      where: { id: data.baId, role: 'BA' },
    });
    if (!ba) {
      throw errors.requirementBaNotFound();
    }
  }

  // 7. 如果修改了 PM → 校验新 PM 存在且角色为 PM
  if (data.pmId) {
    const pm = await prisma.user.findFirst({
      where: { id: data.pmId, role: 'PM' },
    });
    if (!pm) {
      throw errors.requirementPmNotFound();
    }
  }

  // 8. 如果修改了依赖列表 → 批量校验所有依赖需求存在
  if (data.dependencyIds !== undefined) {
    if (data.dependencyIds.length > 0) {
      const existingDeps = await prisma.requirement.findMany({
        where: { id: { in: data.dependencyIds } },
        select: { id: true },
      });
      const existingIds = new Set(existingDeps.map((d) => d.id));
      const missingIds = data.dependencyIds.filter((did) => !existingIds.has(did));
      if (missingIds.length > 0) {
        throw errors.requirementDependencyNotFound(`依赖需求不存在：${missingIds.join(', ')}`);
      }
    }
  }

  // 9. 开启事务：乐观锁更新 → 全量替换依赖 → 日志记录
  return prisma.$transaction(async (tx) => {
    // 9a. 构建更新数据对象（仅包含请求中提供的字段）
    const updateData: any = {};

    // 逐字段判断：undefined 表示未传（不修改），有值则加入更新
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.systemId !== undefined) updateData.systemId = data.systemId;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.storyPoints !== undefined) updateData.storyPoints = data.storyPoints;
    if (data.baId !== undefined) updateData.baId = data.baId;
    if (data.pmId !== undefined) updateData.pmId = data.pmId;
    if (data.reqType !== undefined) updateData.reqType = data.reqType;
    if (data.sourceChannel !== undefined) updateData.sourceChannel = data.sourceChannel;
    // version 自增 1（乐观锁机制）
    updateData.version = { increment: 1 };

    // 9b. 带版本号条件的更新（乐观锁核心）
    const result = await tx.requirement.updateMany({
      where: { id, version: data.version }, // WHERE id = ? AND version = ?
      data: updateData,
    });

    // 9c. 更新影响行数为 0 说明条件不满足，需区分原因
    if (result.count === 0) {
      const current = await tx.requirement.findUnique({ where: { id } });
      if (!current) {
        throw errors.requirementNotFound(); // 需求已被删除
      }
      // 版本号不匹配 → 乐观锁冲突
      throw errors.requirementVersionConflict();
    }

    // 9d. 如果传了 dependencyIds → 全量替换依赖列表
    if (data.dependencyIds !== undefined) {
      // 第一步：删除所有旧依赖
      await tx.requirementDependency.deleteMany({
        where: { dependantId: id },
      });

      // 第二步：逐条创建新依赖（含循环检测）
      for (const depId of data.dependencyIds) {
        const hasCircular = await hasCircularDependency(id, depId, tx);
        if (hasCircular) {
          throw errors.requirementCircularDependency();
        }

        await tx.requirementDependency.create({
          data: { dependantId: id, dependencyId: depId },
        });
      }
    }

    // 9e. 创建编辑操作的状态变更日志
    await tx.statusLog.create({
      data: {
        requirementId: id,                  // 需求 ID
        operationType: OperationType.UPDATE, // 操作类型：编辑
        fromStatus: existing.status,         // 变更前状态（保持草稿）
        toStatus: 'DRAFT',                   // 变更后状态（编辑不改变状态）
        operatorId,                           // 操作人 ID
      },
    });

    // 9f. 重新查询更新后的需求（version 已自增）
    const updated = await tx.requirement.findUnique({
      where: { id },
      include: {
        system: true,
        ba: true,
        pm: true,
        creator: true,
        trainSchedule: { include: { train: true } },
      },
    });

    // 返回更新后的完整详情
    return buildRequirementDetail(updated!, tx);
  });
}

// ========== 紧急变更（封板状态 → 提交审批） ==========

/**
 * 紧急变更：对封板状态的需求提交紧急变更申请
 * 
 * US1.12 紧急变更功能：
 * - 前置条件：状态为 ONBOARDED + 子状态为 FROZEN（封板）
 * - 权限：BA（归属人）、TRAIN_ADMIN、SUPER_ADMIN（RBAC 中间件已校验）
 * - 创建 EmergencyChange 记录，状态为 PENDING
 * - 记录 EMERGENCY_CHANGE 审计日志
 * - Task 1 仅实现提交，审批操作在 Task 2 实现
 * 
 * @param id - 需求 ID
 * @param operatorId - 操作人 ID（从 JWT 提取）
 * @param operatorRole - 操作人角色（从 JWT 提取）
 * @param urgency - 紧急程度（P0/P1）
 * @param reason - 紧急变更原因（必填，最多 500 字）
 * @returns 更新后的需求详情
 */
export async function emergencyChange(
  id: string,
  operatorId: string,
  _operatorRole: string,
  urgency: string,
  reason: string,
): Promise<RequirementDetail> {
  const existing = await prisma.requirement.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      subStatus: true,
      systemId: true,
      scheduleId: true,
      version: true,
    },
  });

  if (!existing) {
    throw errors.requirementNotFound();
  }

  if (existing.status !== 'ONBOARDED' || existing.subStatus !== 'FROZEN') {
    throw errors.requirementSealedCannotChange('仅封板状态的需求可发起紧急变更');
  }

  if (!['P0', 'P1'].includes(urgency)) {
    throw errors.badRequest('紧急程度无效，仅支持 P0/P1');
  }

  // 查找测试经理作为第一审批人
  let firstApproverId: string | null = null;
  if (existing.scheduleId) {
    const snapshot = await prisma.trainSystemSnapshot.findUnique({
      where: {
        trainScheduleId_systemId: { trainScheduleId: existing.scheduleId, systemId: existing.systemId },
      },
      select: { testMgrUserId: true },
    });
    if (snapshot?.testMgrUserId) {
      firstApproverId = snapshot.testMgrUserId;
    }
  }
  if (!firstApproverId) {
    const testMgr = await prisma.systemMember.findFirst({
      where: { systemId: existing.systemId, role: 'TEST_MGR' },
      select: { userId: true },
    });
    if (testMgr) firstApproverId = testMgr.userId;
  }
  if (!firstApproverId) {
    const testMgrUser = await prisma.user.findFirst({
      where: { role: 'TEST_MGR' },
      select: { id: true },
    });
    if (testMgrUser) firstApproverId = testMgrUser.id;
  }

  return prisma.$transaction(async (tx) => {
    await tx.emergencyChange.create({
      data: {
        requirementId: id,
        urgency: urgency as any,
        reason,
        status: 'PENDING',
        approvalStep: 1,
        approverId: firstApproverId,
      },
    });

    await tx.statusLog.create({
      data: {
        requirementId: id,
        operationType: 'EMERGENCY_CHANGE' as any,
        fromStatus: existing.status,
        toStatus: existing.status,
        fromSubStatus: existing.subStatus,
        toSubStatus: existing.subStatus,
        operatorId,
        reason: `紧急程度: ${urgency}, 原因: ${reason}`,
      },
    });

    const updated = await tx.requirement.findUnique({
      where: { id },
      include: {
        system: true,
        ba: true,
        pm: true,
        creator: true,
        trainSchedule: { include: { train: true } },
      },
    });

    return buildRequirementDetail(updated!, tx);
  });
}

// 找到下一个审批人 (step: 2→PROJECT_MGR, 3→null 表示终审)
async function findApproverForStep(systemId: string, scheduleId: string | null, step: number): Promise<string | null> {
  if (step === 2) {
    const pmMgr = await prisma.systemMember.findFirst({
      where: { systemId, role: 'PROJECT_MGR' },
      select: { userId: true },
    });
    if (pmMgr) return pmMgr.userId;
    const pmMgrUser = await prisma.user.findFirst({
      where: { role: 'PROJECT_MGR' },
      select: { id: true },
    });
    if (pmMgrUser) return pmMgrUser.id;
  }
  return null;
}

// 紧急变更审批通过
export async function approveEmergencyChange(
  requirementId: string,
  approverId: string,
): Promise<RequirementDetail> {
  const change = await prisma.emergencyChange.findFirst({
    where: { requirementId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });

  if (!change) {
    throw errors.badRequest('未找到待审批的紧急变更');
  }
  if (change.approverId !== approverId) {
    throw errors.badRequest('您不是当前审批人');
  }

  const nextStep = change.approvalStep + 1;
  const req = await prisma.requirement.findUnique({
    where: { id: requirementId },
    select: { systemId: true, scheduleId: true, status: true, subStatus: true },
  });
  if (!req) throw errors.requirementNotFound();

  const nextApproverId = await findApproverForStep(req.systemId, req.scheduleId, nextStep);

  return prisma.$transaction(async (tx) => {
    if (nextApproverId) {
      await tx.emergencyChange.update({
        where: { id: change.id },
        data: { approvalStep: nextStep, approverId: nextApproverId },
      });
    } else {
      await tx.emergencyChange.update({
        where: { id: change.id },
        data: { status: 'APPROVED', approvedAt: new Date(), approvalStep: nextStep },
      });
      await tx.requirement.update({
        where: { id: requirementId },
        data: { status: 'DRAFT', subStatus: null, version: { increment: 1 } },
      });
    }

    await tx.statusLog.create({
      data: {
        requirementId,
        operationType: 'REVIEW_PASS' as any,
        fromStatus: req.status,
        toStatus: 'DRAFT',
        fromSubStatus: req.subStatus,
        toSubStatus: null,
        operatorId: approverId,
        reason: nextApproverId ? '测试经理审批通过，转项目经理审批' : '紧急变更审批通过，需求退回草稿',
      },
    });

    const updated = await tx.requirement.findUnique({
      where: { id: requirementId },
      include: {
        system: true, ba: true, pm: true, creator: true,
        trainSchedule: { include: { train: true } },
      },
    });
    return buildRequirementDetail(updated!, tx);
  });
}

// 紧急变更审批驳回
export async function rejectEmergencyChange(
  requirementId: string,
  approverId: string,
  rejectReason: string,
): Promise<void> {
  const change = await prisma.emergencyChange.findFirst({
    where: { requirementId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });

  if (!change) {
    throw errors.badRequest('未找到待审批的紧急变更');
  }
  if (change.approverId !== approverId) {
    throw errors.badRequest('您不是当前审批人');
  }

  const req = await prisma.requirement.findUnique({
    where: { id: requirementId },
    select: { status: true, subStatus: true },
  });
  if (!req) throw errors.requirementNotFound();

  await prisma.$transaction(async (tx) => {
    await tx.emergencyChange.update({
      where: { id: change.id },
      data: { status: 'REJECTED', rejectReason },
    });

    await tx.statusLog.create({
      data: {
        requirementId,
        operationType: 'REVIEW_REJECT' as any,
        fromStatus: req.status,
        toStatus: req.status,
        fromSubStatus: req.subStatus,
        toSubStatus: req.subStatus,
        operatorId: approverId,
        reason: `紧急变更审批驳回: ${rejectReason}`,
      },
    });
  });
}

/**
 * 取消需求（草稿状态）
 * 
 * US1.1 仅支持草稿取消，免填原因。
 * 非草稿状态的取消在 US1.3 实现（需填写取消原因）。
 * 
 * @param id - 需求 ID
 * @param operatorId - 操作人 ID（从 JWT 提取）
 * @returns { success: true } — 取消成功
 * @throws AppError 404 - 需求不存在
 * @throws AppError 400 - 非草稿状态（提示使用完整取消功能）
 */
/**
 * 取消需求（US1.9 增强版）
 * 
 * US1.9 将取消功能从仅支持草稿扩展为支持所有非终态需求。
 * 权限：BA（归属人）、TRAIN_ADMIN、SUPER_ADMIN
 * 前置条件：需求状态不能为 CANCELLED 或 RELEASED（已投产）
 * 特殊规则：已纳版需求取消时清除 trainId 并返还容量
 * 
 * @param id - 需求 ID
 * @param operatorId - 操作人 ID（从 JWT 提取）
 * @param operatorRole - 操作人角色（从 JWT 提取）
 * @param reason - 取消原因（必填，最多 500 字）
 * @returns 更新后的需求详情（含状态、版本号、审计日志）
 * @throws REQUIREMENT_NOT_FOUND - 需求不存在
 * @throws REQUIREMENT_ALREADY_CANCELLED - 需求已取消
 * @throws REQUIREMENT_ALREADY_PRODUCED - 已投产需求不能取消
 * @throws REQUIREMENT_PERMISSION_DENIED - 无取消权限（非归属BA/非TRAIN_ADMIN/非SUPER_ADMIN）
 * @throws BAD_REQUEST - 取消原因为空或超过500字
 */
export async function cancelRequirement(
  id: string,
  operatorId: string,
  operatorRole: string,
  reason: string,
): Promise<RequirementDetail> {
  // 1. 查询需求存在性（含权限校验所需字段）
  const existing = await prisma.requirement.findUnique({
    where: { id },
    include: {
      trainSchedule: { select: { trainId: true } },
    },
  });

  if (!existing) {
    throw errors.requirementNotFound();
  }

  // 2. 状态校验：不能是已取消
  if (existing.status === 'CANCELLED') {
    throw errors.requirementAlreadyCancelled();
  }

  // 3. 状态校验：不能是已投产（RELEASED）
  if (existing.status === 'RELEASED') {
    throw errors.requirementAlreadyProduced();
  }

  // 4. 权限校验：BA 必须是归属人，TRAIN_ADMIN/SUPER_ADMIN 不限
  const isBA = operatorRole === Role.BA && operatorId === existing.baId;
  const isTrainAdmin = operatorRole === Role.TRAIN_ADMIN;
  const isSuperAdmin = operatorRole === Role.SUPER_ADMIN;

  if (!isBA && !isTrainAdmin && !isSuperAdmin) {
    throw errors.requirementPermissionDenied('您没有取消需求的权限');
  }

  // 5. 取消原因校验
  if (!reason || reason.trim().length === 0) {
    throw errors.badRequest('取消原因不能为空');
  }

  if (reason.length > 500) {
    throw errors.badRequest('取消原因最多 500 字');
  }

  // 6. 事务内：更新状态 → 清除火车关联 → 返还容量 → 创建审计日志
  return prisma.$transaction(async (tx) => {
    // 6a. 乐观锁：重新读取版本号
    const current = await tx.requirement.findUnique({
      where: { id },
      select: { version: true },
    });

    if (!current) {
      throw errors.requirementNotFound();
    }

    // 6b. 构建更新数据
    const updateData: any = {
      status: 'CANCELLED',
      version: { increment: 1 },
    };

    // 如果已纳版（scheduleId 不为空），清除火车关联
    if (existing.scheduleId) {
      updateData.scheduleId = null;
    }

    // 6c. 更新需求状态
    await tx.requirement.update({
      where: { id, version: current.version },
      data: updateData,
    });

    // 6d. 如果已纳版，返还容量到 TrainSystem
    if (existing.trainSchedule?.trainId) {
      const trainSystem = await tx.trainSystem.findFirst({
        where: {
          trainId: existing.trainSchedule.trainId,
          systemId: existing.systemId,
        },
      });

      if (trainSystem) {
        const newUsedPoints = Math.max(0, trainSystem.usedPoints - existing.storyPoints);
        await tx.trainSystem.update({
          where: { id: trainSystem.id },
          data: { usedPoints: newUsedPoints },
        });
      }
    }

    // 6e. 创建状态变更日志（含取消原因）
    await tx.statusLog.create({
      data: {
        requirementId: id,
        operationType: OperationType.CANCEL,
        fromStatus: existing.status,
        toStatus: 'CANCELLED',
        operatorId,
        reason: reason.trim(),
      },
    });

    // 6f. 返回更新后的需求详情
    const updated = await tx.requirement.findUnique({
      where: { id },
      include: {
        system: true,
        ba: true,
        pm: true,
        creator: true,
        trainSchedule: { include: { train: true } },
      },
    });

    return buildRequirementDetail(updated!, tx);
  });
}

/**
 * 发起评审（草稿 → 待评审）
 * 
 * US1.5 将草稿状态需求提交评审，进入评审流程。
 * 权限：BA（归属人）、TRAIN_ADMIN、SUPER_ADMIN
 * 前置条件：需求状态必须为 DRAFT，且必填字段完整
 * 
 * @param id - 需求 ID
 * @param operatorId - 操作人 ID（从 JWT 提取）
 * @param operatorRole - 操作人角色（从 JWT 提取）
 * @returns 更新后的需求详情（含状态和审计日志）
 * @throws REQUIREMENT_NOT_FOUND - 需求不存在
 * @throws REQUIREMENT_NOT_DRAFT - 非草稿状态
 * @throws REQUIREMENT_PERMISSION_DENIED - 无发起评审权限
 * @throws BAD_REQUEST - 必填字段缺失
 * @throws REQUIREMENT_VERSION_CONFLICT - 乐观锁冲突
 */
export async function submitReview(
  id: string,
  operatorId: string,
  operatorRole: string,
): Promise<RequirementDetail> {
  // 1. 查询需求存在性（含 baId 用于权限校验）
  const existing = await prisma.requirement.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      baId: true,
      title: true,
      description: true,
      systemId: true,
      priority: true,
      storyPoints: true,
      version: true,
    },
  });

  if (!existing) {
    throw errors.requirementNotFound();
  }

  // 2. 状态校验：仅草稿状态可发起评审
  if (existing.status !== 'DRAFT') {
    throw errors.requirementNotDraft('仅草稿状态可发起评审');
  }

  // 3. 权限校验：BA 必须是归属人，TRAIN_ADMIN/SUPER_ADMIN 不限
  const isBA = operatorRole === Role.BA && operatorId === existing.baId;
  const isTrainAdmin = operatorRole === Role.TRAIN_ADMIN;
  const isSuperAdmin = operatorRole === Role.SUPER_ADMIN;

  if (!isBA && !isTrainAdmin && !isSuperAdmin) {
    throw errors.requirementPermissionDenied('无发起评审权限');
  }

  // 4. 必填字段校验
  if (!existing.title || existing.title.trim().length < 1) {
    throw errors.badRequest('标题不能为空');
  }
  if (existing.title.length > 200) {
    throw errors.badRequest('标题长度不能超过 200 字符');
  }
  if (!existing.description || existing.description.trim().length === 0) {
    throw errors.badRequest('需求描述不能为空');
  }
  if (!existing.systemId) {
    throw errors.badRequest('归属系统不能为空');
  }
  if (!existing.priority) {
    throw errors.badRequest('优先级不能为空');
  }
  if (!existing.storyPoints || existing.storyPoints < 1 || existing.storyPoints > 100) {
    throw errors.badRequest('工作量点数必须为 1-100 的正整数');
  }
  if (!existing.baId) {
    throw errors.badRequest('业务归属人不能为空');
  }

  // 5. 事务内：乐观锁更新状态 + 创建审计日志
  return prisma.$transaction(async (tx) => {
    // 5a. 带版本号条件的更新（乐观锁）
    const result = await tx.requirement.updateMany({
      where: { id, version: existing.version },
      data: {
        status: 'PENDING_REVIEW',
        version: { increment: 1 },
      },
    });

    // 5b. 更新影响行数为 0 → 版本冲突
    if (result.count === 0) {
      const current = await tx.requirement.findUnique({ where: { id } });
      if (!current) {
        throw errors.requirementNotFound();
      }
      throw errors.requirementVersionConflict();
    }

    // 5c. 创建状态变更日志（fromStatus 从实际数据读取）
    await tx.statusLog.create({
      data: {
        requirementId: id,
        operationType: OperationType.SUBMIT_REVIEW,
        fromStatus: existing.status,
        toStatus: 'PENDING_REVIEW',
        operatorId,
      },
    });

    // 5d. 重新查询更新后的需求（含关联数据）
    const updated = await tx.requirement.findUnique({
      where: { id },
      include: {
        system: true,
        ba: true,
        pm: true,
        creator: true,
        trainSchedule: { include: { train: true } },
      },
    });

    return buildRequirementDetail(updated!, tx);
  });
}

/**
 * 评审通过（待评审 → 已就绪）
 * 
 * US1.6 将待评审需求评审通过，进入已就绪状态。
 * 权限：仅 PROJECT_MGR（项目经理）
 * 前置条件：需求状态必须为 PENDING_REVIEW
 * 
 * @param id - 需求 ID
 * @param operatorId - 操作人 ID（从 JWT 提取）
 * @param operatorRole - 操作人角色（从 JWT 提取）
 * @param comment - 评审意见（可选，最多 500 字）
 * @returns 更新后的需求详情（含状态和审计日志）
 * @throws REQUIREMENT_NOT_FOUND - 需求不存在
 * @throws REQUIREMENT_NOT_PENDING_REVIEW - 非待评审状态
 * @throws REQUIREMENT_ALREADY_APPROVED - 已被评审通过
 * @throws REQUIREMENT_PERMISSION_DENIED - 无评审通过权限
 * @throws BAD_REQUEST - 评审意见超长
 * @throws REQUIREMENT_VERSION_CONFLICT - 乐观锁冲突
 */
export async function reviewPass(
  id: string,
  operatorId: string,
  operatorRole: string,
  comment?: string,
): Promise<RequirementDetail> {
  // 1. 查询需求存在性（含版本号用于乐观锁）
  const existing = await prisma.requirement.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      version: true,
    },
  });

  if (!existing) {
    throw errors.requirementNotFound();
  }

  // 2. 状态校验：仅待评审状态可评审通过
  if (existing.status !== 'PENDING_REVIEW') {
    throw errors.requirementNotPendingReview('仅待评审状态可评审通过');
  }

  // 3. 权限校验：仅 PROJECT_MGR 可评审通过（SUPER_ADMIN 在中间件层已放行）
  if (operatorRole !== Role.PROJECT_MGR && operatorRole !== Role.SUPER_ADMIN) {
    throw errors.requirementPermissionDenied('仅项目经理可评审通过');
  }

  // 4. 评审意见长度校验
  if (comment && comment.length > 500) {
    throw errors.badRequest('评审意见最多 500 字');
  }

  // 5. 事务内：乐观锁更新状态 + 创建审计日志
  return prisma.$transaction(async (tx) => {
    // 5a. 带版本号条件的更新（乐观锁）
    const result = await tx.requirement.updateMany({
      where: { id, version: existing.version },
      data: {
        status: 'READY',
        version: { increment: 1 },
      },
    });

    // 5b. 更新影响行数为 0 → 版本冲突
    if (result.count === 0) {
      const current = await tx.requirement.findUnique({ where: { id } });
      if (!current) {
        throw errors.requirementNotFound();
      }
      throw errors.requirementVersionConflict();
    }

    // 5c. 创建状态变更日志（审计记录）
    await tx.statusLog.create({
      data: {
        requirementId: id,
        operationType: OperationType.REVIEW_PASS,
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'READY',
        operatorId,
      },
    });

    // 5d. 重新查询更新后的需求（含关联数据）
    const updated = await tx.requirement.findUnique({
      where: { id },
      include: {
        system: true,
        ba: true,
        pm: true,
        creator: true,
        trainSchedule: { include: { train: true } },
      },
    });

    return buildRequirementDetail(updated!, tx);
  });
}

// ========== 评审拒绝（待评审 → 已拒绝） ==========

/**
 * 评审拒绝：项目经理拒绝需求评审，需求进入已拒绝状态
 * 
 * US1.7 评审拒绝功能：
 * - 前置条件：状态为 PENDING_REVIEW
 * - 权限：仅 PROJECT_MGR（SUPER_ADMIN 在中间件层已放行）
 * - 拒绝原因必填，最多 500 字
 * - 记录 REVIEW_REJECT 审计日志
 * 
 * @param id - 需求 ID
 * @param operatorId - 操作人 ID（从 JWT 提取）
 * @param operatorRole - 操作人角色（从 JWT 提取）
 * @param reason - 拒绝原因（必填，最多 500 字）
 * @returns 更新后的需求详情
 * @throws REQUIREMENT_NOT_FOUND - 需求不存在
 * @throws REQUIREMENT_NOT_PENDING_REVIEW - 非待评审状态
 * @throws REQUIREMENT_PERMISSION_DENIED - 无评审拒绝权限
 * @throws BAD_REQUEST - 拒绝原因校验失败
 * @throws REQUIREMENT_VERSION_CONFLICT - 乐观锁冲突
 */
export async function reviewReject(
  id: string,
  operatorId: string,
  operatorRole: string,
  reason: string,
): Promise<RequirementDetail> {
  // 1. 查询需求存在性（含版本号用于乐观锁）
  const existing = await prisma.requirement.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      version: true,
    },
  });

  if (!existing) {
    throw errors.requirementNotFound();
  }

  // 2. 状态校验：仅待评审状态可评审拒绝
  if (existing.status !== 'PENDING_REVIEW') {
    throw errors.requirementNotPendingReview('仅待评审状态可评审拒绝');
  }

  // 3. 权限校验：仅 PROJECT_MGR 可评审拒绝（SUPER_ADMIN 在中间件层已放行）
  if (operatorRole !== Role.PROJECT_MGR && operatorRole !== Role.SUPER_ADMIN) {
    throw errors.requirementPermissionDenied('仅项目经理可评审拒绝');
  }

  // 4. 拒绝原因校验：必填
  if (!reason || reason.trim().length === 0) {
    throw errors.badRequest('拒绝原因不能为空');
  }

  // 5. 拒绝原因长度校验：最多 500 字
  if (reason.length > 500) {
    throw errors.badRequest('拒绝原因最多 500 字');
  }

  // 6. 事务内：乐观锁更新状态 + 创建审计日志
  return prisma.$transaction(async (tx) => {
    // 6a. 带版本号条件的更新（乐观锁）
    const result = await tx.requirement.updateMany({
      where: { id, version: existing.version },
      data: {
        status: 'REJECTED',
        version: { increment: 1 },
      },
    });

    // 6b. 更新影响行数为 0 → 版本冲突
    if (result.count === 0) {
      const current = await tx.requirement.findUnique({ where: { id } });
      if (!current) {
        throw errors.requirementNotFound();
      }
      throw errors.requirementVersionConflict();
    }

    // 6c. 创建状态变更日志（审计记录，含拒绝原因）
    await tx.statusLog.create({
      data: {
        requirementId: id,
        operationType: OperationType.REVIEW_REJECT,
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'REJECTED',
        operatorId,
        reason: reason.trim(),
      },
    });

    // 6d. 重新查询更新后的需求（含关联数据）
    const updated = await tx.requirement.findUnique({
      where: { id },
      include: {
        system: true,
        ba: true,
        pm: true,
        creator: true,
        trainSchedule: { include: { train: true } },
      },
    });

    return buildRequirementDetail(updated!, tx);
  });
}

// ========== 需求变更（已就绪/已纳版 → 草稿） ==========

/**
 * 需求变更：将已就绪或已纳版（非封板）状态的需求退回草稿
 * 
 * US1.11 需求变更功能：
 * - 前置条件：状态为 READY 或 IN_TRAIN（非封板子状态）
 * - 权限：BA（归属人）、TRAIN_ADMIN、SUPER_ADMIN
 * - 已纳版变更时：清除 trainId，释放火车容量
 * - 记录 CHANGE_REQUIREMENT 审计日志
 * 
 * @param id - 需求 ID
 * @param operatorId - 操作人 ID（从 JWT 提取）
 * @param operatorRole - 操作人角色（从 JWT 提取）
 * @param changeReason - 变更原因（必填，最多 500 字）
 * @returns 更新后的需求详情
 */
export async function changeRequirement(
  id: string,
  operatorId: string,
  operatorRole: string,
  changeReason: string,
): Promise<RequirementDetail> {
  // 1. 查询需求存在性（含版本号用于乐观锁）
  const existing = await prisma.requirement.findUnique({
    where: { id },
    include: {
      trainSchedule: { select: { trainId: true } },
    },
  });

  if (!existing) {
    throw errors.requirementNotFound();
  }

  // 2. 状态校验：仅 READY 或 ONBOARDED（非封板）可变更
  if (existing.status === 'READY') {
    // 已就绪状态可变更
  } else if (existing.status === 'ONBOARDED') {
    // 已纳版状态：封板子状态不可变更
    if (existing.subStatus === 'FROZEN') {
      throw errors.requirementSealedCannotChange();
    }
  } else {
    throw errors.requirementNotReadyOrInTrain();
  }

  // 3. 权限校验：BA（归属人）、TRAIN_ADMIN、SUPER_ADMIN
  const isBA = operatorRole === Role.BA;
  const isTrainAdmin = operatorRole === Role.TRAIN_ADMIN;
  const isSuperAdmin = operatorRole === Role.SUPER_ADMIN;

  if (!isBA && !isTrainAdmin && !isSuperAdmin) {
    throw errors.requirementPermissionDenied('仅业务归属人、火车管理员可发起需求变更');
  }

  // 4. 变更原因必填校验
  if (!changeReason || changeReason.trim().length === 0) {
    throw errors.requirementChangeReasonRequired('变更原因不能为空');
  }

  // 5. 变更原因长度校验
  if (changeReason.length > 500) {
    throw errors.requirementChangeReasonTooLong();
  }

  // 6. 事务内：状态变更 + 清除火车关联 + 释放容量 + 审计日志
  return prisma.$transaction(async (tx) => {
    // 6a. 带版本号条件的更新（乐观锁）
    const updateData: any = {
      status: 'DRAFT',
      version: { increment: 1 },
    };

    // 6b. 如果是已纳版状态，清除火车关联
    if (existing.status === 'ONBOARDED' && existing.scheduleId) {
      // 清除火车关联
      updateData.scheduleId = null;

      // 6c. 释放火车容量（如果需求有 storyPoints）
      // 容量在 TrainSystem.usedPoints 上管理
      if (existing.storyPoints && existing.storyPoints > 0 && existing.trainSchedule?.trainId && existing.systemId) {
        await tx.trainSystem.updateMany({
          where: {
            trainId: existing.trainSchedule.trainId,
            systemId: existing.systemId,
          },
          data: {
            usedPoints: { decrement: existing.storyPoints },
          },
        });
      }
    }

    const result = await tx.requirement.updateMany({
      where: { id, version: existing.version },
      data: updateData,
    });

    // 6d. 更新影响行数为 0 → 版本冲突
    if (result.count === 0) {
      const current = await tx.requirement.findUnique({ where: { id } });
      if (!current) {
        throw errors.requirementNotFound();
      }
      throw errors.requirementVersionConflict();
    }

    // 6e. 创建状态变更日志（审计记录）
    await tx.statusLog.create({
      data: {
        requirementId: id,
        operationType: OperationType.CHANGE_REQUIREMENT,
        fromStatus: existing.status,
        toStatus: 'DRAFT',
        operatorId,
        reason: changeReason.trim(),
      },
    });

    // 6f. 重新查询更新后的需求（含关联数据）
    const updated = await tx.requirement.findUnique({
      where: { id },
      include: {
        system: true,
        ba: true,
        pm: true,
        creator: true,
        trainSchedule: { include: { train: true } },
      },
    });

    return buildRequirementDetail(updated!, tx);
  });
}

// ========== 重新编辑（已拒绝 → 草稿） ==========

/**
 * 重新编辑：将已拒绝的需求退回草稿状态，允许 BA/PM 修改后重新提交
 * 
 * 业务规则：
 * - 仅 REJECTED 状态可重新编辑
 * - BA、PM、PROJECT_MGR 可操作（EDIT_REQ 权限）
 * - 使用乐观锁防止并发冲突
 * - 记录 RE_EDIT 审计日志
 * 
 * @param id - 需求 ID
 * @param operatorId - 操作人 ID
 * @param operatorRole - 操作人角色
 * @returns 更新后的需求详情
 */
export async function reEdit(
  id: string,
  operatorId: string,
  operatorRole: string,
): Promise<RequirementDetail> {
  const existing = await prisma.requirement.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      version: true,
    },
  });

  if (!existing) {
    throw errors.requirementNotFound();
  }

  if (existing.status !== 'REJECTED') {
    throw errors.requirementNotRejected('仅已拒绝状态可重新编辑');
  }

  if (
    operatorRole !== Role.BA &&
    operatorRole !== Role.PM
  ) {
    throw errors.requirementPermissionDenied('仅 BA、PM 可重新编辑');
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.requirement.updateMany({
      where: { id, version: existing.version },
      data: {
        status: 'DRAFT',
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      const current = await tx.requirement.findUnique({ where: { id } });
      if (!current) {
        throw errors.requirementNotFound();
      }
      throw errors.requirementVersionConflict();
    }

    await tx.statusLog.create({
      data: {
        requirementId: id,
        operationType: OperationType.RE_EDIT,
        fromStatus: 'REJECTED',
        toStatus: 'DRAFT',
        operatorId,
      },
    });

    const updated = await tx.requirement.findUnique({
      where: { id },
      include: {
        system: true,
        ba: true,
        pm: true,
        creator: true,
        trainSchedule: { include: { train: true } },
      },
    });

    return buildRequirementDetail(updated!, tx);
  });
}

// ========== 需求搜索相关类型 ==========

/** 需求搜索单项结果（用于前端依赖选择下拉） */
export interface RequirementSearchItem {
  id: string;           // 需求 ID（选中后作为依赖方 ID）
  reqCode: string;      // 需求编号（用于展示）
  title: string;        // 需求标题（用于展示）
  status: string;       // 需求状态（前端用于风险提示颜色）
}

/**
 * 需求搜索：按关键词模糊匹配需求编号和标题
 * 
 * 用于前端依赖选择功能——用户在搜索框中输入关键词，
 * 调用本接口获取匹配的需求列表，点击选择添加到依赖。
 * 
 * @param keyword - 搜索关键词（空字符串 → 返回空数组）
 * @returns 匹配的需求列表（最多 20 条，按创建时间倒序）
 */
export async function searchRequirements(keyword: string): Promise<RequirementSearchItem[]> {
  // 空关键词直接返回空数组（避免无效查询）
  if (!keyword || keyword.trim().length === 0) {
    return [];
  }

  // 查询：reqCode 或 title 包含关键词（大小写不敏感）
  return prisma.requirement.findMany({
    where: {
      OR: [
        { reqCode: { contains: keyword, mode: 'insensitive' } }, // 按编号模糊匹配（如 "REQ-2026"）
        { title: { contains: keyword, mode: 'insensitive' } },    // 按标题模糊匹配（如 "登录"）
      ],
    },
    select: { id: true, reqCode: true, title: true, status: true }, // 只取搜索展示所需字段
    orderBy: { createdAt: 'desc' }, // 最新创建的排在前面
    take: 20,                       // 最多返回 20 条
  });
}

/**
 * 需求列表查询（分页 + 筛选 + 搜索 + 排序）
 * 
 * 遵循编码规范 9.4 分页规范：
 * - 使用偏移分页（skip + take）
 * - findMany 和 count 使用相同 where 条件
 * - pageSize 上限 100，page 下限 1
 * 
 * US1.3 增强：
 * - status 支持数组多选（如 ?status=DRAFT&status=PENDING_REVIEW）
 * - systemId 按归属系统筛选
 * - sortBy/sortOrder 动态排序
 * - subStatus 字段返回
 * 
 * @param params - 查询参数（page/pageSize/systemId/status/keyword/sortBy/sortOrder）
 * @returns 分页响应 { list, total, page, pageSize }
 */
export async function listRequirements(
  params: RequirementListQuery,
): Promise<PaginatedResponse<RequirementListItem>> {
  // 分页参数规范化（遵循编码规范 9.4.2）
  const page = Math.max(1, params.page ?? 1);                         // 页码 >= 1
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20)); // 每页 1~100，默认 20

  // 构建 where 条件
  const where: any = {};

  // 按归属系统筛选（US1.3 新增）
  if (params.systemId) {
    where.systemId = params.systemId;
  }

  // 按状态筛选（US1.3 增强：支持单选、多选和逗号分隔）
  if (params.status) {
    let statusValues: ReqStatus[];
    if (Array.isArray(params.status)) {
      // 多选数组
      statusValues = params.status;
    } else if (typeof params.status === 'string' && params.status.includes(',')) {
      // 逗号分隔的字符串
      statusValues = params.status.split(',').filter(s => s.trim()) as ReqStatus[];
    } else {
      // 单选
      statusValues = [params.status as ReqStatus];
    }
    where.status = { in: statusValues };
  }

  // 按关键词模糊搜索（编号或标题）
  if (params.keyword && params.keyword.trim().length > 0) {
    where.OR = [
      { reqCode: { contains: params.keyword, mode: 'insensitive' } },
      { title: { contains: params.keyword, mode: 'insensitive' } },
    ];
  }

  // 构建排序条件（US1.3 新增）
  const sortBy = params.sortBy ?? 'createdAt';     // 默认按创建时间排序
  const sortOrder = params.sortOrder ?? 'desc';     // 默认降序
  const orderBy: any = { [sortBy]: sortOrder };

  // 并行查询：数据 + 总数（相同 where 条件）
  const [list, total] = await Promise.all([
    prisma.requirement.findMany({
      where,
      skip: (page - 1) * pageSize,   // 偏移量
      take: pageSize,                 // 每页条数
      orderBy,                        // 动态排序
      select: {
        id: true,
        reqCode: true,
        title: true,
        status: true,
        subStatus: true,              // US1.3 新增：子状态字段
        priority: true,
        storyPoints: true,
        createdAt: true,
        updatedAt: true,
        system: { select: { id: true, name: true } },
        ba: { select: { id: true, displayName: true } },
        creator: { select: { id: true, displayName: true } },
      },
    }),
    prisma.requirement.count({ where }), // 总数（相同条件）
  ]);

  // 转换为 ISO 8601 字符串格式（Prisma 枚举 → shared 枚举需显式转换）
  const formattedList: RequirementListItem[] = list.map((item) => ({
    ...item,
    status: item.status as unknown as RequirementListItem['status'],
    subStatus: (item.subStatus ?? null) as RequirementListItem['subStatus'],
    priority: item.priority as unknown as RequirementListItem['priority'],
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  return { list: formattedList, total, page, pageSize };
}

// ========== 子状态变更（已纳版需求推进/回退） ==========

/**
 * 子状态变更：变更已纳版需求的子状态（推进或回退）
 * 
 * US1.10 子状态变更功能：
 * - 前置条件：主状态为 ONBOARDED（已纳版），子状态不为 FROZEN（封板）
 * - 权限：PROJECT_MGR / TECH_MGR / TEST_MGR（中间件层已校验 CHANGE_SUB_STATUS）
 * - 目标子状态不能等于当前子状态
 * - 变更说明可选，最多 500 字
 * - 使用乐观锁防止并发冲突
 * - 状态变更和审计日志在同一事务中
 * 
 * @param id - 需求 ID
 * @param operatorId - 操作人 ID（从 JWT 提取）
 * @param subStatus - 目标子状态（DEV_IN_PROGRESS / SIT_TESTING / UAT_TESTING / FROZEN）
 * @param comment - 变更说明（可选，最多 500 字）
 * @returns 更新后的需求详情（含子状态和审计日志）
 * @throws REQUIREMENT_NOT_FOUND - 需求不存在
 * @throws REQUIREMENT_NOT_IN_TRAIN - 非已纳版状态
 * @throws SUB_STATUS_CANNOT_CHANGE - 封板状态不可变更
 * @throws SUB_STATUS_INVALID - 无效的子状态值
 * @throws SUB_STATUS_SAME_AS_CURRENT - 目标子状态等于当前子状态
 * @throws BAD_REQUEST - 变更说明超长
 * @throws REQUIREMENT_VERSION_CONFLICT - 乐观锁冲突
 */
export async function changeSubStatus(
  id: string,
  operatorId: string,
  subStatus: ReqSubStatus,
  comment?: string,
): Promise<RequirementDetail> {
  // 1. 查询需求存在性（含版本号用于乐观锁）
  const existing = await prisma.requirement.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      subStatus: true,
      version: true,
    },
  });

  // 需求不存在
  if (!existing) {
    throw errors.requirementNotFound();
  }

  // 2. 校验主状态必须为已纳版（ONBOARDED）
  if (existing.status !== 'ONBOARDED') {
    throw errors.requirementNotInTrain('仅已纳版需求可变更子状态');
  }

  // 3. 校验子状态不为封板（FROZEN 是终态，不可变更）
  if (existing.subStatus === 'FROZEN') {
    throw errors.subStatusCannotChange('封板状态不可变更');
  }

  // 4. 校验目标子状态有效（必须是 ReqSubStatus 枚举值之一）
  const validSubStatuses = [ReqSubStatus.DEV_IN_PROGRESS, ReqSubStatus.SIT_TESTING, ReqSubStatus.UAT_TESTING, ReqSubStatus.FROZEN];
  if (!validSubStatuses.includes(subStatus as ReqSubStatus)) {
    throw errors.subStatusInvalid('无效的子状态值');
  }

  // 5. 校验不能选择当前子状态
  if (existing.subStatus === subStatus) {
    throw errors.subStatusSameAsCurrent('不能选择当前状态');
  }

  // 6. 校验变更说明长度（可选，最多 500 字）
  if (comment && comment.length > 500) {
    throw errors.badRequest('变更说明最多 500 字');
  }

  // 7. 事务内：乐观锁更新子状态 + 创建审计日志
  return prisma.$transaction(async (tx) => {
    // 7a. 带版本号条件的更新（乐观锁）
    const result = await tx.requirement.updateMany({
      where: { id, version: existing.version },
      data: {
        subStatus: subStatus,
        version: { increment: 1 },
      },
    });

    // 7b. 更新影响行数为 0 → 版本冲突
    if (result.count === 0) {
      const current = await tx.requirement.findUnique({ where: { id } });
      if (!current) {
        throw errors.requirementNotFound();
      }
      throw errors.requirementVersionConflict();
    }

    // 7c. 创建状态变更日志（审计记录，含变更前后子状态）
    await tx.statusLog.create({
      data: {
        requirementId: id,
        operationType: 'CHANGE_SUB_STATUS' as any,
        fromStatus: existing.status,
        toStatus: existing.status, // 主状态不变
        fromSubStatus: existing.subStatus,
        toSubStatus: subStatus,
        operatorId,
        reason: comment?.trim() || undefined,
      },
    });

    // 7d. 重新查询更新后的需求（含关联数据）
    const updated = await tx.requirement.findUnique({
      where: { id },
      include: {
        system: true,
        ba: true,
        pm: true,
        creator: true,
        trainSchedule: { include: { train: true } },
      },
    });

    return buildRequirementDetail(updated!, tx);
  });
}

// ========== API-01: 需求聚合统计 ==========
export async function getRequirementStats(params: {
  systemIds?: string[];
  scheduleId?: string;
  trainId?: string;
}): Promise<RequirementStatsResponse> {
  const where: Prisma.RequirementWhereInput = {};
  if (params.systemIds?.length) {
    where.systemId = { in: params.systemIds };
  }
  if (params.scheduleId) {
    where.scheduleId = params.scheduleId;
  }
  if (params.trainId) {
    where.trainSchedule = { trainId: params.trainId };
  }

  const byStatus = await prisma.requirement.groupBy({
    by: ['status'],
    where,
    _count: true,
  });
  const bySubStatus = await prisma.requirement.groupBy({
    by: ['subStatus'],
    where: { ...where, status: ReqStatus.ONBOARDED },
    _count: true,
  });
  const byPriority = await prisma.requirement.groupBy({
    by: ['priority'],
    where,
    _count: true,
  });
  const total = await prisma.requirement.count({ where });
  const activeCount = await prisma.requirement.count({
    where: {
      ...where,
      status: { notIn: [ReqStatus.CANCELLED, ReqStatus.RELEASED] },
    },
  });

  // ========== 变更率统计（纳版后）==========
  // 仅当有班次筛选时计算变更率
  let changeStats = undefined;
  if (params.scheduleId) {
    // 查找该班次已纳版的需求
    const onboardedRequirements = await prisma.requirement.findMany({
      where: { scheduleId: params.scheduleId, status: ReqStatus.ONBOARDED },
      select: { id: true },
    });
    const onboardedIds = onboardedRequirements.map(r => r.id);
    const totalOnboarded = onboardedIds.length;

    if (totalOnboarded > 0) {
      // 查找有变更记录的需求（状态变更日志中有超过1条记录，说明有过变更）
      const changedRequirements = await prisma.statusLog.groupBy({
        by: ['requirementId'],
        where: { requirementId: { in: onboardedIds } },
        _count: true,
        having: { requirementId: { _count: { gt: 1 } } }, // 超过1条记录说明有变更
      });
      const changedCount = changedRequirements.length;

      // 查找有紧急变更的需求
      const emergencyChanges = await prisma.emergencyChange.findMany({
        where: { requirementId: { in: onboardedIds } },
        select: { requirementId: true },
        distinct: ['requirementId'],
      });
      const emergencyChangeCount = emergencyChanges.length;

      // 计算比例（百分比）
      const changeRate = Math.round((changedCount / totalOnboarded) * 100);
      const emergencyChangeRate = Math.round((emergencyChangeCount / totalOnboarded) * 100);

      changeStats = {
        totalOnboarded,
        changedCount,
        emergencyChangeCount,
        changeRate,
        emergencyChangeRate,
      };
    } else {
      // 无已纳版需求时返回初始值
      changeStats = {
        totalOnboarded: 0,
        changedCount: 0,
        emergencyChangeCount: 0,
        changeRate: 0,
        emergencyChangeRate: 0,
      };
    }
  }

  return {
    byStatus: Object.fromEntries(byStatus.map(item => [item.status, item._count])),
    bySubStatus: Object.fromEntries(bySubStatus.filter(item => item.subStatus).map(item => [item.subStatus, item._count])),
    byPriority: Object.fromEntries(byPriority.map(item => [item.priority, item._count])),
    total,
    activeCount,
    changeStats,
  };
}

// ========== API-02: 紧急变更列表 ==========
export async function getEmergencyChanges(params: {
  status?: ApprovalStatus;
  approverId?: string;
}): Promise<PaginatedResponse<EmergencyChangeItem>> {
  const where: Prisma.EmergencyChangeWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.approverId) where.approverId = params.approverId;

  const [list, total] = await Promise.all([
    prisma.emergencyChange.findMany({
      where,
      include: {
        requirement: {
          select: { reqCode: true, title: true, system: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.emergencyChange.count({ where }),
  ]);

  return {
    list: list.map(item => ({
      id: item.id,
      requirementId: item.requirementId,
      reqCode: item.requirement.reqCode,
      title: item.requirement.title,
      system: item.requirement.system,
      urgency: item.urgency,
      reason: item.reason,
      status: item.status,
      approvalStep: item.approvalStep,
      approverId: item.approverId,
      createdAt: item.createdAt.toISOString(),
    })),
    total,
    page: 1,
    pageSize: list.length,
  };
}

// ========== API-03: 用户待办聚合 ==========
export async function getMyTodos(user: {
  id: string;
  role: Role;
  systemIds?: string[];
}): Promise<MyTodosResponse> {
  const role = user.role;
  // systemIds 如果未提供，默认为空数组（用于 PROJECT_MGR 等无系统限制的角色）
  const systemIds = user.systemIds || [];

  switch (role) {
    case Role.BA: {
      const pendingReviewRejected = await prisma.requirement.findMany({
        where: { status: ReqStatus.REJECTED, systemId: { in: systemIds } },
        include: { 
          system: { select: { id: true, name: true } },
          ba: { select: { id: true, displayName: true } },
          creator: { select: { id: true, displayName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }).then(reqs => reqs.map(item => ({
        id: item.id,
        reqCode: item.reqCode,
        title: item.title,
        status: item.status as unknown as RequirementListItem['status'],
        subStatus: (item.subStatus ?? null) as RequirementListItem['subStatus'],
        priority: item.priority as unknown as RequirementListItem['priority'],
        storyPoints: item.storyPoints,
        system: item.system,
        ba: item.ba,
        creator: item.creator,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })));

      const changedDraftIds = await prisma.statusLog.findMany({
        where: {
          operationType: OperationType.CHANGE_REQUIREMENT,
          requirement: { status: ReqStatus.DRAFT, systemId: { in: systemIds } },
        },
        select: { requirementId: true },
        distinct: ['requirementId'],
      });
      const changeApprovedNeedsResubmit = await prisma.requirement.findMany({
        where: { id: { in: changedDraftIds.map(l => l.requirementId) } },
        include: { 
          system: { select: { id: true, name: true } },
          ba: { select: { id: true, displayName: true } },
          creator: { select: { id: true, displayName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }).then(reqs => reqs.map(item => ({
        id: item.id,
        reqCode: item.reqCode,
        title: item.title,
        status: item.status as unknown as RequirementListItem['status'],
        subStatus: (item.subStatus ?? null) as RequirementListItem['subStatus'],
        priority: item.priority as unknown as RequirementListItem['priority'],
        storyPoints: item.storyPoints,
        system: item.system,
        ba: item.ba,
        creator: item.creator,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })));

      return { pendingReviewRejected, changeApprovedNeedsResubmit };
    }
    case Role.PM: {
      const pendingReviewList = await prisma.requirement.findMany({
        where: { status: ReqStatus.PENDING_REVIEW },
        include: { 
          system: { select: { id: true, name: true } },
          ba: { select: { id: true, displayName: true } },
          creator: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).then(reqs => reqs.map(item => ({
        id: item.id,
        reqCode: item.reqCode,
        title: item.title,
        status: item.status as unknown as RequirementListItem['status'],
        subStatus: (item.subStatus ?? null) as RequirementListItem['subStatus'],
        priority: item.priority as unknown as RequirementListItem['priority'],
        storyPoints: item.storyPoints,
        system: item.system,
        ba: item.ba,
        creator: item.creator,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })));

      return { pendingReviewList };
    }
    case Role.PROJECT_MGR: {
      const pendingReviewList = await prisma.requirement.findMany({
        where: { status: ReqStatus.PENDING_REVIEW },
        include: { 
          system: { select: { id: true, name: true } },
          ba: { select: { id: true, displayName: true } },
          creator: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).then(reqs => reqs.map(item => ({
        id: item.id,
        reqCode: item.reqCode,
        title: item.title,
        status: item.status as unknown as RequirementListItem['status'],
        subStatus: (item.subStatus ?? null) as RequirementListItem['subStatus'],
        priority: item.priority as unknown as RequirementListItem['priority'],
        storyPoints: item.storyPoints,
        system: item.system,
        ba: item.ba,
        creator: item.creator,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })));

      const emergencyPendingApproval = await prisma.emergencyChange.findMany({
        where: { status: ApprovalStatus.PENDING },
        include: {
          requirement: { select: { reqCode: true, title: true, system: { select: { id: true, name: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).then(list => list.map(item => ({
        id: item.id,
        requirementId: item.requirementId,
        reqCode: item.requirement.reqCode,
        title: item.requirement.title,
        system: item.requirement.system,
        urgency: item.urgency,
        reason: item.reason,
        status: item.status,
        approvalStep: item.approvalStep,
        approverId: item.approverId,
        createdAt: item.createdAt.toISOString(),
      })));

      return { pendingReviewList, emergencyPendingApproval };
    }
    case Role.TRAIN_ADMIN: {
      const pendingOnboard = await prisma.requirement.findMany({
        where: { status: ReqStatus.READY },
        include: { 
          system: { select: { id: true, name: true } },
          ba: { select: { id: true, displayName: true } },
          creator: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).then(reqs => reqs.map(item => ({
        id: item.id,
        reqCode: item.reqCode,
        title: item.title,
        status: item.status as unknown as RequirementListItem['status'],
        subStatus: (item.subStatus ?? null) as RequirementListItem['subStatus'],
        priority: item.priority as unknown as RequirementListItem['priority'],
        storyPoints: item.storyPoints,
        system: item.system,
        ba: item.ba,
        creator: item.creator,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })));

      const pendingRelease = await prisma.requirement.findMany({
        where: {
          status: ReqStatus.ONBOARDED,
          subStatus: { in: [ReqSubStatus.SIT_TESTING, ReqSubStatus.UAT_TESTING] },
        },
        include: { 
          system: { select: { id: true, name: true } },
          ba: { select: { id: true, displayName: true } },
          creator: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).then(reqs => reqs.map(item => ({
        id: item.id,
        reqCode: item.reqCode,
        title: item.title,
        status: item.status as unknown as RequirementListItem['status'],
        subStatus: (item.subStatus ?? null) as RequirementListItem['subStatus'],
        priority: item.priority as unknown as RequirementListItem['priority'],
        storyPoints: item.storyPoints,
        system: item.system,
        ba: item.ba,
        creator: item.creator,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })));

      return { pendingOnboard, pendingRelease };
    }
    case Role.TEST_MGR: {
      // 待审批的紧急变更（测试经理可审批紧急变更）
      const emergencyPendingApproval = await prisma.emergencyChange.findMany({
        where: { status: ApprovalStatus.PENDING },
        include: {
          requirement: { select: { reqCode: true, title: true, system: { select: { id: true, name: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).then(list => list.map(item => ({
        id: item.id,
        requirementId: item.requirementId,
        reqCode: item.requirement.reqCode,
        title: item.requirement.title,
        system: item.requirement.system,
        urgency: item.urgency,
        reason: item.reason,
        status: item.status,
        approvalStep: item.approvalStep,
        approverId: item.approverId,
        createdAt: item.createdAt.toISOString(),
      })));

      // 待 SIT 测试通过的需求（测试经理可操作 PASS_SIT）
      const pendingSitPass = await prisma.requirement.findMany({
        where: {
          status: ReqStatus.ONBOARDED,
          subStatus: ReqSubStatus.SIT_TESTING,
        },
        include: { 
          system: { select: { id: true, name: true } },
          ba: { select: { id: true, displayName: true } },
          creator: { select: { id: true, displayName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }).then(reqs => reqs.map(item => ({
        id: item.id,
        reqCode: item.reqCode,
        title: item.title,
        status: item.status as unknown as RequirementListItem['status'],
        subStatus: (item.subStatus ?? null) as RequirementListItem['subStatus'],
        priority: item.priority as unknown as RequirementListItem['priority'],
        storyPoints: item.storyPoints,
        system: item.system,
        ba: item.ba,
        creator: item.creator,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })));

      return { emergencyPendingApproval, pendingSitPass };
    }
    case Role.TECH_MGR: {
      // 待评审需求（技术经理可参与评审）
      const pendingReviewList = await prisma.requirement.findMany({
        where: { status: ReqStatus.PENDING_REVIEW },
        include: { 
          system: { select: { id: true, name: true } },
          ba: { select: { id: true, displayName: true } },
          creator: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).then(reqs => reqs.map(item => ({
        id: item.id,
        reqCode: item.reqCode,
        title: item.title,
        status: item.status as unknown as RequirementListItem['status'],
        subStatus: (item.subStatus ?? null) as RequirementListItem['subStatus'],
        priority: item.priority as unknown as RequirementListItem['priority'],
        storyPoints: item.storyPoints,
        system: item.system,
        ba: item.ba,
        creator: item.creator,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })));

      // 待开发完成的需求（技术经理可操作 COMPLETE_DEV）
      const pendingDevComplete = await prisma.requirement.findMany({
        where: {
          status: ReqStatus.ONBOARDED,
          subStatus: ReqSubStatus.DEV_IN_PROGRESS,
        },
        include: { 
          system: { select: { id: true, name: true } },
          ba: { select: { id: true, displayName: true } },
          creator: { select: { id: true, displayName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }).then(reqs => reqs.map(item => ({
        id: item.id,
        reqCode: item.reqCode,
        title: item.title,
        status: item.status as unknown as RequirementListItem['status'],
        subStatus: (item.subStatus ?? null) as RequirementListItem['subStatus'],
        priority: item.priority as unknown as RequirementListItem['priority'],
        storyPoints: item.storyPoints,
        system: item.system,
        ba: item.ba,
        creator: item.creator,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })));

      return { pendingReviewList, pendingDevComplete };
    }
    default:
      return {};
  }
}

// ========== 需求变更记录列表（T5） ==========
/**
 * 查询指定需求的变更记录列表，按创建时间倒序
 * 
 * @param requirementId - 需求 ID
 * @returns list: 变更记录数组，total: 总数
 */
export async function getChangeRequests(requirementId: string) {
  const [list, total] = await Promise.all([
    prisma.changeRequest.findMany({
      where: { requirementId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        changeCode: true,
        changeSummary: true,
        workloadImpact: true,
        scheduleImpact: true,
        riskLevel: true,
        riskDescription: true,
        status: true,
        source: true,
        createdAt: true,
        confirmedAt: true,
      },
    }),
    prisma.changeRequest.count({ where: { requirementId } }),
  ]);

  return {
    list: list.map((cr) => ({
      ...cr,
      createdAt: cr.createdAt.toISOString(),
      confirmedAt: cr.confirmedAt?.toISOString() || null,
    })),
    total,
  };
}
