# US2.9 完成版本火车 - 详细设计

**版本号**: v1.0  
**日期**: 2026-05-16  
**设计状态**: 待审核  
**来源**: [RT-T2-版本火车管理-用户故事_v1.1_20260516.md](./RT-T2-版本火车管理-用户故事_v1.1_20260516.md)  
**PRD**: [RT-Task2-版本火车管理-PRD.md](./RT-Task2-版本火车管理-PRD.md) §3.4.9

---

## 一、功能概述

完成版本火车是火车管理员手动确认关闭版本火车，使其生命周期结束。

---

## 二、业务规则

| 编号 | 规则 | 校验时机 |
|------|------|----------|
| BR2.9.1 | 前置条件：当前日期不早于统一投产节点 | 操作时 |
| BR2.9.2 | 前置条件：该版本火车下不存在仍处于「已纳版」状态的需求 | 操作时 |
| BR2.9.3 | 所有需求必须为「已投产」或「已取消」或「已就绪」（已移除） | 校验时 |
| BR2.9.4 | 不满足条件时，提示具体原因 | 提示时 |
| BR2.9.5 | 完成成功后，版本火车状态变更为「已完成」 | 变更时 |
| BR2.9.6 | 完成成功后，记录操作历史 | 变更时 |

---

## 三、API 详细设计

### 3.1 完成版本火车

```
POST /api/trains/:id/complete
```

**Service 层逻辑：**

```
1. 权限校验：TRAIN_ADMIN / SUPER_ADMIN
2. 校验火车存在且状态为 IN_PROGRESS
3. 校验当前日期 >= releaseDate
4. 查询该火车下所有需求，校验不存在状态为 ONBOARDED 的需求
5. Prisma 事务：
   a. 更新火车状态为 COMPLETED
   b. 创建 StatusLog 记录（如果有火车状态变更日志表）
6. 返回 { success: true }
```

**错误码：**

| 场景 | HTTP状态码 | code | message |
|------|-----------|------|---------|
| 火车不存在 | 404 | NOT_FOUND | 版本火车不存在 |
| 火车状态非进行中 | 400 | BAD_REQUEST | 只能完成进行中的火车 |
| 当前日期早于投产节点 | 400 | BAD_REQUEST | 当前日期未到统一投产节点{date}，无法完成 |
| 存在未投产需求 | 400 | BAD_REQUEST | 还有{count}个需求未投产，请先处理 |

### 3.2 获取完成校验结果

```
GET /api/trains/:id/complete-check
```

**说明**：在点击"完成"按钮前，先检查是否满足完成条件。

**响应体：**

```typescript
interface CompleteCheckResponse {
  canComplete: boolean;
  releaseDatePassed: boolean;     // 投产节点是否已过
  currentDate: string;
  releaseDate: string;
  onboardedRequirementsCount: number;  // 未投产的需求数量
  onboardedRequirements: {
    id: string;
    reqCode: string;
    title: string;
  }[];
}
```

---

## 四、前端详细设计

### 4.1 完成按钮

**位置**：版本火车详情页，操作按钮区域

**显示条件**：火车状态为「进行中」

```typescript
{/* 版本火车详情页操作按钮 */}
{status === TrainStatus.IN_PROGRESS && (
  <Button 
    type="primary" 
    onClick={handleComplete}
  >
    完成版本火车
  </Button>
)}
```

### 4.2 完成校验

```typescript
const handleComplete = async () => {
  // 先检查是否满足完成条件
  const checkResult = await checkComplete(trainId);
  
  if (!checkResult.canComplete) {
    // 显示不满足条件的原因
    if (!checkResult.releaseDatePassed) {
      message.warning(`当前日期未到统一投产节点${checkResult.releaseDate}，无法完成`);
    }
    if (checkResult.onboardedRequirementsCount > 0) {
      message.warning(`还有${checkResult.onboardedRequirementsCount}个需求未投产，请先处理`);
    }
    return;
  }
  
  // 显示确认弹窗
  setShowCompleteModal(true);
};
```

### 4.3 完成确认弹窗

```
┌──────────────────────────────────────────────────────────────┐
│  完成版本火车                                        [×]      │
├──────────────────────────────────────────────────────────────┤
│                                                                  │
│  确定要完成版本火车 "2026年Q2第1车" 吗？                        │
│                                                                  │
│  当前状态: 进行中                                               │
│  统一投产日: 2026-05-30                                        │
│  已投产需求: 12个                                               │
│                                                                  │
│  ⚠️ 完成后的版本火车将无法再进行纳版、投产等操作。               │
│                                                                  │
├──────────────────────────────────────────────────────────────┤
│                                    [取消]  [确认完成]         │
└──────────────────────────────────────────────────────────────┘
```

---

## 五、前端 Service 层

```typescript
/** 获取完成校验结果 */
async function checkComplete(trainId: string): Promise<CompleteCheckResponse>;

/** 完成版本火车 */
async function completeTrain(trainId: string): Promise<void>;
```

---

## 六、测试案例

### 6.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T2.9.1 | 完成-正常 | 满足所有条件 | POST complete | 200，状态变为已完成 |
| T2.9.2 | 完成-火车状态错误 | 火车非进行中 | POST complete | 400 |
| T2.9.3 | 完成-日期未到 | 当前日期早于投产节点 | POST complete | 400 |
| T2.9.4 | 完成-存在未投产需求 | 有需求未投产 | POST complete | 400 |
| T2.9.5 | 完成校验-正常 | 满足所有条件 | GET complete-check | canComplete=true |
| T2.9.6 | 完成校验-不满足 | 不满足条件 | GET complete-check | canComplete=false，提示原因 |

### 6.2 前端功能测试

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T2.9.7 | 完成按钮显示 | 查看进行中火车详情 | 显示「完成版本火车」按钮 |
| T2.9.8 | 完成校验-不满足 | 有未投产需求时点击完成 | 提示未投产数量 |
| T2.9.9 | 完成成功 | 满足条件并确认 | 火车状态变更，弹窗关闭 |

---

## 七、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-16 | 初版设计 |

---

*文档编号：RT-T2-US2.9*  
*创建时间：2026-05-16*  
*版本：v1.0（待审核）*
