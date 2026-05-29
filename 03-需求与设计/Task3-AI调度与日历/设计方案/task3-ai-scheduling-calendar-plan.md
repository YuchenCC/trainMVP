# Task 3 AI智能调度与日历视图实现计划

## 一、项目调研结论

### 1.1 现有代码基础
- **前端技术栈**：React 18 + Ant Design 5 + React Router 6 + Day.js，已具备良好的组件库支持
- **后端技术栈**：Fastify + Prisma + TypeScript，已有完整的分层架构和错误处理体系
- **类型定义**：`@release-train/shared` 包已有基础类型，可扩展
- **前置依赖**：Task 2（版本火车管理）完成后方可开始，因为需要火车相关接口支持

### 1.2 需求范围
根据 PRD 和 Issue，Task 3 分为三个核心部分：
1. **AI排期规则引擎**（后端）：
   - 依赖检查、优先级排序、容量分配、可装则装策略
   - 输出建议纳入、建议延期、依赖风险、容量预估

2. **AI排期建议页**（前端）：
   - 展示建议纳入、建议延期、依赖风险、容量变化
   - 支持勾选建议项并批量确认纳版

3. **日历视图**（前端）：
   - 周/月切换视图
   - 展示版本火车周期和关键节点
   - 容量预警标识
   - 点击事件跳转到火车详情

---

## 二、实现计划

### 阶段 1：Shared 包类型与错误码扩展
1. 扩展 `packages/shared/src/types/train.ts` 类型定义
   - AI排期建议请求/响应类型
   - 依赖风险类型
   - 容量预估类型
   - 日历视图数据类型
2. 扩展 `packages/shared/src/constants/error-codes.ts` 错误码
   - 添加 AI 排期相关错误码（如果有）

### 阶段 2：后端 AI 排期规则引擎实现
1. 在 `server/src/modules/trains/service.ts` 中添加：
   - `generateAISchedule()` 规则引擎主函数
   - 依赖检查辅助函数
   - 优先级排序辅助函数
   - 容量分配辅助函数（可装则装策略）
   - 依赖风险识别辅助函数
2. 在 `server/src/modules/trains/index.ts` 中添加路由
   - `GET /api/trains/:id/ai-schedule` 获取 AI 排期建议

### 阶段 3：日历视图后端接口补充
1. 在 `server/src/modules/trains/service.ts` 中添加：
   - `getTrainsForCalendar()` 获取日历视图所需的火车列表（按日期范围）
2. 在 `server/src/modules/trains/index.ts` 中添加路由
   - `GET /api/trains/calendar` 获取日历视图数据

### 阶段 4：前端 Service 层实现
1. 更新 `web/src/services/train.ts`
   - 添加获取 AI 排期建议的 API
   - 添加批量确认纳版的 API
   - 添加获取日历视图数据的 API

### 阶段 5：AI排期建议页实现
1. 创建 `web/src/pages/trains/[id]/ai-schedule.tsx` 或 `web/src/pages/trains/AiScheduleModal.tsx`
   - 展示建议纳入需求列表
   - 展示建议延期需求列表
   - 展示依赖风险提示
   - 展示容量预估图表
   - 支持全选/反选
   - 支持批量确认纳版
   - 显示 AI 总结说明

### 阶段 6：日历视图实现
1. 创建 `web/src/pages/trains/calendar.tsx` 日历视图页
   - 月/周视图切换
   - 展示火车周期卡片
   - 展示关键节点（统一纳版/封板/投产）
   - 容量预警标识（>=90% 红色预警）
   - 点击事件跳转到火车详情页
2. 在 `web/src/App.tsx` 中添加日历视图路由

### 阶段 7：火车详情页集成 AI 排期功能
1. 更新 `web/src/pages/trains/[id].tsx`（Task 2 中创建的火车详情页）
   - 添加 "AI 排期建议" 按钮
   - 点击按钮打开 AI 排期建议页面或弹窗

### 阶段 8：测试
1. 编写后端单元测试 `server/src/__tests__/t3-ai-schedule.test.ts`
2. 编写前端组件测试
3. 手动测试完整流程

---

## 三、核心文件修改清单

