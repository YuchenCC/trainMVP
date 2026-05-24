# 智能纳版（AI Agent 排期建议）测试案例

**版本号**: v1.0
**日期**: 2026-05-24
**对应设计**: 智能纳版AI排期建议-设计方案 v1.0
**测试范围**: Coze Prompt 角色设定 → 后端 API → 前端交互

---

## 一、背景知识

### Coze Prompt 角色设定

| 角色 | 内容 |
|------|------|
| **身份** | 专业的版本火车项目经理（Release Train Manager） |
| **能力** | 容量评估、优先级排序、依赖关系处理、容量分配 |
| **模型** | 豆包模型（doubao） |

### 处理规则

| 规则 | 说明 |
|------|------|
| **容量检查** | 总点数 > 剩余容量 → 标记容量预警；按点数从大到小排序 |
| **优先级排序** | P0（最高）→ P1（高）→ P2（中）→ P3（低）；同优先级内按点数降序 |
| **依赖处理** | B未纳版 → B排A前；B已纳版/投产 → A可纳版；B已取消/草稿 → 风险提示 |
| **智能建议** | 容量约束 + 优先级 + 依赖拓扑排序 + 单系统不独占 |

### 测试数据说明

所有测试用例基于以下测试数据模板构造输入，验证 Coze 输出是否符合预期。

---

## 二、容量检查测试（6 个用例）

### TC-CAP-001 容量充足，全部可纳版

| 项 | 内容 |
|------|------|
| **测试目的** | 验证总故事点数 ≤ 剩余容量时，所有需求建议为 recommended |
| **班次数据** | totalCapacity=100, usedCapacity=30, remainingCapacity=70 |
| **需求列表** | req-A (P0, 8pt), req-B (P1, 5pt), req-C (P2, 3pt) — 共16pt |
| **期望输出** | canAccommodate=true, exceededBy=null |
| **Suggestions** | 3个全部 recommended，顺序 P0→P1→P2 |
| **Warnings** | [] |

### TC-CAP-002 容量刚好，全部可纳版

| 项 | 内容 |
|------|------|
| **测试目的** | 验证总点数 == 剩余容量边界情况 |
| **班次数据** | totalCapacity=100, usedCapacity=80, remainingCapacity=20 |
| **需求列表** | req-A (P0, 8pt), req-B (P1, 7pt), req-C (P2, 5pt) — 共20pt |
| **期望输出** | canAccommodate=true, exceededBy=null |
| **Suggestions** | 3个全部 recommended |
| **Warnings** | [] 或仅 info 级别 |

### TC-CAP-003 容量不足，部分无法纳版

| 项 | 内容 |
|------|------|
| **测试目的** | 验证总点数 > 剩余容量时，AI 正确给出容量预警 |
| **班次数据** | totalCapacity=100, usedCapacity=80, remainingCapacity=20 |
| **需求列表** | req-A (P0, 8pt), req-B (P1, 10pt), req-C (P2, 8pt) — 共26pt |
| **期望输出** | canAccommodate=false, exceededBy=6 |
| **Suggestions** | P0 优先 recommended；至少1个标记 not_recommended（容量不足） |
| **Warnings** | 至少包含1个 type=capacity_exceeded |

### TC-CAP-004 剩余容量为 0

| 项 | 内容 |
|------|------|
| **测试目的** | 验证剩余容量为 0 时全部拒绝 |
| **班次数据** | totalCapacity=100, usedCapacity=100, remainingCapacity=0 |
| **需求列表** | req-A (P0, 8pt), req-B (P1, 5pt) |
| **期望输出** | canAccommodate=false, exceededBy=13 |
| **Suggestions** | 全部 not_recommended |
| **Warnings** | 每个需求都有 capacity_exceeded 警告 |

### TC-CAP-005 单个需求超出总容量

| 项 | 内容 |
|------|------|
| **测试目的** | 验证单个需求点数 > 总容量时特殊处理 |
| **班次数据** | totalCapacity=100, usedCapacity=0, remainingCapacity=100 |
| **需求列表** | req-A (P0, 120pt), req-B (P1, 5pt) |
| **期望输出** | canAccommodate=false |
| **Suggestions** | req-A 即使 P0 也标记 not_recommended（点数超出总容量限制） |
| **Warnings** | req-A 有 capacity_exceeded |

