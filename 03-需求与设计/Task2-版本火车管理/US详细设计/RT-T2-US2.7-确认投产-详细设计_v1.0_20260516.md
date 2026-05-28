# US2.7 确认投产 - 详细设计

**版本号**: v1.0  
**日期**: 2026-05-16  
**设计状态**: 待审核  
**来源**: [RT-T2-版本火车管理-用户故事_v1.1_20260516.md](./RT-T2-版本火车管理-用户故事_v1.1_20260516.md)  
**PRD**: [RT-Task2-版本火车管理-PRD.md](./RT-Task2-版本火车管理-PRD.md) §3.4.7

---

## 一、功能概述

确认投产是将已纳版的需求标记为已投产上线，同时支持批量投产。

---

## 二、业务规则

| 编号 | 规则 | 校验时机 |
|------|------|----------|
| BR2.7.1 | 前置条件：需求状态为「已纳版」 | 操作时 |
| BR2.7.2 | 支持手动逐个确认投产，也支持批量投产 | 操作时 |
| BR2.7.3 | 到达统一投产节点时，系统自动将所有「已纳版」需求批量变更为「已投产」 | 触发时 |
| BR2.7.4 | 投产成功后，需求状态变更为「已投产」 | 变更时 |
| BR2.7.5 | 投产成功后，记录操作历史 | 变更时 |

---

## 三、API 详细设计

### 3.1 确认投产

```
POST /api/trains/:id/requirements/:requirementId/release
```

**前置条件**：需求状态为「已纳版」

**Service 层逻辑：**

```
1. 权限校验：TRAIN_ADMIN / SUPER_ADMIN
2. 校验火车存在且状态为 IN_PROGRESS
3. 校验需求存在且状态为 ONBOARDED
4. 校验需求关联的火车ID等于当前火车ID
5. Prisma 事务：
   a. 更新需求状态为 RELEASED
   b. 创建 StatusLog 记录（operationType=RELEASE）
6. 返回 { success: true }
```

### 3.2 批量确认投产

```
POST /api/trains/:id/requirements/release-batch
```

**请求体：**

```typescript
interface BatchReleaseRequest {
  requirementIds: string[];  // 必填，需求ID列表，最多50条
}
```

**Service 层逻辑：**

```
1. 权限校验：TRAIN_ADMIN / SUPER_ADMIN
2. 校验火车存在且状态为 IN_PROGRESS
3. 校验需求ID列表不为空，最多50条
4. 循环校验每个需求：
   a. 校验需求存在
   b. 校验需求状态为 ONBOARDED
   c. 校验需求关联的火车ID等于当前火车ID
5. Prisma 事务：
   a. 批量更新需求状态为 RELEASED
   b. 批量创建 StatusLog 记录
6. 返回批量操作结果
```

### 3.3 自动投产（定时任务）

```
POST /api/trains/:id/auto-release
```

**说明**：定时任务触发，到达统一投产节点时自动投产所有已纳版需求。

**触发条件**：
- 当前日期 >= 统一投产日（releaseDate）
- 火车状态为 IN_PROGRESS
- 存在状态为 ONBOARDED 的需求

**Service 层逻辑：**

```
1. 校验火车存在且状态为 IN_PROGRESS
2. 校验当前日期 >= releaseDate
3. 查询所有状态为 ONBOARDED 且 trainId 等于当前火车的需求
4. 如果有待投产需求：
   a. 批量更新需求状态为 RELEASED
   b. 批量创建 StatusLog 记录
5. 返回自动投产结果
```

---

## 四、前端详细设计

### 4.1 投产按钮

**位置**：已纳版需求列表，每行操作列

```typescript
{/* 已纳版需求列表操作列 */}
<Space>
  <Button type="link" onClick={() => navigate(`/requirements/${record.id}`)}>
    查看
  </Button>
  <Button type="link" onClick={handleRelease}>
    确认投产
  </Button>
</Space>
```

### 4.2 投产确认弹窗

```
┌──────────────────────────────────────────────────────────────┐
│  确认投产                                              [×]  │
├──────────────────────────────────────────────────────────────┤
│                                                                  │
│  确认以下需求已投产上线？                                         │
│                                                                  │
│  需求: REQ-001 用户登录优化                                      │
│  当前状态: 已纳版                                                │
│  版本火车: 2026年Q2第1车                                         │
│                                                                  │
│  投产后状态将变更为"已投产"。                                     │
│  💡 到达统一投产节点(5/30)时，系统将自动批量投产所有已纳版需求。    │
│                                                                  │
├──────────────────────────────────────────────────────────────┤
│                                    [取消]  [确认投产]         │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 批量投产

**位置**：已纳版需求列表顶部

```typescript
{/* 批量投产按钮 */}
<Button 
  type="primary"
  disabled={selectedRowKeys.length === 0}
  onClick={handleBatchRelease}
>
  批量确认投产({selectedRowKeys.length})
</Button>
```

---

## 五、前端 Service 层

```typescript
/** 确认投产 */
async function releaseRequirement(
  trainId: string,
  requirementId: string
): Promise<void>;

/** 批量确认投产 */
async function batchReleaseRequirements(
  trainId: string,
  requirementIds: string[]
): Promise<BatchOperationResult>;
```

---

## 六、测试案例

### 6.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T2.7.1 | 投产-正常 | 需求已纳版 | POST release | 200，状态变为已投产 |
| T2.7.2 | 投产-需求状态错误 | 需求非已纳版 | POST release | 400 |
| T2.7.3 | 批量投产-正常 | 多个需求已纳版 | POST release-batch | 200 |
| T2.7.4 | 批量投产-部分失败 | 部分需求状态错误 | POST release-batch | 返回成功/失败明细 |

### 6.2 前端功能测试

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T2.7.5 | 投产按钮显示 | 查看已纳版需求列表 | 显示「确认投产」按钮 |
| T2.7.6 | 投产成功 | 点击确认投产 | 需求状态变更 |
| T2.7.7 | 批量投产 | 选择多个需求点击批量投产 | 批量变更状态 |

---

## 七、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-16 | 初版设计 |

---

*文档编号：RT-T2-US2.7*  
*创建时间：2026-05-16*  
*版本：v1.0（待审核）*
