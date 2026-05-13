// ========== 系统模块 service 层 ==========
// 提供系统列表查询、系统成员查询
// 文件名：service.ts — 业务逻辑层，供路由层（index.ts）调用
import { prisma } from '../../prisma/index.js';        // Prisma 客户端单例
import { errors } from '../../common/errors/index.js';  // 业务错误工厂

// ========== 系统列表项 ==========
/** 系统列表查询返回的单条记录（不含 createdAt/updatedAt，减少传输量） */
export interface SystemItem {
  id: string;           // 系统 ID（其他表的外键引用）
  name: string;         // 系统名称（如"普惠前端系统"）
  description: string | null; // 系统描述（可为 null）
}

// ========== 系统用户项 ==========
/** 系统成员查询返回的单条记录（供前端下拉框使用） */
export interface SystemUserItem {
  id: string;           // 用户 ID（创建需求时作为 baId/pmId 提交）
  displayName: string;   // 用户显示名（如"张大伟"）
  role: string;         // 成员角色（BA/PM/PROJECT_MGR/TECH_MGR/TEST_MGR/DEV/QA）
}

/**
 * 获取系统列表（支持关键词模糊搜索）
 * 
 * 不传 keyword 时返回全量（兼容旧调用），传 keyword 时按系统名称模糊匹配。
 * 前端「归属系统」下拉框改为远程搜索模式，用户输入关键词后才发起请求，
 * 避免系统数量多时一次性加载全部数据。
 * 
 * @param keyword - 可选搜索关键词，按系统名称模糊匹配（ILIKE）
 * @returns 系统列表数组（最多 50 条，防止下拉框过长）
 */
export async function listSystems(keyword?: string): Promise<SystemItem[]> {
  return prisma.system.findMany({
    where: keyword
      ? { name: { contains: keyword, mode: 'insensitive' } } // 模糊搜索：名称包含关键词（不区分大小写）
      : undefined,                                             // 无关键词 → 全量
    select: {
      id: true,          // 系统 ID
      name: true,        // 系统名称
      description: true, // 系统描述（可为 null）
    },
    orderBy: { name: 'asc' }, // 按名称升序排列
    take: 50,                  // 最多返回 50 条，防止下拉框过长
  });
}

/**
 * 获取指定系统的所有成员
 * 
 * 通过 SystemMember 中间表查询，返回成员用户信息 + 角色。
 * 前端根据所选系统动态拉取成员，按 role 过滤后填入 BA/PM 下拉框。
 * 
 * @param systemId - 系统 ID
 * @returns 该系统下所有成员的列表
 * @throws AppError 404 - 系统不存在
 */
export async function getSystemUsers(systemId: string): Promise<SystemUserItem[]> {
  // 1. 先校验系统存在（不存在 → 404）
  const system = await prisma.system.findUnique({ where: { id: systemId } });
  if (!system) {
    throw errors.notFound('系统');
  }

  // 2. 通过 SystemMember 中间表查询所有成员
  const members = await prisma.systemMember.findMany({
    where: { systemId },           // 按系统 ID 过滤
    select: {
      user: {                      // 关联查询用户表
        select: {
          id: true,                // 用户 ID
          displayName: true,      // 显示名（如"张大伟"）
        },
      },
      role: true,                 // 成员角色（SystemRole 枚举）
    },
  });

  // 3. 格式化为前端所需的 { id, displayName, role } 格式
  return members.map((m) => ({
    id: m.user.id,               // 用户 ID
    displayName: m.user.displayName, // 用户显示名
    role: m.role,                 // 成员角色（BA/PM/...）
  }));
}
