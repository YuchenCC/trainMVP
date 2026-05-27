# 领域模型、术语体系与状态机

**版本号**: v1.0  
**日期**: 2026-05-28  
**对应 Issue**: ISSUE-004  
**领域基线**: `CONTEXT.md` + Prisma schema + shared constants

---

## 一、文档目标

本文档统一版本火车需求管理系统的领域语言、核心实体、状态机和审计点。后续 PRD、设计文档、代码说明和竞赛材料都应使用本文档中的术语，避免 AI 或人工在不同上下文中误解业务概念。

## 二、核心术语

| 术语 | 定义 | 易混淆点 |
|------|------|----------|
| 版本火车 | 固定周期的发布计划容器，包含参与系统、团队容量和多个班次 | 不是单个投产批次 |
| 班次 | 版本火车下的具体发布实例，有独立时间范围、关键节点和容量快照 | 需求实际纳入班次，不是直接纳入火车 |
| 纳版 | 火车管理员确认已就绪需求进入班次交付范围，并占用系统容量 | 不是开工，也不是投产 |
| 已就绪 | 需求信息完整并通过评审，可进入版本规划 | 不代表技术方案完成 |
| 团队容量 | 某系统在某班次中可承接的工作量点数 | 是软约束，超限可强制但需审计 |
| 依赖风险 | 前置依赖未满足、未参车或已取消时的纳版风险 | 不是硬阻断，循环依赖除外 |
| 需求变更 | 已就绪或已纳版非封板需求显式退回草稿并重新评审 | 不是普通编辑 |
| 紧急变更 | 封板后变更申请，需审批通过后退回草稿 | 不能跳过审批 |
| 投产 | 已纳版需求上线发布后的需求级状态变化 | 不等于完成版本火车 |
| 回滚 | 已投产需求撤回到已就绪，等待重新规划 | 不新增“已回滚”长期状态 |
| 完成班次 | 火车管理员确认关闭班次，使其生命周期结束 | 不是自动完成 |
| AI排期建议 | 规则引擎生成结果，AI 负责解释和总结 | AI 不直接决定纳版 |

## 三、核心实体关系

```text
User ──< SystemMember >── System
  │                         │
  │                         ├──< Requirement >──< RequirementDependency >── Requirement
  │                         │          │
  │                         │          ├──< StatusLog
  │                         │          └──< EmergencyChange
  │                         │
Train ──< TrainSystem >─────┘
  │
  └──< TrainSchedule ──< TrainSystemSnapshot
                    └──< Requirement
```

## 四、实体说明

| 实体 | 说明 | 关键字段 |
|------|------|----------|
| User | 演示用户，承担 BA、PM、项目经理、技术经理、测试经理、火车管理员等角色 | `role`、`username`、`systemMembers` |
| System | 业务系统，MVP 中由种子数据预置 | `name`、`description` |
| SystemMember | 用户在系统中的成员角色 | `systemId`、`userId`、`role` |
| Requirement | 需求池核心对象 | `reqCode`、`status`、`subStatus`、`scheduleId`、`storyPoints` |
| RequirementDependency | 需求前置依赖关系 | `dependantId`、`dependencyId` |
| StatusLog | 需求状态和关键操作审计 | `operationType`、`fromStatus`、`toStatus`、`reason` |
| EmergencyChange | 封板后紧急变更审批记录 | `urgency`、`status`、`approverId` |
| Train | 版本火车容器 | `name`、`trainSystems`、`schedules` |
| TrainSystem | 火车级搭载系统和容量配置 | `capacityPoints`、角色用户字段 |
| TrainSchedule | 火车班次 | `status`、`startDate`、`boardingDate`、`sitDate`、`uatDate`、`lockdownDate`、`releaseDate` |
| TrainSystemSnapshot | 班次创建时的容量快照 | `capacityPoints`、`usedPoints` |

## 五、需求状态机

### 5.1 主状态

