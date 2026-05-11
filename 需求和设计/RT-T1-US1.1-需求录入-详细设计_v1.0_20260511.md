# US1.1 需求录入 - 详细设计

**版本号**: v1.1  
**日期**: 2026-05-11  
**设计状态**: 🟡 待审核  
**来源**: [RT-T1-需求池管理-设计方案_20260511.md](./RT-T1-需求池管理-设计方案_20260511.md) v1.1  
**PRD**: [RT-Task1-需求池管理-PRD.md](./RT-Task1-需求池管理-PRD.md) §2.3.1  

### 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-11 | 初版 |
| v1.1 | 2026-05-11 | Grill审核20项决策：去掉软删除全走取消流程、去掉deletedAt字段、去掉DELETE API改为cancel API、去掉依赖子接口只保留全量替换、草稿编辑权限放宽、编号生成自动重试、循环依赖按需查询、双重XSS过滤、systemId可改、baId联动systemId、双按钮提交、description长度校验等 |

---

## 一、前置：Schema 对齐

### 1.1 现有 Schema 与设计方案差异

现有 Prisma Schema（Task 0）与设计方案 v1.1 存在以下差异，需在编码前完成对齐：

| 差异项 | 现有 Schema | 设计方案 v1.1 | 变更类型 |
|--------|------------|---------------|----------|
| 优先级 | `priority Int @default(3)` | `priority Priority`（枚举 P0/P1/P2/P3） | 字段类型变更 |
| BA归属人 | `baOwnerId` / `baOwner` | `baId` / `ba` | 字段重命名 |
| 需求编号 | 无 | `reqCode String @unique` | 新增字段 |
| 乐观锁 | 无 | `version Int @default(1)` | 新增字段 |
| 需求类型 | 无 | `reqType ReqType?` | 新增字段+枚举 |
| 来源渠道 | 无 | `sourceChannel SourceChannel?` | 新增字段+枚举 |
| 提出时间 | 无 | `proposedAt DateTime @default(now())` | 新增字段 |
| 依赖关系 | `dependencies Json?` | `RequirementDependency` 独立模型 | 结构变更 |
| 状态日志操作类型 | 无 | `operationType OperationType` | 新增字段+枚举 |
| 索引 | 5个 | 8个 | 补充索引 |

> **v1.1 变更说明**：去掉软删除（deletedAt），全走取消流程。草稿取消后状态变为 CANCELLED，不再需要 deletedAt 字段。

### 1.2 Schema 变更 SQL（迁移脚本）

```prisma
// ========== 新增枚举 ==========
// 优先级枚举：与PRD权限矩阵对齐，P0最高、P3最低
enum Priority {
  P0   // 最高优先级（线上故障/业务阻断）
  P1   // 高优先级（核心功能/重要需求）
  P2   // 中优先级（常规需求）
  P3   // 低优先级（优化/体验类）
}

// 需求类型枚举：按需求性质分类
enum ReqType {
  NEW_FEATURE   // 新功能：全新开发的业务功能
  OPTIMIZATION  // 优化：已有功能的改进提升
  BUG           // 缺陷：需要修复的问题
}

// 来源渠道枚举：按需求来源分类
enum SourceChannel {
  BUSINESS      // 业务提出：业务方直接提出
  USER_FEEDBACK // 用户反馈：终端用户反馈
  DATA_ANALYSIS // 数据分析：基于数据洞察提出
  COMPETITOR    // 竞品分析：参考竞品功能提出
}

// 操作类型枚举：覆盖所有状态变更和业务操作，用于审计日志
enum OperationType {
  CREATE                // 创建需求
  UPDATE                // 编辑需求（草稿状态）
  SUBMIT_REVIEW         // 发起评审
  REVIEW_PASS           // 评审通过
  REVIEW_REJECT         // 评审拒绝
  RE_EDIT               // 重新编辑（已拒绝→草稿）
  CANCEL                // 取消需求
  CHANGE_REQUIREMENT    // 需求变更（已就绪/已纳版非封板→草稿）
  EMERGENCY_CHANGE      // 紧急变更（封板→草稿，需审批）
  DEV_COMPLETE          // 开发完成（开发中→SIT测试）
  SIT_PASS              // SIT通过（SIT测试→UAT测试）
  UAT_PASS              // UAT通过（UAT测试→封板）
  BATCH_SUBMIT_REVIEW   // 批量发起评审
  BATCH_CANCEL          // 批量取消
  BATCH_CHANGE_PRIORITY // 批量修改优先级
  ONBOARD               // 纳版（Task 2）
  REMOVE                // 从火车移除（Task 2）
  RELEASE               // 投产（Task 2）
  ROLLBACK              // 回滚（Task 2）
}

// ========== Requirement 模型变更 ==========
// 需求主表：存储需求核心字段、状态、关联关系
model Requirement {
  id              String        @id @default(cuid())       // 需求ID，自动生成的CUID
  reqCode         String        @unique                      // 需求编号，格式REQ-{年份}-{4位序号}，全局唯一
  title           String                                    // 需求标题，简洁描述核心内容
  description     String        @db.Text                     // 需求描述，HTML富文本（存储时已做XSS过滤）
  systemId        String                                    // 归属系统ID，必填，系统有关联需求时阻止删除
  priority        Priority                                    // 优先级 P0/P1/P2/P3
  storyPoints     Int                                         // 工作量点数 1-100，纳版容量计算依据
  baId            String                                    // 业务归属人ID，需求的责任BA
  pmId            String?                                   // 产品经理ID，评审通过时指定（可选）
  creatorId       String                                    // 创建人ID，实际创建该需求的用户
  status          ReqStatus     @default(DRAFT)             // 主状态，需求生命周期当前阶段
  subStatus       ReqSubStatus?                              // 子状态，仅已纳版状态有值
  trainId         String?                                   // 所属版本火车ID，已纳版时关联
  version         Int           @default(1)                  // 乐观锁版本号，每次更新自增，防止并发冲突
  reqType         ReqType?                                   // 需求类型：新功能/优化/缺陷（可选）
  sourceChannel   SourceChannel?                             // 来源渠道：业务提出/用户反馈等（可选）
  proposedAt      DateTime      @default(now())              // 提出时间，需求创建时自动填充
  createdAt       DateTime      @default(now())              // 创建时间
  updatedAt       DateTime      @updatedAt                   // 更新时间

  // 关联关系
  system          System        @relation(fields: [systemId], references: [id])             // 归属系统
  ba              User          @relation("BA", fields: [baId], references: [id])           // 业务归属人
  pm              User?         @relation("PM", fields: [pmId], references: [id])           // 产品经理
  creator         User          @relation("Creator", fields: [creatorId], references: [id]) // 创建人
  train           Train?        @relation(fields: [trainId], references: [id])              // 所属火车

  // 依赖关系（双向：作为依赖方和被依赖方）
  dependants      RequirementDependency[] @relation("DependantRequirement")  // 本需求依赖的其他需求
  dependencies    RequirementDependency[] @relation("DependencyRequirement") // 依赖本需求的其他需求

  // 审计与变更
  statusLogs      StatusLog[]                               // 状态变更日志，操作审计
  emergencyChange EmergencyChange?                          // 紧急变更申请（一对一）

  // 业务查询索引
  @@index([status, subStatus])   // 按主状态+子状态筛选（看板分组）
  @@index([systemId])            // 按系统筛选需求列表
  @@index([baId])                // BA查看自己的需求
  @@index([trainId])             // 按火车筛选（Task 2启用）
  @@index([priority])            // 按优先级排序
}

// ========== 新增：需求依赖关系表 ==========
// 存储需求间的前置依赖关系，支持跨系统依赖
// 关系语义：dependant 依赖 dependency（A依赖B，A是dependant，B是dependency）
model RequirementDependency {
  id            String      @id @default(cuid())         // 依赖关系ID
  dependantId   String                                   // 依赖方需求ID（需要等待的需求）
  dependencyId  String                                   // 被依赖方需求ID（被等待的需求）
  createdAt     DateTime    @default(now())              // 创建时间

  // 关联关系：级联删除，需求删除时自动清理依赖
  dependant     Requirement @relation("DependantRequirement", fields: [dependantId], references: [id], onDelete: Cascade)
  dependency    Requirement @relation("DependencyRequirement", fields: [dependencyId], references: [id], onDelete: Cascade)

  // 同一对依赖关系只能存在一条记录
  @@unique([dependantId, dependencyId])
  @@index([dependantId])   // 查询某需求的所有依赖
  @@index([dependencyId])  // 查询被哪些需求依赖
}

// ========== StatusLog 模型变更 ==========
// 状态变更日志表：记录每次状态变更的完整上下文，用于操作审计
model StatusLog {
  id              String        @id @default(cuid())         // 日志ID
  requirementId   String                                     // 关联需求ID
  fromStatus      ReqStatus?                                // 变更前主状态（创建时为null）
  toStatus        ReqStatus                                 // 变更后主状态
  fromSubStatus   ReqSubStatus?                             // 变更前子状态（无子状态时为null）
  toSubStatus     ReqSubStatus?                             // 变更后子状态
  operationType   OperationType                             // 操作类型，标识触发变更的具体动作
  reason          String?       @db.Text                     // 变更原因/评审意见/取消原因等
  operatorId      String                                     // 操作人ID
  createdAt       DateTime      @default(now())              // 操作时间

  // 关联关系
  requirement     Requirement   @relation(fields: [requirementId], references: [id], onDelete: Cascade)
  operator        User          @relation(fields: [operatorId], references: [id])

  // 查询索引
  @@index([requirementId, createdAt])  // 需求操作时间线（按时间倒序）
  @@index([operatorId])                // 按操作人查询
}
```

