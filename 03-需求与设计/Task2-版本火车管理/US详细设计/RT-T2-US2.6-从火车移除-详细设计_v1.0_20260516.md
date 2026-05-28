# US2.6 从火车移除 - 详细设计

**版本号**: v1.0  
**日期**: 2026-05-16  
**设计状态**: 待审核  
**来源**: [RT-T2-版本火车管理-用户故事_v1.1_20260516.md](./RT-T2-版本火车管理-用户故事_v1.1_20260516.md)  
**PRD**: [RT-Task2-版本火车管理-PRD.md](./RT-Task2-版本火车管理-PRD.md) §3.4.6

---

## 一、功能概述

从火车移除是将已纳版的需求从版本火车移除，使其状态恢复为"已就绪"。

---

## 二、业务规则

| 编号 | 规则 | 校验时机 |
|------|------|----------|
| BR2.6.1 | 前置条件：需求状态为「已纳版」 | 操作时 |
| BR2.6.2 | 移除原因必填，最多 500 字符 | 提交时 |
| BR2.6.3 | 移除成功后，需求状态变更为「已就绪」，释放系统容量 | 变更时 |
| BR2.6.4 | 移除成功后，记录操作历史 | 变更时 |
| BR2.6.5 | 使用 Prisma 事务保证数据一致性 | 执行时 |

---

## 三、API 详细设计

### 3.1 从火车移除

```
POST /api/trains/:id/requirements/:requirementId/remove
```

**请求体：**

```typescript
interface RemoveFromTrainRequest {
  reason: string;  // 必填，移除原因，1-500字符
}
```

**Fastify Schema：**

```typescript
const removeFromTrainBodySchema = {
  type: 'object',
  required: ['reason'],
  properties: {
    reason: { type: 'string', minLength: 1, maxLength: 500 },
  },
};
```

**Service 层逻辑：**

```
1. 权限校验：TRAIN_ADMIN / SUPER_ADMIN
2. 校验火车存在且状态为 IN_PROGRESS
3. 校验需求存在且状态为 ONBOARDED
4. 校验需求关联的火车ID等于当前火车ID
5. Prisma 事务：
   a. 查询需求详情（包含 systemId、storyPoints）
   b. 更新需求状态为 READY，清空 trainId
   c. 查询并扣减 TrainSystem.usedPoints（减少该需求的点数）
   d. 创建 StatusLog 记录（operationType=REMOVE, reason=移除原因）
6. 返回 { success: true }
```

**错误码：**

| 场景 | HTTP状态码 | code | message |
|------|-----------|------|---------|
| 火车不存在 | 404 | NOT_FOUND | 版本火车不存在 |
| 火车状态非进行中 | 400 | BAD_REQUEST | 只能从进行中的火车移除需求 |
| 需求不存在 | 404 | NOT_FOUND | 需求不存在 |
| 需求状态非已纳版 | 400 | BAD_REQUEST | 只有已纳版状态的需求可移除 |
| 需求不属于该火车 | 400 | BAD_REQUEST | 该需求不属于本火车 |
| 移除原因为空 | 400 | BAD_REQUEST | 移除原因不能为空 |

### 3.2 批量从火车移除

```
POST /api/trains/:id/requirements/remove-batch
```

**请求体：**

```typescript
interface BatchRemoveFromTrainRequest {
  requirementIds: string[];  // 必填，需求ID列表
  reason: string;           // 必填，移除原因，1-500字符
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
   a. 批量更新需求状态为 READY，清空 trainId
   b. 批量扣减 TrainSystem.usedPoints
   c. 批量创建 StatusLog 记录
6. 返回批量操作结果
```

---

## 四、前端详细设计

### 4.1 移除按钮

**位置**：已纳版需求列表，每行操作列

```typescript
{/* 纳版管理标签页中的已纳版需求列表 */}
<Table
  dataSource={onboardedRequirements}
  rowKey="id"
  rowSelection={{
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  }}
>
  <Column title="需求编号" dataIndex="reqCode" />
  <Column title="需求标题" dataIndex="title" />
  <Column title="操作">
    {(_, record) => (
      <Space>
        <Button type="link" onClick={() => navigate(`/requirements/${record.id}`)}>
          查看
        </Button>
        <Button type="link" danger onClick={() => handleRemove(record)}>
          移除
        </Button>
      </Space>
    )}
  </Column>
</Table>
```

### 4.2 移除确认弹窗

**文件路径**: `apps/web/src/components/trains/RemoveRequirementModal.tsx`

```typescript
interface RemoveRequirementModalProps {
  visible: boolean;
  trainId: string;
  requirement: RequirementListItem;
  onClose: () => void;
  onSuccess: () => void;
}
```

**弹窗布局：**

```
┌──────────────────────────────────────────────────────────────┐
│  从火车移除                                        [×]      │
├──────────────────────────────────────────────────────────────┤
│                                                                  │
│  确定要将需求 "REQ-003 订单导出功能" 从版本火车移除吗？         │
│                                                                  │
│  当前版本火车: 2026年Q2第1车                                    │
│  工作量点数: 8点                                                │
│  移除后将释放订单系统 8点 容量（25/30 → 17/30）                  │
│                                                                  │
│  移除原因 *                                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │  请输入移除原因...                                        │  │
│  │                                                          │  │
│  └────────────────────────────────────────────────────────┘  │
│  ⚠️ 移除后将释放该需求的容量配额                               │
│                                                                  │
├──────────────────────────────────────────────────────────────┤
│                                    [取消]  [确定移除]         │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 批量移除

**位置**：已纳版需求列表顶部

```typescript
{/* 批量移除按钮 */}
<Space>
  <Button 
    danger 
    disabled={selectedRowKeys.length === 0}
    onClick={handleBatchRemove}
  >
    批量移除({selectedRowKeys.length})
  </Button>
</Space>
```

---

## 五、前端 Service 层

**文件路径**: `apps/web/src/services/train.ts`

```typescript
/** 从火车移除 */
async function removeFromTrain(
  trainId: string,
  requirementId: string,
  reason: string
): Promise<void>;

/** 批量从火车移除 */
async function batchRemoveFromTrain(
  trainId: string,
  requirementIds: string[],
  reason: string
): Promise<BatchOperationResult>;
```

---

## 六、测试案例

### 6.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T2.6.1 | 移除-正常 | 需求已纳版 | POST remove | 200，状态变为已就绪 |
| T2.6.2 | 移除-需求状态错误 | 需求非已纳版 | POST remove | 400 |
| T2.6.3 | 移除-原因为空 | 需求已纳版 | reason="" | 400 |
| T2.6.4 | 移除-火车状态错误 | 火车非进行中 | POST remove | 400 |
| T2.6.5 | 批量移除-正常 | 多个需求已纳版 | POST remove-batch | 200 |
| T2.6.6 | 批量移除-部分失败 | 部分需求状态错误 | POST remove-batch | 返回成功/失败明细 |

### 6.2 前端功能测试

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T2.6.7 | 移除按钮显示 | 查看已纳版需求列表 | 显示「移除」按钮 |
| T2.6.8 | 移除弹窗 | 点击移除按钮 | 显示移除确认弹窗 |
| T2.6.9 | 移除成功 | 填写原因并确认 | 需求从列表移除，弹窗关闭 |
| T2.6.10 | 批量移除 | 选择多个需求点击批量移除 | 显示批量移除确认弹窗 |

---

## 七、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-16 | 初版设计 |

---

*文档编号：RT-T2-US2.6*  
*创建时间：2026-05-16*  
*版本：v1.0（待审核）*