### TC-CAP-006 大量需求容量分批

| 项 | 内容 |
|------|------|
| **测试目的** | 验证 10+ 个需求时 AI 正确做容量分批建议 |
| **班次数据** | totalCapacity=100, usedCapacity=0, remainingCapacity=100 |
| **需求列表** | 15个需求，P0~P3 混合，总点数 200pt |
| **期望输出** | canAccommodate=false |
| **Suggestions** | 按 P0→P1→P2→P3 排列；前面的推荐纳版，后面的标记 not_recommended |
| **Warnings** | 有 capacity_exceeded 警告，且消息明确说明超出数量和限制原因 |

---

## 三、优先级排序测试（5 个用例）

### TC-PRI-001 P0 优先于 P1

| 项 | 内容 |
|------|------|
| **测试目的** | 验证 P0 始终排在 P1 前面 |
| **班次数据** | remainingCapacity=100 |
| **需求列表** | req-A (P1, 20pt), req-B (P0, 5pt), req-C (P2, 15pt) |
| **期望输出** | Order: B(P0) → A(P1) → C(P2) |
| **验证点** | P0 的 order < P1 的 order < P2 的 order |

### TC-PRI-002 同优先级按点数降序

| 项 | 内容 |
|------|------|
| **测试目的** | 验证同优先级内故事点数大的排在前面 |
| **班次数据** | remainingCapacity=100 |
| **需求列表** | req-A (P0, 5pt), req-B (P0, 13pt), req-C (P0, 8pt) |
| **期望输出** | Order: B(13pt) → C(8pt) → A(5pt) |
| **验证点** | 同优先级内按 storyPoints 降序排列 |

### TC-PRI-003 P3 低优先级排在最后

| 项 | 内容 |
|------|------|
| **测试目的** | 验证 P3 始终排在最后 |
| **班次数据** | remainingCapacity=100 |
| **需求列表** | req-A (P3, 50pt), req-B (P0, 3pt), req-C (P1, 8pt) |
| **期望输出** | Order: B(P0) → C(P1) → A(P3) |
| **验证点** | 即使 P3 点数最大，仍排在所有更高优先级之后 |

### TC-PRI-004 全 P0 场景

| 项 | 内容 |
|------|------|
| **测试目的** | 验证全是 P0 时仅按点数降序排列 |
| **班次数据** | remainingCapacity=50 |
| **需求列表** | req-A (P0, 8pt), req-B (P0, 13pt), req-C (P0, 5pt), req-D (P0, 20pt) |
| **期望输出** | Order: D(20) → B(13) → A(8) → C(5) |
| **Suggestions** | 全部 recommended（假设容量够） |

### TC-PRI-005 优先级 + 容量联合排序

| 项 | 内容 |
|------|------|
| **测试目的** | 验证优先级和容量联合作用时的综合排序 |
| **班次数据** | remainingCapacity=20 |
| **需求列表** | req-A (P0, 8pt), req-B (P1, 20pt), req-C (P0, 10pt), req-D (P2, 3pt) |
| **期望输出** | Order: A(P0,8) → C(P0,10) → D(P2,3)，B 因为20pt超出剩余容量标记 not_recommended |
| **验证点** | 容量不足的需求即使优先级不高也标记 not_recommended |

---

## 四、依赖关系测试（6 个用例）

### TC-DEP-001 简单依赖，依赖方排在前面

| 项 | 内容 |
|------|------|
| **测试目的** | 验证 A 依赖 B 时，B 排在 A 前面 |
| **班次数据** | remainingCapacity=100 |
| **需求列表** | req-A (P0, 8pt), req-A依赖req-B (P1, 5pt, 状态READY) |
| **期望输出** | Order: B(P1) → A(P0) |
| **Suggestions** | B 的 reason 含 "被依赖"，A 的 reason 含 "依赖已建议纳版" |

### TC-DEP-002 链式依赖 A→B→C