### 1.3 shared 包类型同步更新

以下类型需要在 `packages/shared` 中同步更新：

**constants/index.ts 新增枚举：**

```typescript
// ========== 优先级枚举 ==========
// 与PRD权限矩阵对齐，P0最高、P3最低，用于需求优先级标记和排序
export enum Priority {
  P0 = 'P0',  // 最高优先级（线上故障/业务阻断）
  P1 = 'P1',  // 高优先级（核心功能/重要需求）
  P2 = 'P2',  // 中优先级（常规需求）
  P3 = 'P3',  // 低优先级（优化/体验类）
}

// ========== 需求类型枚举 ==========
// 按需求性质分类，用于需求池的分类筛选和统计
export enum ReqType {
  NEW_FEATURE = 'NEW_FEATURE',    // 新功能：全新开发的业务功能
  OPTIMIZATION = 'OPTIMIZATION',  // 优化：已有功能的改进提升
  BUG = 'BUG',                    // 缺陷：需要修复的问题
}

// ========== 来源渠道枚举 ==========
// 按需求来源分类，用于追溯需求出处和渠道分析
export enum SourceChannel {
  BUSINESS = 'BUSINESS',            // 业务提出：业务方直接提出
  USER_FEEDBACK = 'USER_FEEDBACK',  // 用户反馈：终端用户反馈
  DATA_ANALYSIS = 'DATA_ANALYSIS',  // 数据分析：基于数据洞察提出
  COMPETITOR = 'COMPETITOR',        // 竞品分析：参考竞品功能提出
}

// ========== 操作类型枚举 ==========
// 覆盖所有状态变更和业务操作，写入StatusLog用于操作审计
// 每个值对应一种业务动作，与Prisma OperationType枚举一一对应
export enum OperationType {
  CREATE = 'CREATE',                          // 创建需求
  UPDATE = 'UPDATE',                          // 编辑需求（草稿状态）
  SUBMIT_REVIEW = 'SUBMIT_REVIEW',            // 发起评审
  REVIEW_PASS = 'REVIEW_PASS',                // 评审通过
  REVIEW_REJECT = 'REVIEW_REJECT',            // 评审拒绝
  RE_EDIT = 'RE_EDIT',                        // 重新编辑（已拒绝→草稿）
  CANCEL = 'CANCEL',                          // 取消需求
  CHANGE_REQUIREMENT = 'CHANGE_REQUIREMENT',  // 需求变更（已就绪/已纳版非封板→草稿）
  EMERGENCY_CHANGE = 'EMERGENCY_CHANGE',      // 紧急变更（封板→草稿，需审批）
  DEV_COMPLETE = 'DEV_COMPLETE',              // 开发完成（开发中→SIT测试）
  SIT_PASS = 'SIT_PASS',                      // SIT通过（SIT测试→UAT测试）
  UAT_PASS = 'UAT_PASS',                      // UAT通过（UAT测试→封板）
  BATCH_SUBMIT_REVIEW = 'BATCH_SUBMIT_REVIEW',           // 批量发起评审
  BATCH_CANCEL = 'BATCH_CANCEL',                         // 批量取消
  BATCH_CHANGE_PRIORITY = 'BATCH_CHANGE_PRIORITY',       // 批量修改优先级
  ONBOARD = 'ONBOARD',                        // 纳版（Task 2）
  REMOVE = 'REMOVE',                          // 从火车移除（Task 2）
  RELEASE = 'RELEASE',                        // 投产（Task 2）
  ROLLBACK = 'ROLLBACK',                      // 回滚（Task 2）
}

// ========== 优先级中文标签映射 ==========
// 用于前端下拉框选项和列表展示
export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.P0]: 'P0-最高',  // 线上故障/业务阻断
  [Priority.P1]: 'P1-高',    // 核心功能/重要需求
  [Priority.P2]: 'P2-中',    // 常规需求
  [Priority.P3]: 'P3-低',    // 优化/体验类
};

// ========== 需求类型中文标签映射 ==========
// 用于前端下拉框选项和列表展示
export const REQ_TYPE_LABELS: Record<ReqType, string> = {
  [ReqType.NEW_FEATURE]: '新功能',    // 全新开发的业务功能
  [ReqType.OPTIMIZATION]: '优化',     // 已有功能的改进提升
  [ReqType.BUG]: '缺陷',              // 需要修复的问题
};

// ========== 来源渠道中文标签映射 ==========
// 用于前端下拉框选项和列表展示
export const SOURCE_CHANNEL_LABELS: Record<SourceChannel, string> = {
  [SourceChannel.BUSINESS]: '业务提出',      // 业务方直接提出
  [SourceChannel.USER_FEEDBACK]: '用户反馈',  // 终端用户反馈
  [SourceChannel.DATA_ANALYSIS]: '数据分析',  // 基于数据洞察提出
  [SourceChannel.COMPETITOR]: '竞品分析',     // 参考竞品功能提出
};
```