| 状态 | 含义 | 主要来源 |
|------|------|----------|
| `DRAFT` | 草稿，可编辑完善 | 创建需求、重新编辑、需求变更后 |
| `PENDING_REVIEW` | 待评审 | 发起评审 |
| `READY` | 已就绪，可纳版 | 评审通过、移除、回滚 |
| `REJECTED` | 已拒绝 | 评审拒绝 |
| `ONBOARDED` | 已纳版 | 纳入班次 |
| `RELEASED` | 已投产 | 确认投产或班次投产联动 |
| `CANCELLED` | 已取消 | 投产前取消 |

### 5.2 子状态

子状态仅在 `ONBOARDED` 下生效：

| 子状态 | 含义 | 下一步 |
|--------|------|--------|
| `DEV_IN_PROGRESS` | 开发中 | SIT测试 |
| `SIT_TESTING` | SIT测试 | UAT测试 |
| `UAT_TESTING` | UAT测试 | 封板 |
| `FROZEN` | 封板 | 投产或紧急变更 |

### 5.3 主要流转

```text
DRAFT
  ├─ 发起评审 → PENDING_REVIEW
  └─ 取消 → CANCELLED

PENDING_REVIEW
  ├─ 评审通过 → READY
  ├─ 评审拒绝 → REJECTED
  └─ 取消 → CANCELLED

REJECTED
  ├─ 重新编辑 → DRAFT
  └─ 取消 → CANCELLED

READY
  ├─ 纳版 → ONBOARDED / DEV_IN_PROGRESS
  ├─ 需求变更 → DRAFT
  └─ 取消 → CANCELLED

ONBOARDED
  ├─ 子状态推进：DEV_IN_PROGRESS → SIT_TESTING → UAT_TESTING → FROZEN
  ├─ 从班次移除 → READY
  ├─ 非封板需求变更 → DRAFT
  ├─ 封板紧急变更审批通过 → DRAFT
  ├─ 确认投产 → RELEASED
  └─ 取消 → CANCELLED

RELEASED
  └─ 回滚 → READY
```

## 六、班次状态机

| 状态 | 含义 | 典型触发 |
|------|------|----------|
| `PLANNING` | 规划中 | 创建班次 |
| `IN_PROGRESS` | 进行中 | 纳版或手动状态推进 |
| `LOCKED_DOWN` | 已封板 | 封板操作 |
| `RELEASED` | 已投产 | 投产操作 |

班次状态联动规则：

- 班次封板时，已纳版需求子状态同步为 `FROZEN`。
- 班次投产时，已纳版需求主状态同步为 `RELEASED`。
- 取消班次时，已纳版需求回到 `READY`。

## 七、权限触发点

| 操作 | 主要角色 |
|------|----------|
| 创建需求 | BA、PM、PROJECT_MGR |
| 编辑需求 | BA、PM、PROJECT_MGR |
| 评审需求 | PROJECT_MGR |
| 取消需求 | BA、TRAIN_ADMIN、SUPER_ADMIN |
| 需求变更 | BA、TRAIN_ADMIN、SUPER_ADMIN |
| 紧急变更 | BA、TRAIN_ADMIN |
| 紧急变更审批 | TEST_MGR、PROJECT_MGR、TRAIN_ADMIN |
| 子状态变更 | PROJECT_MGR、TECH_MGR、TEST_MGR |
| 创建/管理火车 | TRAIN_ADMIN |
| 纳版、移除、投产、回滚、完成班次 | TRAIN_ADMIN |

## 八、审计点

必须通过 `StatusLog` 或业务记录保留痕迹的动作：

- 创建需求。
- 编辑需求。
- 发起评审。
- 评审通过/拒绝。
- 重新编辑。
- 取消需求。
- 需求变更。
- 紧急变更和审批。
- 子状态变更。
- 纳版。
- 从班次移除。
- 投产。
- 回滚。

## 九、AI实现约束

后续 AI 修改系统时必须遵守以下约束：

1. 不得把“纳版”改写成“投产”。
2. 不得新增“已回滚”长期状态。
3. 不得让 AI 直接改变纳版结果，必须保留人工确认。
4. 不得绕过封板后的紧急变更审批。
5. 不得只在前端做权限控制，服务端必须校验。

## 十、版本记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-05-28 | 初始版本，整理术语、领域模型、需求状态机和班次状态机 |