| 项 | 内容 |
|------|------|
| **测试目的** | 验证多层链式依赖的正确拓扑排序 |
| **班次数据** | remainingCapacity=100 |
| **需求列表** | req-A (P0, 8pt, 依赖req-B), req-B (P1, 5pt, 依赖req-C), req-C (P2, 3pt) |
| **期望输出** | Order: C → B → A |
| **验证点** | 所有依赖链上的需求 order 递增 |

### TC-DEP-003 依赖已纳版/投产，直接排入

| 项 | 内容 |
|------|------|
| **测试目的** | 验证被依赖方已投产时，依赖方可正常纳版 |
| **班次数据** | remainingCapacity=50 |
| **需求列表** | req-A (P0, 8pt, 依赖req-B), req-B 状态=RELEASED |
| **期望输出** | A 直接 recommended |
| **Suggestions** | A 的 reason 含 "依赖已投产"，B 不出现在建议中（已投产不需要再次纳版） |

### TC-DEP-004 依赖已取消/草稿，标记风险

| 项 | 内容 |
|------|------|
| **测试目的** | 验证被依赖方取消/草稿时生成风险警告 |
| **班次数据** | remainingCapacity=50 |
| **需求列表** | req-A (P0, 8pt, 依赖req-B), req-B 状态=CANCELLED |
| **期望输出** | A 的 suggestion 可能为 optional/not_recommended |
| **Warnings** | 至少1个 type=dependency_risk，reqCode=A，message 含"依赖已取消" |

### TC-DEP-005 P0 依赖 P1，依赖方排序调整

| 项 | 内容 |
|------|------|
| **测试目的** | 验证 P0 依赖 P1 时，P1 排到 P0 前（依赖优先于优先级） |
| **班次数据** | remainingCapacity=50 |
| **需求列表** | req-A (P0, 8pt, 依赖req-B), req-B (P1, 5pt), req-C (P0, 3pt, 无依赖) |
| **期望输出** | Order: B(P1,被依赖) → A(P0) → C(P0) |
| **验证点** | 被依赖方即使优先级低，也排在依赖方前面 |

### TC-DEP-006 循环依赖检测

| 项 | 内容 |
|------|------|
| **测试目的** | 验证互相对依赖时的风险提示 |
| **班次数据** | remainingCapacity=50 |
| **需求列表** | req-A (P0, 8pt, 依赖req-B), req-B (P1, 5pt, 依赖req-A) |
| **期望输出** | success=true（不崩溃） |
| **Warnings** | 至少1个 type=cycle_dependency 警告 |

---

## 五、警告/边界测试（4 个用例）

### TC-WARN-001 容量 + 依赖双重警告

| 项 | 内容 |
|------|------|
| **测试目的** | 验证同时出现容量和依赖问题时都生成警告 |
| **班次数据** | remainingCapacity=10 |
| **需求列表** | req-A (P0, 8pt, 依赖req-B), req-B (P1, 5pt, CANCELLED), req-C (P2, 4pt) |
| **期望输出** | success=true |
| **Warnings** | 至少2条警告，分别 type=capacity_exceeded 和 type=dependency_risk |

### TC-WARN-002 空需求列表

| 项 | 内容 |
|------|------|
| **测试目的** | 验证不选任何需求时返回空结果 |
| **班次数据** | remainingCapacity=50 |
| **需求列表** | [] |
| **期望输出** | totalSelected=0, totalStoryPoints=0, canAccommodate=true |
| **Suggestions** | [] |

### TC-WARN-003 单个系统独占容量不均衡

| 项 | 内容 |
|------|------|
| **测试目的** | 验证同优先级下多个系统时均衡分配的建议 |
| **班次数据** | remainingCapacity=40 |
| **需求列表** | 用户中心: req-A(P0, 10pt), req-B(P0, 10pt), req-C(P0, 10pt)；订单系统: req-D(P0, 8pt) |
| **期望输出** | 4个 P0 全部 recommended（容量充足） |
| **验证点** | summary 中可能提到"单系统独占"提示 |

### TC-WARN-004 需求状态非 READY