---

## 二、US1.1 功能边界

### 2.1 本次设计范围

| 功能 | 说明 | 状态 |
|------|------|------|
| 创建需求 | 填写表单提交，生成需求编号 | ✅ 本次 |
| 编辑需求（草稿） | 修改草稿状态需求的字段（含 systemId、baId） | ✅ 本次 |
| 取消需求（草稿） | 草稿状态取消，状态变为 CANCELLED，免填原因 | ✅ 本次 |
| 依赖关系配置 | 编辑时全量替换依赖列表，循环依赖检测 | ✅ 本次 |
| XSS过滤 | 需求描述存储时过滤 + 前端渲染时 DOMPurify 二次过滤 | ✅ 本次 |
| 需求编号自动生成 | REQ-{年份}-{4位序号}，并发冲突自动重试3次 | ✅ 本次 |

### 2.2 本次不做

| 功能 | 说明 | 原因 |
|------|------|------|
| 发起评审 | 状态流转功能 | US1.2 |
| 评审通过/拒绝 | 状态流转功能 | US1.2 |
| 需求变更/紧急变更 | 状态流转功能 | US1.3 |
| 取消需求（非草稿） | 非草稿状态取消需填原因，属完整取消流程 | US1.3 |
| 批量操作 | 列表页功能 | US1.4 |
| 需求列表/详情/评审页 | 页面级功能 | US1.4/US1.5 |

---

## 三、数据层详细设计

### 3.1 需求编号生成规则

```
格式：REQ-{年份}-{4位序号}
示例：REQ-2026-0001、REQ-2026-0042

生成时机：需求创建时（POST /api/requirements）
生成方式：数据库查询当年最大序号 + 1
并发安全：利用 Prisma $transaction + 数据库唯一约束兜底
```

```typescript
/**
 * 生成需求编号
 * 
 * 格式：REQ-{年份}-{4位序号}，如 REQ-2026-0001
 * 生成时机：需求创建时，在Prisma事务内调用
 * 并发安全：利用数据库唯一约束兜底，冲突时自动重试最多3次
 * 
 * @param tx - Prisma事务客户端，确保编号生成与需求创建在同一事务中
 * @param maxRetries - 最大重试次数，默认3次
 * @returns 生成的需求编号字符串，如 "REQ-2026-0001"
 * @throws 重试耗尽后抛出冲突错误
 */
async function generateReqCode(tx: PrismaTransaction, maxRetries = 3): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 获取当前年份，用于编号前缀
      const year = new Date().getFullYear();
      // 构造前缀，如 "REQ-2026-"
      const prefix = `REQ-${year}-`;

      // 查询当年已有编号中最大的一个（按reqCode降序取第一条）
      const lastReq = await tx.requirement.findFirst({
        where: { reqCode: { startsWith: prefix } },
        orderBy: { reqCode: 'desc' },
        select: { reqCode: true },
      });

      // 默认序号为1，如果已有记录则取最大序号+1
      let nextSeq = 1;
      if (lastReq) {
        // 从编号字符串中截取序号部分并转为整数
        const lastSeq = parseInt(lastReq.reqCode.slice(prefix.length), 10);
        nextSeq = lastSeq + 1;
      }

      // 格式化为4位序号，不足4位前补零
      const reqCode = `${prefix}${nextSeq.toString().padStart(4, '0')}`;

      // 尝试创建需求记录来验证编号唯一性
      // 如果唯一约束冲突，Prisma会抛出 P2002 错误，由外层重试
      return reqCode;
    } catch (error) {
      // 非唯一约束错误，直接抛出
      if (error?.code !== 'P2002') throw error;
      // 唯一约束冲突，如果是最后一次尝试则抛出
      if (attempt === maxRetries - 1) {
        throw errors.conflict('需求编号生成冲突，请重试');
      }
      // 否则继续重试
    }
  }
  throw errors.conflict('需求编号生成冲突，请重试');
}
```

### 3.2 XSS 过滤规则

```typescript
import sanitizeHtml from 'sanitize-html';

// ========== XSS过滤白名单配置 ==========
// 定义需求描述中允许保留的HTML标签、属性和协议
// 不在白名单内的标签和属性将被移除，内容保留
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  // 允许的HTML标签：覆盖TipTap编辑器输出的常用格式
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',  // 标题
    'p', 'br', 'hr',                       // 段落和分隔
    'ul', 'ol', 'li',                      // 列表
    'strong', 'em', 's', 'u',              // 文本样式
    'blockquote', 'pre', 'code',           // 引用和代码
    'a', 'img',                            // 链接和图片
    'table', 'thead', 'tbody', 'tr', 'th', 'td',  // 表格
  ],
  // 允许的HTML属性：仅开放安全且必要的属性
  allowedAttributes: {
    a: ['href', 'target', 'rel'],          // 链接：允许跳转和打开方式
    img: ['src', 'alt', 'width', 'height'], // 图片：允许来源和尺寸
    td: ['colspan', 'rowspan'],            // 表格单元格：允许合并
    th: ['colspan', 'rowspan'],            // 表头单元格：允许合并
  },
  // 允许的URL协议：禁止javascript:等危险协议
  allowedSchemes: ['http', 'https', 'mailto'],
  // 不在白名单的标签处理方式：丢弃标签但保留内容
  disallowedTagsMode: 'discard',
};

/**
 * XSS过滤：清洗HTML富文本内容（后端存储时过滤）
 * 
 * 在需求描述存储前调用，移除危险标签和属性
 * 采用双重XSS防护策略：
 * - 后端存储时：sanitize-html 过滤（本函数）
 * - 前端渲染时：DOMPurify 二次过滤（前端组件中调用）
 * 
 * @param html - 待过滤的HTML字符串，来自TipTap编辑器输出
 * @returns 清洗后的安全HTML字符串
 */
function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
```

> **v1.1 变更说明**：XSS防护从"仅存储时过滤"升级为"双重过滤"策略。后端存储时用 sanitize-html 过滤，前端渲染时用 DOMPurify 二次过滤，双重保险。

