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
  DependencyItem,             // 依赖项摘要类型（用于依赖列表展示）
  OperationType,              // 操作类型枚举（用于 StatusLog 审计）
} from '@release-train/shared';

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
          throw errors.conflict('需求编号生成冲突，请重试');
        }
        continue; // 继续下一轮重试
      }
      return reqCode; // 成功生成唯一编号
    } catch (error) {
      // 非业务错误的异常直接透出
      if (attempt === maxRetries - 1) {
        throw errors.conflict('需求编号生成冲突，请重试');
      }
    }
  }

  // 兜底：重试耗尽
  throw errors.conflict('需求编号生成冲突，请重试');
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
  const dependencies: DependencyItem[] = deps.map((d) => ({
    id: d.dependency.id,                                                         // 需求 ID
    reqCode: d.dependency.reqCode,                                              // 需求编号
    title: d.dependency.title,                                                  // 需求标题
    status: d.dependency.status as unknown as DependencyItem['status'],         // 主状态（类型断言解决 Prisma 枚举差异）
    subStatus: (d.dependency.subStatus ?? undefined) as DependencyItem['subStatus'], // 子状态（null → undefined）
  }));

  // 3. 返回完整的 RequirementDetail（含关联数据展开和时间格式化）
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
    train: requirement.train
      ? { id: requirement.train.id, name: requirement.train.name } // 所属火车摘要（已纳版时有值）
      : undefined,                                                   // null → undefined
    reqType: requirement.reqType ?? undefined,             // 需求类型（null → undefined）
    sourceChannel: requirement.sourceChannel ?? undefined,  // 来源渠道（null → undefined）
    version: requirement.version,                           // 乐观锁版本号
    dependencies,                                           // 前置依赖列表（步骤 2 已组装）
    createdAt: requirement.createdAt.toISOString(),         // 创建时间 → ISO 8601 字符串
    updatedAt: requirement.updatedAt.toISOString(),         // 更新时间 → ISO 8601 字符串
    proposedAt: requirement.proposedAt.toISOString(),       // 提出时间 → ISO 8601 字符串
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
    throw errors.badRequest('需求描述不能为空');
  }

  // 校验过滤后描述不超长（50000 字上限）
  if (filteredDescription.length > 50000) {
    throw errors.badRequest('需求描述不能超过50000字');
  }

  // 2. 校验归属系统存在性（先判空，避免无效 DB 查询）
  if (!data.systemId) {
    throw errors.badRequest('归属系统不能为空');
  }
  const system = await prisma.system.findUnique({ where: { id: data.systemId } });
  if (!system) {
    throw errors.badRequest('归属系统不存在');
  }

  // 3. 校验业务归属人存在且角色为 BA（先判空，避免无效 DB 查询）
  if (!data.baId) {
    throw errors.badRequest('业务归属人不能为空');
  }
  const ba = await prisma.user.findFirst({
    where: { id: data.baId, role: 'BA' }, // 限定角色为 BA
  });
  if (!ba) {
    throw errors.badRequest('业务归属人不存在');
  }

  // 4. 如果指定了产品经理，校验其存在且角色为 PM
  if (data.pmId) {
    const pm = await prisma.user.findFirst({
      where: { id: data.pmId, role: 'PM' }, // 限定角色为 PM
    });
    if (!pm) {
      throw errors.badRequest('产品经理不存在');
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
      throw errors.badRequest(`依赖需求不存在：${missingIds.join(', ')}`);
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
        train: true,                         // 所属火车（初始为 null）
      },
    });

    // 6c. 如果指定了依赖，逐条创建依赖关系（含循环检测）
    if (data.dependencyIds && data.dependencyIds.length > 0) {
      for (const depId of data.dependencyIds) {
        // 循环依赖检测：添加 A → depId 是否会形成环？
        const hasCircular = await hasCircularDependency(requirement.id, depId, tx);
        if (hasCircular) {
          throw errors.badRequest('存在循环依赖，无法添加'); // 阻断保存
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
      train: true,    // 所属火车（初始为 null，已纳版时有值）
    },
  });

  // 需求不存在 → 404
  if (!requirement) {
    throw errors.notFound('需求');
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
    include: { system: true, ba: true, pm: true, creator: true, train: true },
  });

  // 需求不存在
  if (!existing) {
    throw errors.notFound('需求');
  }

  // 2. 仅草稿状态可编辑
  if (existing.status !== 'DRAFT') {
    throw errors.badRequest('仅草稿状态可编辑');
  }

  // 3. 乐观锁校验：version 不匹配说明已被其他人修改
  if (existing.version !== data.version) {
    throw errors.conflict('需求已被其他人修改，请刷新后重试');
  }

  // 4. 如果修改了描述 → XSS 过滤后再做长度校验
  if (data.description) {
    const filtered = sanitizeDescription(data.description);
    if (filtered.length === 0) {
      throw errors.badRequest('需求描述不能为空');
    }
    if (filtered.length > 50000) {
      throw errors.badRequest('需求描述不能超过50000字');
    }
    data.description = filtered; // 替换为过滤后的安全文本
  }

  // 5. 如果修改了归属系统 → 校验新系统存在
  if (data.systemId) {
    const system = await prisma.system.findUnique({ where: { id: data.systemId } });
    if (!system) {
      throw errors.badRequest('归属系统不存在');
    }
  }

  // 6. 如果修改了 BA → 校验新 BA 存在且角色为 BA
  if (data.baId) {
    const ba = await prisma.user.findFirst({
      where: { id: data.baId, role: 'BA' },
    });
    if (!ba) {
      throw errors.badRequest('业务归属人不存在');
    }
  }

  // 7. 如果修改了 PM → 校验新 PM 存在且角色为 PM
  if (data.pmId) {
    const pm = await prisma.user.findFirst({
      where: { id: data.pmId, role: 'PM' },
    });
    if (!pm) {
      throw errors.badRequest('产品经理不存在');
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
        throw errors.badRequest(`依赖需求不存在：${missingIds.join(', ')}`);
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
        throw errors.notFound('需求'); // 需求已被删除
      }
      // 版本号不匹配 → 乐观锁冲突
      throw errors.conflict('需求已被其他人修改，请刷新后重试');
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
          throw errors.badRequest('存在循环依赖，无法添加');
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
        train: true,
      },
    });

    // 返回更新后的完整详情
    return buildRequirementDetail(updated!, tx);
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
export async function cancelRequirement(
  id: string,
  operatorId: string,
): Promise<{ success: true }> {
  // 1. 查询需求存在性
  const existing = await prisma.requirement.findUnique({ where: { id } });

  if (!existing) {
    throw errors.notFound('需求');
  }

  // 2. US1.1 仅支持草稿取消
  if (existing.status !== 'DRAFT') {
    throw errors.badRequest('US1.1仅支持草稿取消，非草稿取消请使用取消需求功能');
  }

  // 3. 事务内更新状态 + 创建日志
  return prisma.$transaction(async (tx) => {
    // 更新状态为 CANCELLED（终态，不可恢复）
    await tx.requirement.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // 创建状态变更日志
    await tx.statusLog.create({
      data: {
        requirementId: id,                   // 需求 ID
        operationType: OperationType.CANCEL, // 操作类型：取消
        fromStatus: 'DRAFT',                 // 变更前状态：草稿
        toStatus: 'CANCELLED',               // 变更后状态：已取消
        operatorId,                           // 操作人 ID
      },
    });

    // 返回成功标记
    return { success: true as const };
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