| 文件路径 | 操作类型 | 说明 |
|---------|---------|-----|
| `packages/shared/src/types/train.ts` | 修改 | 扩展 AI 排期和日历视图类型 |
| `release-train/apps/server/src/modules/trains/service.ts` | 修改 | 添加 AI 排期规则引擎和日历视图数据查询 |
| `release-train/apps/server/src/modules/trains/index.ts` | 修改 | 添加 AI 排期和日历视图路由 |
| `release-train/apps/web/src/services/train.ts` | 修改 | 添加 AI 排期和日历视图 API 调用 |
| `release-train/apps/web/src/pages/trains/calendar.tsx` | 新建 | 日历视图页 |
| `release-train/apps/web/src/pages/trains/[id]/ai-schedule.tsx` 或 `web/src/pages/trains/AiScheduleModal.tsx` | 新建 | AI 排期建议页/弹窗 |
| `release-train/apps/web/src/App.tsx` | 修改 | 添加日历视图路由 |
| `release-train/apps/server/src/__tests__/t3-ai-schedule.test.ts` | 新建 | Task 3 单元测试 |

---

## 四、关键业务逻辑设计

### 4.1 AI 排期规则引擎核心逻辑
```
输入: 版本火车ID
输出:
  - recommendedRequirementIds: 建议纳入本车的需求ID数组
  - deferredRequirementIds: 建议延期的需求ID数组
  - capacityForecast: 各系统容量预估（usedPoints, capacityPoints, usageRate）
  - dependencyRisks: 依赖风险列表
  - reasons: 每个建议的原因说明

处理流程:
1. 获取火车信息（搭载系统、容量、节点时间）
2. 获取所有已就绪需求（状态为 READY，归属系统在火车搭载列表中）
3. 依赖检查:
   - 遍历需求，检查其依赖状态
   - 标记依赖风险（已取消/依赖系统未参与/依赖未纳版）
4. 需求排序:
   - 主排序: 优先级 P0 > P1 > P2 > P3
   - 次排序: 工作量点数 从小到大
5. 容量分配（可装则装策略）:
   - 按系统分组
   - 对每个系统，遍历排序后的需求
   - 若剩余容量 >= 需求点数 → 纳入建议
   - 否则 → 标记为建议延期
6. 依赖联动建议:
   - 若需求A依赖需求B，且A建议纳入但B未建议纳入
   - 检查B是否可纳入（容量和依赖）
   - 若可纳入 → 将B也加入建议
7. 输出结果
```

### 4.2 日历视图数据结构
```typescript
// 日历视图数据
interface CalendarViewData {
  year: number;
  month: number;
  week?: number; // 周视图时有效
  trains: TrainCalendarItem[];
}

interface TrainCalendarItem {
  id: string;
  name: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  status: TrainStatus;
  capacityWarnings: {
    systemName: string;
    usageRate: number;
  }[];
  milestones: {
    type: 'boarding' | 'lockdown' | 'release';
    date: string; // ISO 8601
    name: string;
  }[];
}
```

### 4.3 日历视图展示逻辑
- **火车周期卡片**：从开始日期到结束日期
- **关键节点**：在对应日期显示小卡片
  - 统一纳版：绿色
  - 统一封板：橙色
  - 统一投产：蓝色
- **容量预警**：任一系统使用率 ≥90% 显示红色预警图标
- **状态标识**：
  - 灰色：已完成
  - 黄色：进行中
  - 蓝色：计划中

---

## 五、风险与注意事项

1. **前置依赖**：Task 2（版本火车管理）必须先完成，特别是：
   - 火车创建和查询接口
   - 纳版接口（特别是批量纳版）
   - 需求状态管理

2. **日历库选择**：需要确认使用哪种日历组件。Ant Design 没有内置日历视图组件，可考虑：
   - 使用 `antd` 的 `Calendar` 组件（基础日历）
   - 或使用 `@ant-design/pro-components` 中的日历相关组件
   - 或自行实现

3. **AI 生成说明**：PRD 提到 AI 解释能力，但 issue 17 明确 AI 只生成解释和总结，不改变规则引擎结果。本任务我们先实现规则引擎的确定性建议，AI 自然语言总结可作为后续扩展（如需要）。

4. **性能考量**：AI 排期规则引擎需要处理多个需求和依赖关系，注意：
   - 避免 N+1 查询
   - 对于大量需求，考虑分页或分批处理
   - 缓存火车和需求数据