### 3.3 循环依赖检测算法

```typescript
/**
 * 循环依赖检测：判断添加依赖后是否形成循环
 * 
 * 使用DFS（深度优先搜索）从被依赖方出发，按需查询数据库检查是否能回到依赖方
 * 不预加载全量依赖数据，DFS过程中按需查库，避免大数据量时的性能问题
 * 循环依赖是数据一致性错误，必须在保存依赖关系时阻断
 * 
 * @param dependantId - 依赖方需求ID（要添加依赖的需求，即A）
 * @param dependencyId - 被依赖方需求ID（被依赖的需求，即B）
 * @param tx - Prisma事务客户端，用于按需查询依赖关系
 * @returns true表示存在循环依赖（应阻断），false表示无循环（可添加）
 */
async function hasCircularDependency(
  dependantId: string,
  dependencyId: string,
  tx: PrismaTransaction,
): Promise<boolean> {
  // 自依赖检查：A不能依赖A自身
  if (dependantId === dependencyId) return true;

  // DFS遍历：从dependencyId出发，看能否回到dependantId
  const visited = new Set<string>();  // 已访问节点集合，防止重复遍历
  const stack = [dependencyId];       // DFS栈，初始放入被依赖方

  while (stack.length > 0) {
    const current = stack.pop()!;

    // 如果回到了依赖方，说明存在循环
    if (current === dependantId) return true;

    // 跳过已访问节点，避免无限循环
    if (visited.has(current)) continue;
    visited.add(current);

    // 按需查询当前节点的所有依赖（从数据库获取，避免全量加载）
    const deps = await tx.requirementDependency.findMany({
      where: { dependantId: current },
      select: { dependencyId: true },
    });

    // 将当前节点的所有依赖加入栈中继续搜索
    for (const dep of deps) {
      stack.push(dep.dependencyId);
    }
  }

  // 遍历结束未回到依赖方，无循环依赖
  return false;
}
```

### 3.4 乐观锁校验

```typescript
/**
 * 乐观锁更新：带版本号校验的需求更新
 * 
 * 使用Prisma的updateMany实现乐观锁：
 * - WHERE条件包含id和version，确保只有版本号匹配时才更新
 * - 更新成功后version自增1
 * - 更新失败时区分"需求不存在"和"版本冲突"两种情况
 * 
 * @param id - 需求ID
 * @param version - 客户端持有的版本号，必须与数据库当前版本一致
 * @param data - 要更新的字段数据（不含version，version由函数自动管理）
 * @returns 更新后的需求完整数据
 * @throws AppError 404 - 需求不存在或已删除
 * @throws AppError 409 - 乐观锁冲突（需求已被其他人修改）
 */
async function updateWithOptimisticLock(
  id: string,
  version: number,
  data: Prisma.RequirementUpdateInput,
) {
  // 尝试带版本号条件更新，只有version匹配时才成功
  const result = await prisma.requirement.updateMany({
    where: { id, version },
    data: { ...data, version: { increment: 1 } },  // 更新数据并自增版本号
  });

  // 更新影响行数为0，说明条件不满足，需区分原因
  if (result.count === 0) {
    const existing = await prisma.requirement.findUnique({ where: { id } });

    // 情况1：需求不存在
    if (!existing) {
      throw errors.notFound('需求');
    }

    // 情况2：版本号不匹配，说明需求已被其他人修改
    if (existing.version !== version) {
      throw errors.conflict('需求已被其他人修改，请刷新后重试');
    }

    // 其他未知情况，按不存在处理
    throw errors.notFound('需求');
  }

  // 更新成功，返回最新数据
  return prisma.requirement.findUnique({ where: { id } });
}
```

---

## 四、API 详细设计

### 4.1 创建需求

```
POST /api/requirements
```

**请求体：**

```typescript
/** 创建需求请求参数 */
interface CreateRequirementRequest {
  title: string;           // 必填，需求标题，1-200字
  description: string;     // 必填，需求描述，HTML富文本，1-50000字（过滤后）
  systemId: string;        // 必填，归属系统ID
  priority: Priority;      // 必填，优先级 P0/P1/P2/P3
  storyPoints: number;     // 必填，工作量点数 1-100
  baId: string;            // 必填，业务归属人ID
  pmId?: string;           // 可选，产品经理ID
  reqType?: ReqType;       // 可选，需求类型：新功能/优化/缺陷
  sourceChannel?: SourceChannel; // 可选，来源渠道
  dependencyIds?: string[];      // 可选，前置依赖需求ID列表，最多20个
}
```

**Fastify Schema：**

```typescript
// 创建需求请求体校验Schema，由Fastify自动校验请求参数
const createRequirementBodySchema = {
  type: 'object',
  required: ['title', 'description', 'systemId', 'priority', 'storyPoints', 'baId'],  // 必填字段
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },          // 标题：1-200字
    description: { type: 'string', minLength: 1 },                     // 描述：非空HTML
    systemId: { type: 'string', minLength: 1 },                        // 系统ID：非空
    priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },     // 优先级：枚举值
    storyPoints: { type: 'integer', minimum: 1, maximum: 100 },        // 点数：1-100整数
    baId: { type: 'string', minLength: 1 },                            // BA ID：非空
    pmId: { type: 'string' },                                          // PM ID：可选
    reqType: { type: 'string', enum: ['NEW_FEATURE', 'OPTIMIZATION', 'BUG'] },  // 类型：枚举
    sourceChannel: { type: 'string', enum: ['BUSINESS', 'USER_FEEDBACK', 'DATA_ANALYSIS', 'COMPETITOR'] },  // 渠道：枚举
    dependencyIds: {
      type: 'array',
      items: { type: 'string' },                                       // 依赖ID数组
      maxItems: 20,                                                    // 最多20个依赖
    },
  },
};
```

**响应体：**

```typescript
/** 需求详情响应数据（创建/编辑/查询共用） */
interface RequirementDetail {
  id: string;                          // 需求ID
  reqCode: string;                     // 需求编号，如 REQ-2026-0001
  title: string;                       // 需求标题
  description: string;                 // 需求描述（已XSS过滤的HTML）
  system: { id: string; name: string }; // 归属系统摘要
  priority: Priority;                  // 优先级
  storyPoints: number;                 // 工作量点数
  ba: { id: string; displayName: string };  // 业务归属人摘要
  pm?: { id: string; displayName: string }; // 产品经理摘要（可选）
  creator: { id: string; displayName: string }; // 创建人摘要
  status: ReqStatus;                   // 主状态
  subStatus?: ReqSubStatus;            // 子状态（仅已纳版有值）
  train?: { id: string; name: string }; // 所属版本火车摘要（已纳版时有值）
  reqType?: ReqType;                   // 需求类型（可选）
  sourceChannel?: SourceChannel;       // 来源渠道（可选）
  version: number;                     // 乐观锁版本号
  dependencies: DependencyItem[];      // 前置依赖列表
  createdAt: string;                   // 创建时间（ISO 8601）
  updatedAt: string;                   // 更新时间（ISO 8601）
  proposedAt: string;                  // 提出时间（ISO 8601）
}

/** 依赖需求摘要（用于需求详情中的依赖列表展示） */
interface DependencyItem {
  id: string;           // 依赖需求ID
  reqCode: string;      // 依赖需求编号
  title: string;        // 依赖需求标题
  status: ReqStatus;    // 依赖需求状态（用于前端风险提示）
}
```