| 项 | 内容 |
|------|------|
| **测试目的** | 验证非 READY 状态需求的处理建议 |
| **班次数据** | remainingCapacity=50 |
| **需求列表** | req-A (P0, 8pt, DRAFT), req-B (P1, 5pt, READY) |
| **期望输出** | B 推荐纳版；A 标记 not_recommended，reason 含"状态为DRAFT不可纳版" |

---

## 六、前后端集成测试（4 个用例）

### TC-INT-001 后端 buildCozeInput 数据格式

| 项 | 内容 |
|------|------|
| **测试目的** | 验证传递给 Coze 的数据结构符合设计 |
| **测试方式** | 单元测试 mock getScheduleCapacity/getRequirementsForAI |
| **验证点** | cozeInput 中包含 `trainSchedule.name`, `trainSchedule.totalCapacity`, `selectedRequirements` 数组；依赖字段使用 `depId/depReqCode` 等简化命名 |

### TC-INT-002 Coze 返回解析

| 项 | 内容 |
|------|------|
| **测试目的** | 验证解析 Coze 流式响应中 `data.content` JSON |
| **测试方式** | 单元测试 mock Coze 流式返回 |
| **验证点** | 正确提取 `output.success`, `output.suggestions[]`, `output.warnings[]` |

### TC-INT-003 前端超时保护

| 项 | 内容 |
|------|------|
| **测试目的** | 验证前端请求超时设置 |
| **测试方式** | 查看 `smart-onboard.ts` 中的 timeout 配置 |
| **验证点** | `/smart-onboard/suggest` 和 `/smart-onboard/confirm` 的 timeout=60000 |

### TC-INT-004 confirmOnboard 确认纳版

| 项 | 内容 |
|------|------|
| **测试目的** | 验证确认纳版后需求状态正确变更 |
| **测试方式** | 集成测试：先调用 suggest 再调用 confirm |
| **验证点** | 需求状态 READY→ONBOARDED；子状态→DEV_IN_PROGRESS；scheduleId 被设置；usedPoints 增加 |

---

## 七、E2E 场景测试（3 个用例）

### TC-E2E-001 正常纳版全流程

| 步骤 | 操作 | 期望 |
|------|------|------|
| 1 | 创建班次，配置系统容量 totalCapacity=50 | 成功 |
| 2 | 为两个系统分别创建 READY 状态需求各3个 | 成功 |
| 3 | 在班次详情页纳版管理中勾选需求 | 显示已选点数 |
| 4 | 点击「AI 智能纳版」 | 弹出建议模态框 |
| 5 | 查看 AI 建议（约15-20秒后） | 显示容量分析、建议列表、总结 |
| 6 | 确认纳版 | 需求状态变更 ONBOARDED |

### TC-E2E-002 容量超限预警

| 步骤 | 操作 | 期望 |
|------|------|------|
| 1 | 班次剩余容量 10 | — |
| 2 | 勾选 3 个需求（总 25pt） | — |
| 3 | 点击「AI 智能纳版」 | 显示容量分析 exceededBy=15 |
| 4 | 查看建议 | P0 需求 recommended，其余 not_recommended |
| 5 | 确认纳版时仅勾选 recommended | 容量不超限 |

### TC-E2E-003 依赖关系正确排序

| 步骤 | 操作 | 期望 |
|------|------|------|
| 1 | 创建 req-A(P0) 依赖 req-B(P1) 依赖 req-C(P2) | — |
| 2 | 勾选 A, B, C 三个需求 | — |
| 3 | 点击「AI 智能纳版」 | — |
| 4 | 查看建议顺序 | C → B → A |
| 5 | 查看每个的 reason | C("无依赖"), B("被A依赖"), A("依赖B已建议纳版") |

---

## 八、快速验证表

