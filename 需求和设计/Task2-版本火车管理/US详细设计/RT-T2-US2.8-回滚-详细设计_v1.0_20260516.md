# US2.8 回滚 - 详细设计

**版本号**: v1.0  
**日期**: 2026-05-16  
**设计状态**: 待审核  
**来源**: [RT-T2-版本火车管理-用户故事_v1.1_20260516.md](./RT-T2-版本火车管理-用户故事_v1.1_20260516.md)  
**PRD**: [RT-Task2-版本火车管理-PRD.md](./RT-Task2-版本火车管理-PRD.md) §3.4.8

---

## 一、功能概述

回滚是将已投产的需求状态回退到"已就绪"，使其可以重新搭载到其他版本火车。

---

## 二、业务规则

| 编号 | 规则 | 校验时机 |
|------|------|----------|
| BR2.8.1 | 前置条件：需求状态为「已投产」 | 操作时 |
| BR2.8.2 | 回滚原因必填，最多 500 字符 | 提交时 |
| BR2.8.3 | 回滚成功后，需求状态变更为「已就绪」 | 变更时 |
| BR2.8.4 | 回滚成功后，记录操作历史 | 变更时 |

---

## 三、API 详细设计

### 3.1 回滚需求

```
POST /api/trains/:id/requirements/:requirementId/rollback
```

**请求体：**

```typescript
interface RollbackRequest {
  reason: string;  // 必填，回滚原因，1-500字符
}
```

**Fastify Schema：**

```typescript
const rollbackBodySchema = {
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
2. 校验火车存在
3. 校验需求存在且状态为 RELEASED
4. 校验需求关联的火车ID等于当前火车ID
5. Prisma 事务：
   a. 更新需求状态为 READY（注意：不清空 trainId，回滚后保留原火车关联）
   b. 创建 StatusLog 记录（operationType=ROLLBACK, reason=回滚原因）
6. 返回 { success: true }
```

**错误码：**

| 场景 | HTTP状态码 | code | message |
|------|-----------|------|---------|
| 火车不存在 | 404 | NOT_FOUND | 版本火车不存在 |
| 需求不存在 | 404 | NOT_FOUND | 需求不存在 |
| 需求状态非已投产 | 400 | BAD_REQUEST | 只有已投产状态的需求可回滚 |
| 回滚原因为空 | 400 | BAD_REQUEST | 回滚原因不能为空 |

---

## 四、前端详细设计

### 4.1 回滚按钮

**位置**：已投产需求列表，每行操作列

```typescript
{/* 已投产需求列表操作列 */}
<Space>
  <Button type="link" onClick={() => navigate(`/requirements/${record.id}`)}>
    查看
  </Button>
  <Button type="link" danger onClick={() => handleRollback(record)}>
    回滚
  </Button>
</Space>
```

### 4.2 回滚确认弹窗

**文件路径**: `apps/web/src/components/trains/RollbackModal.tsx`

```typescript
interface RollbackModalProps {
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
│  回滚需求                                              [×]  │
├──────────────────────────────────────────────────────────────┤
│                                                                  │
│  确定要回滚需求 "REQ-003 订单导出功能" 吗？                       │
│                                                                  │
│  回滚后需求将返回"已就绪"状态，可重新搭载到其他版本火车。          │
│                                                                  │
│  回滚原因 *                                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │  请输入回滚原因...                                        │  │
│  │                                                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                  │
├──────────────────────────────────────────────────────────────┤
│                                    [取消]  [确定回滚]         │
└──────────────────────────────────────────────────────────────┘
```

---

## 五、前端 Service 层

```typescript
/** 回滚需求 */
async function rollbackRequirement(
  trainId: string,
  requirementId: string,
  reason: string
): Promise<void>;
```

---

## 六、测试案例

### 6.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T2.8.1 | 回滚-正常 | 需求已投产 | POST rollback | 200，状态变为已就绪 |
| T2.8.2 | 回滚-需求状态错误 | 需求非已投产 | POST rollback | 400 |
| T2.8.3 | 回滚-原因为空 | 需求已投产 | reason="" | 400 |

### 6.2 前端功能测试

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T2.8.4 | 回滚按钮显示 | 查看已投产需求列表 | 显示「回滚」按钮 |
| T2.8.5 | 回滚成功 | 填写原因并确认 | 需求状态变更 |

---

## 七、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-16 | 初版设计 |

---

*文档编号：RT-T2-US2.8*  
*创建时间：2026-05-16*  
*版本：v1.0（待审核）*