**Service 层逻辑：**

```
1. 权限校验：当前用户角色 ∈ {BA, PM, PROJECT_MGR, TRAIN_ADMIN}（rbacMiddleware 已完成）
2. XSS过滤：sanitizeDescription(request.body.description)
3. 校验归属系统存在性
4. 校验业务归属人存在且角色为 BA（如指定了 systemId，校验 BA 属于该系统）
5. 校验产品经理存在（如果指定）
6. 校验依赖需求存在（如果指定），批量返回所有不存在的ID
7. 循环依赖检测（按需查询数据库，在事务内处理）
8. 事务内：
   a. generateReqCode(tx) 生成需求编号（冲突自动重试3次）
   b. 创建 Requirement 记录（status=DRAFT, creatorId=当前用户ID）
   c. 创建 RequirementDependency 记录（如果指定了依赖）
   d. 创建 StatusLog 记录（operationType=CREATE, toStatus=DRAFT）
9. 返回完整需求详情（含关联数据）
```

**错误码：**

| 场景 | HTTP状态码 | code | message |
|------|-----------|------|---------|
| 未登录 | 401 | UNAUTHORIZED | 未登录或登录已过期 |
| 无权限 | 403 | FORBIDDEN | 无权限执行此操作 |
| 系统不存在 | 400 | BAD_REQUEST | 归属系统不存在 |
| BA不存在 | 400 | BAD_REQUEST | 业务归属人不存在 |
| PM不存在 | 400 | BAD_REQUEST | 产品经理不存在 |
| 依赖需求不存在 | 400 | BAD_REQUEST | 依赖需求不存在：{id1, id2, ...}（批量返回所有不存在的ID） |
| 循环依赖 | 400 | BAD_REQUEST | 存在循环依赖，无法添加 |
| 需求编号唯一冲突 | 409 | CONFLICT | 需求编号生成冲突，请重试 |

### 4.2 编辑需求（仅草稿状态）

```
PATCH /api/requirements/:id
```

**请求体：**

```typescript
/** 编辑需求请求参数（仅草稿状态可编辑） */
interface UpdateRequirementRequest {
  version: number;         // 必填，乐观锁版本号，必须与当前数据库版本一致
  title?: string;          // 可选，需求标题，1-200字
  description?: string;    // 可选，需求描述，HTML富文本
  systemId?: string;       // 可选，归属系统ID（草稿状态可修改）
  priority?: Priority;     // 可选，优先级
  storyPoints?: number;    // 可选，工作量点数 1-100
  baId?: string;           // 可选，业务归属人ID（草稿状态可修改）
  pmId?: string;           // 可选，产品经理ID
  reqType?: ReqType;       // 可选，需求类型
  sourceChannel?: SourceChannel; // 可选，来源渠道
  dependencyIds?: string[];      // 可选，全量替换依赖列表（非增量）
}
```

**Fastify Schema：**

```typescript
// 编辑需求请求体校验Schema，version为必填项用于乐观锁校验
const updateRequirementBodySchema = {
  type: 'object',
  required: ['version'],  // 乐观锁版本号必填
  properties: {
    version: { type: 'integer', minimum: 1 },                          // 版本号：≥1
    title: { type: 'string', minLength: 1, maxLength: 200 },          // 标题：1-200字
    description: { type: 'string', minLength: 1 },                     // 描述：非空HTML
    systemId: { type: 'string', minLength: 1 },                        // 系统ID：草稿可改
    priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },     // 优先级：枚举
    storyPoints: { type: 'integer', minimum: 1, maximum: 100 },        // 点数：1-100
    baId: { type: 'string', minLength: 1 },                            // BA ID
    pmId: { type: 'string' },                                          // PM ID
    reqType: { type: 'string', enum: ['NEW_FEATURE', 'OPTIMIZATION', 'BUG'] },  // 类型
    sourceChannel: { type: 'string', enum: ['BUSINESS', 'USER_FEEDBACK', 'DATA_ANALYSIS', 'COMPETITOR'] },  // 渠道
    dependencyIds: {
      type: 'array',
      items: { type: 'string' },                                       // 依赖ID数组
      maxItems: 20,                                                    // 最多20个
    },
  },
};
```

**Service 层逻辑：**

```
1. 权限校验：草稿状态 BA/PM/PROJECT_MGR 都可编辑（不限 baId），TRAIN_ADMIN 也可
2. 查询需求，校验存在性
3. 校验需求状态为 DRAFT（非草稿不可编辑）
4. 乐观锁校验：request.body.version === requirement.version
5. 如果修改了 description，执行 XSS 过滤
6. 如果修改了 systemId，校验新系统存在性
7. 如果修改了 baId，校验新 BA 存在且属于新系统
8. 如果修改了 dependencyIds：
   a. 校验依赖需求存在，批量返回所有不存在的ID
   b. 循环依赖检测（按需查询数据库）
   c. 事务内全量替换 RequirementDependency 记录
9. 事务内更新 Requirement（version + 1）
10. 创建 StatusLog 记录（operationType=UPDATE）
11. 返回更新后的需求详情
```

**错误码：**

| 场景 | HTTP状态码 | code | message |
|------|-----------|------|---------|
| 需求不存在 | 404 | NOT_FOUND | 需求不存在 |
| 非草稿状态 | 400 | BAD_REQUEST | 仅草稿状态可编辑 |
| 乐观锁冲突 | 409 | CONFLICT | 需求已被其他人修改，请刷新后重试 |
| 循环依赖 | 400 | BAD_REQUEST | 存在循环依赖，无法添加 |

### 4.3 取消需求（草稿状态）

```
POST /api/requirements/:id/cancel
```

**请求体：** 无（草稿取消免填原因）

**Service 层逻辑：**

```
1. 权限校验：当前用户角色 ∈ {BA, PM, PROJECT_MGR, TRAIN_ADMIN}
2. 查询需求，校验存在性
3. 校验需求状态为 DRAFT（US1.1 仅实现草稿取消，非草稿取消在 US1.3）
4. 更新需求状态为 CANCELLED
5. 创建 StatusLog 记录（operationType=CANCEL, fromStatus=DRAFT, toStatus=CANCELLED）
6. 返回 { success: true }
```

**错误码：**

| 场景 | HTTP状态码 | code | message |
|------|-----------|------|---------|
| 需求不存在 | 404 | NOT_FOUND | 需求不存在 |
| 非草稿状态 | 400 | BAD_REQUEST | US1.1仅支持草稿取消，非草稿取消请使用取消需求功能 |