| 编号 | 类别 | 验证点 | 期望 |
|------|------|--------|------|
| CAP-001 | 容量 | 总点数≤剩余容量 | canAccommodate=true |
| CAP-003 | 容量 | 总点数>剩余容量 | canAccommodate=false, 有容量警告 |
| PRI-001 | 排序 | P0→P1→P2→P3 | order 严格递增 |
| PRI-002 | 排序 | 同优先级点数降序 | 13pt→8pt→5pt |
| DEP-001 | 依赖 | A依赖B | B order < A order |
| DEP-003 | 依赖 | 被依赖已投产 | A正常纳版 |
| DEP-004 | 依赖 | 被依赖已取消 | A标记风险+not_recommended |
| DEP-005 | 依赖 | P0依赖P1 | P1排在P0前 |
| DEP-006 | 依赖 | 循环依赖 | 不崩溃，有cycle_dependency警告 |
| WARN-002 | 边界 | 空需求列表 | []，totalSelected=0 |
| WARN-004 | 边界 | DRAFT状态 | not_recommended |
| E2E-001 | 集成 | 全流程 | 建议生成 + 确认纳版成功 |

---

## 九、Mock Coze 测试数据

以下 JSON 可直接用于 Coze 工作流调试/手动测试：

### Mock 数据 1：正常场景

```json
{
  "trainSchedule": {
    "name": "2026年Q2第1班",
    "totalCapacity": 100,
    "usedCapacity": 30,
    "remainingCapacity": 70
  },
  "selectedRequirements": [
    {
      "id": "req-101",
      "reqCode": "REQ-2026-0101",
      "title": "用户登录优化",
      "priority": "P0",
      "storyPoints": 8,
      "system": "用户中心",
      "status": "READY",
      "dependencies": []
    },
    {
      "id": "req-102",
      "reqCode": "REQ-2026-0102",
      "title": "订单列表优化",
      "priority": "P1",
      "storyPoints": 5,
      "system": "订单系统",
      "status": "READY",
      "dependencies": []
    },
    {
      "id": "req-103",
      "reqCode": "REQ-2026-0103",
      "title": "支付回调处理",
      "priority": "P1",
      "storyPoints": 13,
      "system": "支付系统",
      "status": "READY",
      "dependencies": []
    }
  ]
}
```

### Mock 数据 2：依赖场景

```json
{
  "trainSchedule": {
    "name": "2026年Q2第2班",
    "totalCapacity": 50,
    "usedCapacity": 0,
    "remainingCapacity": 50
  },
  "selectedRequirements": [
    {
      "id": "req-201",
      "reqCode": "REQ-2026-0201",
      "title": "订单支付功能",
      "priority": "P0",
      "storyPoints": 8,
      "system": "订单系统",
      "status": "READY",
      "dependencies": [
        {
          "depId": "req-202",
          "depReqCode": "REQ-2026-0202",
          "depTitle": "第三方支付集成",
          "depPriority": "P1",
          "depStoryPoints": 5,
          "depStatus": "DRAFT"
        }
      ]
    },
    {
      "id": "req-202",
      "reqCode": "REQ-2026-0202",
      "title": "第三方支付集成",
      "priority": "P1",
      "storyPoints": 5,
      "system": "订单系统",
      "status": "DRAFT",
      "dependencies": []
    }
  ]
}
```

### Mock 数据 3：容量超限场景

```json
{
  "trainSchedule": {
    "name": "2026年Q2第3班",
    "totalCapacity": 50,
    "usedCapacity": 40,
    "remainingCapacity": 10
  },
  "selectedRequirements": [
    {
      "id": "req-301",
      "reqCode": "REQ-2026-0301",
      "title": "首页性能优化",
      "priority": "P0",
      "storyPoints": 8,
      "system": "普惠前端系统",
      "status": "READY",
      "dependencies": []
    },
    {
      "id": "req-302",
      "reqCode": "REQ-2026-0302",
      "title": "员工信息页改版",
      "priority": "P1",
      "storyPoints": 5,
      "system": "人力资源系统",
      "status": "READY",
      "dependencies": []
    },
    {
      "id": "req-303",
      "reqCode": "REQ-2026-0303",
      "title": "考勤报表增加导出",
      "priority": "P2",
      "storyPoints": 13,
      "system": "人力资源系统",
      "status": "READY",
      "dependencies": []
    }
  ]
}
```

---

*设计来源：RT-Task3-智能纳版AI排期建议-设计方案 v1.0*
*关联文件：`apps/server/src/modules/smart-onboard/service.ts`，`SmartOnboardSuggestion.tsx`*