### 4.4 获取需求详情

```
GET /api/requirements/:id
```

**Service 层逻辑：**

```
1. 权限校验：所有角色可查看
2. 查询需求（where: { id }），include 关联数据（含 train 信息）
3. 不存在则 404
4. 构造 RequirementDetail 返回
```

### 4.5 依赖管理

> **v1.1 变更说明**：去掉独立的依赖子接口（POST/DELETE /dependencies），依赖管理统一通过编辑需求时的 `dependencyIds` 字段全量替换。简化 API 设计，避免两套接口功能重叠。

---

## 五、前端详细设计

### 5.1 路由配置

在 `App.tsx` 中新增路由：

```typescript
// 新增需求页面路由，仅对有CREATE_REQ权限的用户可见
<Route path="/requirements/new" element={<RequirementCreatePage />} />
// 编辑需求页面路由，仅草稿状态可访问
<Route path="/requirements/:id/edit" element={<RequirementEditPage />} />
```

权限守卫：`checkPermission(Operation.CREATE_REQ)` 控制新建按钮显示。

### 5.2 页面组件设计

#### 5.2.1 RequirementCreatePage

**文件路径**: `apps/web/src/pages/requirements/create.tsx`

**职责**: 需求创建页面，渲染 RequirementForm 组件（mode='create'）

```typescript
/** 需求创建页面组件Props（无额外属性，页面级组件） */
interface RequirementCreatePageProps {}

// 页面结构：
// ┌─────────────────────────────────────────┐
// │  面包屑：需求池管理 > 新增需求            │
// ├─────────────────────────────────────────┤
// │  RequirementForm mode="create"           │
// └─────────────────────────────────────────┘
```

#### 5.2.2 RequirementEditPage

**文件路径**: `apps/web/src/pages/requirements/edit.tsx`

**职责**: 需求编辑页面，加载现有数据后渲染 RequirementForm 组件（mode='edit'）

```typescript
// 页面结构：
// ┌─────────────────────────────────────────┐
// │  面包屑：需求池管理 > {reqCode} > 编辑    │
// ├─────────────────────────────────────────┤
// │  RequirementForm mode="edit"             │
// │    initialData={requirement}             │
// └─────────────────────────────────────────┘

// 加载逻辑：
// 1. 从 URL 参数获取需求 ID
// 2. 调用 GET /api/requirements/:id 获取详情
// 3. 校验状态为 DRAFT，否则提示并跳转详情页
```

#### 5.2.3 RequirementForm（核心表单组件）

**文件路径**: `apps/web/src/components/requirements/RequirementForm.tsx`

**职责**: 需求新增/编辑共用表单，含所有字段、校验、依赖配置

```typescript
/** 需求表单组件Props（新增/编辑共用） */
interface RequirementFormProps {
  mode: 'create' | 'edit';                                                    // 表单模式：create=新增，edit=编辑
  initialData?: RequirementDetail;                                            // 编辑模式下的初始数据
  onSubmit: (data: CreateRequirementRequest | UpdateRequirementRequest) => Promise<void>;  // 提交回调
}
```

**表单字段布局：**

```
┌──────────────────────────────────────────────────────────────┐
│  需求标题：[______________________________________]           │
│                                                              │
│  归属系统：[用户中心 ▼]    优先级：[P1 ▼]    工作量：[  5  ]  │
│                                                              │
│  业务归属人：[张三 ▼]     产品经理：[李四 ▼]                  │
│                                                              │
│  需求类型：[新功能 ▼]     来源渠道：[业务提出 ▼]              │
│                                                              │
│  需求描述：                                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [B] [I] [S] [H1][H2][H3] [UL][OL] [引用][代码]       │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │  （TipTap 富文本编辑区域）                              │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  前置依赖：                                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [+ 添加依赖]                                          │  │
│  │                                                        │  │
│  │  REQ-2026-0001  用户登录优化    已就绪    [✕ 移除]     │  │
│  │  REQ-2026-0003  权限管理改造    待评审    [✕ 移除]     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│                              [取消]  [保存草稿]  [保存并发起评审]              │
└──────────────────────────────────────────────────────────────┘
```

**Ant Design Form 字段定义：**

| 字段 | 组件 | 校验规则 | 说明 |
|------|------|----------|------|
| title | Input | 必填，1-200字 | 需求标题 |
| description | TipTap Editor | 必填，纯文本1-40000字（前端校验纯文本长度，后端校验HTML长度≤50000） | 需求描述 |
| systemId | Select | 必填 | 归属系统，数据源：GET /api/systems；变更时联动清空 baId 和 pmId |
| priority | Select | 必填 | 优先级 P0/P1/P2/P3 |
| storyPoints | InputNumber | 必填，1-100整数 | 工作量点数 |
| baId | Select | 必填 | 业务归属人，联动 systemId 过滤该系统的 BA 成员（SystemMember role=BA） |
| pmId | Select | 可选 | 产品经理，联动 systemId 过滤该系统的 PM 成员（SystemMember role=PM） |
| reqType | Select | 可选 | 需求类型 |
| sourceChannel | Select | 可选 | 来源渠道 |
| dependencyIds | DependencySelector | 可选，最多20个 | 前置依赖 |

**表单提交逻辑：**

```
create模式：
1. 收集表单值
2. 点击「保存草稿」→ 调用 POST /api/requirements → 成功跳转到需求详情页
3. 点击「保存并发起评审」→ 调用 POST /api/requirements → 成功后自动调用发起评审 API（US1.2）
4. 失败 → 显示错误提示

edit模式：
1. 收集表单值 + version字段
2. 调用 PATCH /api/requirements/:id
3. 成功 → 跳转到需求详情页
4. 409冲突 → 提示"需求已被其他人修改"，用户自行决定是否刷新
5. 400状态已变更 → 提示"需求状态已变更"，用户自行决定
6. 其他失败 → 显示错误提示
```

### 5.3 依赖选择器组件

**文件路径**: `apps/web/src/components/requirements/DependencySelector.tsx`

```typescript
/** 依赖选择器组件Props */
interface DependencySelectorProps {
  value: string[];                          // 当前已选依赖ID列表（受控组件）
  onChange: (ids: string[]) => void;        // 依赖列表变更回调
  maxDependencies?: number;                 // 最大依赖数量，默认20
  excludeIds?: string[];                    // 需排除的需求ID（如自身ID）
}
```

**交互流程：**

```
1. 点击 [+ 添加依赖] → 弹出 Modal
2. Modal 内展示需求列表（可搜索、可筛选系统/状态）
3. 列表排除已选中的依赖和当前需求自身
4. 勾选后确认 → 添加到依赖列表
5. 依赖列表每项显示：需求编号 + 标题 + 状态标签 + [移除]按钮
6. 依赖需求状态为已取消时，显示⚠️预警样式（仅前端预警，不阻断操作）
7. 依赖需求状态为已纳版/已投产时，显示✅依赖已满足标识
```

**Modal 内列表查询：**

```
GET /api/requirements?pageSize=50&keyword={搜索词}&systemId={系统ID}
```

### 5.4 TipTap 富文本编辑器组件

**文件路径**: `apps/web/src/components/common/RichTextEditor.tsx`

```typescript
/** 富文本编辑器组件Props */
interface RichTextEditorProps {
  value: string;             // HTML内容，由TipTap编辑器管理
  onChange: (html: string) => void;  // 内容变更回调，返回HTML字符串
  placeholder?: string;      // 占位提示文本
}
```

**工具栏按钮：**

| 分组 | 按钮 |
|------|------|
| 文本样式 | 加粗、斜体、删除线、下划线 |
| 标题 | H1、H2、H3 |
| 列表 | 无序列表、有序列表 |
| 块级 | 引用、代码块 |
| 插入 | 链接、图片（URL方式） |
| 表格 | 插入表格 |

**依赖包：**

```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-link": "^2.x",
  "@tiptap/extension-image": "^2.x",
  "@tiptap/extension-table": "^2.x",
  "@tiptap/extension-underline": "^2.x",
  "dompurify": "^3.x"
}
```

> **v1.1 变更说明**：新增 DOMPurify 依赖，用于前端渲染需求描述时的二次 XSS 过滤。存储时后端用 sanitize-html 过滤，渲染时前端用 DOMPurify 二次过滤，双重保险。

### 5.5 前端 Service 层

**文件路径**: `apps/web/src/services/requirement.ts`

```typescript
/** 创建需求API调用 */
async function createRequirement(
  data: CreateRequirementRequest,
): Promise<RequirementDetail>;

/** 编辑需求API调用（需传version用于乐观锁） */
async function updateRequirement(
  id: string,
  data: UpdateRequirementRequest,
): Promise<RequirementDetail>;

/** 取消需求API调用（草稿取消免填原因） */
async function cancelRequirement(id: string): Promise<void>;

/** 获取需求详情API调用 */
async function getRequirement(id: string): Promise<RequirementDetail>;
```

### 5.6 前端 Store

US1.1 不需要独立的 Zustand Store。表单状态由 Ant Design Form 管理，提交逻辑在页面组件中处理。

编辑页加载的需求详情数据使用 React Query 风格的本地 state（`useState` + `useEffect`），因为 US1.1 不涉及跨页面状态共享。

---

## 六、后端模块结构

### 6.1 文件组织

```
apps/server/src/modules/requirements/
├── index.ts                    # 注册所有需求相关路由
├── routes/
│   ├── create.ts               # POST   /api/requirements — 创建需求
│   ├── update.ts               # PATCH  /api/requirements/:id — 编辑需求
│   ├── cancel.ts               # POST   /api/requirements/:id/cancel — 取消需求
│   └── get.ts                  # GET    /api/requirements/:id — 获取需求详情
├── services/
│   └── requirement.service.ts  # 业务逻辑（reqCode生成、XSS过滤、循环依赖检测、乐观锁）
├── utils/
│   ├── sanitize.ts             # XSS过滤工具（sanitize-html，存储时过滤）
│   └── req-code.ts             # 需求编号生成器（含自动重试逻辑）
└── permissions.ts              # 权限校验辅助函数（资源归属校验）
```

### 6.2 路由注册

```typescript
// modules/requirements/index.ts
export async function requirementRoutes(fastify: FastifyInstance): Promise<void> {
  // US1.1 需求录入路由
  fastify.register(createRequirementRoute);    // POST   /api/requirements
  fastify.register(updateRequirementRoute);    // PATCH  /api/requirements/:id
  fastify.register(cancelRequirementRoute);    // POST   /api/requirements/:id/cancel
  fastify.register(getRequirementRoute);       // GET    /api/requirements/:id
}
```

```typescript
// ========== 需求模块路由注册 ==========
// 所有需求相关API挂载在 /api/requirements 路径下
// 需要JWT认证（authenticate中间件），部分接口需要RBAC权限校验
app.register(requirementRoutes, { prefix: '/api/requirements' });
```

### 6.3 permissions.ts 资源归属校验

```typescript
/**
 * 校验当前用户是否有权操作指定需求
 * 
 * 权限规则（按角色降序判断，草稿状态权限更宽松）：
 * - SUPER_ADMIN / TRAIN_ADMIN：可操作所有需求
 * - PROJECT_MGR：草稿状态可操作所有需求；非草稿只能操作自己关联的需求
 * - BA：草稿状态可操作所有需求；非草稿只能操作自己作为业务归属人的需求
 * - PM：草稿状态可操作所有需求；非草稿只能操作自己作为产品经理的需求
 * - 其他角色：无权操作
 * 
 * @param user - 当前登录用户的JWT解码信息
 * @param requirement - 待操作的需求对象
 * @param status - 需求当前状态（用于判断草稿宽松权限）
 * @returns true=有权操作，false=无权操作
 */
function canOperateRequirement(
  user: JwtPayload,
  requirement: Requirement,
  status?: ReqStatus,
): boolean {
  // 超级管理员和火车管理员：拥有全部操作权限
  if (user.role === Role.SUPER_ADMIN || user.role === Role.TRAIN_ADMIN) {
    return true;
  }

  // 草稿状态：BA/PM/PROJECT_MGR 都可操作（不限归属人）
  if (status === ReqStatus.DRAFT) {
    if (user.role === Role.BA || user.role === Role.PM || user.role === Role.PROJECT_MGR) {
      return true;
    }
  }

  // 非草稿状态：按归属人判断
  // BA角色：只能操作自己作为业务归属人的需求
  if (user.role === Role.BA && requirement.baId === user.sub) {
    return true;
  }
  // PM角色：只能操作自己作为产品经理的需求
  if (user.role === Role.PM && requirement.pmId === user.sub) {
    return true;
  }
  // 项目经理：可操作自己关联的需求（作为BA或PM）
  if (user.role === Role.PROJECT_MGR) {
    if (requirement.baId === user.sub || requirement.pmId === user.sub) {
      return true;
    }
  }

  // 其他情况：无权操作
  return false;
}
```

---

## 七、测试案例

### 7.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T1.1.1 | 创建需求-正常 | BA用户登录 | POST /api/requirements，填写完整字段 | 201，返回需求详情，reqCode格式正确，status=DRAFT，version=1 |
| T1.1.2 | 创建需求-无权限 | TEST_MGR用户登录 | POST /api/requirements | 403 FORBIDDEN |
| T1.1.3 | 创建需求-标题为空 | BA用户登录 | POST，title="" | 400 BAD_REQUEST |
| T1.1.4 | 创建需求-点数超限 | BA用户登录 | POST，storyPoints=101 | 400 BAD_REQUEST |
| T1.1.5 | 创建需求-系统不存在 | BA用户登录 | POST，systemId="不存在" | 400 BAD_REQUEST |
| T1.1.6 | 创建需求-XSS过滤 | BA用户登录 | POST，description含`<script>alert(1)</script>` | 存储后description中无script标签 |
| T1.1.7 | 创建需求-带依赖 | BA用户登录 | POST，dependencyIds=[已有需求ID] | 创建成功，依赖关系正确 |
| T1.1.8 | 创建需求-循环依赖 | BA用户登录 | POST，依赖自身 | 400 BAD_REQUEST，循环依赖 |
| T1.1.9 | 创建需求-需求编号递增 | BA用户登录 | 连续创建2个需求 | 第一个REQ-2026-xxxx，第二个序号+1 |
| T1.1.10 | 编辑需求-正常 | 草稿需求，BA归属人 | PATCH，version匹配 | 200，字段更新，version+1 |
| T1.1.11 | 编辑需求-乐观锁冲突 | 草稿需求，version=1 | PATCH，version=0 | 409 CONFLICT |
| T1.1.12 | 编辑需求-非草稿 | 已就绪需求 | PATCH | 400 BAD_REQUEST，仅草稿可编辑 |
| T1.1.13 | 编辑需求-非归属人（草稿） | 其他BA用户 | PATCH | 200，草稿状态不限归属人 |
| T1.1.14 | 编辑需求-修改systemId | 草稿需求 | PATCH，systemId改为新系统 | 200，systemId更新，baId/pmId联动清空 |
| T1.1.15 | 取消需求-正常 | 草稿需求，BA用户 | POST /cancel | 200，status=CANCELLED |
| T1.1.16 | 取消需求-非草稿 | 已就绪需求 | POST /cancel | 400 BAD_REQUEST |
| T1.1.17 | 取消需求-不存在 | 不存在的ID | POST /cancel | 404 NOT_FOUND |
| T1.1.18 | 获取详情-正常 | 存在的需求 | GET /api/requirements/:id | 200，返回完整详情含关联数据（含train信息） |
| T1.1.19 | 获取详情-不存在 | 不存在的ID | GET | 404 NOT_FOUND |
| T1.1.20 | 编辑需求-全量替换依赖 | 草稿需求，已有依赖A | PATCH，dependencyIds=[B,C] | 200，依赖变为B和C（A被移除） |
| T1.1.21 | 编辑需求-循环依赖 | A依赖B，编辑B依赖A | PATCH，dependencyIds含A | 400 BAD_REQUEST，循环依赖 |
| T1.1.22 | 创建需求-依赖不存在 | BA用户 | POST，dependencyIds含不存在的ID | 400 BAD_REQUEST，返回所有不存在的ID |
| T1.1.23 | 创建需求-编号冲突重试 | 并发创建需求 | 两个请求同时创建 | 均成功，编号不重复（自动重试） |

### 7.2 前端组件测试

| 编号 | 场景 | 预期结果 |
|------|------|----------|
| T1.1.F1 | 表单校验-标题为空 | 提交时显示"请输入需求标题" |
| T1.1.F2 | 表单校验-点数超限 | 输入101时显示"工作量点数范围1-100" |
| T1.1.F3 | 表单校验-必填项未填 | 提交时高亮未填必填项 |
| T1.1.F4 | 创建成功-保存草稿 | 点击「保存草稿」后跳转到需求详情页，显示成功提示 |
| T1.1.F5 | 创建成功-保存并发起评审 | 点击「保存并发起评审」后先创建需求，再自动调用发起评审API |
| T1.1.F6 | 编辑乐观锁冲突 | 显示"需求已被其他人修改"提示，用户自行决定是否刷新 |
| T1.1.F7 | systemId变更联动 | 修改归属系统后，baId和pmId自动清空 |
| T1.1.F8 | 依赖选择器-搜索 | 输入关键词后列表过滤 |
| T1.1.F9 | 依赖选择器-移除 | 点击移除后依赖列表更新 |
| T1.1.F10 | 依赖选择器-已取消预警 | 依赖需求状态为已取消时，显示⚠️预警样式 |
| T1.1.F11 | 富文本编辑器 | 支持加粗、标题、列表等格式 |
| T1.1.F12 | description长度校验 | 纯文本超过40000字时提示"描述内容过长" |
| T1.1.F13 | 无权限用户 | 隐藏新建需求按钮 |

---

## 八、依赖包清单

### 8.1 后端新增

| 包名 | 用途 | 版本 |
|------|------|------|
| sanitize-html | HTML XSS过滤 | ^2.x |

### 8.2 前端新增

| 包名 | 用途 | 版本 |
|------|------|------|
| @tiptap/react | 富文本编辑器核心 | ^2.x |
| @tiptap/starter-kit | 富文本基础扩展集 | ^2.x |
| @tiptap/extension-link | 链接扩展 | ^2.x |
| @tiptap/extension-image | 图片扩展 | ^2.x |
| @tiptap/extension-table | 表格扩展 | ^2.x |
| @tiptap/extension-underline | 下划线扩展 | ^2.x |
| dompurify | 前端渲染时XSS二次过滤 | ^3.x |

---

## 九、编码顺序建议

```
Step 1: Schema 对齐
  ├─ 更新 prisma/schema.prisma
  ├─ 更新 packages/shared/constants/index.ts（新增枚举+Label映射）
  ├─ 更新 packages/shared/types/requirement.ts（DTO对齐）
  └─ 执行 prisma migrate dev

Step 2: 后端实现
  ├─ 安装 sanitize-html
  ├─ 创建 modules/requirements/ 目录结构
  ├─ 实现 service.ts（reqCode生成、XSS过滤、循环依赖检测、乐观锁）
  ├─ 实现 validators.ts（Fastify schema）
  ├─ 实现 permissions.ts（资源归属校验）
  ├─ 实现 routes.ts（6个接口）
  └─ 注册路由到 app.ts

Step 3: 前端实现
  ├─ 安装 TipTap 相关包
  ├─ 实现 RichTextEditor 组件
  ├─ 实现 DependencySelector 组件
  ├─ 实现 RequirementForm 组件
  ├─ 实现 services/requirement.ts
  ├─ 实现 RequirementCreatePage
  ├─ 实现 RequirementEditPage
  └─ 更新 App.tsx 路由配置

Step 4: 测试
  ├─ 后端接口测试（T1.1.1 ~ T1.1.21）
  ├─ 前端组件测试（T1.1.F1 ~ T1.1.F9）
  └─ 联调测试（创建→编辑→删除完整流程）
```

---

*文档编号：RT-T1-US1.1-需求录入-详细设计*  
*创建时间：2026-05-11*  
*版本：v1.0*  
*关联文档：RT-T1-需求池管理-设计方案_20260511.md v1.1、RT-Task1-需求池管理-PRD.md v1.1、coding-standards.md v1.0*
